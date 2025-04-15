
import React from 'react';
import { Info, Play, LoaderCircle, Sword, Newspaper, HelpCircle } from 'lucide-react';
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
        <div className="flex items-center gap-3">
          <Button
            className="rounded-2xl ml-2 relative overflow-hidden"
            style={{
              color: '#FFF8DC',
              border: '2px solid rgba(210, 180, 140, 0.8)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
              transition: 'all 0.2s ease',
              padding: '0.5rem 1.5rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            <span className="relative z-10 flex items-center">
              <Sword className="h-4 w-4 mr-2" />
              Comming Soon
            </span>
            <div 
              className="absolute inset-0 z-0" 
              style={{
                backgroundImage: 'url("/bg.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.7) saturate(1.2)',
                opacity: 0.9
              }}
            />
            <div 
              className="absolute inset-0 z-0" 
              style={{
                background: 'linear-gradient(45deg, rgba(139, 69, 19, 0.7), rgba(160, 82, 45, 0.7))',
                mixBlendMode: 'multiply'
              }}
            />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <Newspaper className="h-5 w-5" style={{ color: '#8B4513' }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" style={{ 
              backgroundColor: 'rgba(255, 248, 220, 0.95)',
              borderColor: 'rgba(139, 69, 19, 0.5)',
              borderWidth: '2px'
            }}>
              <div className="space-y-2">
                <h3 className="font-medium text-lg" style={{ color: '#8B4513' }}>Latest News</h3>
                <p className="text-sm" style={{ color: '#5D4037' }}>
                  Welcome to the Python Playground! Create beautiful 3D voxel art with simple Python code.
                  Experiment with different patterns and shapes in our interactive environment.
                </p>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <HelpCircle className="h-5 w-5" style={{ color: '#8B4513' }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" style={{ 
              backgroundColor: 'rgba(255, 248, 220, 0.95)',
              borderColor: 'rgba(139, 69, 19, 0.5)',
              borderWidth: '2px'
            }}>
              <div className="space-y-2">
                <h3 className="font-medium text-lg" style={{ color: '#8B4513' }}>About</h3>
                <p className="text-sm" style={{ color: '#5D4037' }}>
                  This playground allows you to create 3D voxel art using Python code.
                  The code executes for each voxel in the 3D grid, determining if it should be visible or not.
                </p>
                <h4 className="font-medium" style={{ color: '#8B4513' }}>Available variables:</h4>
                <ul className="text-sm list-disc pl-4" style={{ color: '#5D4037' }}>
                  <li><code>X</code>, <code>Y</code>, <code>Z</code>: Current voxel coordinates</li>
                  <li><code>GRID_SIZE</code>: Size of the 3D grid</li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <Info className="h-5 w-5" style={{ color: '#8B4513' }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" style={{ 
              backgroundColor: 'rgba(255, 248, 220, 0.95)',
              borderColor: 'rgba(139, 69, 19, 0.5)',
              borderWidth: '2px'
            }}>
              <div className="space-y-2">
                <h3 className="font-medium text-lg" style={{ color: '#8B4513' }}>How to Use</h3>
                <p className="text-sm" style={{ color: '#5D4037' }}>
                  Write a Python function called <code>draw</code> that takes coordinates and returns True or False.
                  Return True to make a voxel visible, or False to make it transparent.
                </p>
                <p className="text-sm" style={{ color: '#5D4037' }}>
                  Experiment with mathematical expressions to create interesting 3D shapes!
                </p>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={onRunCode} 
            disabled={isRunning}
            className="relative overflow-hidden rounded-full group"
            style={{
              backgroundColor: isRunning ? 'rgba(139, 69, 19, 0.6)' : 'rgba(139, 69, 19, 0.8)',
              color: '#FFF8DC',
              border: '2px solid rgba(210, 180, 140, 0.8)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              padding: '0.5rem 1rem',
              fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
              transition: 'all 0.2s ease'
            }}
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
              <span className="absolute inset-0 border-2 border-amber-200/40 rounded-full animate-ping"></span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Navbar;
