
import React, { useEffect, useRef } from 'react';
import ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-lua';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

interface CodeEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ initialValue, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const aceEditorRef = useRef<ace.Ace.Editor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize Ace Editor
    aceEditorRef.current = ace.edit(editorRef.current);
    const editor = aceEditorRef.current;
    
    // Configure editor
    editor.setTheme('ace/theme/monokai');
    editor.session.setMode('ace/mode/lua');
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showLineNumbers: true,
      tabSize: 2,
      fontSize: 14,
    });
    
    // Set initial value
    editor.setValue(initialValue, -1);
    
    // Add change listener
    editor.on('change', () => {
      const value = editor.getValue();
      onChange(value);
    });
    
    // Clean up
    return () => {
      editor.destroy();
      aceEditorRef.current = null;
    };
  }, [initialValue, onChange]);

  return <div id="editor" ref={editorRef}></div>;
};

export default CodeEditor;
