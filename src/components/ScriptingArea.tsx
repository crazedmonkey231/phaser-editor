import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { useEditorStore } from '../store/editorStore';

function ScriptingArea() {
  const { scene, setScript } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Track whether an update is coming from the store (to avoid loops)
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: scene.script,
        extensions: [
          basicSetup,
          javascript(),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !suppressRef.current) {
              setScript(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once on mount. setScript is a stable Zustand action and
    // does not need to be listed as a dependency—adding it would re-create the editor
    // on every render cycle and destroy the user's cursor position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store → editor when script changes externally (e.g., import)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== scene.script) {
      suppressRef.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: scene.script },
      });
      suppressRef.current = false;
    }
  }, [scene.script]);

  return (
    <div className="scripting-area">
      <div className="scripting-header">
        <span className="scripting-title">Scene Script</span>
        <span className="scripting-hint">
          Use <code style={{ color: '#a78bfa' }}>this</code> for the Phaser Scene inside{' '}
          <code style={{ color: '#a78bfa' }}>create()</code> /{' '}
          <code style={{ color: '#a78bfa' }}>update()</code> (Play mode)
        </span>
      </div>
      <div className="cm-editor-wrap" ref={containerRef} />
    </div>
  );
}

export default ScriptingArea;
