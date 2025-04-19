import { Interpreter, jsPython } from '../../submodules/jspython/src/interpreter';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import functions and classes from other modules
import { proxyManager, type ElementProxyReceiver } from '../lib/proxy';
import { initializeThree, initializeControls, addSceneExtras, handleResize, disposeThreeResources } from '../lib/three-setup';
// Assuming disposeVoxelResources exists or will be added in voxel-utils.ts
import { updateVoxelMesh, resetVoxelData, disposeVoxelResources } from '../utils/voxel-utils';
import { runPythonCode } from '../lib/python-runner';

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

/**
 * Handles request to run Python code.
 */
async function executeCode(data: { code: string }) {
     try {
        await runPythonCode(state, data.code);
        self.postMessage({ type: 'runPythonCode', status: 'success' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Code execution failed:", message);
        // Ensure the error message includes specifics (syntax vs runtime)
        self.postMessage({ type: 'error', message: `Code execution failed: ${message}` });
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
        case 'runPythonCode':
            await executeCode(data); // Ensure await here
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