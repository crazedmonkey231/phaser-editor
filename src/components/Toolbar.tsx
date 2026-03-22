import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { RectangleObject, CircleObject, TextObject } from '../types/scene';

const generateObjectId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `obj-${crypto.randomUUID()}`
    : `obj-${Math.random().toString(36).slice(2)}-${Date.now()}`;

function Toolbar() {
  const { scene, selectedObjectId, isPlaying, snapToGrid, gridSize, addObject, removeObject, setPlaying, setSnapToGrid, setGridSize } =
    useEditorStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);

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

  const addObjectAndClose = (addHandler: () => void) => {
    addHandler();
    setAddDropdownOpen(false);
  };

  // Close the "Add Object" dropdown when clicking outside it
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Delete selected object with the Delete or Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const { selectedObjectId: id, removeObject: remove } = useEditorStore.getState();
      if (id) remove(id);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="toolbar">
      <span className="toolbar-title">⚡ Phaser Editor</span>
      <div className="toolbar-divider" />
      <div className="add-object-dropdown" ref={addDropdownRef}>
        <button
          className="btn"
          onClick={() => setAddDropdownOpen((prev: boolean) => !prev)}
          title="Add Object"
        >
          ＋ Add Object ▾
        </button>
        {addDropdownOpen && (
          <div className="dropdown-menu">
            <button
              className="dropdown-item"
              onClick={() => addObjectAndClose(handleAddRectangle)}
            >
              ▭ Rectangle
            </button>
            <button
              className="dropdown-item"
              onClick={() => addObjectAndClose(handleAddCircle)}
            >
              ● Circle
            </button>
            <button
              className="dropdown-item"
              onClick={() => addObjectAndClose(handleAddText)}
            >
              T Text
            </button>
          </div>
        )}
      </div>
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
      <div className="toolbar-divider" />
      <label className="snap-toggle" title="Snap to Grid">
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        <span>⊞ Snap</span>
      </label>
      <input
        className="grid-size-input"
        type="number"
        min="4"
        max="128"
        step="4"
        value={gridSize}
        disabled={!snapToGrid}
        onChange={(e) => setGridSize(Math.max(4, Number(e.target.value)))}
        title="Grid size (px)"
      />
      <span className="grid-size-label">px</span>
    </div>
  );
}

export default Toolbar;
