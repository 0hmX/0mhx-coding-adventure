import React, { useRef, useEffect } from 'react';
import type { Interpreter } from '../../submodules/jspython/src/interpreter';
import * as THREE from 'three';

/**
 * Global context interface for preserving Three.js canvas state between renders
 */
interface CanvasGlobalContext {
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  cubes: Array<Array<Array<THREE.Mesh>>>;
  initialized: boolean;
  worker: Worker | null;
}

// Initialize global context
if (typeof window !== 'undefined' && !window.canvasGlobalContext) {
  window.canvasGlobalContext = {
    scene: null,
    renderer: null,
    camera: null,
    cubes: [],
    initialized: false,
    worker: null
  };
}

/**
 * Props interface for the Canvas component
 */
interface CanvasProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  pythonCode: string;
  pythonInterpreter: Interpreter | null;
  shouldRun: boolean;
  onRunComplete: (error?: Error) => void;
}


/**
 * A 3D canvas component that renders a grid of cubes controlled by Python code
 */
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
  const isExecutingRef = useRef(false);

  // Calculate effective grid size
  const effectiveGridSize = Math.max(1, Math.floor(gridSize));

  // Initialize worker and offscreen canvas
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;
    
    // Only initialize once
    if (globalContext.worker) return;
    
    // Create worker
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    globalContext.worker = worker;
    
    // Handle messages from worker
    worker.onmessage = (e) => {
      const { type, status, message, data } = e.data;
      
      if (type === 'error') {
        console.error('Worker error:', message);
      } else if (type === 'batch') {
        // Handle batch of results if needed
      } else if (type === 'init' && status === 'success') {
        console.log('Worker initialized successfully');
      }
    };
    
    // Cleanup function
    return () => {
      if (globalContext.worker) {
        globalContext.worker.terminate();
        globalContext.worker = null;
      }
    };
  }, []);

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

    // Create canvas and transfer to worker
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    containerRef.current.appendChild(canvas);
    
    // Transfer canvas to worker
    const offscreenCanvas = canvas.transferControlToOffscreen();
    
    if (globalContext.worker) {
      globalContext.worker.postMessage({
        type: 'init',
        canvas: offscreenCanvas,
        width,
        height,
        gridSize: effectiveGridSize
      }, [offscreenCanvas]);
    }

    // Mark as initialized
    globalContext.initialized = true;

    // Cleanup function
    return () => {
      // Just remove the canvas from the container
      if (containerRef.current && canvas.parentNode === containerRef.current) {
        containerRef.current.removeChild(canvas);
      }
    };
  }, [width, height, effectiveGridSize]);

  // Handle resize
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;
    if (!globalContext.worker || !globalContext.initialized) return;
    
    globalContext.worker.postMessage({
      type: 'resize',
      width,
      height
    });
  }, [width, height]);

  // Effect for executing Python code
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;

    // Guard clauses
    if (
      !shouldRun ||
      !pythonInterpreter ||
      !pythonCode.trim() ||
      !globalContext.worker ||
      isExecutingRef.current
    ) {
      if (shouldRun && !isExecutingRef.current) {
        console.log('Canvas: shouldRun is true, but prerequisites not met. Calling onRunComplete.');
        onRunComplete?.();
      }
      return;
    }

    // Execution logic
    const executePythonDrawing = async () => {
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;
      console.log('Canvas: Starting Python execution.');

      try {
        // Send code to worker
        globalContext.worker.postMessage({
          type: 'runPythonCode',
          code: pythonCode,
          gridSize: effectiveGridSize
        });
        
        // Set up message handler for completion
        const messageHandler = (e: MessageEvent) => {
          const { type, status, message } = e.data;
          
          if (type === 'runPythonCode' && status === 'success') {
            globalContext.worker?.removeEventListener('message', messageHandler);
            isExecutingRef.current = false;
            onRunComplete();
          } else if (type === 'error') {
            globalContext.worker?.removeEventListener('message', messageHandler);
            isExecutingRef.current = false;
            onRunComplete(new Error(message));
          }
        };
        
        globalContext.worker.addEventListener('message', messageHandler);
      } catch (error) {
        console.error('Canvas: Error during Python execution:', error);
        isExecutingRef.current = false;
        onRunComplete(error instanceof Error ? error : new Error(String(error)));
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
      }}
    />
  );
};

/**
 * TypeScript declaration for the global context
 */
declare global {
  interface Window {
    canvasGlobalContext: CanvasGlobalContext;
  }
}

export default Canvas;