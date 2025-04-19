import { Interpreter, jsPython } from '../../submodules/jspython/src/interpreter';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import functions and classes from other modules
import { proxyManager, type ElementProxyReceiver } from '../lib/proxy';
import { initializeThree, initializeControls, addSceneExtras, handleResize, disposeThreeResources } from '../lib/three-setup';
import { updateVoxelMesh, resetVoxelData, disposeVoxelResources, createVoxelDataArray } from '../utils/voxel-utils';
import { runPythonCode } from '../lib/python-runner';

type VoxelDataType = (string | null)[][][];

// Define the structure of the shared state
export type WorkerState = {
    three: THREE.WebGLRenderer | null;
    interpreter: Interpreter | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    controls: OrbitControls | null;
    animationFrameId: number | null;
    // Voxel data: null = empty, string = color
    voxelData: (string | null)[][][] | null;
    voxelMesh: THREE.Mesh | null; // Single mesh for all voxels
    gridSize: number;
    canvasId: string | null; // Use string ID consistent with ProxyManager
    inputProxy: ElementProxyReceiver | null;
};

// Initialize the state
const state: WorkerState = {
    three: null,
    interpreter: null,
    scene: null,
    camera: null,
    controls: null,
    animationFrameId: null,
    voxelData: null,
    voxelMesh: null,
    gridSize: 0,
    canvasId: null,
    inputProxy: null,
};

/**
 * Initializes the worker environment.
 */
function init(data: any) {
    try {
        const { canvas, width, height, gridSize, canvasId, enableOrbitControls = true } = data;

        console.log(`Initializing worker for canvasId: ${canvasId}, size: ${width}x${height}, grid: ${gridSize}`);

        // Store core info in state
        state.canvasId = canvasId;
        state.gridSize = gridSize;

        // Ensure proxy exists for the input element
        const inputProxy = proxyManager.getProxy(canvasId);
        if (!inputProxy) {
            throw new Error(`Input proxy not found for canvasId: ${canvasId}. Call 'makeProxy' first.`);
        }
        state.inputProxy = inputProxy;

        // Initialize Python interpreter
        state.interpreter = jsPython();
        console.log('js-python interpreter initialized.');

        // Initialize Three.js core
        initializeThree(state, canvas, width, height);

        // Initialize Controls if enabled
        if (enableOrbitControls && state.camera && state.inputProxy) {
            initializeControls(state, state.inputProxy);
        } else {
             console.log('OrbitControls disabled or prerequisites missing.');
        }

        // Initialize voxel data array
        resetVoxelData(state); // Use reset which handles initialization

        // Create initial empty voxel mesh (or update if reset doesn't handle mesh)
        updateVoxelMesh(state); // Ensure mesh reflects initial empty state

        // Add lights, helpers etc.
        addSceneExtras(state);

        // Start the render loop
        startRenderLoop();

        self.postMessage({ type: 'init', status: 'success' });
        console.log("Worker initialization successful.");

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Initialization failed:", message);
        self.postMessage({ type: 'error', message: `Initialization failed: ${message}` });
    }
}

/**
 * Starts the Three.js render loop.
 */
function startRenderLoop() {
    if (state.animationFrameId !== null) {
        console.warn("Render loop already running.");
        return;
    }
    if (!state.three || !state.scene || !state.camera) {
        console.error('Cannot start render loop: Core Three.js components missing.');
        self.postMessage({ type: 'error', message: 'Cannot start render loop: renderer, scene, or camera not initialized' });
        return;
    }

    console.log("Starting render loop...");
    const animate = (timestamp: number) => {
        state.animationFrameId = self.requestAnimationFrame(animate);

        // Update controls if they exist
        state.controls?.update();

        // Render the scene
        state.three!.render(state.scene!, state.camera!);
    };
    animate(performance.now());
}

/**
 * Stops the Three.js render loop.
 */
function stopRenderLoop() {
    if (state.animationFrameId !== null) {
        self.cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
        console.log("Render loop stopped.");
    }
}

/**
 * Handles resize messages.
 */
function resize(data: { width: number; height: number }) {
     try {
        handleResize(state, data.width, data.height);
        self.postMessage({ type: 'resize', status: 'success' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Resize failed:", message);
        self.postMessage({ type: 'error', message: `Resize failed: ${message}` });
    }
}


// --- Helper Functions for Challenge Evaluation ---

/**
 * Creates a deep copy of the voxel data array.
 * Requires createVoxelDataArray utility function.
 * @param data The source voxel data.
 * @param gridSize The grid size.
 * @returns A deep copy of the voxel data, or null if input is null.
 */
function deepCopyVoxelData(data: VoxelDataType | null, gridSize: number): VoxelDataType | null {
    if (!data || gridSize <= 0) return null;
    // Assumes createVoxelDataArray initializes an empty grid correctly
    const copy: VoxelDataType = createVoxelDataArray(gridSize);
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            // Ensure inner arrays exist before accessing z
            if (!data[x]?.[y]) continue;
            for (let z = 0; z < gridSize; z++) {
                // Use nullish coalescing for safety
                copy[x][y][z] = data[x][y][z] ?? null;
            }
        }
    }
    return copy;
}


/**
 * Compares two voxel data sets and returns a similarity score (Jaccard Index).
 * @param data1 First voxel data array.
 * @param data2 Second voxel data array.
 * @param gridSize The grid size (must be the same for both data sets).
 * @returns Similarity score (0.0 to 1.0), or 0.0 if inputs are invalid.
 */
function compareVoxelData(
    data1: VoxelDataType | null,
    data2: VoxelDataType | null,
    gridSize: number
): number {
    if (!data1 || !data2 || gridSize <= 0) {
        console.warn("compareVoxelData: Invalid input data or grid size.");
        // If both are null, they are identical? Or should we return 0?
        // Let's return 1.0 if both are null, 0.0 otherwise if one is null.
        if (data1 === null && data2 === null) return 1.0;
        return 0.0;
    }

    let matchingVoxels = 0;
    let totalData1Voxels = 0;
    let totalData2Voxels = 0;

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                // Safe access using optional chaining and nullish coalescing
                const voxel1 = data1[x]?.[y]?.[z] ?? null;
                const voxel2 = data2[x]?.[y]?.[z] ?? null;

                const hasVoxel1 = voxel1 !== null;
                const hasVoxel2 = voxel2 !== null;

                if (hasVoxel1) totalData1Voxels++;
                if (hasVoxel2) totalData2Voxels++;

                // Count as match if both have a voxel (ignoring color for now)
                if (hasVoxel1 && hasVoxel2) {
                    matchingVoxels++;
                }
            }
        }
    }

    const union = totalData1Voxels + totalData2Voxels - matchingVoxels;
    if (union === 0) {
        // If union is 0, both must be empty (or identical non-empty, covered by matchingVoxels/union)
        return 1.0;
    }

    const similarity = matchingVoxels / union;
    console.log(`Comparison: Matches=${matchingVoxels}, Data1Total=${totalData1Voxels}, Data2Total=${totalData2Voxels}, Union=${union}, Similarity=${similarity}`);
    return similarity;
}

// --- End Helper Functions ---


/**
 * Handles request to run Python code for rendering.
 * Modifies the main worker state.
 */
async function executeCode(data: { code: string }) {
     try {
        // This function updates the main state.voxelData and triggers mesh updates via runPythonCode
        await runPythonCode(state, data.code);
        self.postMessage({ type: 'runPythonCode', status: 'success' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Code execution failed:", message);
        self.postMessage({ type: 'error', message: `Code execution failed: ${message}` });
    }
}

/**
 * Handles request to evaluate similarity between two code snippets.
 * Temporarily modifies worker state but restores it. Sends back similarity score.
 */
async function handleEvaluateChallenge(data: { targetCode: string; userCode: string }) {
    if (!state.interpreter || !state.voxelData || state.gridSize <= 0) {
        self.postMessage({ type: 'challengeResult', status: 'error', message: 'Worker not ready or grid not initialized.' });
        return;
    }

    console.log("Evaluating challenge...");
    let originalVoxelData: VoxelDataType | null = null;
    let targetResultData: VoxelDataType | null = null;
    let userResultData: VoxelDataType | null = null;

    try {
        // 1. Save current state
        originalVoxelData = deepCopyVoxelData(state.voxelData, state.gridSize);

        // 2. Run target code (modifies state.voxelData)
        console.log("Running target code for comparison...");
        await runPythonCode(state, data.targetCode);
        // 3. Copy target result
        targetResultData = deepCopyVoxelData(state.voxelData, state.gridSize);

        // 4. Restore original state (important!)
        console.log("Restoring original state after target run...");
        state.voxelData = deepCopyVoxelData(originalVoxelData, state.gridSize); // Restore data
        if (state.voxelData) {
             updateVoxelMesh(state); // Update mesh to reflect restored state visually (optional but good practice)
        } else {
             resetVoxelData(state); // Or reset if original was null
             updateVoxelMesh(state);
        }


        // 5. Run user code (modifies state.voxelData again)
        console.log("Running user code for comparison...");
        await runPythonCode(state, data.userCode);
        // 6. Copy user result
        userResultData = deepCopyVoxelData(state.voxelData, state.gridSize);

        // 7. Restore original state AGAIN (important!)
        console.log("Restoring original state after user run...");
        state.voxelData = deepCopyVoxelData(originalVoxelData, state.gridSize); // Restore data
         if (state.voxelData) {
             updateVoxelMesh(state); // Update mesh again
        } else {
             resetVoxelData(state);
             updateVoxelMesh(state);
        }

        // 8. Compare results
        const similarity = compareVoxelData(targetResultData, userResultData, state.gridSize);

        // 9. Send result back
        self.postMessage({
            type: 'challengeResult',
            status: 'success',
            similarity: similarity // Send back the score (0.0 to 1.0)
        });
        console.log(`Challenge evaluation complete. Similarity: ${similarity}`);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Challenge evaluation failed:", message);
        self.postMessage({ type: 'challengeResult', status: 'error', message: `Challenge evaluation failed: ${message}` });

        // Attempt to restore original state even on error
        if (originalVoxelData) {
            console.log("Attempting state restore after error...");
            state.voxelData = deepCopyVoxelData(originalVoxelData, state.gridSize);
             if (state.voxelData) {
                 updateVoxelMesh(state);
            } else {
                 resetVoxelData(state);
                 updateVoxelMesh(state);
            }
        }
    }
}


/**
 * Cleans up resources when the worker is terminated.
 */
function terminate() {
    console.log("Terminating worker...");
    try {
        stopRenderLoop();

        // Dispose resources managed by modules
        disposeThreeResources(state); // Dispose renderer, scene children (lights/helpers), controls
        disposeVoxelResources(state); // Dispose voxel mesh geometry/material
        proxyManager.dispose(); // Clean up proxy manager if needed

        // Clean up interpreter? jsPython doesn't have an explicit dispose, rely on GC
        state.interpreter = null;

        // Clear remaining state references
        // Use type assertion to allow setting to null
        Object.keys(state).forEach(key => (state as any)[key] = null);

        self.postMessage({ type: 'terminate', status: 'success' });
        console.log("Worker terminated successfully.");
        self.close(); // Close the worker context
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Termination failed:", message);
        self.postMessage({ type: 'error', message: `Termination failed: ${message}` });
        // Still attempt to close even if cleanup fails
        self.close();
    }
}

// Main message handler for the worker
self.onmessage = async (event: MessageEvent) => {
    const { type, ...data } = event.data;

    console.log(`Worker received message: ${type}`, data);

    switch (type) {
        case 'makeProxy':
            proxyManager.makeProxy(data);
            break;
        case 'event':
            proxyManager.handleEvent(data);
            break;
        case 'start':
            init(data);
            break;
        case 'resize':
            resize(data);
            break;
        case 'runPythonCode': // For regular execution and rendering
            await executeCode(data);
            break;
        case 'evaluateChallenge': // New message type for challenge comparison
            await handleEvaluateChallenge(data); // Call the new handler
            break;
        case 'terminate':
            terminate();
            break;
        default:
            console.warn(`Unknown message type received: ${type}`);
            self.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
    }
};

// Signal that the worker is ready to receive messages
console.log("Canvas worker script loaded and ready.");
self.postMessage({ type: 'ready' });