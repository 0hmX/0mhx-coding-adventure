import React, { useRef, useEffect } from 'react';
import { Interpreter } from 'jspython-interpreter'; // Correct import path

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
  gridSize, // Interpreted as number of horizontal cells
  showGrid,
  pythonCode,
  pythonInterpreter,
  shouldRun = false,
  onRunComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isExecutingRef = useRef(false);

  // --- Calculate cell dimensions based on width and gridSize ---
  // Ensure gridSize is at least 1 to avoid division by zero and nonsensical layout
  const effectiveGridSize = Math.max(1, Math.floor(gridSize));
  // Calculate the pixel size of each cell (assuming square cells for simplicity)
  const cellSize = width / effectiveGridSize;
  // Calculate the number of cells needed vertically to cover the height
  const numCellsY = Math.ceil(height / cellSize);

  // Function to draw the grid using calculated cell size
  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
    if (!showGrid || cellSize <= 0) return;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // Draw vertical lines
    // Iterate `effectiveGridSize + 1` times to draw all lines including the last edge
    for (let i = 0; i <= effectiveGridSize; i++) {
      const x = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    // Iterate `numCellsY + 1` times
    for (let i = 0; i <= numCellsY; i++) {
      const y = i * cellSize;
      // Don't draw lines beyond the canvas height
      if (y > height) break;
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
      ctx.stroke();
    }
  };

  // Effect for initial canvas clearing and drawing grid
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Canvas: Clearing and drawing initial grid.');
    ctx.clearRect(0, 0, width, height);
    drawGridLines(ctx); // Use the updated grid drawing function
    // Dependencies now include calculated values indirectly via props
  }, [width, height, gridSize, showGrid]);

  // Effect for executing Python code
  useEffect(() => {
    // Recalculate derived values inside the effect if they depend on props
    // that might change and trigger this effect.
    const currentEffectiveGridSize = Math.max(1, Math.floor(gridSize));
    const currentCellSize = width / currentEffectiveGridSize;
    const currentNumCellsY = Math.ceil(height / currentCellSize);

    // --- Guard Clauses ---
    if (
      !shouldRun ||
      !pythonInterpreter ||
      !pythonCode.trim() ||
      !canvasRef.current ||
      isExecutingRef.current ||
      currentCellSize <= 0 // Add check for valid cell size
    ) {
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
      onRunComplete?.();
      return;
    }

    // --- Execution Logic ---
    const executePythonDrawing = async () => {
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;
      console.log('Canvas: Starting Python execution.');

      try {
        // 1. Clear & Draw Grid
        ctx.clearRect(0, 0, width, height);
        drawGridLines(ctx); // Use updated grid drawing

        // 2. Define Python function(s)
        // console.log('Canvas: Evaluating Python code definition...');
        let parseAST = pythonInterpreter.parse(pythonCode);
        // console.log('Canvas: Python code definition evaluated.');

        // 3. Set drawing color
        ctx.fillStyle = 'black';

        // 4. Iterate based on calculated number of cells
        console.log(
          `Canvas: Starting cell loop (${currentEffectiveGridSize}x${currentNumCellsY} cells, size ${currentCellSize.toFixed(2)}px)...`,
        );

        // Iterate through the grid cells by index
        for (let cellY = 0; cellY < currentNumCellsY; cellY++) {
          for (let cellX = 0; cellX < currentEffectiveGridSize; cellX++) {
            // Calculate the top-left pixel coordinate for the current cell
            const pixelX = cellX * currentCellSize;
            const pixelY = cellY * currentCellSize;

            try {
              const result = await pythonInterpreter.evalAsync(parseAST, context, ["draw", cellX, cellY, width, height])

              if (result) {
                // Fill the rectangle representing this cell
                // Use floor/ceil carefully if exact pixel boundaries matter,
                // but fillRect usually handles fractional coords reasonably.
                ctx.fillRect(
                  pixelX,
                  pixelY,
                  currentCellSize,
                  currentCellSize, // Draw a square cell
                );
              }
            } catch (pixelError) {
              console.error(
                `Canvas: Error executing draw for cell (${cellX}, ${cellY}) at pixel (${pixelX.toFixed(2)}, ${pixelY.toFixed(2)}):`,
                pixelError,
              );
              // Decide whether to stop or continue
            }
          }
          // Optional yield
          // await new Promise(resolve => setTimeout(resolve, 0));
        }
        console.log('Canvas: Cell loop finished.');
      } catch (error) {
        console.error('Canvas: Error during Python execution:', error);
      } finally {
        console.log('Canvas: Python execution finished. Calling onRunComplete.');
        isExecutingRef.current = false;
        onRunComplete?.();
      }
    };

    executePythonDrawing();
  }, [
    // Dependencies remain largely the same, but their interpretation changes behavior
    shouldRun,
    pythonInterpreter,
    pythonCode,
    width,
    height,
    gridSize, // gridSize change now recalculates cell sizes
    showGrid,
    onRunComplete,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc' }}
    />
  );
};

export default Canvas;
