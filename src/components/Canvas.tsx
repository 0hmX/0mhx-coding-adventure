import React, { useRef, useEffect } from 'react';
import type { Interpreter } from '../../submodules/jspython/src/interpreter';
import * as THREE from 'three';
const mouseEventHandler = makeSendPropertiesHandler( [
	'ctrlKey',
	'metaKey',
	'shiftKey',
	'button',
	'pointerType',
	'clientX',
	'clientY',
	'pointerId',
	'pageX',
	'pageY',
] );
const wheelEventHandlerImpl = makeSendPropertiesHandler( [
	'deltaX',
	'deltaY',
] );
const keydownEventHandler = makeSendPropertiesHandler( [
	'ctrlKey',
	'metaKey',
	'shiftKey',
	'keyCode',
] );

function wheelEventHandler( event, sendFn ) {

	event.preventDefault();
	wheelEventHandlerImpl( event, sendFn );

}

function preventDefaultHandler( event ) {

	event.preventDefault();

}

function copyProperties( src, properties, dst ) {

	for ( const name of properties ) {

		dst[ name ] = src[ name ];

	}

}

function makeSendPropertiesHandler( properties ) {

	return function sendProperties( event, sendFn ) {

		const data = { type: event.type };
		copyProperties( event, properties, data );
		sendFn( data );

	};

}

function touchEventHandler( event, sendFn ) {
	
	// preventDefault() fixes mousemove, mouseup and mousedown 
	// firing at touch events when doing a simple touchup touchdown
	// Happens only at offscreen canvas
	event.preventDefault(); 
	const touches = [];
	const data = { type: event.type, touches };
	for ( let i = 0; i < event.touches.length; ++ i ) {

		const touch = event.touches[ i ];
		touches.push( {
			pageX: touch.pageX,
			pageY: touch.pageY,
			clientX: touch.clientX,
			clientY: touch.clientY,
		} );

	}

	sendFn( data );

}

// The four arrow keys
const orbitKeys = {
	'37': true, // left
	'38': true, // up
	'39': true, // right
	'40': true, // down
};
function filteredKeydownEventHandler( event, sendFn ) {

	const { keyCode } = event;
	if ( orbitKeys[ keyCode ] ) {

		event.preventDefault();
		keydownEventHandler( event, sendFn );

	}

}

let nextProxyId = 0;
class ElementProxy {
  id: number;
  worker: Worker;

	constructor( element, worker, eventHandlers ) {

		this.id = nextProxyId ++;
		this.worker = worker;
		const sendEvent = ( data ) => {

			this.worker.postMessage( {
				type: 'event',
				id: this.id,
				data,
			} );

		};

		// register an id
		worker.postMessage( {
			type: 'makeProxy',
			id: this.id,
		} );
		sendSize();
		for ( const [ eventName, handler ] of Object.entries( eventHandlers ) ) {

			element.addEventListener( eventName, function ( event ) {

        // @ts-ignore
				handler( event, sendEvent );

			} );

		}

		function sendSize() {

			const rect = element.getBoundingClientRect();
			sendEvent( {
				type: 'size',
				left: rect.left,
				top: rect.top,
				width: element.clientWidth,
				height: element.clientHeight,
			} );

		}

		// really need to use ResizeObserver
		window.addEventListener( 'resize', sendSize );

	}

}
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
 * Result type for operations that may fail
 */
type Result<T> = { success: true; value: T } | { success: false; error: Error };

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
    const worker = new Worker(new URL('../workers/canvas.ts', import.meta.url), { type: 'module' });
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
      } else if (type === 'orbitUpdate') {
        console.log('Orbit camera updated');
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
    const eventHandlers = {
		contextmenu: preventDefaultHandler,
		mousedown: mouseEventHandler,
		mousemove: mouseEventHandler,
		mouseup: mouseEventHandler,
		pointerdown: mouseEventHandler,
		pointermove: mouseEventHandler,
		pointerup: mouseEventHandler,
		touchstart: touchEventHandler,
		touchmove: touchEventHandler,
		touchend: touchEventHandler,
		wheel: wheelEventHandler,
		keydown: filteredKeydownEventHandler,
	};

    const proxy = new ElementProxy(canvas, globalContext.worker, eventHandlers);
    if (globalContext.worker) {
      globalContext.worker.postMessage({
        type: 'start',
        canvas: offscreenCanvas,
        width,
        height,
        gridSize: effectiveGridSize,
        canvasId: proxy.id,
        enableOrbitControls: true, // Enable orbit controls
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

  // Check if Python execution prerequisites are met
  const checkPrerequisites = (): Result<void> => {
    const globalContext = window.canvasGlobalContext;
    
    if (!pythonInterpreter) {
      return { 
        success: false, 
        error: new Error('Python interpreter not available') 
      };
    }
    
    if (!pythonCode.trim()) {
      return { 
        success: false, 
        error: new Error('No Python code provided') 
      };
    }
    
    if (!globalContext.worker) {
      return { 
        success: false, 
        error: new Error('Worker not initialized') 
      };
    }
    
    if (isExecutingRef.current) {
      return { 
        success: false, 
        error: new Error('Code is already executing') 
      };
    }
    
    return { success: true, value: undefined };
  };

  // Effect for executing Python code
  useEffect(() => {
    const globalContext = window.canvasGlobalContext;

    // Skip if not supposed to run
    if (!shouldRun) return;

    // Check prerequisites
    const prerequisitesResult = checkPrerequisites();
    if (!prerequisitesResult.success) {
      const errorResult = prerequisitesResult as { success: false; error: Error };
      console.log('Canvas: Prerequisites not met:', errorResult.error.message);
      onRunComplete?.(errorResult.error);
      return;
    }

    // Execution logic
    const executePythonDrawing = () => {
      isExecutingRef.current = true;
      console.log('Canvas: Starting Python execution.');

      // Send code to worker
      globalContext.worker!.postMessage({
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
      
      globalContext.worker!.addEventListener('message', messageHandler);
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