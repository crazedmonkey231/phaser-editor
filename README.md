# phaser-editor

A browser-based 2D scene editor built with Phaser 3 + React + Zustand.

## Features

- Add/remove rectangles, circles, text, and **image/sprite** objects to a Phaser scene
- **Image upload** — upload PNG/JPG/etc. via the Properties panel; images are stored as base64 dataUrls in the Zustand store (`assets[]`) and loaded into Phaser's texture cache on demand
- Drag objects freely on the canvas in edit mode
- **Snap to Grid** — toggle in the toolbar; set a custom grid size (px); a subtle grid overlay appears on the canvas while enabled
- **Snap Origin** — per-object setting in the Properties panel (Common section); choose which point of the object snaps to the grid: Center, Top Left, Top Right, Bottom Left, or Bottom Right
- Edit object properties (position, rotation, alpha, depth, color, size, scale, etc.) in the Properties panel
- **Copy/Paste** — Ctrl+C copies the selected object; Ctrl+V pastes it offset by +20/+20 with a `(copy)` name suffix
- Import/Export scenes as JSON
- Run scene scripts in Play mode

## Agent Notes

- `gridSize` and `snapToGrid` are top-level fields on `EditorState` (not nested in `SceneData`) so snap settings persist independently of scene JSON export/import.
- `snapOrigin` is an optional field on `BaseGameObject` (`types/scene.ts`) defaulting to `'center'` at runtime.
- Grid is drawn in `EditorScene.drawGrid()` using a `gridGraphics` Phaser Graphics layer at depth 0; updated via `updateSnapSettings()` without restarting the scene.
- Snap math lives in `EditorScene.applySnap()` — calculates snap-point offset for each object type/origin, snaps that point, then back-calculates the new object origin position.
- When scene restarts (play toggle, resize), `gridSize` and `snapToGrid` are passed through `EditorSceneInitData`.
- `assets: AssetEntry[]` is a top-level field on `EditorState` (not in `SceneData`); images are **not** exported in scene JSON. Re-upload is required after import.
- `AssetEntry` lives in `src/types/scene.ts` with fields `key`, `dataUrl`, `filename`. `addAsset` deduplicates by key.
- Image texture loading in Phaser: `createDisplayObject` for `type === 'image'` checks `textures.exists(key)` first (sync); otherwise creates an HTMLImageElement, loads the dataUrl, then calls `textures.addImage` on load. The store subscription also pre-loads textures when `state.assets` changes.
- `EditorScene.sceneData` is `public` to allow the store subscription to access it for re-rendering image objects after texture load.
- Copy/paste clipboard is a module-level variable in `Toolbar.tsx` (`let clipboard: AnyGameObject | null`); Ctrl+C/V are guarded against INPUT/TEXTAREA/SELECT and call `e.preventDefault()`.
- `ImagePicker` component is defined in `PropertiesEditor.tsx`; it generates asset keys by stripping the file extension and sanitizing non-alphanumeric chars, with a `image_{timestamp}` fallback for empty keys.