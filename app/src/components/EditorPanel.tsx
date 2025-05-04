import React from 'react';
import CodeEditor from './CodeEditor'; // Assuming CodeEditor is in the same dir or adjust path

// Define Theme type locally or import if shared
interface Theme {
  colors: {
    panelBg: string;
    border: string;
  };
}

interface EditorPanelProps {
  theme: Theme;
  pythonCode: string;
  onCodeChange: (newCode: string) => void;
  isMobile?: boolean; // Optional flag if mobile styling differs significantly
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  theme,
  pythonCode,
  onCodeChange,
  isMobile = false, // Default to false
}) => {
  // Use isMobile flag if specific mobile styles are needed later
  const panelClasses = `flex h-full flex-col overflow-hidden border ${
    isMobile ? 'rounded-xl' : 'rounded-l-xl' // Adjust rounding based on context
  }`;
  const borderStyle = isMobile ? {} : { borderRightWidth: 0 }; // No right border on desktop left panel

  return (
    <div
      className={panelClasses}
      style={{
        backgroundColor: theme.colors.panelBg,
        borderColor: theme.colors.border,
        ...borderStyle,
      }}
    >
      <div className="relative flex-grow">
        <CodeEditor
          language="python"
          initialValue={pythonCode}
          onChange={onCodeChange}
        />
      </div>
    </div>
  );
};

export default EditorPanel;