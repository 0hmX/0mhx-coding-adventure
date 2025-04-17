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
import { jsPython, type Interpreter } from '../../submodules/jspython/src/interpreter';
import { Button } from '@/components/ui/button';
import { Code, Cuboid, Play, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * @typedef {object} ThemeColors
 * @property {string} primary - Primary interactive color (e.g., buttons).
 * @property {string} secondary - Secondary background/accent color.
 * @property {string} background - Main background color/image.
 * @property {string} panelBg - Background for code editor and canvas panels.
 * @property {string} textPrimary - Primary text color, often on dark backgrounds.
 * @property {string} textSecondary - Secondary text color, often for labels.
 * @property {string} textHeader - Color for the main header text (original).
 * @property {string} bloodRed - Deep red color for the styled header.
 * @property {string} border - Border color for panels and elements.
 * @property {string} inputBg - Background color for input fields.
 * @property {string} inputBorder - Border color for input fields.
 * @property {string} checkboxAccent - Accent color for checkboxes.
 * @property {string} handleBg - Background color for the resizable handle.
 * @property {string} shadow - Default box shadow color/value.
 * @property {string} textShadow - Default text shadow color/value.
 * @property {string} bloodShadowDark - Darker shadow for blood effect.
 * @property {string} bloodShadowMid - Mid-tone shadow for blood effect.
 * @property {string} bloodShadowLight - Lighter shadow for blood effect.
 */

/**
 * @typedef {object} ThemeFonts
 * @property {string} primary - Primary font family for UI text.
 * @property {string} header - Font family specifically for the main header.
 */

/**
 * @typedef {object} ThemeLayout
 * @property {string} borderRadius - Standard border radius for panels.
 * @property {string} padding - Standard padding value.
 * @property {string} controlBarHeight - Minimum height for the control bar.
 */

/**
 * @typedef {object} ThemeBackground
 * @property {string} image - URL for the background image.
 * @property {string} size - Background size property.
 * @property {string} position - Background position property.
 * @property {string} attachment - Background attachment property.
 */

/**
 * @typedef {object} Theme
 * @property {ThemeColors} colors - Color palette.
 * @property {ThemeFonts} fonts - Font families.
 * @property {ThemeLayout} layout - Layout properties like padding and border radius.
 * @property {ThemeBackground} background - Background image properties.
 */

/**
 * Theme object defining the visual style of the application.
 * @type {Theme}
 */
const theme = {
  colors: {
    primary: 'rgba(139, 69, 19, 0.8)', // SaddleBrown-ish, semi-transparent
    secondary: 'rgba(210, 180, 140, 0.85)', // Tan-ish, semi-transparent
    panelBg: 'rgba(57, 52, 43, 0.9)', // Dark Olive/Brown, semi-transparent
    textPrimary: '#FFF8DC', // Cornsilk
    textSecondary: '#5D3A1A', // Darker Brown for labels
    textHeader: '#A0522D', // Sienna (original)
    bloodRed: '#8b0000', // DarkRed
    border: 'rgba(139, 69, 19, 0.5)', // SaddleBrown-ish, more transparent
    inputBg: '#FFF8DC', // Cornsilk (approximates amber-50)
    inputBorder: '#8B4513', // SaddleBrown (approximates amber-700)
    checkboxAccent: '#8B4513', // SaddleBrown (approximates amber-700)
    handleBg: 'rgba(139, 69, 19, 0.3)', // SaddleBrown-ish, very transparent
    shadow: 'rgba(0,0,0,0.15)',
    textShadow: 'rgba(0,0,0,0.3)',
    // Colors for the blood drip text shadow effect
    bloodShadowDark: 'rgba(50, 0, 0, 0.8)',
    bloodShadowMid: 'rgba(100, 0, 0, 0.6)',
    bloodShadowLight: 'rgba(139, 0, 0, 0.4)',
  },
  fonts: {
    primary: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    // Consider a more dramatic font if available, otherwise Palatino is fine
    header: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    // Example alternative: header: '"Creepster", cursive', // Needs Google Font import
  },
  layout: {
    borderRadius: '0.75rem', // Corresponds to rounded-xl
    padding: '1rem', // Corresponds to p-4
    controlBarHeight: '60px',
    panelShadow: '0 8px 32px rgba(0,0,0,0.15)',
    buttonPadding: '0.5rem 1.5rem',
  },
  background: {
    image: 'url("/bg.png")',
    size: 'cover',
    position: 'center',
    attachment: 'fixed',
  },
};

/**
 * Default Python code provided in the editor.
 * Includes a function to determine pixel color based on 3D coordinates.
 * @type {string}
 */
const DEFAULT_PYTHON_CODE = 
`# Copyright (c) 2023 0hmX
# SPDX-License-Identifier: MIT

def draw(X, Y, Z, GRID_SIZE):
  center = (GRID_SIZE - 1) / 2.0
  dist_from_center = sqrt(
      (X - center)**2 + (Y - center)**2 + (Z - center)**2
  )
  outer_radius = GRID_SIZE * 0.45
  inner_radius = GRID_SIZE * 0.30
  is_in_shell = inner_radius <= dist_from_center <= outer_radius
  if is_in_shell:
    if mod(floor(X) + floor(Y) + floor(Z), 2) == 0:
      return "red"
    else:
      return False
  else:
    return False
`;

/**
 * Main application component integrating the code editor and 3D canvas.
 * @returns {JSX.Element} The rendered application UI.
 */
const Index = () => {
  /** State for the Python code in the editor */
  const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
  /** State for the size of the grid (N x N x N) */
  const [gridSize, setGridSize] = useState(10);
  /** State to toggle the visibility of the grid lines on the canvas */
  const [showGrid, setShowGrid] = useState(true);
  /** State for the desired width of the canvas component */
  const [canvasWidth, setCanvasWidth] = useState(500);
  /** State for the desired height of the canvas component */
  const [canvasHeight, setCanvasHeight] = useState(500);
  /** State holding the js-python interpreter instance */
  const [pythonInterpreter, setPythonInterpreter] =
    useState<Interpreter | null>(null);
  /** State indicating if the Python code is currently being executed */
  const [isRunning, setIsRunning] = useState(false);
  /** State acting as a trigger for the Canvas component to run the code */
  const [shouldRun, setShouldRun] = useState(false);
  /** State to track errors in the Python code execution */
  const [error, setError] = useState<Error | null>(null);
  /** Hook to detect if the current view is mobile */
  const isMobile = useIsMobile();
  /** State to toggle between 'editor' and 'canvas' view on mobile */
  const [mobileView, setMobileView] = useState<'editor' | 'canvas'>('editor');
  /** Toast hook for showing error notifications */
  const { toast } = useToast();

  /**
   * Initializes the js-python interpreter when the component mounts
   * and cleans it up when the component unmounts.
   */
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

  /**
   * Updates the pythonCode state when the editor content changes.
   * @param {string} newCode - The updated Python code.
   */
  const handleCodeChange = (newCode: string) => {
    setPythonCode(newCode);
    // Reset error state when code changes
    if (error) {
      setError(null);
    }
  };

  /**
   * Updates the gridSize state.
   * @param {number} size - The new grid size.
   */
  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
  };

  /**
   * Updates the showGrid state.
   * @param {boolean} show - Whether to show the grid.
   */
  const handleShowGridChange = (show: boolean) => {
    setShowGrid(show);
  };

  /**
   * Handles the click event of the 'Run' button.
   * Sets flags to initiate code execution in the Canvas component.
   */
  const handleRunCode = () => {
    if (!pythonInterpreter) {
      console.error('Python interpreter not initialized yet.');
      return;
    }
    
    // Reset error state before running
    setError(null);
    
    // Try to parse the code first to catch syntax errors
    try {
      pythonInterpreter.parse(pythonCode);
    } catch (err) {
      console.error('Python syntax error:', err);
      const syntaxError = err instanceof Error ? err : new Error(String(err));
      setError(syntaxError);
      toast({
        title: "Syntax Error",
        description: syntaxError.message,
        variant: "destructive",
      });
      return;
    }
    
    console.log('Run button clicked, setting shouldRun=true');
    setIsRunning(true);
    setShouldRun(true);
  };

  /**
   * Callback function passed to the Canvas component.
   * Called when the canvas finishes executing the Python code.
   * Resets the execution flags.
   */
  const handleRunComplete = (err?: Error) => {
    console.log('Canvas reported run complete, setting shouldRun=false');
    setShouldRun(false);
    setIsRunning(false);
    
    if (err) {
      console.error('Error during Python execution:', err);
      setError(err);
      toast({
        title: "Execution Error",
        description: err.message || 'An error occurred while running your code',
        variant: "destructive",
      });
    }
  };

  /**
   * Toggles the view between the code editor and the canvas on mobile devices.
   */
  const toggleMobileView = () => {
    setMobileView(prev => (prev === 'editor' ? 'canvas' : 'editor'));
  };

  // Define the complex text shadow for the blood drip effect
  const bloodDripShadow = `
    1px 1px 1px ${theme.colors.bloodShadowDark},
    0px 2px 1px ${theme.colors.bloodShadowDark},
    0px 4px 3px ${theme.colors.bloodShadowMid},
    0px 6px 5px ${theme.colors.bloodShadowLight},
    0px 8px 8px ${theme.colors.bloodShadowLight}
  `;
  // Optional: Add slight variations for specific letters if desired,
  // but that would require spans or more complex CSS selectors.

  // Check if there's an error
  const hasError = error !== null;

  return (
    <div
      className="min-h-screen w-screen overflow-hidden p-4"
      style={{
        backgroundImage: theme.background.image,
        backgroundSize: theme.background.size,
        backgroundPosition: theme.background.position,
        backgroundAttachment: theme.background.attachment,
      }}
    >
      <div className="mb-4 text-center">
        <h1
          className="text-4xl font-bold" // Keep font-bold for weight
          style={{
            color: theme.colors.bloodRed, // Use the deep red color
            fontFamily: theme.fonts.header,
            textShadow: bloodDripShadow, // Apply the dripping shadow effect
            // Optional: Add a very slight rotation for unease
            // transform: 'rotate(-1deg)',
          }}
        >
          Created By 0hmX
        </h1>
      </div>

      {/* Show Navbar only on desktop */}
      {!isMobile && (
        <div className="mb-4">
          <Navbar onRunCode={handleRunCode} isRunning={isRunning} error={error} />
        </div>
      )}

      {/* Mobile view controls */}
      {isMobile && (
        <>
          <div className="mb-4 flex justify-center">
            <Button onClick={toggleMobileView} className="rounded-full relative overflow-hidden"
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

          {/* Floating action button for run */}
          <div
            className="absolute bottom-16 right-6 z-50 animate-in fade-in duration-300"
            style={{
              filter: `drop-shadow(0 4px 8px ${theme.colors.shadow})`,
              transform: 'scale(1.2)',
            }}
          >
            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              className="h-16 w-16 rounded-full hover:scale-110 transition-transform"
              style={{
                backgroundColor: hasError 
                  ? '#8b0000' // Use bloodRed for error state
                  : isRunning 
                    ? theme.colors.secondary 
                    : theme.colors.primary,
                color: theme.colors.textPrimary,
                border: `2px solid ${hasError ? '#ff6b6b' : theme.colors.border}`,
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
      )}

      {isMobile ? (
        <div
          className="h-[calc(100vh-220px)] w-full overflow-hidden rounded-xl"
          style={{ boxShadow: theme.layout.panelShadow }}
        >
          {mobileView === 'editor' ? (
            <div
              className="flex h-full flex-col overflow-hidden rounded-xl border"
              style={{
                backgroundColor: theme.colors.panelBg,
                borderColor: theme.colors.border,
              }}
            >
              <div className="relative flex-grow">
                <CodeEditor
                  language="python"
                  initialValue={pythonCode}
                  onChange={handleCodeChange}
                />
              </div>
            </div>
          ) : (
            <div
              className="relative h-full overflow-hidden rounded-xl border"
              style={{
                backgroundColor: theme.colors.panelBg,
                borderColor: theme.colors.border,
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
                    backgroundColor: theme.colors.secondary,
                    borderTop: `1px solid ${theme.colors.border}`,
                    padding: '12px',
                    minHeight: theme.layout.controlBarHeight,
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
                          handleGridSizeChange(parseInt(e.target.value) || 10)
                        }
                        className="w-16 px-2 py-1 rounded"
                        style={{
                          border: `1px solid ${theme.colors.inputBorder}`,
                          backgroundColor: theme.colors.inputBg,
                          color: theme.colors.textSecondary, // Ensure text is visible
                        }}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showGridMobile" /** Unique ID for mobile */
                        checked={showGrid}
                        onChange={e => handleShowGridChange(e.target.checked)}
                        className="mr-2 h-4 w-4"
                        style={{ accentColor: theme.colors.checkboxAccent }}
                      />
                      <label
                        htmlFor="showGridMobile"
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
              </div>
            </div>
          )}
        </div>
      ) : (
        // Desktop layout with resizable panels
        <div className='h-[calc(100vh-180px)]'>
        <ResizablePanelGroup
          direction="horizontal"
          // Added mb-4 here for the bottom gap
          className="w-full rounded-xl overflow-hidden mb-10"
          style={{ boxShadow: theme.layout.panelShadow }}
        >
          <ResizablePanel defaultSize={50} minSize={30}>
            <div
              className="flex h-full flex-col overflow-hidden rounded-l-xl border"
              style={{
                backgroundColor: theme.colors.panelBg,
                borderColor: theme.colors.border,
                borderRightWidth: 0,
              }}
            >
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
              backgroundColor: theme.colors.handleBg,
            }}
          />

          <ResizablePanel defaultSize={50} minSize={30}>
            <div
              className="relative h-full overflow-hidden rounded-r-xl border"
              style={{
                backgroundColor: theme.colors.panelBg,
                borderColor: theme.colors.border,
                borderLeftWidth: 0,
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex-grow flex items-center justify-center overflow-hidden p-2">
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
                    backgroundColor: theme.colors.secondary,
                    borderTop: `1px solid ${theme.colors.border}`,
                    padding: '12px',
                    minHeight: theme.layout.controlBarHeight,
                    borderBottomLeftRadius: theme.layout.borderRadius,
                    borderBottomRightRadius: theme.layout.borderRadius,
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
                          handleGridSizeChange(parseInt(e.target.value) || 10)
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
                        id="showGridDesktop" /** Unique ID for desktop */
                        checked={showGrid}
                        onChange={e => handleShowGridChange(e.target.checked)}
                        className="mr-2 h-4 w-4"
                        style={{ accentColor: theme.colors.checkboxAccent }}
                      />
                      <label
                        htmlFor="showGridDesktop"
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
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      )}
    </div>
  );
};

export default Index;