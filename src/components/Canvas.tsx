import React, { useRef, useEffect } from 'react';
import { Interpreter } from 'jspython-interpreter';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface CanvasProps {
  width: number;
  height: number;
  /** Represents the desired number of grid cells horizontally. */
  gridSize: number; // Now interpreted as number of cells/divisions
  showGrid: boolean;
  pythonCode: string;
  pythonInterpreter: Interpreter | null;
  shouldRun?: boolean;
  onRunComplete?: () => void;
}

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
}

const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  gridSize,
  showGrid,
  pythonCode,
  pythonInterpreter,
  shouldRun = false,
  onRunComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  // Update the type definition to be more specific about the 3D array structure
  const cubesRef = useRef<Array<Array<Array<THREE.Mesh>>>>([]);
  const isExecutingRef = useRef(false);

  // --- Calculate grid dimensions ---
  const effectiveGridSize = Math.max(1, Math.floor(gridSize));
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Changed to black color
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // Adjusted camera position for better centering
    camera.position.set(
      effectiveGridSize / 2, 
      effectiveGridSize / 2, 
      effectiveGridSize * 1.8
    );
    camera.lookAt(effectiveGridSize / 2, effectiveGridSize / 2, effectiveGridSize / 2);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create grid helper if needed
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(effectiveGridSize, effectiveGridSize);
      // Adjust grid position to fix the 0.5 unit offset
      gridHelper.position.set(effectiveGridSize / 2 , 0, effectiveGridSize / 2 );
      sceneRef.current.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Cleanup function
    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      if (gridHelperRef.current) {
        scene.remove(gridHelperRef.current);
      }
      // Remove all cubes and properly dispose of resources
      if (cubesRef.current.length > 0) {
        // Only dispose geometry once since it's shared
        let geometryDisposed = false;
        cubesRef.current.forEach(zRow => {
          if (Array.isArray(zRow)) {
            zRow.forEach(yRow => {
              if (Array.isArray(yRow)) {
                yRow.forEach(cube => {
                  if (cube instanceof THREE.Mesh) {
                    scene.remove(cube);
                    if (!geometryDisposed && cube.geometry) {
                      cube.geometry.dispose();
                      geometryDisposed = true;
                    }
                    if (cube.material) {
                      (cube.material as THREE.Material).dispose();
                    }
                  }
                });
              }
            });
          }
        });
        cubesRef.current = [];
      }
    };
  }, [width, height, effectiveGridSize, showGrid]);
  
  // Update grid visibility when showGrid changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    if (gridHelperRef.current) {
      sceneRef.current.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }
    
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(effectiveGridSize, effectiveGridSize);
      // Center the grid helper
      gridHelper.position.set(effectiveGridSize / 2, 0, effectiveGridSize / 2);
      sceneRef.current.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
  }, [showGrid, effectiveGridSize]);
  
  // Effect for executing Python code
  useEffect(() => {
    // --- Guard Clauses ---
    if (
      !shouldRun ||
      !pythonInterpreter ||
      !pythonCode.trim() ||
      !sceneRef.current ||
      isExecutingRef.current
    ) {
      if (shouldRun && !isExecutingRef.current) {
        console.log(
          'Canvas3D: shouldRun is true, but prerequisites not met. Calling onRunComplete.',
        );
        onRunComplete?.();
      }
      return;
    }
    
    const scene = sceneRef.current;
    
    // --- Execution Logic ---
    const executePythonDrawing = async () => {
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;
      console.log('Canvas3D: Starting Python execution.');
      
      try {
        // 1. Parse Python code
        let parseAST = pythonInterpreter.parse(pythonCode);
        
        // 2. Create a reusable geometry if it doesn't exist yet
        const geometry = new THREE.BoxGeometry(.9, .9, .9);
        
        // 3. Initialize or reuse cubes array
        if (!cubesRef.current.length) {
          // First run - create all cubes but make them invisible
          const newCubes: Array<Array<Array<THREE.Mesh>>> = [];
          
          for (let z = 0; z < effectiveGridSize; z++) {
            newCubes[z] = [];
            for (let y = 0; y < effectiveGridSize; y++) {
              newCubes[z][y] = [];
              for (let x = 0; x < effectiveGridSize; x++) {
                // Create cube with default material
                const material = new THREE.MeshLambertMaterial({ 
                  color: 0xffffff,
                  transparent: true,
                  opacity: 0 // Start invisible
                });
                
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x+.5, y+.5, z+.5);
                scene.add(cube);
                
                newCubes[z][y][x] = cube;
              }
            }
          }
          
          cubesRef.current = newCubes;
        }
        else {
          // Reset all cubes to invisible
          for (let z = 0; z < cubesRef.current.length; z++) {
            const zLayer = cubesRef.current[z];
            if (zLayer) {
              for (let y = 0; y < zLayer.length; y++) {
                const yRow = zLayer[y];
                if (yRow) {
                  for (let x = 0; x < yRow.length; x++) {
                    const cube = yRow[x];
                    if (cube && cube.material) {
                      (cube.material as THREE.MeshLambertMaterial).opacity = 0;
                    }
                  }
                }
              }
            }
          }
        }
        
        // 4. Update cube visibility and colors based on Python code
        for (let z = 0; z < effectiveGridSize; z++) {
          for (let y = 0; y < effectiveGridSize; y++) {
            for (let x = 0; x < effectiveGridSize; x++) {
              try {
                const result = await pythonInterpreter.evalAsync(
                  parseAST, 
                  context, 
                  ["draw", x, y, z, effectiveGridSize]
                );
                
                // Make sure we have a cube at this position
                if (z < cubesRef.current.length && 
                    y < cubesRef.current[z].length && 
                    x < cubesRef.current[z][y].length) {
                  
                  const cube = cubesRef.current[z][y][x];
                  
                  if (result) {
                    // Update cube color and make visible
                    const hue = (x + y + z) / (3 * effectiveGridSize);
                    (cube.material as THREE.MeshLambertMaterial).color.setHSL(hue, 0.7, 0.5);
                    (cube.material as THREE.MeshLambertMaterial).opacity = 1;
                  }
                }
              } catch (cellError) {
                console.error(
                  `Canvas3D: Error executing draw for cell (${x}, ${y}, ${z}):`,
                  cellError,
                );
              }
            }
          }
        }
        
        console.log('Canvas3D: Cell loop finished.');
        
      } catch (error) {
        console.error('Canvas3D: Error during Python execution:', error);
      } finally {
        console.log('Canvas3D: Python execution finished. Calling onRunComplete.');
        isExecutingRef.current = false;
        onRunComplete?.();
      }
    };
    
    executePythonDrawing();
  }, [
    shouldRun,
    pythonInterpreter,
    pythonCode,
    effectiveGridSize,
    onRunComplete,
  ]);
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`, 
        border: '1px solid #ccc' 
      }}
    />
  );
};

export default Canvas;
