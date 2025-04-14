import React, { useEffect, useRef } from 'react';
import ace from 'ace-builds';

// --- Import necessary modes and theme ---
// Import the modes you expect to use (e.g., python, lua)
import 'ace-builds/src-noconflict/mode-python';
// Import the theme
import 'ace-builds/src-noconflict/theme-monokai';
// Import extensions
import 'ace-builds/src-noconflict/ext-language_tools';
// Optional: Import worker files if you encounter issues with syntax checking/linting
// import 'ace-builds/src-noconflict/worker-python'; // Example for Python worker

interface CodeEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  language: string; // e.g., "python", "lua"
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialValue,
  onChange,
  language, // Destructure the language prop
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const aceEditorRef = useRef<ace.Ace.Editor | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChangeRef updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // --- Effect for Editor Initialization ---
  useEffect(() => {
    if (!editorRef.current || aceEditorRef.current) return; // Initialize only once

    aceEditorRef.current = ace.edit(editorRef.current);
    const editor = aceEditorRef.current;

    // --- Set initial options including the dynamic mode ---
    editor.setOptions({
      theme: 'ace/theme/monokai',
      mode: `ace/mode/${language}`, // Use the language prop here
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showLineNumbers: true,
      tabSize: 2,
      useWorker: true, // Set to true if you imported worker files
      fontSize: 14,
      showGutter: true,
      highlightActiveLine: true,
      highlightSelectedWord: true,
      showPrintMargin: false,
      scrollPastEnd: false,
    });

    editor.setValue(initialValue, -1);

    const changeListener = () => {
      if (aceEditorRef.current) {
        onChangeRef.current(aceEditorRef.current.getValue());
      }
    };
    editor.on('change', changeListener);

    const resizeObserver = new ResizeObserver(() => editor.resize());
    resizeObserver.observe(editorRef.current);

    return () => {
      resizeObserver.disconnect();
      if (editor) {
        editor.off('change', changeListener);
        editor.destroy();
        // Attempting manual cleanup (though editor.destroy() should handle most)
        const editorNode = editor.container;
        if (editorNode) {
          // @ts-ignore - These properties might not exist or be directly deletable
          delete editorNode.env;
          // @ts-ignore
          delete editorNode.renderer;
          // @ts-ignore
          delete editorNode.session;
          // @ts-ignore
          delete editorNode.$mouseHandler;
        }
      }
      aceEditorRef.current = null;
    };
    // Add language to dependency array ONLY if you want to re-initialize
    // the entire editor on language change (usually not desired).
    // We handle language changes separately below.
  }, [initialValue]); // Run only once on mount based on initialValue

  // --- Effect to handle language prop changes ---
  useEffect(() => {
    if (aceEditorRef.current) {
      // Update the mode if the language prop changes after initialization
      aceEditorRef.current.session.setMode(`ace/mode/${language}`);
      console.log(`CodeEditor: Mode set to ace/mode/${language}`);
    }
  }, [language]); // Re-run this effect only when the language prop changes

  return (
    <div
      // Consider a more specific ID if needed, but ref is usually sufficient
      // id="editor-container"
      ref={editorRef}
      className="absolute inset-0 h-full w-full" // Ensure parent has relative positioning
    ></div>
  );
};

export default CodeEditor;
