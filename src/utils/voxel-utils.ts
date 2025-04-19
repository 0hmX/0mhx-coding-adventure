import * as THREE from 'three';
import type { WorkerState } from '../workers/canvas'; // Assuming state type is defined in main worker file

// Define Voxel Data Type (can be shared or defined here if not already shared)
type VoxelDataType = (string | null)[][][];

// Define face data for voxel geometry generation
export const VoxelFaces = [
    { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] }, // left
    { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] }, // right
    { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] }, // bottom
    { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] }, // top
    { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] }, // back
    { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] }, // front
];

/**
 * Creates and initializes a 3D array for voxel data.
 * @param gridSize The size of the grid (width, height, depth).
 * @returns A new VoxelDataType array filled with null.
 */
export function createVoxelDataArray(gridSize: number): VoxelDataType {
    const data: VoxelDataType = [];
    for (let x = 0; x < gridSize; x++) {
        data[x] = [];
        for (let y = 0; y < gridSize; y++) {
            data[x][y] = [];
            for (let z = 0; z < gridSize; z++) {
                data[x][y][z] = null; // Initialize with null (empty)
            }
        }
    }
    return data;
}

/**
 * Helper function to safely get voxel data from state
 */
export function getVoxelColor(state: WorkerState, x: number, y: number, z: number): string | null {
    const { gridSize, voxelData } = state;
    if (!voxelData || x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
        return null; // Out of bounds or not initialized
    }
    // Ensure indices are valid before accessing
    return voxelData[x]?.[y]?.[z] ?? null;
}

/**
 * Generates BufferGeometry for the current voxel state
 */
export function generateVoxelGeometry(state: WorkerState): THREE.BufferGeometry {
    const { gridSize, voxelData } = state;
    if (!voxelData) {
        // Return an empty geometry instead of throwing an error
        console.warn("generateVoxelGeometry called with uninitialized voxelData.");
        return new THREE.BufferGeometry();
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
                const voxelColorStr = getVoxelColor(state, x, y, z);

                if (voxelColorStr) { // If there's a voxel here
                    try {
                        tempColor.set(voxelColorStr); // Parse the color string
                    } catch (e) {
                        console.warn(`Invalid color "${voxelColorStr}" at (${x},${y},${z}), using default green.`);
                        tempColor.set(0x00ff00); // Default to green on error
                    }

                    // Check all 6 faces
                    for (const { dir, corners } of VoxelFaces) {
                        const neighborColor = getVoxelColor(state, x + dir[0], y + dir[1], z + dir[2]);

                        if (!neighborColor) { // If neighbor is empty or out of bounds, add this face
                            const ndx = positions.length / 3;
                            for (const pos of corners) {
                                // Apply centering offset here
                                positions.push(pos[0] + x - centerOffset, pos[1] + y - centerOffset, pos[2] + z - centerOffset);
                                normals.push(...dir);
                                colors.push(tempColor.r, tempColor.g, tempColor.b);
                            }
                            // Add indices for the two triangles forming the quad face
                            indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                        }
                    }
                }
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    // Set attributes only if there's data
    if (positions.length > 0) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere(); // Compute bounds if geometry is not empty
    } else {
        // Ensure an empty geometry still has a bounding sphere if needed elsewhere
        geometry.boundingSphere = new THREE.Sphere();
    }


    return geometry;
}

/**
 * Updates the voxel mesh in the scene based on current voxelData in state
 */
export function updateVoxelMesh(state: WorkerState) {
    if (!state.scene) {
        console.warn("updateVoxelMesh called before scene is initialized.");
        return;
    }

    // Remove and dispose old mesh if it exists
    disposeVoxelResources(state); // Use the dedicated dispose function

    // Generate new geometry using the state
    const geometry = generateVoxelGeometry(state);

    // Create new mesh only if geometry has vertices
    if (geometry.index && geometry.index.count > 0) {
        // Use MeshLambertMaterial for vertex colors and lighting interaction
        const material = new THREE.MeshLambertMaterial({ vertexColors: true });
        state.voxelMesh = new THREE.Mesh(geometry, material);
        state.scene.add(state.voxelMesh);
        console.log(`Voxel mesh updated with ${geometry.index.count / 3} faces.`);
    } else {
        geometry.dispose(); // Dispose the empty geometry
        state.voxelMesh = null; // Ensure state reflects no mesh
        console.log("Voxel mesh updated (empty).");
    }
}

/**
 * Resets the voxel data in the worker state.
 * @param state The worker state.
 */
export function resetVoxelData(state: WorkerState) {
    if (state.gridSize > 0) {
        console.log(`Resetting voxel data for grid size: ${state.gridSize}`);
        state.voxelData = createVoxelDataArray(state.gridSize); // Use the helper function
        // Update the mesh to reflect the reset (will become empty)
        updateVoxelMesh(state);
    } else {
        console.warn("Cannot reset voxel data: Grid size is not positive.");
        state.voxelData = null;
        // Also update the mesh if grid size is invalid
        updateVoxelMesh(state);
    }
}

/**
 * Disposes the geometry and material of the voxel mesh if it exists.
 */
export function disposeVoxelResources(state: WorkerState) {
    if (state.voxelMesh) {
        console.log("Disposing voxel mesh resources...");
        // Remove from scene first
        state.scene?.remove(state.voxelMesh);

        // Dispose geometry
        state.voxelMesh.geometry?.dispose();

        // Dispose material(s)
        if (Array.isArray(state.voxelMesh.material)) {
            state.voxelMesh.material.forEach(m => m.dispose());
        } else {
            state.voxelMesh.material?.dispose();
        }

        // Clear the reference in state
        state.voxelMesh = null;
        console.log("Disposed voxel mesh resources.");
    }
}