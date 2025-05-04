import React from 'react';
import { Button } from '@/components/ui/button';
import { Code, Cuboid, Play, AlertTriangle } from 'lucide-react';

// Define Theme type locally or import if shared
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    textPrimary: string;
    border: string;
    shadow: string;
    bloodRed: string; // For error state
  };
  fonts: {
    primary: string;
  };
  layout: {
    buttonPadding: string;
  };
}

interface MobileControlsProps {
  theme: Theme;
  mobileView: 'editor' | 'canvas';
  onToggle: () => void;
  isRunning: boolean;
  hasError: boolean;
  onRunCode: () => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({
  theme,
  mobileView,
  onToggle,
  isRunning,
  hasError,
  onRunCode,
}) => {
  return (
    <>
      {/* View Toggle Button */}
      <div className="mb-4 flex justify-center">
        <Button
          onClick={onToggle}
          className="rounded-full relative overflow-hidden"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.textPrimary,
            border: `2px solid ${theme.colors.border}`,
            boxShadow: `0 2px 4px ${theme.colors.shadow}`,
            padding: theme.layout.buttonPadding,
            fontFamily: theme.fonts.primary,
            transition: 'all 0.2s ease',
          }}
        >
          <span className="flex items-center">
            {mobileView === 'editor' ? (
              <>
                <Cuboid className="mr-2 h-4 w-4" />
                Switch to Canvas
              </>
            ) : (
              <>
                <Code className="mr-2 h-4 w-4" />
                Switch to Editor
              </>
            )}
          </span>
        </Button>
      </div>

      {/* Floating Action Button (FAB) for Run */}
      <div
        className="absolute bottom-16 right-6 z-50 animate-in fade-in duration-300"
        style={{
          filter: `drop-shadow(0 4px 8px ${theme.colors.shadow})`,
          transform: 'scale(1.2)',
        }}
      >
        <Button
          onClick={onRunCode}
          disabled={isRunning}
          className="h-16 w-16 rounded-full hover:scale-110 transition-transform"
          style={{
            backgroundColor: hasError
              ? theme.colors.bloodRed // Use bloodRed for error state
              : isRunning
              ? theme.colors.secondary
              : theme.colors.primary,
            color: theme.colors.textPrimary,
            border: `2px solid ${hasError ? '#ff6b6b' : theme.colors.border}`, // Highlight border on error
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {hasError ? (
            <AlertTriangle className="h-8 w-8" />
          ) : (
            <Play className={`h-8 w-8 ${isRunning ? 'animate-pulse' : ''}`} />
          )}
        </Button>
      </div>
    </>
  );
};

export default MobileControls;