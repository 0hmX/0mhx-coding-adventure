import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CodeEditor from '../components/CodeEditor';
import Canvas from '../components/Canvas'; // Assuming Canvas is updated for Python
import GridControls from '../components/GridControls';
import Navbar from '../components/Navbar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { jsPython, Interpreter } from 'jspython-interpreter'; // Import js-python

// Default Python code with a circle example
const DEFAULT_PYTHON_CODE = `# Define a function to draw based on coordinates
# X and Y are the current coordinates (0-based)
# WIDTH and HEIGHT are the canvas dimensions
# Return True (or any truthy value) to color the pixel,
# False (or any falsy value like None, 0) to leave it transparent
import math

def draw(X, Y, WIDTH, HEIGHT):
  # Calculate distance from center
  center_x = WIDTH / 2
  center_y = HEIGHT / 2
  # Use min for radius, ensure it's positive
  radius = max(1, min(WIDTH, HEIGHT) / 4) 
  
  # Calculate distance from the center of the pixel
  # Add 0.5 to X and Y to target the pixel's center
  distance = math.hypot(X + 0.5 - center_x, Y + 0.5 - center_y)
  
  # Return true if point is inside the circle
  return distance <= radius
`;

const Index = () => {
  // State for Python code instead of Lua
  const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
  const [gridSize, setGridSize] = useState(10);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(500);
  // State to hold the js-python interpreter instance
  const [pythonInterpreter, setPythonInterpreter] = useState<Interpreter | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [shouldRun, setShouldRun] = useState(false); // Flag to trigger canvas update
  const isMobile = useIsMobile();

  // Initialize the js-python interpreter on component mount
  useEffect(() => {
    console.log('Initializing js-python interpreter...');
    // Create the interpreter instance
    const interp = jsPython();
    setPythonInterpreter(interp); // Store the instance in state
    console.log('js-python interpreter initialized.');

    // Cleanup function to run when the component unmounts
    return () => {
      console.log('Cleaning up js-python interpreter...');
      interp.cleanUp(); // Clean up resources used by the interpreter
      setPythonInterpreter(null);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleCodeChange = (newCode: string) => {
    setPythonCode(newCode);
    // Optionally, you could trigger a re-run automatically on code change
    // handleRunCode();
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    // Optionally trigger re-run if desired when grid changes
    // handleRunCode();
  };

  const handleShowGridChange = (show: boolean) => {
    setShowGrid(show);
  };

  const handleCanvasSizeChange = (width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
    // Optionally trigger re-run if desired when canvas size changes
    // handleRunCode();
  };

  // Trigger the execution flag
  const handleRunCode = () => {
    if (!pythonInterpreter) {
      console.error('Python interpreter not initialized yet.');
      return; // Don't run if interpreter isn't ready
    }
    console.log('Run button clicked, setting shouldRun=true');
    setIsRunning(true); // Show loading state
    setShouldRun(true); // Signal the Canvas to execute

    // Simulate execution time / wait for Canvas to potentially finish
    // In a real scenario, Canvas might provide a callback when done.
    // For now, just reset the loading indicator after a delay.
    setTimeout(() => {
      setIsRunning(false);
      // Important: Reset shouldRun *after* Canvas has had a chance to react.
      // This might need adjustment depending on how Canvas handles the prop.
      // Setting it false here might be too soon if Canvas runs async.
      // A better approach is for Canvas to call a 'onRunComplete' prop.
      // setShouldRun(false); // Let Canvas reset this or use a callback
    }, 500); // Adjust delay as needed
  };

  // Callback for Canvas to signal completion (Optional but recommended)
  const handleRunComplete = () => {
    console.log('Canvas reported run complete, setting shouldRun=false');
    setShouldRun(false); // Reset the trigger flag
    // isRunning might already be false due to setTimeout, or reset it here too
    setIsRunning(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background p-4">
      {/* Pass isRunning state to Navbar */}
      <Navbar onRunCode={handleRunCode} isRunning={isRunning} />

      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        // Adjust height calculation if Navbar height changes
        className="h-[calc(100%-64px)] w-full"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div
            className={cn(
              'flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5',
              isMobile
                ? 'rounded-bl-none border-b-0'
                : 'rounded-tr-none border-r-0',
            )}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
              {/* Update title */}
              <h2 className="text-lg font-semibold">Python Editor</h2>
            </div>
            <div className="relative flex-grow">
              <CodeEditor
                language="python" // Set language for syntax highlighting
                initialValue={pythonCode}
                onChange={handleCodeChange}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-white/10 transition-colors duration-200 hover:bg-white/20"
        />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div
            className={cn(
              'relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/5',
              isMobile
                ? 'rounded-tr-none border-t-0'
                : 'rounded-tl-none border-l-0',
            )}
          >
            <div className="flex h-full items-center justify-center">
              {/* Pass Python related props to Canvas */}
              <Canvas
                width={canvasWidth}
                height={canvasHeight}
                gridSize={gridSize}
                showGrid={showGrid}
                pythonCode={pythonCode} // Pass Python code
                pythonInterpreter={pythonInterpreter} // Pass interpreter instance
                shouldRun={shouldRun} // Pass trigger flag
                onRunComplete={handleRunComplete} // Pass completion callback
              />
            </div>
            {/* GridControls remains the same */}
            <GridControls
              gridSize={gridSize}
              showGrid={showGrid}
              onGridSizeChange={handleGridSizeChange}
              onShowGridChange={handleShowGridChange}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onCanvasSizeChange={handleCanvasSizeChange}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
