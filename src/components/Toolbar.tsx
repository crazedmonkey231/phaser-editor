import { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { RectangleObject, CircleObject, TextObject } from '../types/scene';

let objectCounter = 0;
const generateObjectId = () => `obj-${++objectCounter}-${Date.now()}`;

function Toolbar() {
  const { scene, selectedObjectId, isPlaying, addObject, removeObject, setPlaying } =
    useEditorStore();
  const importRef = useRef<HTMLInputElement>(null);

  const handleAddRectangle = () => {
    const obj: RectangleObject = {
      id: generateObjectId(),
      type: 'rectangle',
      name: `Rectangle ${scene.objects.length + 1}`,
      x: 100 + scene.objects.length * 20,
      y: 100 + scene.objects.length * 20,
      width: 120,
      height: 80,
      rotation: 0,
      alpha: 1,
      depth: 0,
      visible: true,
      fillColor: '#4444cc',
      strokeColor: '#8888ff',
      strokeWidth: 2,
    };
    addObject(obj);
  };

  const handleAddCircle = () => {
    const obj: CircleObject = {
      id: generateObjectId(),
      type: 'circle',
      name: `Circle ${scene.objects.length + 1}`,
      x: 150 + scene.objects.length * 20,
      y: 150 + scene.objects.length * 20,
      radius: 50,
      rotation: 0,
      alpha: 1,
      depth: 0,
      visible: true,
      fillColor: '#cc4444',
      strokeColor: '#ff8888',
      strokeWidth: 2,
    };
    addObject(obj);
  };

  const handleAddText = () => {
    const obj: TextObject = {
      id: generateObjectId(),
      type: 'text',
      name: `Text ${scene.objects.length + 1}`,
      x: 200,
      y: 200 + scene.objects.length * 30,
      text: 'Hello, Phaser!',
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#ffffff',
      rotation: 0,
      alpha: 1,
      depth: 0,
      visible: true,
    };
    addObject(obj);
  };

  const handleDeleteSelected = () => {
    if (selectedObjectId) removeObject(selectedObjectId);
  };

  const handleExport = () => {
    const json = JSON.stringify(scene, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Replace entire scene (objects + metadata) via a single state update
        useEditorStore.setState({ scene: data, selectedObjectId: null });
      } catch {
        alert('Invalid scene file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTogglePlay = () => {
    setPlaying(!isPlaying);
  };

  return (
    <div className="toolbar">
      <span className="toolbar-title">⚡ Phaser Editor</span>
      <div className="toolbar-divider" />
      <button className="btn" onClick={handleAddRectangle} title="Add Rectangle">
        ▭ Rectangle
      </button>
      <button className="btn" onClick={handleAddCircle} title="Add Circle">
        ● Circle
      </button>
      <button className="btn" onClick={handleAddText} title="Add Text">
        T Text
      </button>
      <div className="toolbar-divider" />
      <button
        className="btn btn-danger"
        onClick={handleDeleteSelected}
        disabled={!selectedObjectId}
        title="Delete Selected"
      >
        🗑 Delete
      </button>
      <div className="toolbar-divider" />
      <button className="btn" onClick={() => importRef.current?.click()} title="Import Scene JSON">
        📂 Import
      </button>
      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <button className="btn" onClick={handleExport} title="Export Scene JSON">
        💾 Export
      </button>
      <div className="toolbar-divider" />
      <button
        className={isPlaying ? 'btn btn-danger' : 'btn btn-success'}
        onClick={handleTogglePlay}
        title={isPlaying ? 'Stop' : 'Play scene'}
      >
        {isPlaying ? '⏹ Stop' : '▶ Play'}
      </button>
    </div>
  );
}

export default Toolbar;
