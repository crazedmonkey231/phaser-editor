import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useEditorStore } from '../store/editorStore';
import { AnyGameObject, CircleObject, ImageObject, RectangleObject, SceneData, TextObject } from '../types/scene';

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

type PhaserDisplayObject = Phaser.GameObjects.Graphics | Phaser.GameObjects.Text | Phaser.GameObjects.Image;

interface EditorSceneInitData {
  sceneData: SceneData;
  isPlaying: boolean;
  onSelect: (id: string | null) => void;
  onUpdateObject: (id: string, updates: Partial<AnyGameObject>) => void;
  gridSize: number;
  snapToGrid: boolean;
}

class EditorScene extends Phaser.Scene {
  public displayObjects: Map<string, PhaserDisplayObject> = new Map();
  private selectionHighlight!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  public sceneData!: SceneData;
  private isPlaying = false;
  private onSelect!: (id: string | null) => void;
  private onUpdateObject!: (id: string, updates: Partial<AnyGameObject>) => void;
  private scriptCleanup: (() => void) | null = null;
  private scriptUpdate: ((...args: unknown[]) => void) | null = null;
  private dragObjectId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private gridSize = 16;
  private snapToGrid = false;

  constructor() {
    super({ key: 'EditorScene' });
  }

  init(data: EditorSceneInitData) {
    this.sceneData = data.sceneData;
    this.isPlaying = data.isPlaying;
    this.onSelect = data.onSelect;
    this.onUpdateObject = data.onUpdateObject;
    this.gridSize = data.gridSize ?? 16;
    this.snapToGrid = data.snapToGrid ?? false;
  }

  // Returns the offset from object origin to snap point based on snapOrigin setting
  private getSnapOffset(objId: string): { dx: number; dy: number } {
    const obj = this.sceneData.objects.find((o) => o.id === objId);
    if (!obj) return { dx: 0, dy: 0 };

    const origin = obj.snapOrigin ?? 'center';

    if (obj.type === 'rectangle') {
      const r = obj as RectangleObject;
      const hw = r.width / 2;
      const hh = r.height / 2;
      switch (origin) {
        case 'topLeft':     return { dx: -hw, dy: -hh };
        case 'topRight':    return { dx:  hw, dy: -hh };
        case 'bottomLeft':  return { dx: -hw, dy:  hh };
        case 'bottomRight': return { dx:  hw, dy:  hh };
        default:            return { dx: 0, dy: 0 }; // center
      }
    } else if (obj.type === 'circle') {
      const c = obj as CircleObject;
      const r = c.radius;
      switch (origin) {
        case 'topLeft':     return { dx: -r, dy: -r };
        case 'topRight':    return { dx:  r, dy: -r };
        case 'bottomLeft':  return { dx: -r, dy:  r };
        case 'bottomRight': return { dx:  r, dy:  r };
        default:            return { dx: 0, dy: 0 };
      }
    } else if (obj.type === 'text') {
      // Text origin in Phaser defaults to top-left, so stored x/y is top-left
      const go = this.displayObjects.get(objId);
      if (go instanceof Phaser.GameObjects.Text) {
        const bounds = go.getBounds();
        const w = bounds.width;
        const h = bounds.height;
        switch (origin) {
          case 'center':      return { dx: w / 2, dy: h / 2 };
          case 'topRight':    return { dx: w, dy: 0 };
          case 'bottomLeft':  return { dx: 0, dy: h };
          case 'bottomRight': return { dx: w, dy: h };
          default:            return { dx: 0, dy: 0 }; // topLeft
        }
      }
    } else if (obj.type === 'image') {
      const go = this.displayObjects.get(objId);
      if (go instanceof Phaser.GameObjects.Image) {
        const hw = (go.width * go.scaleX) / 2;
        const hh = (go.height * go.scaleY) / 2;
        switch (origin) {
          case 'topLeft':     return { dx: -hw, dy: -hh };
          case 'topRight':    return { dx:  hw, dy: -hh };
          case 'bottomLeft':  return { dx: -hw, dy:  hh };
          case 'bottomRight': return { dx:  hw, dy:  hh };
          default:            return { dx: 0, dy: 0 };
        }
      }
    }

    return { dx: 0, dy: 0 };
  }

  // Snaps the given object position to the grid using the object's snap origin
  private applySnap(objId: string, rawX: number, rawY: number): { x: number; y: number } {
    if (!this.snapToGrid || this.gridSize <= 0) return { x: rawX, y: rawY };
    const { dx, dy } = this.getSnapOffset(objId);
    const snappedPtX = Math.round((rawX + dx) / this.gridSize) * this.gridSize;
    const snappedPtY = Math.round((rawY + dy) / this.gridSize) * this.gridSize;
    return { x: snappedPtX - dx, y: snappedPtY - dy };
  }

  // Draws (or clears) the grid overlay
  drawGrid() {
    this.gridGraphics.clear();
    if (!this.snapToGrid || this.gridSize <= 0) return;
    this.gridGraphics.lineStyle(1, 0x444466, 0.4);
    for (let x = 0; x <= this.sceneData.width; x += this.gridSize) {
      this.gridGraphics.lineBetween(x, 0, x, this.sceneData.height);
    }
    for (let y = 0; y <= this.sceneData.height; y += this.gridSize) {
      this.gridGraphics.lineBetween(0, y, this.sceneData.width, y);
    }
  }

  // Update snap/grid settings without restarting the scene
  updateSnapSettings(snapToGrid: boolean, gridSize: number) {
    this.snapToGrid = snapToGrid;
    this.gridSize = gridSize;
    this.drawGrid();
  }

  create() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(0);
    this.drawGrid();

    this.selectionHighlight = this.add.graphics();
    this.selectionHighlight.setDepth(9999);

    this.buildScene(this.sceneData);

    if (!this.isPlaying) {
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.dragObjectId) {
          const go = this.displayObjects.get(this.dragObjectId);
          if (go) {
            const rawX = pointer.worldX - this.dragOffsetX;
            const rawY = pointer.worldY - this.dragOffsetY;
            const { x, y } = this.applySnap(this.dragObjectId, rawX, rawY);
            go.setPosition(x, y);
            this.updateSelectionHighlight(this.dragObjectId, this.sceneData);
          }
        }
      });

      this.input.on('pointerup', () => {
        if (this.dragObjectId) {
          const go = this.displayObjects.get(this.dragObjectId);
          if (go) {
            const { x, y } = this.applySnap(this.dragObjectId, go.x, go.y);
            go.setPosition(x, y);
            this.onUpdateObject(this.dragObjectId, { x: Math.round(x), y: Math.round(y) });
          }
          this.dragObjectId = null;
          this.game.canvas.style.cursor = 'default';
        }
      });
    }

    if (this.isPlaying) {
      this.runScript(this.sceneData.script);
    }
  }

  // Build (or rebuild) all display objects from scene data
  buildScene(data: SceneData) {
    this.sceneData = data;

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
    } else if (obj.type === 'image') {
      const img = obj as ImageObject;
      if (!img.imageKey) return null;

      const createImageGO = (): Phaser.GameObjects.Image => {
        const gameImg = this.add.image(img.x, img.y, img.imageKey);
        gameImg.setScale(img.scaleX, img.scaleY);
        gameImg.setRotation(img.rotation);
        gameImg.setDepth(img.depth);
        gameImg.setAlpha(img.alpha);
        gameImg.setVisible(img.visible);
        this.displayObjects.set(obj.id, gameImg);

        if (!this.isPlaying) {
          gameImg.setInteractive();
          gameImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.onSelect(obj.id);
            this.dragObjectId = obj.id;
            this.dragOffsetX = pointer.worldX - gameImg.x;
            this.dragOffsetY = pointer.worldY - gameImg.y;
            this.game.canvas.style.cursor = 'grabbing';
          });
          gameImg.on('pointerover', () => {
            if (!this.dragObjectId) this.game.canvas.style.cursor = 'grab';
          });
          gameImg.on('pointerout', () => {
            if (!this.dragObjectId) this.game.canvas.style.cursor = 'default';
          });
        }
        return gameImg;
      };

      if (this.textures.exists(img.imageKey)) {
        go = createImageGO();
      } else {
        const assets = useEditorStore.getState().assets;
        const asset = assets.find((a) => a.key === img.imageKey);
        if (asset) {
          const htmlImg = new Image();
          htmlImg.onload = () => {
            // Guard: object may have been deleted before the texture finished loading
            const stillExists = this.sceneData.objects.some((o) => o.id === obj.id);
            if (!stillExists) return;
            if (!this.textures.exists(img.imageKey)) {
              this.textures.addImage(img.imageKey, htmlImg);
            }
            const old = this.displayObjects.get(obj.id);
            if (old) { old.destroy(); this.displayObjects.delete(obj.id); }
            createImageGO();
          };
          htmlImg.onerror = () => {
            console.warn(`[ImageObject] Failed to load image for key "${img.imageKey}"`);
          };
          htmlImg.src = asset.dataUrl;
        }
        return null;
      }
    }

    if (go) {
      this.displayObjects.set(obj.id, go);

      // Make interactive for selection in edit mode
      // Images handle their own interaction inside createImageGO
      if (!this.isPlaying && obj.type !== 'image') {
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

        go.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.onSelect(obj.id);
          this.dragObjectId = obj.id;
          this.dragOffsetX = pointer.worldX - go.x;
          this.dragOffsetY = pointer.worldY - go.y;
          this.game.canvas.style.cursor = 'grabbing';
        });

        go.on('pointerover', () => {
          if (!this.dragObjectId) {
            this.game.canvas.style.cursor = 'grab';
          }
        });
        go.on('pointerout', () => {
          if (!this.dragObjectId) {
            this.game.canvas.style.cursor = 'default';
          }
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

    // Use the display object's current position so the highlight tracks during drags
    const go = this.displayObjects.get(obj.id);
    if (!go) return;

    const currentX = go.x;
    const currentY = go.y;

    this.selectionHighlight.lineStyle(2, 0xa855f7, 1);

    if (obj.type === 'rectangle') {
      const r = obj as RectangleObject;
      this.selectionHighlight.strokeRect(
        currentX - r.width / 2 - 2,
        currentY - r.height / 2 - 2,
        r.width + 4,
        r.height + 4
      );
    } else if (obj.type === 'circle') {
      const c = obj as CircleObject;
      this.selectionHighlight.strokeCircle(currentX, currentY, c.radius + 3);
    } else if (obj.type === 'text') {
      if (go instanceof Phaser.GameObjects.Text) {
        const b = go.getBounds();
        this.selectionHighlight.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
      }
    } else if (obj.type === 'image') {
      if (go instanceof Phaser.GameObjects.Image) {
        const hw = (go.width * go.scaleX) / 2;
        const hh = (go.height * go.scaleY) / 2;
        this.selectionHighlight.strokeRect(
          currentX - hw - 2,
          currentY - hh - 2,
          hw * 2 + 4,
          hh * 2 + 4
        );
      }
    }
  }

  runScript(script: string) {
    if (!script.trim()) return;
    try {
      // NOTE: new Function() is intentional here. This is a game editor where the
      // author writes and runs their own scene scripts. The script receives the
      // Phaser scene instance as `this` via standard lifecycle functions (preload,
      // create, update). Users should only run scripts they trust, as this executes
      // arbitrary JavaScript in the page context.
      // eslint-disable-next-line no-new-func
      const fn = new Function(`
        ${script}
        return {
          preload: typeof preload !== 'undefined' ? preload : null,
          create:  typeof create  !== 'undefined' ? create  : null,
          update:  typeof update  !== 'undefined' ? update  : null,
        };
      `);
      const { preload, create, update } = fn() as {
        preload: ((...args: unknown[]) => void) | null;
        create:  ((...args: unknown[]) => void) | null;
        update:  ((...args: unknown[]) => void) | null;
      };
      if (typeof preload === 'function') preload.call(this);
      if (typeof create  === 'function') create.call(this);
      this.scriptUpdate = typeof update === 'function' ? update : null;
    } catch (err) {
      console.error('[SceneScript]', err);
    }
  }

  update(_time: number, _delta: number) {
    if (this.isPlaying && this.scriptUpdate) {
      try {
        this.scriptUpdate.call(this);
      } catch (err) {
        console.error('[SceneScript update]', err);
        this.scriptUpdate = null;
      }
    }
  }

  setPlayingMode(playing: boolean, script: string) {
    this.isPlaying = playing;
    if (this.scriptCleanup) {
      this.scriptCleanup();
      this.scriptCleanup = null;
    }
    this.scriptUpdate = null;
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
      scene: [],
      input: { mouse: { preventDefaultWheel: false } },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on(Phaser.Core.Events.READY, () => {
      const { gridSize, snapToGrid } = useEditorStore.getState();
      game.scene.add('EditorScene', EditorScene, true, {
        sceneData: scene,
        isPlaying,
        onSelect: selectObject,
        onUpdateObject: (id: string, updates: Partial<AnyGameObject>) => useEditorStore.getState().updateObject(id, updates),
        gridSize,
        snapToGrid,
      });
      sceneRef.current = game.scene.getScene('EditorScene') as EditorScene;
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
          onUpdateObject: (id: string, updates: Partial<AnyGameObject>) => useEditorStore.getState().updateObject(id, updates),
          gridSize: state.gridSize,
          snapToGrid: state.snapToGrid,
        });
        return;
      }

      // Background color changed
      if (state.scene.backgroundColor !== prev.scene.backgroundColor) {
        pScene.cameras.main.setBackgroundColor(state.scene.backgroundColor);
      }

      // Snap settings changed
      if (state.snapToGrid !== prev.snapToGrid || state.gridSize !== prev.gridSize) {
        pScene.updateSnapSettings(state.snapToGrid, state.gridSize);
      }

      // New assets added/removed – sync textures into Phaser
      if (state.assets !== prev.assets) {
        const newKeys = new Set(state.assets.map((a) => a.key));
        state.assets.forEach((asset) => {
          if (!pScene.textures.exists(asset.key)) {
            const htmlImg = new Image();
            htmlImg.onload = () => {
              // Guard: asset may have been removed before the texture finished loading
              if (!useEditorStore.getState().assets.some((a) => a.key === asset.key)) return;
              if (!pScene.textures.exists(asset.key)) {
                pScene.textures.addImage(asset.key, htmlImg);
              }
              // Re-render any image objects using this key
              pScene.sceneData.objects
                .filter((o) => o.type === 'image' && (o as ImageObject).imageKey === asset.key)
                .forEach((o) => pScene.updateDisplayObject(o));
            };
            htmlImg.onerror = () => {
              console.warn(`[Assets] Failed to load texture for key "${asset.key}"`);
            };
            htmlImg.src = asset.dataUrl;
          }
        });
        // Remove textures that were deleted
        prev.assets.forEach((asset) => {
          if (!newKeys.has(asset.key) && pScene.textures.exists(asset.key)) {
            pScene.textures.remove(asset.key);
          }
        });
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

        pScene.updateSelectionHighlight(state.selectedObjectId, state.scene);
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
          onUpdateObject: (id: string, updates: Partial<AnyGameObject>) => useEditorStore.getState().updateObject(id, updates),
          gridSize: state.gridSize,
          snapToGrid: state.snapToGrid,
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
