import React, { useState, useEffect } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CodeEditor from '../components/CodeEditor';
import Canvas from '../components/Canvas';
import GridControls from '../components/GridControls';
import Navbar from '../components/Navbar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';

// Default Lua code with a circle example
const DEFAULT_LUA_CODE = `-- Define a function to draw a circle
-- X and Y are the current coordinates
-- WIDTH and HEIGHT are the canvas dimensions
-- Return true to color the pixel, false to leave it transparent

function draw(X, Y)
  -- Calculate distance from center
  local centerX = WIDTH / 2
  local centerY = HEIGHT / 2
  local radius = math.min(WIDTH, HEIGHT) / 4
  
  local distance = math.sqrt((X - centerX)^2 + (Y - centerY)^2)
  
  -- Return true if point is inside the circle
  return distance <= radius
end`;

const Index = () => {
  const [luaCode, setLuaCode] = useState(DEFAULT_LUA_CODE);
  const [gridSize, setGridSize] = useState(10);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(500);
  const [luaInterpreter, setLuaInterpreter] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [shouldRun, setShouldRun] = useState(false);
  const isMobile = useIsMobile();

  // Load the Fengari Lua interpreter
  useEffect(() => {
    const loadLuaInterpreter = async () => {
      try {
        // Dynamically import fengari-web
        const fengari = await import('fengari-web');
        setLuaInterpreter(fengari);
      } catch (error) {
        console.error("Error loading Lua interpreter:", error);
      }
    };

    loadLuaInterpreter();
  }, []);

  const handleCodeChange = (newCode: string) => {
    setLuaCode(newCode);
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
    setIsRunning(true);
    setShouldRun(true);
    
    // Reset the running state after animation completes
    setTimeout(() => {
      setIsRunning(false);
    }, 1000);
  };

  // Reset shouldRun after execution
  useEffect(() => {
    if (!isRunning && shouldRun) {
      setShouldRun(false);
    }
  }, [isRunning, shouldRun]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background p-4">
      <Navbar onRunCode={handleRunCode} isRunning={isRunning} />
      
      <ResizablePanelGroup
        direction={isMobile ? "vertical" : "horizontal"}
        className="h-[calc(100%-64px)] w-full"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col rounded-xl overflow-hidden border border-white/10">
            <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold">Lua Editor</h2>
            </div>
            <div className="flex-grow relative">
              <CodeEditor 
                initialValue={luaCode} 
                onChange={handleCodeChange} 
              />
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <div className="h-full flex items-center justify-center">
              <Canvas
                width={canvasWidth}
                height={canvasHeight}
                gridSize={gridSize}
                showGrid={showGrid}
                luaCode={luaCode}
                luaInterpreter={luaInterpreter}
                shouldRun={shouldRun}
              />
            </div>
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
