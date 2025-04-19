import React from 'react';

// Define Theme type locally or import if shared
interface Theme {
  colors: {
    secondary: string;
    border: string;
    textSecondary: string;
    inputBorder: string;
    inputBg: string;
    checkboxAccent: string;
  };
  fonts: {
    primary: string;
  };
  layout: {
    controlBarHeight: string;
    borderRadius?: string; // Optional for desktop rounding
  };
}

interface ControlBarProps {
  theme: Theme;
  gridSize: number;
  showGrid: boolean;
  onGridSizeChange: (size: number) => void;
  onShowGridChange: (show: boolean) => void;
  isMobile: boolean; // To generate unique IDs for labels/inputs
}

const ControlBar: React.FC<ControlBarProps> = ({
  theme,
  gridSize,
  showGrid,
  onGridSizeChange,
  onShowGridChange,
  isMobile,
}) => {
  const uniqueIdPrefix = isMobile ? 'mobile' : 'desktop';

  return (
    <div
      className="w-full flex-shrink-0 mt-auto"
      style={{
        backgroundColor: theme.colors.secondary,
        borderTop: `1px solid ${theme.colors.border}`,
        padding: '12px',
        minHeight: theme.layout.controlBarHeight,
        // Apply border radius only if provided (for desktop panel)
        ...(theme.layout.borderRadius && !isMobile && {
            borderBottomLeftRadius: theme.layout.borderRadius,
            borderBottomRightRadius: theme.layout.borderRadius,
        })
      }}
    >
      <div className="flex justify-center items-center gap-8">
        <div className="flex items-center">
          <label
            className="font-semibold mr-2"
            style={{
              fontFamily: theme.fonts.primary,
              color: theme.colors.textSecondary,
            }}
          >
            Grid Size
          </label>
          <input
            type="number"
            value={gridSize}
            onChange={e =>
              onGridSizeChange(parseInt(e.target.value) || 10)
            }
            className="w-16 px-2 py-1 rounded"
            style={{
              border: `1px solid ${theme.colors.inputBorder}`,
              backgroundColor: theme.colors.inputBg,
              color: theme.colors.textSecondary,
            }}
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`showGrid-${uniqueIdPrefix}`}
            checked={showGrid}
            onChange={e => onShowGridChange(e.target.checked)}
            className="mr-2 h-4 w-4"
            style={{ accentColor: theme.colors.checkboxAccent }}
          />
          <label
            htmlFor={`showGrid-${uniqueIdPrefix}`}
            className="font-semibold"
            style={{
              fontFamily: theme.fonts.primary,
              color: theme.colors.textSecondary,
            }}
          >
            Show Grid
          </label>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;