import React, { useEffect, useRef } from 'react';
import { jsPython, Interpreter } from 'jspython-interpreter'; // Import js-python
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Interface remains the same
interface GridControlsProps {
  gridSize: number;
  showGrid: boolean;
  onGridSizeChange: (size: number) => void;
  onShowGridChange: (show: boolean) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (width: number, height: number) => void;
  className?: string;
}


const GridControls: React.FC<GridControlsProps> = ({
  gridSize,
  showGrid,
  onGridSizeChange,
  onShowGridChange,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
  className,
}) => {
  // Use a ref to hold the interpreter instance
  // This prevents re-initializing it on every render
  const interpreterRef = useRef<Interpreter | null>(jsPython());

  // Initialize the js-python interpreter on component mount
  useEffect(() => {
    console.log('Initializing js-python interpreter...');
    // Create the interpreter instance
    const interp = jsPython();

    // Cleanup function to run when the component unmounts
    return () => {
      console.log('Cleaning up js-python interpreter...');
      interpreterRef.current?.cleanUp(); // Clean up resources used by the interpreter
      interpreterRef.current = null;
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  const handleNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    defaultValue: number,
  ): number => {
    const value = parseInt(e.target.value);
    return isNaN(value) ? defaultValue : value;
  };

  const handleGridSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = handleNumberInput(e, 10);
    onGridSizeChange(newSize); // Update state via parent callback
  };

  const handleCanvasWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = handleNumberInput(e, 500);
    onCanvasSizeChange(newWidth, canvasHeight); // Update state via parent callback
  };

  const handleCanvasHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = handleNumberInput(e, 500);
    onCanvasSizeChange(canvasWidth, newHeight); // Update state via parent callback
  };

  return (
    <div
      className={cn(
        'absolute top-4 right-4 z-10 rounded-lg border border-white/10 bg-background/80 p-4 shadow-lg backdrop-blur-sm',
        'grid grid-cols-2 gap-x-4 gap-y-3', // Grid layout
        className,
      )}
    >
      {/* Grid Size */}
      <div className="col-span-1 flex flex-col space-y-1">
        <Label htmlFor="gridSize" className="text-xs text-muted-foreground">
          Grid Size
        </Label>
        <Input
          id="gridSize"
          type="number"
          min="1"
          max="50"
          value={gridSize}
          onChange={handleGridSizeChange} // Use updated handler
          className="h-8 text-sm"
        />
      </div>

      {/* Show Grid Toggle */}
      <div className="col-span-1 flex items-center justify-start space-x-2 pt-5">
        <Checkbox
          id="showGrid"
          checked={showGrid}
          // No Python needed here, standard callback
          onCheckedChange={(checked) => onShowGridChange(Boolean(checked))}
        />
        <Label
          htmlFor="showGrid"
          className="cursor-pointer text-xs text-muted-foreground"
        >
          Show Grid
        </Label>
      </div>

      {/* Canvas Width */}
      <div className="col-span-1 flex flex-col space-y-1">
        <Label htmlFor="canvasWidth" className="text-xs text-muted-foreground">
          Width (px)
        </Label>
        <Input
          id="canvasWidth"
          type="number"
          min="100"
          max="2000"
          step="10"
          value={canvasWidth}
          onChange={handleCanvasWidthChange} // Use updated handler
          className="h-8 text-sm"
        />
      </div>

      {/* Canvas Height */}
      <div className="col-span-1 flex flex-col space-y-1">
        <Label htmlFor="canvasHeight" className="text-xs text-muted-foreground">
          Height (px)
        </Label>
        <Input
          id="canvasHeight"
          type="number"
          min="100"
          max="2000"
          step="10"
          value={canvasHeight}
          onChange={handleCanvasHeightChange} // Use updated handler
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
};

export default GridControls;
