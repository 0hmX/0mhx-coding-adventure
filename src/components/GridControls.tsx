
import React from 'react';

interface GridControlsProps {
  gridSize: number;
  showGrid: boolean;
  onGridSizeChange: (size: number) => void;
  onShowGridChange: (show: boolean) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (width: number, height: number) => void;
}

const GridControls: React.FC<GridControlsProps> = ({
  gridSize,
  showGrid,
  onGridSizeChange,
  onShowGridChange,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
}) => {
  return (
    <div className="grid-controls">
      <label>
        Grid Size:
        <input
          type="number"
          min="1"
          max="50"
          value={gridSize}
          onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 1)}
        />
      </label>
      <label>
        Show Grid:
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(e) => onShowGridChange(e.target.checked)}
        />
      </label>
      <label>
        Canvas Width:
        <input
          type="number"
          min="100"
          max="2000"
          value={canvasWidth}
          onChange={(e) => onCanvasSizeChange(parseInt(e.target.value) || 400, canvasHeight)}
        />
      </label>
      <label>
        Canvas Height:
        <input
          type="number"
          min="100"
          max="2000"
          value={canvasHeight}
          onChange={(e) => onCanvasSizeChange(canvasWidth, parseInt(e.target.value) || 400)}
        />
      </label>
    </div>
  );
};

export default GridControls;
