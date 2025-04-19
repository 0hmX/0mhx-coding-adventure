import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ElementProxyReceiver } from './proxy';
import type { WorkerState } from '../workers/canvas'; // Assuming state type is defined here

/**
 * Initializes the core Three.js components (Renderer, Scene, Camera).
 */
export function initializeThree(state: WorkerState, canvas: OffscreenCanvas, width: number, height: number) {
    state.three = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });
    state.three.setSize(width, height, false);
    state.three.setClearColor(0x000000, 0); // Transparent background

    state.scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    // Position camera based on grid size
    const cameraDistance = Math.max(15, state.gridSize * 1.5);
    state.camera.position.set(cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7);
    state.camera.lookAt(0, 0, 0); // Look at the center of the grid (origin)

    console.log('Three.js core components initialized.');
}

/**
 * Initializes OrbitControls.
 */
export function initializeControls(state: WorkerState, inputElement: ElementProxyReceiver) {
    if (!state.camera) {
        console.error("Cannot initialize controls: Camera not found.");
        return;
    }
    // OrbitControls needs specific properties on the element
    inputElement.ownerDocument = { defaultView: self }; // Ensure ownerDocument is set

    // Use type assertion 'as any' to satisfy OrbitControls constructor type requirement
    state.controls = new OrbitControls(state.camera, inputElement as any);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.25;
    state.controls.screenSpacePanning = false;
    state.controls.maxPolarAngle = Math.PI / 1.5;
    state.controls.minDistance = 5;
    state.controls.maxDistance = Math.max(50, state.gridSize * 3);
    state.controls.target.set(0, 0, 0); // Center target at the origin
    state.controls.update();
    console.log('OrbitControls initialized.');
}

/**
 * Adds lights and helpers to the scene.
 */
export function addSceneExtras(state: WorkerState) {
    if (!state.scene) {
        console.error("Cannot add extras: Scene not found.");
        return;
    }
    // Lights
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 0.5).normalize();
    state.scene.add(directionalLight);

    // Helpers
    const axisHelper = new THREE.AxesHelper(Math.max(10, state.gridSize / 2 + 2));
    state.scene.add(axisHelper);

    console.log('Scene extras (lights, helpers) added.');
}

/**
 * Handles canvas resize updates for renderer and camera.
 */
export function handleResize(state: WorkerState, width: number, height: number) {
    if (!state.three || !state.camera) {
        console.error('Cannot resize: Renderer or camera not initialized');
        return;
    }
    state.three.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
    console.log(`Resized canvas to ${width}x${height}`);
}

/**
 * Disposes Three.js resources managed in this module.
 */
export function disposeThreeResources(state: WorkerState) {
    // Note: Voxel mesh disposal is handled in voxel-utils
    // Dispose controls? OrbitControls doesn't have an explicit dispose method.
    state.controls = null;

    // Dispose scene children (lights, helpers)
    if (state.scene) {
        while(state.scene.children.length > 0){
            const object = state.scene.children[0];
            // Don't remove the voxel mesh here, it's handled separately
            if (object !== state.voxelMesh) {
                state.scene.remove(object);
                // Dispose geometry/material if necessary for helpers/lights
                if (object instanceof THREE.AxesHelper || object instanceof THREE.GridHelper) {
                    object.geometry?.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material?.dispose();
                    }
                }
                // Lights don't typically need disposal
            } else {
                 // If it's the voxel mesh, break the loop as it's handled elsewhere
                 // Or ensure it's removed last if voxel-utils disposal runs first
                 break; // Assuming voxel-utils disposal runs before this
            }
        }
    }


    if (state.three) {
        state.three.dispose(); // Dispose renderer
        state.three = null;
    }
    state.scene = null;
    state.camera = null;
    console.log('Three.js resources disposed.');
}