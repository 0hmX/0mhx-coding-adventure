import React, { useRef, useEffect } from 'react';
import { Interpreter } from 'jspython-interpreter'; // Import Interpreter type for better typing

interface CanvasProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  pythonCode: string;
  // Use the specific Interpreter type if available, otherwise 'any' is fallback
  pythonInterpreter: Interpreter | null;
  shouldRun?: boolean;
  onRunComplete?: () => void; // Corrected prop name typo
}

const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  gridSize,
  showGrid,
  pythonCode,
  pythonInterpreter,
  shouldRun = false,
  onRunComplete, // Corrected prop name typo
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref to track if an execution is currently in progress
  const isExecutingRef = useRef(false);

  // Function to draw the grid (can be called from multiple places)
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    if (!showGrid || gridSize <= 0) return;

    ctx.strokeStyle = '#ddd'; // Grid color
    ctx.lineWidth = 0.5; // Use thinner lines for grid

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      // Offset by 0.5 for sharper lines
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
      ctx.stroke();
    }
  };

  // Effect for initial canvas clearing and drawing grid when size/grid props change
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Canvas: Clearing and drawing initial grid.');
    // Clear canvas completely
    ctx.clearRect(0, 0, width, height);

    // Optional: Set a background color if needed (default is transparent)
    // ctx.fillStyle = 'white';
    // ctx.fillRect(0, 0, width, height);

    // Draw the grid
    drawGrid(ctx);
  }, [width, height, gridSize, showGrid]); // Rerun only if these change

  // Effect for executing Python code
  useEffect(() => {
    // --- Guard Clauses ---
    if (
      !shouldRun || // Only run when triggered
      !pythonInterpreter || // Need the interpreter
      !pythonCode.trim() || // Need code
      !canvasRef.current || // Need the canvas element
      isExecutingRef.current // Prevent concurrent runs
    ) {
      // If shouldRun was true but we didn't run, maybe call onRunComplete?
      // Or assume the parent handles the shouldRun reset logic correctly.
      // For safety, let's ensure onRunComplete is called if shouldRun is true but we bail early.
      if (shouldRun && !isExecutingRef.current) {
        console.log(
          'Canvas: shouldRun is true, but prerequisites not met. Calling onRunComplete.',
        );
        onRunComplete?.();
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas: Failed to get 2D context.');
      onRunComplete?.(); // Signal completion even on error
      return;
    }

    // --- Execution Logic ---
    const executePythonDrawing = async () => {
      if (isExecutingRef.current) return; // Double check concurrency
      isExecutingRef.current = true; // Mark as executing
      console.log('Canvas: Starting Python execution.');

      try {
        // 1. Clear previous drawing & Draw Grid for this run
        ctx.clearRect(0, 0, width, height);
        // Optional background fill
        // ctx.fillStyle = 'white';
        // ctx.fillRect(0, 0, width, height);
        drawGrid(ctx); // Draw grid overlay first

        // 2. Define the Python function(s) in the interpreter's context
        console.log('Canvas: Evaluating Python code definition...');
        await pythonInterpreter.evalAsync(pythonCode);
        console.log('Canvas: Python code definition evaluated.');

        // 3. Set drawing color
        ctx.fillStyle = 'black'; // Color for filled pixels

        // 4. Iterate and call Python 'draw' function for each grid cell
        console.log('Canvas: Starting pixel loop...');
        const promises = []; // Store promises for potential parallel execution (optional)

        for (let y = 0; y < height; y += gridSize) {
          for (let x = 0; x < width; x += gridSize) {
            // Construct the Python call string
            // Pass coordinates and dimensions
            const pythonCall = `draw(${x}, ${y}, ${width}, ${height})`;

            // Asynchronously call the Python function
            // We don't strictly need to await each one *here* if drawing order doesn't matter,
            // but awaiting ensures sequential processing and easier error handling per pixel.
            // For potentially faster rendering (but harder error pinpointing),
            // you could push promises to an array and use Promise.all later.
            try {
              const result = await pythonInterpreter.evalAsync(pythonCall);

              // Check if the result is truthy (Python True, non-zero numbers, non-empty strings etc.)
              if (result) {
                // Fill the grid cell
                ctx.fillRect(x, y, gridSize, gridSize);
              }
            } catch (pixelError) {
              console.error(
                `Canvas: Error executing draw(${x}, ${y}):`,
                pixelError,
              );
              // Optional: Stop the whole process on pixel error, or just continue
              // throw pixelError; // Uncomment to stop on first pixel error
            }
          }
          // Optional: Yield to the event loop occasionally for large canvases
          // await new Promise(resolve => setTimeout(resolve, 0));
        }
        console.log('Canvas: Pixel loop finished.');
      } catch (error) {
        console.error('Canvas: Error during Python execution:', error);
        // Handle errors (e.g., syntax error in pythonCode definition)
      } finally {
        console.log('Canvas: Python execution finished. Calling onRunComplete.');
        isExecutingRef.current = false; // Mark execution as finished
        onRunComplete?.(); // Notify parent component that execution is complete
      }
    };

    executePythonDrawing();

    // This effect should only run when `shouldRun` transitions to true,
    // or if other dependencies change *while* shouldRun is true (which shouldn't happen with current parent logic).
    // The cleanup function is less critical here as the main control is `shouldRun`.
  }, [
    shouldRun,
    pythonInterpreter,
    pythonCode,
    width,
    height,
    gridSize,
    showGrid, // Include showGrid if drawGrid is inside this effect
    onRunComplete,
  ]);

  // Render the canvas element
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc' }} // Basic border for visibility
    />
  );
};

export default Canvas;
