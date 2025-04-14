
import React from 'react';
import { Info, Play, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from '@/components/ui/card';

interface NavbarProps {
  onRunCode: () => void;
  isRunning: boolean;
}

const Navbar = ({ onRunCode, isRunning }: NavbarProps) => {
  return (
    <Card className="w-full px-4 py-2 mb-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-md">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Lua Playground
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <Info className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h3 className="font-medium text-lg">About Lua Playground</h3>
                <p className="text-sm text-muted-foreground">
                  This playground allows you to write Lua code that generates pixel-based graphics.
                  The code executes for each pixel on the canvas, determining if it should be filled or not.
                </p>
                <h4 className="font-medium">Available variables:</h4>
                <ul className="text-sm text-muted-foreground list-disc pl-4">
                  <li><code>X</code>, <code>Y</code>: Current pixel coordinates</li>
                  <li><code>WIDTH</code>, <code>HEIGHT</code>: Canvas dimensions</li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={onRunCode} 
            disabled={isRunning}
            className="relative overflow-hidden rounded-full group"
            variant="default"
          >
            <span className="flex items-center">
              {isRunning ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Code
                </>
              )}
            </span>
            {isRunning && (
              <span className="absolute inset-0 border-2 border-white/30 rounded-full animate-ping"></span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Navbar;
