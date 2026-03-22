import { useEditorStore } from '../store/editorStore';

const TYPE_ICON: Record<string, string> = {
  rectangle: '▭',
  circle: '●',
  text: 'T',
  image: '🖼',
};

function SceneBuilder() {
  const { scene, selectedObjectId, selectObject } = useEditorStore();
  const { objects } = scene;

  return (
    <div className="scene-builder">
      <div className="panel-header">Scene Objects</div>
      <div className="scene-object-list">
        {objects.length === 0 ? (
          <div className="scene-empty">
            No objects yet.
            <br />
            Use the toolbar to add objects.
          </div>
        ) : (
          objects.map((obj) => (
            <div
              key={obj.id}
              className={`scene-object-item${selectedObjectId === obj.id ? ' selected' : ''}`}
              onClick={() => selectObject(obj.id)}
            >
              <span className="scene-object-icon">{TYPE_ICON[obj.type] ?? '?'}</span>
              <span className="scene-object-name">{obj.name}</span>
              <span className="scene-object-type">{obj.type}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SceneBuilder;
