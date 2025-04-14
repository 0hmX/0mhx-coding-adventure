
import React, { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import Canvas from '../components/Canvas';
import GridControls from '../components/GridControls';

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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="editor-container">
        <CodeEditor 
          initialValue={luaCode} 
          onChange={handleCodeChange} 
        />
      </div>
      <div className="canvas-container">
        <div className="canvas-wrapper">
          <Canvas
            width={canvasWidth}
            height={canvasHeight}
            gridSize={gridSize}
            showGrid={showGrid}
            luaCode={luaCode}
            luaInterpreter={luaInterpreter}
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
    </div>
  );
};

export default Index;
