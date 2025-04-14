import React, { useEffect, useRef, memo } from 'react';
import ace from 'ace-builds';

// --- Import necessary modes and theme ---
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

interface CodeEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  language: string;
  theme?: string;
  fontSize?: number;
  readOnly?: boolean;
}

// Wrap component with React.memo
const CodeEditor: React.FC<CodeEditorProps> = memo(
  ({
    initialValue,
    onChange,
    language,
    theme = 'ace/theme/monokai',
    fontSize = 20,
    readOnly = false,
  }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    // @ts-ignore
    const aceEditorRef = useRef<ace.Ace.Editor | null>(null);
    const onChangeRef = useRef(onChange);
    const isInitializingRef = useRef(true);

    // Keep onChangeRef updated without causing re-renders of effects using it
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // --- Effect for Editor Initialization (Runs only ONCE on mount) ---
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

    // Rest of the effects remain the same
    useEffect(() => {
      if (aceEditorRef.current && !isInitializingRef.current) {
        const currentValue = aceEditorRef.current.getValue();
        if (initialValue !== currentValue) {
          console.log(
            'CodeEditor: Received new initialValue prop, updating editor.',
          );
          isInitializingRef.current = true;
          aceEditorRef.current.setValue(initialValue, -1);
          isInitializingRef.current = false;
        }
      }
    }, [initialValue]);

    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting mode to ace/mode/${language}`);
        aceEditorRef.current.session.setMode(`ace/mode/${language}`);
      }
    }, [language]);

    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting theme to ${theme}`);
        aceEditorRef.current.setTheme(theme);
      }
    }, [theme]);

    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting font size to ${fontSize}`);
        aceEditorRef.current.setFontSize(fontSize);
      }
    }, [fontSize]);

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
