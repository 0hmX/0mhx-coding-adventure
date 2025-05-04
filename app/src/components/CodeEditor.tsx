import React, { useEffect, useRef, memo } from 'react';
import ace from 'ace-builds';

// --- Import necessary modes and theme ---
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

/**
 * Props interface for the CodeEditor component
 * @interface CodeEditorProps
 */
interface CodeEditorProps {
  /** Initial code value for the editor */
  initialValue: string;
  /** Callback function triggered when editor content changes */
  onChange: (value: string) => void;
  /** Programming language for syntax highlighting */
  language: string;
  /** Editor theme name */
  theme?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
}

/**
 * A memoized code editor component using Ace Editor
 * @component
 * @param {CodeEditorProps} props - Component props
 * @returns {JSX.Element} Rendered code editor
 */
const CodeEditor: React.FC<CodeEditorProps> = memo(
  ({
    initialValue,
    onChange,
    language,
    theme = 'ace/theme/monokai',
    fontSize = 20,
    readOnly = false,
  }) => {
    /** Reference to the editor container div element */
    const editorRef = useRef<HTMLDivElement>(null);
    /** Reference to the Ace editor instance */
    // @ts-ignore
    const aceEditorRef = useRef<ace.Ace.Editor | null>(null);
    /** Reference to store the current onChange callback */
    const onChangeRef = useRef(onChange);
    /** Flag to track initial editor setup */
    const isInitializingRef = useRef(true);

    /**
     * Updates the onChange callback reference when the prop changes
     */
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    /**
     * Initializes the Ace editor instance and sets up custom styling
     * @returns {Function} Cleanup function to destroy editor instance
     */
    useEffect(() => {
      if (!editorRef.current) return;

      if (!ace) {
        console.error('Ace editor instance not found.');
        return;
      }

      if (aceEditorRef.current) return;

      console.log('CodeEditor: Initializing Ace Editor...');
      isInitializingRef.current = true;

      // Add custom CSS for Ghibli theme
      const style = document.createElement('style');
      style.id = 'ace-ghibli-style';
      style.innerHTML = `
        .ace_editor {
          font-family: 'VT323', 'Courier New', monospace !important;
          background-color: rgba(51, 41, 32, 0.95) !important;
          line-height: 1.5 !important;
        }
        .ace_line {
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }
        .ace_gutter {
          background-color: rgba(73, 55, 36, 0.8) !important;
          color: #d2b48c !important;
          padding-right: 8px !important;
        }
        .ace_cursor {
          color: #ffefd5 !important;
        }
        .ace_marker-layer .ace_selection {
          background: rgba(139, 69, 19, 0.4) !important;
        }
        .ace_comment {
          color: #a89a85 !important;
        }
        .ace_keyword {
          color: #e6a272 !important;
          font-weight: bold;
        }
        .ace_string {
          color: #b4da82 !important;
        }
        .ace_numeric {
          color: #9ddcff !important;
        }
        .ace_function {
          color: #ffb870 !important;
        }
        .ace_operator {
          color: #ffd39b !important;
        }
        
        /* VS Code-like scrollbar styles */
        .ace_scrollbar {
          width: 14px !important;
        }
        .ace_scrollbar::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
        }
        .ace_scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(121, 82, 50, 0.2) !important;
          border-radius: 0px !important;
          border: 3px solid rgba(51, 41, 32, 0.95) !important;
        }
        .ace_scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(139, 69, 19, 0.7) !important;
        }
        .ace_scrollbar::-webkit-scrollbar-thumb:active {
          background-color: rgba(139, 69, 19, 0.9) !important;
          border: 2px solid rgba(51, 41, 32, 0.95) !important;
        }
        .ace_scrollbar::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .ace_scrollbar::-webkit-scrollbar-track:hover {
          background: rgba(73, 55, 36, 0.1) !important;
        }
        .ace_scrollbar::-webkit-scrollbar-track:active {
          background: rgba(73, 55, 36, 0.2) !important;
        }
        .ace_scrollbar::-webkit-scrollbar-corner {
          background: transparent !important;
        }
        
        /* Horizontal scrollbar */
        .ace_scrollbar-h {
          height: 14px !important;
        }
        .ace_scrollbar-h::-webkit-scrollbar {
          height: 14px !important;
        }
        
        /* Scrollbar position indicator */
        .ace_scrollbar-v .ace_scrollbar-inner {
          background-color: rgba(139, 69, 19, 0.3) !important;
        }
      `;
      document.head.appendChild(style);

      // Load pixelated font
      const fontLink = document.createElement('link');
      fontLink.id = 'pixelated-font';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';
      document.head.appendChild(fontLink);

      aceEditorRef.current = ace.edit(editorRef.current);
      const editor = aceEditorRef.current;

      // --- Set initial options ---
      editor.setOptions({
        theme: theme,
        mode: `ace/mode/${language}`,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
        useWorker: false,
        fontSize: fontSize,
        showGutter: true,
        highlightActiveLine: true,
        highlightSelectedWord: true,
        showPrintMargin: false,
        scrollPastEnd: false,
        readOnly: readOnly,
        fontFamily: "'Press Start 2P', 'VT323', monospace",
      });

      // Set the initial value ONLY during initialization
      editor.setValue(initialValue, -1);

      isInitializingRef.current = false;

      const changeListener = () => {
        if (aceEditorRef.current && !isInitializingRef.current) {
          onChangeRef.current(aceEditorRef.current.getValue());
        }
      };
      editor.on('change', changeListener);

      // Handle resizing
      const resizeObserver = new ResizeObserver(() => editor.resize());
      if (editorRef.current) {
        resizeObserver.observe(editorRef.current);
      }

      // --- Cleanup ---
      return () => {
        console.log('CodeEditor: Cleaning up Ace Editor...');
        resizeObserver.disconnect();
        if (editor) {
          editor.off('change', changeListener);
          editor.destroy();
        }
        aceEditorRef.current = null;
        
        // Remove custom styles
        const customStyle = document.getElementById('ace-ghibli-style');
        if (customStyle) {
          customStyle.remove();
        }
        
        // Remove font link
        const fontLinkElem = document.getElementById('pixelated-font');
        if (fontLinkElem) {
          fontLinkElem.remove();
        }
      };
    }, []);

    /**
     * Updates editor content when initialValue prop changes
     */
    useEffect(() => {
      if (aceEditorRef.current && !isInitializingRef.current) {
        const currentValue = aceEditorRef.current.getValue();
        if (initialValue !== currentValue) {
          console.log('CodeEditor: Received new initialValue prop, updating editor.');
          isInitializingRef.current = true;
          aceEditorRef.current.setValue(initialValue, -1);
          isInitializingRef.current = false;
        }
      }
    }, [initialValue]);

    /**
     * Updates editor language mode when language prop changes
     */
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting mode to ace/mode/${language}`);
        aceEditorRef.current.session.setMode(`ace/mode/${language}`);
      }
    }, [language]);

    /**
     * Updates editor theme when theme prop changes
     */
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting theme to ${theme}`);
        aceEditorRef.current.setTheme(theme);
      }
    }, [theme]);

    /**
     * Updates editor font size when fontSize prop changes
     */
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting font size to ${fontSize}`);
        aceEditorRef.current.setFontSize(fontSize);
      }
    }, [fontSize]);

    /**
     * Updates editor read-only state when readOnly prop changes
     */
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting readOnly to ${readOnly}`);
        aceEditorRef.current.setReadOnly(readOnly);
      }
    }, [readOnly]);

    return (
      <div
        ref={editorRef}
        className="absolute inset-0 h-full w-full"
        style={{ 
          minHeight: '100px',
          border: '2px solid rgba(139, 69, 19, 0.5)',
          borderRadius: '4px',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
        }}
      ></div>
    );
  },
);

// Add display name for better debugging
CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
