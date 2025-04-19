import * as THREE from 'three';
import type { WorkerState } from '../workers/canvas'; // Assuming state type is defined in main worker file

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
 * Helper function to safely get voxel data from state
 */
export function getVoxelColor(state: WorkerState, x: number, y: number, z: number): string | null {
    const { gridSize, voxelData } = state;
    if (!voxelData || x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
        return null; // Out of bounds or not initialized
    }
    return voxelData[x][y][z];
}

/**
 * Generates BufferGeometry for the current voxel state
 */
export function generateVoxelGeometry(state: WorkerState): THREE.BufferGeometry {
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

                        if (!neighborColor) { // If neighbor is empty, add this face
                            const ndx = positions.length / 3;
                            for (const pos of corners) {
                                positions.push(pos[0] + x - centerOffset, pos[1] + y - centerOffset, pos[2] + z - centerOffset);
                                normals.push(...dir);
                                colors.push(tempColor.r, tempColor.g, tempColor.b);
                            }
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
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    if (indices.length > 0) {
        geometry.computeBoundingSphere();
    } else {
        geometry.boundingSphere = new THREE.Sphere();
    }

    return geometry;
}

/**
 * Updates the voxel mesh in the scene based on current voxelData in state
 */
export function updateVoxelMesh(state: WorkerState) {
    if (!state.scene) return;

    // Remove and dispose old mesh if it exists
    if (state.voxelMesh) {
        state.scene.remove(state.voxelMesh);
        state.voxelMesh.geometry.dispose();
        if (Array.isArray(state.voxelMesh.material)) {
            state.voxelMesh.material.forEach(m => m.dispose());
        } else {
            state.voxelMesh.material.dispose();
        }
        state.voxelMesh = null;
    }

    // Generate new geometry using the state
    const geometry = generateVoxelGeometry(state);

    // Create new mesh only if geometry has vertices
    if (geometry.index && geometry.index.count > 0) {
        const material = new THREE.MeshLambertMaterial({ vertexColors: true });
        state.voxelMesh = new THREE.Mesh(geometry, material);
        state.scene.add(state.voxelMesh);
        console.log(`Voxel mesh updated with ${geometry.index.count / 3} faces.`);
    } else {
        geometry.dispose(); // Dispose empty geometry
        console.log("Voxel mesh updated (empty).");
    }
}

/**
 * Resets the voxel data array in the state to all null.
 */
export function resetVoxelData(state: WorkerState) {
    const { gridSize } = state;
    if (!state.voxelData || state.voxelData.length !== gridSize) {
        // Initialize if not present or wrong size
        state.voxelData = Array(gridSize).fill(null).map(() =>
            Array(gridSize).fill(null).map(() =>
                Array(gridSize).fill(null)
            )
        );
    } else {
        // Reset existing array
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    state.voxelData[x][y][z] = null;
                }
            }
        }
    }
    console.log(`Voxel data reset for grid size ${gridSize}`);
}

/**
 * Disposes the geometry and material of the voxel mesh.
 */
export function disposeVoxelResources(state: WorkerState) {
    if (state.voxelMesh) {
        console.log("Disposing voxel mesh resources...");
        state.voxelMesh.geometry?.dispose();
        if (Array.isArray(state.voxelMesh.material)) {
            state.voxelMesh.material.forEach(m => m.dispose());
        } else {
            state.voxelMesh.material?.dispose();
        }
        // Remove reference from state after disposal
        state.voxelMesh = null;
    } else {
        console.log("No voxel mesh resources to dispose.");
    }
}