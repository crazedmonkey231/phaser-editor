import { useCallback, useEffect, useRef, useState } from 'react';
import Toolbar from './components/Toolbar';
import SceneBuilder from './components/SceneBuilder';
import PreviewCanvas from './components/PreviewCanvas';
import PropertiesEditor from './components/PropertiesEditor';
import ScriptingArea from './components/ScriptingArea';

const MIN_SCRIPT_HEIGHT = 100;
const MAX_SCRIPT_HEIGHT = 600;

function App() {
  const [scriptHeight, setScriptHeight] = useState(200);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const onDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartHeight.current = scriptHeight;
      e.preventDefault();
    },
    [scriptHeight]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      setScriptHeight(
        Math.max(MIN_SCRIPT_HEIGHT, Math.min(MAX_SCRIPT_HEIGHT, dragStartHeight.current + delta))
      );
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="app-layout" style={{ gridTemplateRows: `48px 1fr ${scriptHeight}px` }}>
      <header className="app-toolbar">
        <Toolbar />
      </header>
      <main className="app-main">
        <aside className="panel panel-left">
          <SceneBuilder />
        </aside>
        <section className="panel panel-center">
          <PreviewCanvas />
        </section>
        <aside className="panel panel-right">
          <PropertiesEditor />
        </aside>
      </main>
      <footer className="app-scripting">
        <div className="scripting-resize-handle" onMouseDown={onDragStart} />
        <ScriptingArea />
      </footer>
    </div>
  );
}

export default App;
