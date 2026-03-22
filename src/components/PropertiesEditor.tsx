import { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { AnyGameObject, RectangleObject, CircleObject, TextObject, ImageObject, SnapOrigin } from '../types/scene';

function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  );
}

function ImagePicker({ currentKey, onSelect }: { currentKey: string; onSelect: (key: string) => void }) {
  const { assets, addAsset } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let key = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!key) key = `image_${Date.now()}`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      addAsset({ key, dataUrl, filename: file.name });
      onSelect(key);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="image-picker">
      <button className="btn image-picker-upload" onClick={() => fileInputRef.current?.click()}>
        + Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      {assets.length === 0 && (
        <div className="image-picker-empty">No images uploaded yet.</div>
      )}
      <div className="image-picker-grid">
        {assets.map((asset) => (
          <button
            key={asset.key}
            className={`image-picker-thumb${currentKey === asset.key ? ' selected' : ''}`}
            title={asset.filename}
            onClick={() => onSelect(asset.key)}
          >
            <img src={asset.dataUrl} alt={asset.filename} />
            <span>{asset.key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertiesEditor() {
  const { scene, selectedObjectId, updateObject, updateScene } = useEditorStore();
  const selectedObj = scene.objects.find((o) => o.id === selectedObjectId) ?? null;

  if (!selectedObj) {
    return (
      <div className="properties-editor">
        <div className="panel-header">Properties — Scene</div>
        <div className="properties-body">
          <div className="prop-section">
            <div className="prop-section-title">Scene</div>
            <PropRow label="Name">
              <input
                className="prop-input"
                value={scene.name}
                onChange={(e) => updateScene({ name: e.target.value })}
              />
            </PropRow>
            <PropRow label="BG Color">
              <input
                className="prop-input"
                type="color"
                value={scene.backgroundColor}
                onChange={(e) => updateScene({ backgroundColor: e.target.value })}
              />
              <input
                className="prop-input"
                value={scene.backgroundColor}
                onChange={(e) => updateScene({ backgroundColor: e.target.value })}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
            <PropRow label="Width">
              <input
                className="prop-input"
                type="number"
                value={scene.width}
                onChange={(e) => updateScene({ width: Number(e.target.value) })}
              />
            </PropRow>
            <PropRow label="Height">
              <input
                className="prop-input"
                type="number"
                value={scene.height}
                onChange={(e) => updateScene({ height: Number(e.target.value) })}
              />
            </PropRow>
          </div>
        </div>
      </div>
    );
  }

  const upd = (updates: Partial<AnyGameObject>) => updateObject(selectedObj.id, updates);

  return (
    <div className="properties-editor">
      <div className="panel-header">Properties — {selectedObj.name}</div>
      <div className="properties-body">
        {/* Common */}
        <div className="prop-section">
          <div className="prop-section-title">Common</div>
          <PropRow label="Name">
            <input
              className="prop-input"
              value={selectedObj.name}
              onChange={(e) => upd({ name: e.target.value })}
            />
          </PropRow>
          <PropRow label="X">
            <input
              className="prop-input"
              type="number"
              value={selectedObj.x}
              onChange={(e) => upd({ x: Number(e.target.value) })}
            />
          </PropRow>
          <PropRow label="Y">
            <input
              className="prop-input"
              type="number"
              value={selectedObj.y}
              onChange={(e) => upd({ y: Number(e.target.value) })}
            />
          </PropRow>
          <PropRow label="Rotation">
            <input
              className="prop-input"
              type="number"
              step="0.01"
              value={selectedObj.rotation}
              onChange={(e) => upd({ rotation: Number(e.target.value) })}
            />
          </PropRow>
          <PropRow label="Alpha">
            <input
              className="prop-input"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={selectedObj.alpha}
              onChange={(e) => upd({ alpha: Number(e.target.value) })}
            />
          </PropRow>
          <PropRow label="Depth">
            <input
              className="prop-input"
              type="number"
              value={selectedObj.depth}
              onChange={(e) => upd({ depth: Number(e.target.value) })}
            />
          </PropRow>
          <PropRow label="Visible">
            <input
              className="prop-input"
              type="checkbox"
              checked={selectedObj.visible}
              onChange={(e) => upd({ visible: e.target.checked })}
            />
          </PropRow>
          <PropRow label="Snap Origin">
            <select
              className="prop-input"
              value={selectedObj.snapOrigin ?? 'center'}
              onChange={(e) => upd({ snapOrigin: e.target.value as SnapOrigin })}
            >
              <option value="center">Center</option>
              <option value="topLeft">Top Left</option>
              <option value="topRight">Top Right</option>
              <option value="bottomLeft">Bottom Left</option>
              <option value="bottomRight">Bottom Right</option>
            </select>
          </PropRow>
        </div>

        {/* Rectangle */}
        {selectedObj.type === 'rectangle' && (
          <div className="prop-section">
            <div className="prop-section-title">Rectangle</div>
            <PropRow label="Width">
              <input
                className="prop-input"
                type="number"
                value={(selectedObj as RectangleObject).width}
                onChange={(e) => upd({ width: Number(e.target.value) } as Partial<RectangleObject>)}
              />
            </PropRow>
            <PropRow label="Height">
              <input
                className="prop-input"
                type="number"
                value={(selectedObj as RectangleObject).height}
                onChange={(e) => upd({ height: Number(e.target.value) } as Partial<RectangleObject>)}
              />
            </PropRow>
            <PropRow label="Fill">
              <input
                className="prop-input"
                type="color"
                value={(selectedObj as RectangleObject).fillColor}
                onChange={(e) => upd({ fillColor: e.target.value } as Partial<RectangleObject>)}
              />
              <input
                className="prop-input"
                value={(selectedObj as RectangleObject).fillColor}
                onChange={(e) => upd({ fillColor: e.target.value } as Partial<RectangleObject>)}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
            <PropRow label="Stroke">
              <input
                className="prop-input"
                type="color"
                value={(selectedObj as RectangleObject).strokeColor}
                onChange={(e) => upd({ strokeColor: e.target.value } as Partial<RectangleObject>)}
              />
              <input
                className="prop-input"
                value={(selectedObj as RectangleObject).strokeColor}
                onChange={(e) => upd({ strokeColor: e.target.value } as Partial<RectangleObject>)}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
            <PropRow label="Stroke W">
              <input
                className="prop-input"
                type="number"
                min="0"
                value={(selectedObj as RectangleObject).strokeWidth}
                onChange={(e) => upd({ strokeWidth: Number(e.target.value) } as Partial<RectangleObject>)}
              />
            </PropRow>
          </div>
        )}

        {/* Circle */}
        {selectedObj.type === 'circle' && (
          <div className="prop-section">
            <div className="prop-section-title">Circle</div>
            <PropRow label="Radius">
              <input
                className="prop-input"
                type="number"
                value={(selectedObj as CircleObject).radius}
                onChange={(e) => upd({ radius: Number(e.target.value) } as Partial<CircleObject>)}
              />
            </PropRow>
            <PropRow label="Fill">
              <input
                className="prop-input"
                type="color"
                value={(selectedObj as CircleObject).fillColor}
                onChange={(e) => upd({ fillColor: e.target.value } as Partial<CircleObject>)}
              />
              <input
                className="prop-input"
                value={(selectedObj as CircleObject).fillColor}
                onChange={(e) => upd({ fillColor: e.target.value } as Partial<CircleObject>)}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
            <PropRow label="Stroke">
              <input
                className="prop-input"
                type="color"
                value={(selectedObj as CircleObject).strokeColor}
                onChange={(e) => upd({ strokeColor: e.target.value } as Partial<CircleObject>)}
              />
              <input
                className="prop-input"
                value={(selectedObj as CircleObject).strokeColor}
                onChange={(e) => upd({ strokeColor: e.target.value } as Partial<CircleObject>)}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
            <PropRow label="Stroke W">
              <input
                className="prop-input"
                type="number"
                min="0"
                value={(selectedObj as CircleObject).strokeWidth}
                onChange={(e) => upd({ strokeWidth: Number(e.target.value) } as Partial<CircleObject>)}
              />
            </PropRow>
          </div>
        )}

        {/* Text */}
        {selectedObj.type === 'text' && (
          <div className="prop-section">
            <div className="prop-section-title">Text</div>
            <PropRow label="Content">
              <input
                className="prop-input"
                value={(selectedObj as TextObject).text}
                onChange={(e) => upd({ text: e.target.value } as Partial<TextObject>)}
              />
            </PropRow>
            <PropRow label="Font Size">
              <input
                className="prop-input"
                type="number"
                value={(selectedObj as TextObject).fontSize}
                onChange={(e) => upd({ fontSize: Number(e.target.value) } as Partial<TextObject>)}
              />
            </PropRow>
            <PropRow label="Font">
              <input
                className="prop-input"
                value={(selectedObj as TextObject).fontFamily}
                onChange={(e) => upd({ fontFamily: e.target.value } as Partial<TextObject>)}
              />
            </PropRow>
            <PropRow label="Color">
              <input
                className="prop-input"
                type="color"
                value={(selectedObj as TextObject).color}
                onChange={(e) => upd({ color: e.target.value } as Partial<TextObject>)}
              />
              <input
                className="prop-input"
                value={(selectedObj as TextObject).color}
                onChange={(e) => upd({ color: e.target.value } as Partial<TextObject>)}
                style={{ width: 80, flexShrink: 0 }}
              />
            </PropRow>
          </div>
        )}

        {/* Image */}
        {selectedObj.type === 'image' && (
          <div className="prop-section">
            <div className="prop-section-title">Image</div>
            <PropRow label="Image">
              <ImagePicker
                currentKey={(selectedObj as ImageObject).imageKey}
                onSelect={(key) => upd({ imageKey: key } as Partial<ImageObject>)}
              />
            </PropRow>
            <PropRow label="Scale X">
              <input
                className="prop-input"
                type="number"
                step="0.1"
                min="0.01"
                value={(selectedObj as ImageObject).scaleX}
                onChange={(e) => upd({ scaleX: Number(e.target.value) } as Partial<ImageObject>)}
              />
            </PropRow>
            <PropRow label="Scale Y">
              <input
                className="prop-input"
                type="number"
                step="0.1"
                min="0.01"
                value={(selectedObj as ImageObject).scaleY}
                onChange={(e) => upd({ scaleY: Number(e.target.value) } as Partial<ImageObject>)}
              />
            </PropRow>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertiesEditor;
