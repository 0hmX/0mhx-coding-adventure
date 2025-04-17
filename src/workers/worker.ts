import { Interpreter, jsPython } from '../../submodules/jspython/src/interpreter'
import * as THREE from 'three'

/**
 * Context object containing built-in functions and constants available to Python code
 */
const context = {
  "True": true,
  "False": false,
  "print": (...args: unknown[]) => {
    console.log('Python print:', ...args);
  },
  "max": Math.max,
  "min": Math.min,
  "abs": Math.abs,
  "round": Math.round,
  "floor": Math.floor,
  "ceil": Math.ceil,
  "random": Math.random,
  "sqrt": Math.sqrt,
  "sin": Math.sin,
  "cos": Math.cos,
  "tan": Math.tan,
  "asin": Math.asin,
  "acos": Math.acos,
  "atan": Math.atan,
  "atan2": Math.atan2,
  "pow": Math.pow,
  "log": Math.log,
  "exp": Math.exp,
  "log10": Math.log10,
  "log2": Math.log2,
  "log1p": Math.log1p,
  "hypot": Math.hypot,
  "PI": Math.PI,
  "E": Math.E,
  "LN2": Math.LN2,
  "LN10": Math.LN10,
  "LOG2E": Math.LOG2E,
  "LOG10E": Math.LOG10E,
  "SQRT1_2": Math.SQRT1_2,
  "SQRT2": Math.SQRT2,
  "mod": (x: number, y: number) => x % y,
};

/**
 * State interface for the worker
 */
type State = {
    three: THREE.WebGLRenderer | null,
    interpreter: Interpreter | null,
    scene: THREE.Scene | null,
    camera: THREE.PerspectiveCamera | null,
    animationFrameId: number | null,
    cubes: THREE.Mesh[][][] | null,  // Array to store cube references
    animatingCubes: {mesh: THREE.Mesh, targetScale: THREE.Vector3, startTime: number, progress: number}[], // Track currently animating cubes
    isAnimating: boolean, // Flag to track if animations are in progress
    animationResolve: (() => void) | null, // Resolver function for animation completion
    lastTimestamp: number // Last animation timestamp
}

const state: State = {
    three: null,
    interpreter: null,
    scene: null,
    camera: null,
    animationFrameId: null,
    cubes: null,
    animatingCubes: [],
    isAnimating: false,
    animationResolve: null,
    lastTimestamp: 0
}

/**
 * Initializes the worker with canvas and other required parameters
 * @param {Object} data - Initialization data
 * @param {OffscreenCanvas} data.canvas - The offscreen canvas
 * @param {number} data.width - Canvas width
 * @param {number} data.height - Canvas height
 * @param {number} data.gridSize - Size of the grid
 */
function init(data: any) {
    try {
        const { canvas, width, height, gridSize } = data
        
        // Initialize interpreter
        state.interpreter = jsPython()
        
        // Initialize Three.js renderer with offscreen canvas
        state.three = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        })
        state.three.setSize(width, height, false)
        
        // Create scene and camera
        state.scene = new THREE.Scene()
        state.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        state.camera.position.z = 15
        
        // Initialize cubes array
        initializeCubes(gridSize)
        
        // Start render loop
        startRenderLoop()
        
        // Send success message back to main thread
        self.postMessage({ type: 'init', status: 'success' })
    } catch (error) {
        self.postMessage({ type: 'error', message: `Initialization failed: ${error.message}` })
    }
}

/**
 * Initializes all cubes in the grid and sets them to invisible
 * @param {number} gridSize - Size of the grid
 */
function initializeCubes(gridSize: number) {
    if (!state.scene) {
        throw new Error('Scene not initialized')
    }
    
    // Create a geometry and material that will be reused
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    
    // Initialize 3D array to store cube references
    state.cubes = Array(gridSize).fill(null).map(() => 
        Array(gridSize).fill(null).map(() => 
            Array(gridSize).fill(null)
        )
    )
    
    // Create all cubes and add them to the scene
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                const cube = new THREE.Mesh(geometry, material.clone())
                cube.position.set(x - gridSize/2, y - gridSize/2, z - gridSize/2)
                cube.visible = false // Initially invisible
                cube.scale.set(0, 0, 0) // Start with zero scale for animation
                state.scene.add(cube)
                state.cubes[x][y][z] = cube
            }
        }
    }
}

/**
 * Handles canvas resize events
 * @param {Object} data - Resize data
 * @param {number} data.width - New width
 * @param {number} data.height - New height
 */
function resize(data: any) {
    try {
        const { width, height } = data
        if (!state.three || !state.camera) {
            throw new Error('Renderer or camera not initialized')
        }
        
        state.three.setSize(width, height, false)
        state.camera.aspect = width / height
        state.camera.updateProjectionMatrix()
        
        self.postMessage({ type: 'resize', status: 'success' })
    } catch (error) {
        self.postMessage({ type: 'error', message: `Resize failed: ${error.message}` })
    }
}

/**
 * Starts the render loop
 */
function startRenderLoop() {
    if (!state.three || !state.scene || !state.camera) {
        self.postMessage({ type: 'error', message: 'Cannot start render loop: renderer, scene, or camera not initialized' })
        return
    }
    
    const animate = (timestamp: number) => {
        state.animationFrameId = self.requestAnimationFrame(animate)
        state.lastTimestamp = timestamp
        
        // Update animations
        updateAnimations(timestamp)
        
        // Render the scene
        state.three!.render(state.scene!, state.camera!)
    }
    
    animate(performance.now())
}

/**
 * Updates all ongoing animations
 * @param {number} timestamp - Current timestamp
 */
function updateAnimations(timestamp: number) {
    if (!state.animatingCubes.length) {
        // If no more animations and we were waiting for completion, resolve the promise
        if (state.isAnimating && state.animationResolve) {
            state.isAnimating = false;
            state.animationResolve();
            state.animationResolve = null;
        }
        return;
    }
    
    const ANIMATION_DURATION = 500; // Animation duration in milliseconds
    const remainingAnimations = [];
    
    for (const animation of state.animatingCubes) {
        const { mesh, targetScale, startTime, progress: currentProgress } = animation;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        
        // Easing function for smooth animation (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Update scale based on progress
        mesh.scale.x = targetScale.x * eased;
        mesh.scale.y = targetScale.y * eased;
        mesh.scale.z = targetScale.z * eased;
        
        // Keep animation if not complete
        if (progress < 1) {
            remainingAnimations.push({...animation, progress});
        }
    }
    
    // Update the list of ongoing animations
    state.animatingCubes = remainingAnimations;
}

/**
 * Adds a cube to the animation queue
 * @param {THREE.Mesh} cube - The cube to animate
 */
function animateCubeAppearance(cube: THREE.Mesh) {
    cube.visible = true;
    cube.scale.set(0, 0, 0);
    
    state.animatingCubes.push({
        mesh: cube,
        targetScale: new THREE.Vector3(1, 1, 1),
        startTime: state.lastTimestamp || performance.now(),
        progress: 0
    });
    
    // Set animation flag
    state.isAnimating = true;
}

/**
 * Waits for all current animations to complete
 * @returns {Promise<void>} Promise that resolves when animations are complete
 */
function waitForAnimations(): Promise<void> {
    // If no animations are running, resolve immediately
    if (!state.isAnimating || state.animatingCubes.length === 0) {
        return Promise.resolve();
    }
    
    // Otherwise, return a promise that will be resolved when animations complete
    return new Promise<void>((resolve) => {
        state.animationResolve = resolve;
    });
}

/**
 * Manually advances animations by a specified number of frames
 * @param {number} frames - Number of frames to advance
 * @returns {Promise<void>} Promise that resolves when the frames have been processed
 */
async function advanceAnimationFrames(frames: number = 1): Promise<void> {
    if (!state.three || !state.scene || !state.camera) {
        throw new Error('Renderer, scene, or camera not initialized');
    }
    
    // Process the specified number of frames
    for (let i = 0; i < frames; i++) {
        const now = performance.now();
        updateAnimations(now);
        state.three.render(state.scene, state.camera);
        
        // Small delay to allow other processing
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

/**
 * Stops the render loop
 */
function stopRenderLoop() {
    if (state.animationFrameId !== null) {
        self.cancelAnimationFrame(state.animationFrameId)
        state.animationFrameId = null
    }
}

/**
 * Runs Python code and generates 3D objects
 * @param {Object} data - Code execution data
 * @param {string} data.code - Python code to execute
 * @param {number} data.gridSize - Size of the grid
 * @returns {Promise<void>} Promise that resolves when execution is complete
 */
async function runPythonCode(data: any): Promise<void> {
    try {
        const { code, gridSize } = data
        
        if (!state.interpreter || !state.scene || !state.cubes) {
            throw new Error('Interpreter, scene, or cubes not initialized')
        }
        
        // Reset all cubes to invisible
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    if (state.cubes[x][y][z]) {
                        state.cubes[x][y][z].visible = false;
                    }
                }
            }
        }
        
        // Clear any ongoing animations
        state.animatingCubes = [];
        state.isAnimating = false;
        
        // Parse the Python code
        const codeAst = state.interpreter.parse(code)
        
        // Calculate center of grid
        const center = Math.floor(gridSize / 2);
        
        // Create a list of coordinates sorted by distance from center
        const coordinates = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    // Calculate distance from center
                    const distance = Math.sqrt(
                        Math.pow(x - center, 2) + 
                        Math.pow(y - center, 2) + 
                        Math.pow(z - center, 2)
                    );
                    coordinates.push({ x, y, z, distance });
                }
            }
        }
        
        // Sort by distance from center outward
        coordinates.sort((a, b) => a.distance - b.distance);
        
        // Process coordinates in batches
        const animationBatchSize = 15;
        let animationCount = 0;
        
        for (const coord of coordinates) {
            const { x, y, z } = coord;
            
            // Evaluate Python code for this coordinate
            try {
                const result = state.interpreter.eval(codeAst, context, ["draw", x, y, z, gridSize]);
                
                if (result && state.cubes[x][y][z]) {
                    // Queue cube for animation
                    animateCubeAppearance(state.cubes[x][y][z]);
                    animationCount++;
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                throw new Error(`Error at coordinate (${x},${y},${z}): ${error.message}`);
            }
            
            // After each batch, manually advance animations and wait if needed
            if (animationCount >= animationBatchSize) {
                animationCount = 0;
                
                // Manually advance animations by a few frames
                await advanceAnimationFrames(3);
                
                // If too many animations are queued, wait for some to complete
                if (state.animatingCubes.length > 50) {
                    await waitForAnimations();
                }
            }
        }
        
        // Wait for all remaining animations to complete
        await waitForAnimations();
        
        self.postMessage({ type: 'runPythonCode', status: 'success' })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: 'error', message: `Code execution failed: ${errorMessage}` })
    }
}

/**
 * Cleans up resources when worker is terminated
 */
function terminate() {
    try {
        stopRenderLoop()
        
        // Dispose Three.js resources
        if (state.three) {
            state.three.dispose()
        }
        
        // Clear state
        state.three = null
        state.interpreter = null
        state.scene = null
        state.camera = null
        
        self.postMessage({ type: 'terminate', status: 'success' })
    } catch (error) {
        self.postMessage({ type: 'error', message: `Termination failed: ${error.message}` })
    }
}

const handler = { init, resize, runPythonCode, terminate }

/**
 * Message handler for the worker
 */
self.onmessage = (e: any) => {
    const { type } = e.data
    
    if (typeof handler[type] !== 'function') {
        self.postMessage({ type: 'error', message: `Handler not found for type: ${type}` })
        return
    }
    
    try {
        const result = handler[type](e.data)
        
        // Handle promises
        if (result instanceof Promise) {
            result.catch(error => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                self.postMessage({ type: 'error', message: `Promise execution failed: ${errorMessage}` })
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: 'error', message: `Handler execution failed: ${errorMessage}` })
    }
}