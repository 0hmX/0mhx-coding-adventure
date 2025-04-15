import React, { useRef, useEffect } from 'react';
import { Interpreter } from 'jspython-interpreter';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Global context to preserve canvas state between renders
interface CanvasGlobalContext {
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
  cubes: Array<Array<Array<THREE.Mesh>>>;
  initialized: boolean;
}

// Initialize global context
if (typeof window !== 'undefined' && !window.canvasGlobalContext) {
  window.canvasGlobalContext = {
    scene: null,
    renderer: null,
    camera: null,
    controls: null,
    cubes: [],
    initialized: false
  };
}

interface CanvasProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  pythonCode: string;
  pythonInterpreter: Interpreter | null;
  shouldRun: boolean;
  onRunComplete: (error?: Error) => void; // Updated to accept an error parameter
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
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const isExecutingRef = useRef(false);

  // --- Calculate grid dimensions ---
  const effectiveGridSize = Math.max(1, Math.floor(gridSize));
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    const globalContext = window.canvasGlobalContext;
    
    // If we already have a renderer, just reattach it
    if (globalContext.initialized && globalContext.renderer) {
      containerRef.current.appendChild(globalContext.renderer.domElement);
      
      // Update renderer size
      globalContext.renderer.setSize(width, height);
      
      // Update camera aspect ratio
      if (globalContext.camera) {
        globalContext.camera.aspect = width / height;
        globalContext.camera.updateProjectionMatrix();
      }
      
      return;
    }
    
    // Create scene
    const scene = new THREE.Scene();
    // Change background to a softer Ghibli-inspired color
    scene.background = new THREE.Color(0xE6DDC6); // Warm parchment color for Ghibli style
    globalContext.scene = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // Position camera to center on the grid
    const gridCenter = effectiveGridSize / 2;
    camera.position.set(
      gridCenter, 
      gridCenter, 
      effectiveGridSize * 1.8
    );
    camera.lookAt(gridCenter, gridCenter, gridCenter);
    globalContext.camera = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    globalContext.renderer = renderer;
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    globalContext.controls = controls;
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(effectiveGridSize);
    axesHelper.position.set(0, 1, 0);
    scene.add(axesHelper);
    
    // Add axis labels
    const createAxisLabel = (text: string, position: THREE.Vector3, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = 'rgba(255, 248, 220, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 40px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(1, 0.5, 1);
        scene.add(sprite);
        return sprite;
      }
      return null;
    };
    
    // Create axis labels
    const xLabel = createAxisLabel('X', new THREE.Vector3(effectiveGridSize + 0.5, 0, 0), '#ff0000');
    const yLabel = createAxisLabel('Y', new THREE.Vector3(0, effectiveGridSize + 0.5, 0), '#00ff00');
    const zLabel = createAxisLabel('Z', new THREE.Vector3(0, 0, effectiveGridSize + 0.5), '#0000ff');
    
    // Setup raycaster for hover effects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltipDiv = document.createElement('div');
    tooltipDiv.style.position = 'absolute';
    tooltipDiv.style.padding = '8px';
    tooltipDiv.style.backgroundColor = 'rgba(255, 248, 220, 0.8)';
    tooltipDiv.style.border = '1px solid #8B4513';
    tooltipDiv.style.borderRadius = '4px';
    tooltipDiv.style.color = '#5D3A1A';
    tooltipDiv.style.fontFamily = '"Palatino Linotype", "Book Antiqua", Palatino, serif';
    tooltipDiv.style.fontSize = '14px';
    tooltipDiv.style.pointerEvents = 'none';
    tooltipDiv.style.display = 'none';
    tooltipDiv.style.zIndex = '1000';
    if (containerRef.current) {
      containerRef.current.appendChild(tooltipDiv);
    }
    
    // Add mouse move event listener
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !globalContext.renderer || !globalContext.camera || !globalContext.scene) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, globalContext.camera);
      const intersects = raycaster.intersectObjects(globalContext.scene.children, true);
      
      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.object instanceof THREE.Mesh) {
          const position = intersect.object.position;
          tooltipDiv.textContent = `Position: (${Math.floor(position.x)}, ${Math.floor(position.y)}, ${Math.floor(position.z)})`;
          
          // Fix tooltip positioning to follow mouse cursor
          const canvasRect = containerRef.current.getBoundingClientRect();
          const mouseX = event.clientX - canvasRect.left;
          const mouseY = event.clientY - canvasRect.top;
          
          tooltipDiv.style.left = `${mouseX + 10}px`;
          tooltipDiv.style.top = `${mouseY + 10}px`;
          tooltipDiv.style.display = 'block';
        } else {
          tooltipDiv.style.display = 'none';
        }
      } else {
        tooltipDiv.style.display = 'none';
      }
    };
    
    containerRef.current.addEventListener('mousemove', onMouseMove);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create grid helper if needed
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(effectiveGridSize, effectiveGridSize, 0x8B4513, 0xD2B48C); // Brown and tan colors for grid
      // Center the grid helper
      gridHelper.position.set(effectiveGridSize / 2, 0, effectiveGridSize / 2);
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Mark as initialized
    globalContext.initialized = true;
    
    // Cleanup function
    return () => {
      // Don't remove the renderer from the DOM on unmount
      // We'll reattach it on the next mount
      
      // Just remove the renderer from the container
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Don't dispose of resources, as we want to preserve them
    };
  }, [width, height, effectiveGridSize, showGrid]);
  
  // Update grid visibility when showGrid changes
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;
    if (!globalContext.scene) return;
    
    if (gridHelperRef.current) {
      globalContext.scene.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }
    
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(effectiveGridSize, effectiveGridSize);
      // Center the grid helper
      gridHelper.position.set(effectiveGridSize / 2, 0, effectiveGridSize / 2);
      globalContext.scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
  }, [showGrid, effectiveGridSize]);
  
  // Effect for executing Python code
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;
    
    // --- Guard Clauses ---
    if (
      !shouldRun ||
      !pythonInterpreter ||
      !pythonCode.trim() ||
      !globalContext.scene ||
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
    
    const scene = globalContext.scene;
    
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
        if (!globalContext.cubes.length) {
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
          
          globalContext.cubes = newCubes;
        }
        else {
          // Reset all cubes to invisible
          for (let z = 0; z < globalContext.cubes.length; z++) {
            const zLayer = globalContext.cubes[z];
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
        let hasExecutionError = false;
        let executionError: Error | undefined;
        
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
                if (z < globalContext.cubes.length && 
                    y < globalContext.cubes[z].length && 
                    x < globalContext.cubes[z][y].length) {
                  
                  const cube = globalContext.cubes[z][y][x];
                  
                  if (result) {
                    // Update cube color and make visible using Ghibli-inspired palette
                    const ghibliColors = [
                      0x7BB661, // Soft green
                      0x4D85BD, // Sky blue
                      0xE15554, // Coral red
                      0xF9C74F, // Warm yellow
                      0x9C89B8, // Lavender
                      0xF8961E  // Orange
                    ];
                    const colorIndex = Math.floor((x + y + z) % ghibliColors.length);
                    (cube.material as THREE.MeshLambertMaterial).color.setHex(ghibliColors[colorIndex]);
                    (cube.material as THREE.MeshLambertMaterial).opacity = 1;
                  }
                }
              } catch (cellError) {
                console.error(
                  `Canvas3D: Error executing draw for cell (${x}, ${y}, ${z}):`,
                  cellError,
                );
                // Only capture the first error
                if (!hasExecutionError) {
                  hasExecutionError = true;
                  executionError = cellError instanceof Error 
                    ? cellError 
                    : new Error(`Error at position (${x},${y},${z}): ${cellError}`);
                }
              }
            }
          }
        }
        
        console.log('Canvas3D: Cell loop finished.');
        
        // If we had any execution errors, throw the first one
        if (hasExecutionError && executionError) {
          throw executionError;
        }
        
      } catch (error) {
        console.error('Canvas3D: Error during Python execution:', error);
        // Pass the error to the parent component
        onRunComplete(error instanceof Error ? error : new Error(String(error)));
        return;
      } finally {
        console.log('Canvas3D: Python execution finished.');
        isExecutingRef.current = false;
      }
      
      // Only call onRunComplete without error if we didn't have any errors
      onRunComplete();
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
      }}
    />
  );
};

// Add TypeScript declaration for the global context
declare global {
  interface Window {
    canvasGlobalContext: CanvasGlobalContext;
  }
}

export default Canvas;
