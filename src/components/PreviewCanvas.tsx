import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useEditorStore } from '../store/editorStore';
import { AnyGameObject, CircleObject, RectangleObject, SceneData, TextObject } from '../types/scene';

// ── Helpers ──────────────────────────────────────────────────────────────────

function cssColorToHex(color: string): number {
  const hex = color.replace('#', '');
  return parseInt(hex, 16);
}

function cssColorToRgb(color: string): { r: number; g: number; b: number } {
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

// ── Phaser Scene ──────────────────────────────────────────────────────────────

type PhaserDisplayObject = Phaser.GameObjects.Graphics | Phaser.GameObjects.Text;

interface EditorSceneInitData {
  sceneData: SceneData;
  isPlaying: boolean;
  onSelect: (id: string | null) => void;
}

class EditorScene extends Phaser.Scene {
  public displayObjects: Map<string, PhaserDisplayObject> = new Map();
  private selectionHighlight!: Phaser.GameObjects.Graphics;
  private sceneData!: SceneData;
  private isPlaying = false;
  private onSelect!: (id: string | null) => void;
  private scriptCleanup: (() => void) | null = null;

  constructor() {
    super({ key: 'EditorScene' });
  }

  init(data: EditorSceneInitData) {
    this.sceneData = data.sceneData;
    this.isPlaying = data.isPlaying;
    this.onSelect = data.onSelect;
  }

  create() {
    this.selectionHighlight = this.add.graphics();
    this.selectionHighlight.setDepth(9999);

    this.buildScene(this.sceneData);

    if (this.isPlaying) {
      this.runScript(this.sceneData.script);
    }
  }

  // Build (or rebuild) all display objects from scene data
  buildScene(data: SceneData) {
    // Destroy existing
    this.displayObjects.forEach((go) => go.destroy());
    this.displayObjects.clear();

    for (const obj of data.objects) {
      this.createDisplayObject(obj);
    }

    this.cameras.main.setBackgroundColor(data.backgroundColor);
  }

  createDisplayObject(obj: AnyGameObject): PhaserDisplayObject | null {
    if (!obj.visible) return null;

    let go: PhaserDisplayObject | null = null;

    if (obj.type === 'rectangle') {
      const r = obj as RectangleObject;
      const g = this.add.graphics();
      const fill = cssColorToHex(r.fillColor);
      const stroke = cssColorToHex(r.strokeColor);
      g.fillStyle(fill, r.alpha);
      g.fillRect(-r.width / 2, -r.height / 2, r.width, r.height);
      if (r.strokeWidth > 0) {
        g.lineStyle(r.strokeWidth, stroke, r.alpha);
        g.strokeRect(-r.width / 2, -r.height / 2, r.width, r.height);
      }
      g.setPosition(r.x, r.y);
      g.setRotation(r.rotation);
      g.setDepth(r.depth);
      g.setAlpha(r.alpha);
      go = g;
    } else if (obj.type === 'circle') {
      const c = obj as CircleObject;
      const g = this.add.graphics();
      const fill = cssColorToHex(c.fillColor);
      const stroke = cssColorToHex(c.strokeColor);
      g.fillStyle(fill, c.alpha);
      g.fillCircle(0, 0, c.radius);
      if (c.strokeWidth > 0) {
        g.lineStyle(c.strokeWidth, stroke, c.alpha);
        g.strokeCircle(0, 0, c.radius);
      }
      g.setPosition(c.x, c.y);
      g.setRotation(c.rotation);
      g.setDepth(c.depth);
      g.setAlpha(c.alpha);
      go = g;
    } else if (obj.type === 'text') {
      const t = obj as TextObject;
      const rgb = cssColorToRgb(t.color);
      const hexColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
      const textObj = this.add.text(t.x, t.y, t.text, {
        fontSize: `${t.fontSize}px`,
        fontFamily: t.fontFamily,
        color: hexColor,
      });
      textObj.setRotation(t.rotation);
      textObj.setDepth(t.depth);
      textObj.setAlpha(t.alpha);
      go = textObj;
    }

    if (go) {
      this.displayObjects.set(obj.id, go);

      // Make interactive for selection in edit mode
      if (!this.isPlaying) {
        if (go instanceof Phaser.GameObjects.Graphics) {
          go.setInteractive(
            new Phaser.Geom.Rectangle(
              obj.type === 'rectangle'
                ? -(obj as RectangleObject).width / 2
                : -(obj as CircleObject).radius,
              obj.type === 'rectangle'
                ? -(obj as RectangleObject).height / 2
                : -(obj as CircleObject).radius,
              obj.type === 'rectangle'
                ? (obj as RectangleObject).width
                : (obj as CircleObject).radius * 2,
              obj.type === 'rectangle'
                ? (obj as RectangleObject).height
                : (obj as CircleObject).radius * 2
            ),
            Phaser.Geom.Rectangle.Contains
          );
        } else if (go instanceof Phaser.GameObjects.Text) {
          go.setInteractive();
        }

        go.on('pointerdown', () => {
          this.onSelect(obj.id);
        });

        go.on('pointerover', () => {
          this.game.canvas.style.cursor = 'pointer';
        });
        go.on('pointerout', () => {
          this.game.canvas.style.cursor = 'default';
        });
      }
    }

    return go;
  }

  updateDisplayObject(obj: AnyGameObject) {
    const existing = this.displayObjects.get(obj.id);
    if (existing) {
      existing.destroy();
      this.displayObjects.delete(obj.id);
    }
    this.createDisplayObject(obj);
  }

  updateSelectionHighlight(selectedId: string | null, data: SceneData) {
    this.selectionHighlight.clear();
    if (!selectedId) return;

    const obj = data.objects.find((o) => o.id === selectedId);
    if (!obj) return;

    this.selectionHighlight.lineStyle(2, 0xa855f7, 1);

    if (obj.type === 'rectangle') {
      const r = obj as RectangleObject;
      this.selectionHighlight.strokeRect(
        r.x - r.width / 2 - 2,
        r.y - r.height / 2 - 2,
        r.width + 4,
        r.height + 4
      );
    } else if (obj.type === 'circle') {
      const c = obj as CircleObject;
      this.selectionHighlight.strokeCircle(c.x, c.y, c.radius + 3);
    } else if (obj.type === 'text') {
      const go = this.displayObjects.get(obj.id);
      if (go instanceof Phaser.GameObjects.Text) {
        const b = go.getBounds();
        this.selectionHighlight.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
      }
    }
  }

  runScript(script: string) {
    if (!script.trim()) return;
    try {
      // NOTE: new Function() is intentional here. This is a game editor where the
      // author writes and runs their own scene scripts. The script receives the
      // Phaser scene instance as its only argument. Users should only run scripts
      // they trust, as this executes arbitrary JavaScript in the page context.
      // eslint-disable-next-line no-new-func
      const fn = new Function('scene', script);
      fn(this);
    } catch (err) {
      console.error('[SceneScript]', err);
    }
  }

  setPlayingMode(playing: boolean, script: string) {
    this.isPlaying = playing;
    if (this.scriptCleanup) {
      this.scriptCleanup();
      this.scriptCleanup = null;
    }
    if (playing) {
      this.runScript(script);
    }
  }
}

// ── React Component ───────────────────────────────────────────────────────────

function PreviewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<EditorScene | null>(null);

  const store = useEditorStore();

  // Bootstrap Phaser once
  useEffect(() => {
    if (!containerRef.current) return;

    const { scene, isPlaying, selectObject } = useEditorStore.getState();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: scene.width,
      height: scene.height,
      parent: containerRef.current,
      backgroundColor: scene.backgroundColor,
      scene: EditorScene,
      input: { mouse: { preventDefaultWheel: false } },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on(Phaser.Core.Events.READY, () => {
      const phaserScene = game.scene.getScene('EditorScene') as EditorScene;
      sceneRef.current = phaserScene;
      phaserScene.init({ sceneData: scene, isPlaying, onSelect: selectObject });
      // init is called internally before create; we must restart to pass data
      game.scene.stop('EditorScene');
      game.scene.start('EditorScene', { sceneData: scene, isPlaying, onSelect: selectObject });
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // This effect runs once on mount to create the Phaser game instance. The game
    // is kept alive for the lifetime of the component; subsequent store changes are
    // handled by the subscription in the second useEffect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to store changes and update Phaser accordingly
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      const game = gameRef.current;
      if (!game) return;

      const pScene = game.scene.getScene('EditorScene') as EditorScene | null;
      if (!pScene) return;

      // Scene size or background changed – restart the game
      if (
        state.scene.width !== prev.scene.width ||
        state.scene.height !== prev.scene.height
      ) {
        game.scale.resize(state.scene.width, state.scene.height);
        game.scene.stop('EditorScene');
        game.scene.start('EditorScene', {
          sceneData: state.scene,
          isPlaying: state.isPlaying,
          onSelect: state.selectObject,
        });
        return;
      }

      // Background color changed
      if (state.scene.backgroundColor !== prev.scene.backgroundColor) {
        pScene.cameras.main.setBackgroundColor(state.scene.backgroundColor);
      }

      // Objects changed
      if (state.scene.objects !== prev.scene.objects) {
        // Check for removed objects
        const newIds = new Set(state.scene.objects.map((o) => o.id));
        prev.scene.objects.forEach((o) => {
          if (!newIds.has(o.id)) {
            pScene.displayObjects.get(o.id)?.destroy();
            pScene.displayObjects.delete(o.id);
          }
        });

        // Check for new or updated objects (shallow comparison of all fields)
        state.scene.objects.forEach((obj) => {
          const prevObj = prev.scene.objects.find((o) => o.id === obj.id);
          if (!prevObj || obj !== prevObj) {
            pScene.updateDisplayObject(obj);
          }
        });
      }

      // Selection changed
      if (state.selectedObjectId !== prev.selectedObjectId) {
        pScene.updateSelectionHighlight(state.selectedObjectId, state.scene);
      }

      // Play mode toggled
      if (state.isPlaying !== prev.isPlaying) {
        // Restart the scene cleanly
        game.scene.stop('EditorScene');
        game.scene.start('EditorScene', {
          sceneData: state.scene,
          isPlaying: state.isPlaying,
          onSelect: state.selectObject,
        });
      }
    });

    return unsub;
  }, []);

  // Keep game canvas size in sync
  const { scene } = store;

  return (
    <div className="preview-canvas-wrap">
      <div className="canvas-label">
        {scene.name} — {scene.width}×{scene.height}
      </div>
      <div
        className="phaser-container"
        ref={containerRef}
        style={{ width: scene.width, height: scene.height }}
      />
    </div>
  );
}

export default PreviewCanvas;
