import React, { useEffect, useRef, memo } from 'react';
import ace from 'ace-builds';

// --- Import necessary modes and theme ---
import 'ace-builds/src-noconflict/mode-python';
// import 'ace-builds/src-noconflict/mode-lua'; // Added Lua for example
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
// Optional: Import worker files if needed
// import 'ace-builds/src-noconflict/worker-python';

interface CodeEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  language: string; // e.g., "python", "lua"
  // Add other Ace options as props if you want them configurable
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
    theme = 'ace/theme/monokai', // Default theme
    fontSize = 14, // Default font size
    readOnly = false, // Default readOnly state
  }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    // @ts-ignore
    const aceEditorRef = useRef<ace.Ace.Editor | null>(null);
    const onChangeRef = useRef(onChange);
    const isInitializingRef = useRef(true); // Flag to manage initial value setting

    // Keep onChangeRef updated without causing re-renders of effects using it
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // --- Effect for Editor Initialization (Runs only ONCE on mount) ---
    useEffect(() => {
      if (!editorRef.current) return; // Should not happen if div exists

      // Ensure Ace is loaded - sometimes needed in certain environments
      if (!ace) {
        console.error('Ace editor instance not found.');
        return;
      }

      // Prevent re-initialization if already done
      if (aceEditorRef.current) return;

      console.log('CodeEditor: Initializing Ace Editor...');
      isInitializingRef.current = true; // Set flag before setting value

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
        useWorker: false, // Set true only if workers are correctly configured
        fontSize: fontSize,
        showGutter: true,
        highlightActiveLine: true,
        highlightSelectedWord: true,
        showPrintMargin: false,
        scrollPastEnd: false,
        readOnly: readOnly,
      });

      // Set the initial value ONLY during initialization
      editor.setValue(initialValue, -1); // Move cursor to the start

      isInitializingRef.current = false; // Clear flag after setting initial value

      const changeListener = () => {
        // Avoid calling onChange during the initial setValue
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
          editor.destroy(); // This is the primary cleanup method
          // The container node is destroyed, manual deletion is usually not needed
        }
        aceEditorRef.current = null; // Clear the ref
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // <-- EMPTY dependency array: Run only once on mount

    // --- Effect to handle EXTERNAL changes to initialValue (Optional) ---
    // This effect allows the parent to programmatically reset the editor's
    // content by changing the initialValue prop AFTER the initial mount.
    // Be cautious with this, as it can conflict with user input if not managed carefully.
    useEffect(() => {
      if (aceEditorRef.current && !isInitializingRef.current) {
        const currentValue = aceEditorRef.current.getValue();
        // Only update if the prop value is different from the current editor value
        if (initialValue !== currentValue) {
          console.log(
            'CodeEditor: Received new initialValue prop, updating editor.',
          );
          // Set flag to prevent onChange during this programmatic change
          isInitializingRef.current = true;
          aceEditorRef.current.setValue(initialValue, -1);
          isInitializingRef.current = false;
        }
      }
      // This effect should run when initialValue changes *after* mount
    }, [initialValue]);

    // --- Effect to handle language prop changes ---
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting mode to ace/mode/${language}`);
        aceEditorRef.current.session.setMode(`ace/mode/${language}`);
      }
    }, [language]); // Re-run only when language changes

    // --- Effect to handle theme prop changes ---
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting theme to ${theme}`);
        aceEditorRef.current.setTheme(theme);
      }
    }, [theme]); // Re-run only when theme changes

    // --- Effect to handle fontSize prop changes ---
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting font size to ${fontSize}`);
        aceEditorRef.current.setFontSize(fontSize);
      }
    }, [fontSize]); // Re-run only when fontSize changes

    // --- Effect to handle readOnly prop changes ---
    useEffect(() => {
      if (aceEditorRef.current) {
        console.log(`CodeEditor: Setting readOnly to ${readOnly}`);
        aceEditorRef.current.setReadOnly(readOnly);
      }
    }, [readOnly]); // Re-run only when readOnly changes

    return (
      <div
        ref={editorRef}
        className="absolute inset-0 h-full w-full" // Ensure parent has relative positioning
        style={{ minHeight: '100px' }} // Example: Ensure minimum height
      ></div>
    );
  },
);

// Add display name for better debugging
CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
