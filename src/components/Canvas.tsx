
import React, { useRef, useEffect } from 'react';

interface CanvasProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  luaCode: string;
  luaInterpreter: any;
}

const Canvas: React.FC<CanvasProps> = ({ 
  width, 
  height, 
  gridSize, 
  showGrid, 
  luaCode,
  luaInterpreter 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      
      // Draw vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Execute Lua code for each grid cell
    if (luaInterpreter && luaCode.trim()) {
      try {
        // Create global variables for Lua
        const fengari = luaInterpreter;
        const L = fengari.L;
        const lua = fengari.lua;
        const lauxlib = fengari.lauxlib;
        const lualib = fengari.lualib;
        
        // Set up the Lua state
        lauxlib.luaL_openlibs(L);
        
        // Set global variables
        lua.lua_pushnumber(L, width);
        lua.lua_setglobal(L, "WIDTH");
        
        lua.lua_pushnumber(L, height);
        lua.lua_setglobal(L, "HEIGHT");
        
        // Load the user's Lua code
        if (lauxlib.luaL_dostring(L, luaCode) !== 0) {
          console.error("Lua execution error:", fengari.to_js(L, -1));
          lua.lua_pop(L, 1);
          return;
        }
        
        ctx.fillStyle = 'black';
        
        // For each pixel in the grid, call the Lua function
        for (let y = 0; y < height; y += gridSize) {
          for (let x = 0; x < width; x += gridSize) {
            // Push the function onto the stack
            lua.lua_getglobal(L, "draw");
            
            // Push arguments
            lua.lua_pushnumber(L, x);
            lua.lua_pushnumber(L, y);
            
            // Call the function with 2 arguments, expecting 1 return value
            if (lua.lua_pcall(L, 2, 1, 0) !== 0) {
              console.error("Error calling draw function:", fengari.to_js(L, -1));
              lua.lua_pop(L, 1);
              continue;
            }
            
            // Get the return value
            const result = lua.lua_toboolean(L, -1);
            lua.lua_pop(L, 1);
            
            if (result) {
              ctx.fillRect(x, y, gridSize, gridSize);
            }
          }
        }
      } catch (error) {
        console.error("Error executing Lua code:", error);
      }
    }
  }, [width, height, gridSize, showGrid, luaCode, luaInterpreter]);
  
  return <canvas ref={canvasRef} width={width} height={height} />;
};

export default Canvas;
