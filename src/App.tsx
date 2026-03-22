import Toolbar from './components/Toolbar';
import SceneBuilder from './components/SceneBuilder';
import PreviewCanvas from './components/PreviewCanvas';
import PropertiesEditor from './components/PropertiesEditor';
import ScriptingArea from './components/ScriptingArea';

function App() {
  return (
    <div className="app-layout">
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
        <ScriptingArea />
      </footer>
    </div>
  );
}

export default App;
