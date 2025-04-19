import { Interpreter, jsPython } from '../../submodules/jspython/src/interpreter'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {EventDispatcher} from 'three'

function noop() {}

class ElementProxyReceiver extends EventDispatcher {
    style: any;
    left: number = 0;
    top: number = 0;
    width: number = 0;
    height: number = 0;
    ownerDocument: any;

    constructor() {
        super();
        // because OrbitControls try to set style.touchAction;
        this.style = {};

        // Add ownerDocument with defaultView for OrbitControls
        this.ownerDocument = {
            defaultView: self
        };
    }

    get clientWidth() {
        return this.width;
    }

    get clientHeight() {
        return this.height;
    }

    // OrbitControls call these as of r132
    setPointerCapture() { }
    releasePointerCapture() { }

    // Add getRootNode method for OrbitControls
    getRootNode() {
        return this;
    }

    getBoundingClientRect() {
        return {
            left: this.left,
            top: this.top,
            width: this.width,
            height: this.height,
            right: this.left + this.width,
            bottom: this.top + this.height,
        };
    }

    handleEvent(data) {
        if (data.type === 'size') {
            this.left = data.left;
            this.top = data.top;
            this.width = data.width;
            this.height = data.height;
            return;
        }

        data.preventDefault = noop;
        data.stopPropagation = noop;
        // @ts-ignore
        this.dispatchEvent(data);
    }

    focus() {
        // no-op
    }
}

class ProxyManager {
    targets: Record<any, any>

	constructor() {

		this.targets = {};
		this.handleEvent = this.handleEvent.bind( this );

	}
	makeProxy( data ) {

		const { id } = data;
		const proxy = new ElementProxyReceiver();
		this.targets[ id ] = proxy;

	}
	getProxy( id ) {

		return this.targets[ id ];

	}
	handleEvent( data ) {

		this.targets[ data.id ].handleEvent( data.data );

	}

}

const proxyManager = new ProxyManager();

function start( data ) {
    console.log(data);

	const proxy = proxyManager.getProxy( data.canvasId );
	proxy.ownerDocument = proxy; // HACK!
    console.log('Starting worker with proxy:', proxy, proxyManager);

    // @ts-ignore
	self.document = {}; // HACK!
	init({
		canvas: data.canvas,
		inputElement: proxy,
        ...data
	} );

}

function makeProxy( data ) {

	proxyManager.makeProxy( data );

}

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
  "div": (x: number, y: number) => x / y,
  "range": (start: number, stop: number, step: number) => {
    const result = [];
    for (let i = start; i < stop; i += step) {
      result.push(i);
    }
    return result;
  },
  "len": (x: any) => x.length,
  "1e": Math.E,
  "EULER": Math.E,
  "TAU": Math.PI * 2,
};

// Define face data for voxel geometry generation
const VoxelFaces = [
    { // left
        dir: [ -1, 0, 0 ],
        corners: [ [ 0, 1, 0 ], [ 0, 0, 0 ], [ 0, 1, 1 ], [ 0, 0, 1 ] ],
    },
    { // right
        dir: [ 1, 0, 0 ],
        corners: [ [ 1, 1, 1 ], [ 1, 0, 1 ], [ 1, 1, 0 ], [ 1, 0, 0 ] ],
    },
    { // bottom
        dir: [ 0, -1, 0 ],
        corners: [ [ 1, 0, 1 ], [ 0, 0, 1 ], [ 1, 0, 0 ], [ 0, 0, 0 ] ],
    },
    { // top
        dir: [ 0, 1, 0 ],
        corners: [ [ 0, 1, 1 ], [ 1, 1, 1 ], [ 0, 1, 0 ], [ 1, 1, 0 ] ],
    },
    { // back
        dir: [ 0, 0, -1 ],
        corners: [ [ 1, 0, 0 ], [ 0, 0, 0 ], [ 1, 1, 0 ], [ 0, 1, 0 ] ],
    },
    { // front
        dir: [ 0, 0, 1 ],
        corners: [ [ 0, 0, 1 ], [ 1, 0, 1 ], [ 0, 1, 1 ], [ 1, 1, 1 ] ],
    },
];


/**
 * State interface for the worker
 */
type State = {
    three: THREE.WebGLRenderer | null,
    interpreter: Interpreter | null,
    scene: THREE.Scene | null,
    camera: THREE.PerspectiveCamera | null,
    controls: OrbitControls | null,
    animationFrameId: number | null,
    // Store voxel data: null = empty, string = color
    voxelData: (string | null)[][][] | null,
    voxelMesh: THREE.Mesh | null, // Single mesh for all voxels
    gridSize: number, // Store grid size
    canvasId: number | null,
    eventTarget: EventTarget | null,
}

const state: State = {
    three: null,
    interpreter: null,
    scene: null,
    camera: null,
    controls: null,
    animationFrameId: null,
    voxelData: null, // Initialize voxelData
    voxelMesh: null, // Initialize voxelMesh
    gridSize: 0, // Initialize gridSize
    canvasId: null,
    eventTarget: null
}

/**
 * Initializes the worker with canvas and other required parameters
 * @param {Object} data - Initialization data
 * @param {OffscreenCanvas} data.canvas - The offscreen canvas
 * @param {number} data.width - Canvas width
 * @param {number} data.height - Canvas height
 * @param {number} data.gridSize - Size of the grid
 * @param {number} data.canvasId - ID of the canvas proxy
 * @param {boolean} data.enableOrbitControls - Whether to enable orbit controls
 */
function init(data: any) {
    try {
        const { canvas, width, height, gridSize, canvasId, enableOrbitControls = true, inputElement } = data

        // Store canvas ID and grid size
        state.canvasId = canvasId;
        state.gridSize = gridSize; // Store gridSize

        // Initialize interpreter
        state.interpreter = jsPython()

        // Initialize Three.js renderer
        state.three = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        })
        state.three.setSize(width, height, false)
        state.three.setClearColor(0x000000, 0)

        // Create scene and camera
        state.scene = new THREE.Scene()
        state.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)

        // Position camera
        const cameraDistance = Math.max(15, gridSize * 1.5); // Adjust camera distance based on grid size
        state.camera.position.set(cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7);
        state.camera.lookAt(0, 0, 0);

        // Initialize orbit controls
        if (enableOrbitControls && state.camera && inputElement) {
            // Add missing methods to inputElement to make OrbitControls work
            inputElement.getRootNode = () => inputElement;
            inputElement.ownerDocument = {
                defaultView: self
            };

            state.controls = new OrbitControls(state.camera, inputElement);
            state.controls.enableDamping = true;
            state.controls.dampingFactor = 0.25;
            state.controls.screenSpacePanning = false;
            state.controls.maxPolarAngle = Math.PI / 1.5;
            state.controls.minDistance = 5;
            state.controls.maxDistance = Math.max(50, gridSize * 3); // Adjust max distance
            state.controls.target.set(0, 0, 0); // Center target
            state.controls.update();
        }

        // Initialize voxel data array
        state.voxelData = Array(gridSize).fill(null).map(() =>
            Array(gridSize).fill(null).map(() =>
                Array(gridSize).fill(null)
            )
        );

        // Create initial empty voxel mesh
        updateVoxelMesh();

        // Start render loop
        startRenderLoop()

        // Send success message
        self.postMessage({ type: 'init', status: 'success' })
    } catch (error) {
        self.postMessage({ type: 'error', message: `Initialization failed: ${error.message}` })
    }
}

// --- Removed initializeCubes function ---

/**
 * Helper function to safely get voxel data
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {string | null} Color string or null if empty/out of bounds
 */
function getVoxelColor(x: number, y: number, z: number): string | null {
    const { gridSize, voxelData } = state;
    if (!voxelData || x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
        return null; // Out of bounds or not initialized
    }
    return voxelData[x][y][z];
}

/**
 * Generates BufferGeometry for the current voxel state
 * @returns {THREE.BufferGeometry}
 */
function generateVoxelGeometry(): THREE.BufferGeometry {
    const { gridSize, voxelData } = state;
    if (!voxelData) {
        throw new Error("Voxel data not initialized");
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const tempColor = new THREE.Color(); // Reuse color object

    const centerOffset = gridSize / 2 - 0.5; // Offset to center the grid at origin

    for (let y = 0; y < gridSize; ++y) {
        for (let z = 0; z < gridSize; ++z) {
            for (let x = 0; x < gridSize; ++x) {
                const voxelColorStr = getVoxelColor(x, y, z);

                if (voxelColorStr) { // If there's a voxel here
                    try {
                        tempColor.set(voxelColorStr); // Parse the color string
                    } catch (e) {
                        console.warn(`Invalid color "${voxelColorStr}" at (${x},${y},${z}), using default green.`);
                        tempColor.set(0x00ff00); // Default to green on error
                    }

                    // Check all 6 faces
                    for (const { dir, corners } of VoxelFaces) { // <-- This should now be found
                        const neighborColor = getVoxelColor(x + dir[0], y + dir[1], z + dir[2]);

                        if (!neighborColor) { // If neighbor is empty, add this face
                            const ndx = positions.length / 3; // Starting index for vertices of this face

                            for (const pos of corners) {
                                // Add position, offset to center grid
                                positions.push(pos[0] + x - centerOffset, pos[1] + y - centerOffset, pos[2] + z - centerOffset);
                                // Add normal
                                normals.push(...dir);
                                // Add vertex color
                                colors.push(tempColor.r, tempColor.g, tempColor.b);
                            }

                            // Add indices for the two triangles forming the face
                            indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                        }
                    }
                }
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // Add color attribute
    geometry.setIndex(indices);

    // Optional: Compute bounding sphere for frustum culling
    if (indices.length > 0) {
       geometry.computeBoundingSphere();
    } else {
       // Ensure bounding sphere is created even for empty geometry to avoid errors
       geometry.boundingSphere = new THREE.Sphere();
    }


    return geometry;
}

/**
 * Updates the voxel mesh in the scene based on current voxelData
 */
function updateVoxelMesh() {
    if (!state.scene) return;

    // Remove and dispose old mesh if it exists
    if (state.voxelMesh) {
        state.scene.remove(state.voxelMesh);
        state.voxelMesh.geometry.dispose();
        // Assuming material is shared or simple, otherwise dispose material too
        if (Array.isArray(state.voxelMesh.material)) {
             state.voxelMesh.material.forEach(m => m.dispose());
        } else {
             state.voxelMesh.material.dispose();
        }
        state.voxelMesh = null;
    }

    // Generate new geometry
    const geometry = generateVoxelGeometry();

    // Create new mesh only if geometry has vertices
    if (geometry.index && geometry.index.count > 0) {
        // Use a material that supports vertex colors
        const material = new THREE.MeshLambertMaterial({ vertexColors: true });
        state.voxelMesh = new THREE.Mesh(geometry, material);
        state.scene.add(state.voxelMesh);
    } else {
        // If geometry is empty, dispose it immediately
        geometry.dispose();
    }
}


/**
 * Handles canvas resize events
 * @param {Object} data - Resize data
 * @param {number} data.width - New width
 * @param {number} data.height - New height
 */
function resize(data: any) {
    // ... (resize logic remains largely the same) ...
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

    // Add lights for MeshLambertMaterial
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5); // Soft ambient light
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional light
    directionalLight.position.set(1, 1, 0.5).normalize();
    state.scene.add(directionalLight);


    // Add axis helper
    const axisHelper = new THREE.AxesHelper(Math.max(10, state.gridSize / 2 + 2)); // Scale helper
    state.scene.add(axisHelper)

    // Add grid helper
    const gridHelperSize = Math.max(20, state.gridSize + 4); // Scale helper grid
    const gridHelper = new THREE.GridHelper(gridHelperSize, gridHelperSize, 0x888888, 0x444444)
    gridHelper.position.y = -state.gridSize / 2 - 0.5; // Position below the voxel grid
    state.scene.add(gridHelper)

    const animate = (timestamp: number) => {
        state.animationFrameId = self.requestAnimationFrame(animate)

        // Update orbit controls if available
        if (state.controls) {
            state.controls.update();
        }

        // --- Removed updateAnimations call ---

        // Render the scene
        state.three!.render(state.scene!, state.camera!)
    }

    animate(performance.now())
}

// --- Removed updateAnimations function ---
// --- Removed animateCubeAppearance function ---
// --- Removed waitForAnimations function ---
// --- Removed advanceAnimationFrames function ---


/**
 * Stops the render loop
 */
function stopRenderLoop() {
    // ... (stopRenderLoop logic remains the same) ...
    if (state.animationFrameId !== null) {
        self.cancelAnimationFrame(state.animationFrameId)
        state.animationFrameId = null
    }
}

/**
 * Runs Python code and generates 3D voxel geometry
 * @param {Object} data - Code execution data
 * @param {string} data.code - Python code to execute
 * @param {number} data.gridSize - Size of the grid (already stored in state, but passed for consistency)
 * @returns {Promise<void>} Promise that resolves when execution is complete
 */
async function runPythonCode(data: any): Promise<void> {
    try {
        const { code } = data // gridSize is now in state
        const { interpreter, scene, voxelData, gridSize } = state;

        if (!interpreter || !scene || !voxelData) {
            throw new Error('Interpreter, scene, or voxelData not initialized')
        }

        // Reset voxel data to empty (null)
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    voxelData[x][y][z] = null;
                }
            }
        }

        // --- Removed animation state reset ---

        // Parse the Python code once
        const codeAst = interpreter.parse(code)

        // --- Removed coordinate sorting and batching ---

        // Evaluate Python code for each coordinate
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    try {
                        const result = interpreter.eval(codeAst, context, ["draw", x, y, z, gridSize]);

                        // Update voxelData based on result
                        if (typeof result === 'string') {
                            // Use the string as color
                            voxelData[x][y][z] = result;
                        } else if (result === true) {
                            // Use default color for true
                            voxelData[x][y][z] = '#00ff00'; // Default green
                        } else {
                            // false, null, undefined, or other types result in empty voxel
                            voxelData[x][y][z] = null;
                        }

                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        // Report error but continue processing other voxels
                        console.error(`Error evaluating Python code at (${x},${y},${z}): ${error.message}`);
                        self.postMessage({ type: 'warning', message: `Code evaluation error at (${x},${y},${z}): ${error.message}` });
                        voxelData[x][y][z] = null; // Ensure voxel is empty on error
                    }
                }
                 // Yield control briefly to prevent blocking the worker thread for too long
                 if (y % 4 === 0) { // Adjust frequency as needed
                     await new Promise(resolve => setTimeout(resolve, 0));
                 }
            }
        }

        // Regenerate the entire voxel mesh based on the updated voxelData
        updateVoxelMesh();

        // --- Removed waiting for animations ---

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
        if (state.voxelMesh) {
            state.scene?.remove(state.voxelMesh);
            state.voxelMesh.geometry.dispose();
             if (Array.isArray(state.voxelMesh.material)) {
                 state.voxelMesh.material.forEach(m => m.dispose());
            } else {
                 state.voxelMesh.material.dispose();
            }
        }
        if (state.three) {
            state.three.dispose()
        }

        // Clear state
        state.three = null
        state.interpreter = null
        state.scene = null
        state.camera = null
        state.controls = null // Dispose controls if needed? OrbitControls doesn't have a dispose method.
        state.voxelData = null
        state.voxelMesh = null

        self.postMessage({ type: 'terminate', status: 'success' })
    } catch (error) {
        self.postMessage({ type: 'error', message: `Termination failed: ${error.message}` })
    }
}

const handler = { init, resize, runPythonCode, terminate,
    start,
    makeProxy,
	event: proxyManager.handleEvent,
 }

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