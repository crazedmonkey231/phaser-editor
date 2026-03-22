import { create } from 'zustand';
import { AnyGameObject, AssetEntry, SceneData } from '../types/scene';

interface EditorState {
  scene: SceneData;
  selectedObjectId: string | null;
  activePanel: 'scene' | 'script' | 'properties';
  isPlaying: boolean;
  gridSize: number;
  snapToGrid: boolean;
  assets: AssetEntry[];

  addObject: (obj: AnyGameObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<AnyGameObject>) => void;
  selectObject: (id: string | null) => void;
  updateScene: (updates: Partial<Omit<SceneData, 'objects'>>) => void;
  setActivePanel: (panel: 'scene' | 'script' | 'properties') => void;
  setScript: (script: string) => void;
  setPlaying: (playing: boolean) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (enabled: boolean) => void;
  addAsset: (entry: AssetEntry) => void;
  removeAsset: (key: string) => void;
}

const defaultScene: SceneData = {
  id: 'scene-1',
  name: 'My Scene',
  backgroundColor: '#1a1a2e',
  width: 640,
  height: 480,
  objects: [],
  script: '// Scene script\n// The "scene" variable refers to the Phaser Scene instance\n// Example: scene.add.text(100, 100, "Hello!", { color: "#ffffff" });\n',
};

export const useEditorStore = create<EditorState>((set) => ({
  scene: defaultScene,
  selectedObjectId: null,
  activePanel: 'scene',
  isPlaying: false,
  gridSize: 20,
  snapToGrid: false,
  assets: [],

  addObject: (obj) =>
    set((state) => ({
      scene: { ...state.scene, objects: [...state.scene.objects, obj] },
      selectedObjectId: obj.id,
    })),

  removeObject: (id) =>
    set((state) => ({
      scene: {
        ...state.scene,
        objects: state.scene.objects.filter((o) => o.id !== id),
      },
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    })),

  updateObject: (id, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        objects: state.scene.objects.map((o) =>
          o.id === id ? ({ ...o, ...updates } as AnyGameObject) : o
        ),
      },
    })),

  selectObject: (id) => set({ selectedObjectId: id }),

  updateScene: (updates) =>
    set((state) => ({
      scene: { ...state.scene, ...updates },
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setScript: (script) =>
    set((state) => ({
      scene: { ...state.scene, script },
    })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setGridSize: (size) => set({ gridSize: size }),

  setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),

  addAsset: (entry) =>
    set((state) => ({
      assets: [...state.assets.filter((a) => a.key !== entry.key), entry],
    })),

  removeAsset: (key) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.key !== key),
    })),
}));
