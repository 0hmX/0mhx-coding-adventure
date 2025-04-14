import { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import Canvas from '../components/Canvas';
import Navbar from '../components/Navbar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { jsPython, Interpreter } from 'jspython-interpreter';

// Default Python code with a simple example
const DEFAULT_PYTHON_CODE = `# Define a function to draw based on coordinates
# X, Y, and Z are the current coordinates (0-based)
# GRID_SIZE is the size of the grid
# Return True to color the pixel, False to leave it transparent

def draw(X, Y, Z, GRID_SIZE):
  # Create a simple 3D shape
  if X + Y + Z <= GRID_SIZE:
    return True
  return False
`;

const Index = () => {
  // State management
  const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
  const [gridSize, setGridSize] = useState(10);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(500);
  const [pythonInterpreter, setPythonInterpreter] = useState<Interpreter | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [shouldRun, setShouldRun] = useState(false);
  const isMobile = useIsMobile();

  // Initialize the js-python interpreter on component mount
  useEffect(() => {
    console.log('Initializing js-python interpreter...');
    const interp = jsPython();
    setPythonInterpreter(interp);
    console.log('js-python interpreter initialized.');

    return () => {
      console.log('Cleaning up js-python interpreter...');
      interp.cleanUp();
      setPythonInterpreter(null);
    };
  }, []);

  const handleCodeChange = (newCode: string) => {
    setPythonCode(newCode);
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
  };

  const handleShowGridChange = (show: boolean) => {
    setShowGrid(show);
  };

  const handleCanvasSizeChange = (width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
  };

  const handleRunCode = () => {
    if (!pythonInterpreter) {
      console.error('Python interpreter not initialized yet.');
      return;
    }
    console.log('Run button clicked, setting shouldRun=true');
    setIsRunning(true);
    setShouldRun(true);

    setTimeout(() => {
      setIsRunning(false);
    }, 500);
  };

  const handleRunComplete = () => {
    console.log('Canvas reported run complete, setting shouldRun=false');
    setShouldRun(false);
    setIsRunning(false);
  };

  return (
    <div 
      className="min-h-screen w-screen overflow-hidden p-4"
      style={{
        backgroundImage: 'url("/bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Ghibli-style header */}
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold text-amber-800" style={{ 
          fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          Created By 0hmX
        </h1>
      </div>

      {/* Navbar with Ghibli styling */}
      <div className="mb-4">
        <Navbar 
          onRunCode={handleRunCode} 
          isRunning={isRunning} 
        />
      </div>

      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="h-[calc(100vh-180px)] w-full rounded-xl overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div
            className={cn(
              'flex h-full flex-col overflow-hidden rounded-xl border',
              isMobile
                ? 'rounded-bl-none'
                : 'rounded-tr-none',
            )}
            style={{ 
              backgroundColor: 'rgba(255, 248, 220, 0.85)',
              borderColor: 'rgba(139, 69, 19, 0.5)'
            }}
          >
            <div className="flex items-center justify-between p-4" style={{ 
              borderBottom: '1px solid rgba(139, 69, 19, 0.3)',
              backgroundColor: 'rgba(210, 180, 140, 0.5)'
            }}>
              <h2 className="text-lg font-semibold text-amber-900" style={{ 
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif' 
              }}>
                Python Editor
              </h2>
            </div>
            <div className="relative flex-grow">
              <CodeEditor
                language="python"
                initialValue={pythonCode}
                onChange={handleCodeChange}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="transition-colors duration-200"
          style={{ 
            backgroundColor: 'rgba(139, 69, 19, 0.3)',
          }}
        />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div
            className={cn(
              'relative h-full overflow-hidden rounded-xl border',
              isMobile
                ? 'rounded-tr-none'
                : 'rounded-tl-none',
            )}
            style={{ 
              backgroundColor: 'rgba(255, 248, 220, 0.85)',
              borderColor: 'rgba(139, 69, 19, 0.5)'
            }}
          >
            <div className="flex h-full flex-col">
              <div className="flex-grow flex items-center justify-center overflow-hidden">
                <Canvas
                  width={canvasWidth}
                  height={canvasHeight}
                  gridSize={gridSize}
                  showGrid={showGrid}
                  pythonCode={pythonCode}
                  pythonInterpreter={pythonInterpreter}
                  shouldRun={shouldRun}
                  onRunComplete={handleRunComplete}
                />
              </div>
              <div 
                className="w-full flex-shrink-0 mt-auto"
                style={{ 
                  backgroundColor: 'rgba(210, 180, 140, 0.85)',
                  borderTop: '1px solid rgba(139, 69, 19, 0.5)',
                  padding: '12px',
                  minHeight: '60px'
                }}
              >
                <div className="flex justify-center items-center gap-8 text-black">
                  <div className="flex items-center">
                    <label className="text-amber-900 font-semibold mr-2" style={{ 
                      fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
                      color: '#5D3A1A'
                    }}>
                      Grid Size
                    </label>
                    <input 
                      type="number" 
                      value={gridSize}
                      onChange={(e) => handleGridSizeChange(parseInt(e.target.value) || 10)}
                      className="w-16 px-2 py-1 rounded border border-amber-700 bg-amber-50"
                    />
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="showGrid"
                      checked={showGrid}
                      onChange={(e) => handleShowGridChange(e.target.checked)}
                      className="mr-2 h-4 w-4 accent-amber-700"
                    />
                    <label htmlFor="showGrid" className="text-amber-900 font-semibold" style={{ 
                      fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
                      color: '#5D3A1A'
                    }}>
                      Show Grid
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
