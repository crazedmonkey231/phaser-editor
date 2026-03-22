# phaser-editor

A browser-based 2D scene editor built with Phaser 3 + React + Zustand.

## Features

- Add/remove rectangles, circles, and text objects to a Phaser scene
- Drag objects freely on the canvas in edit mode
- **Snap to Grid** — toggle in the toolbar; set a custom grid size (px); a subtle grid overlay appears on the canvas while enabled
- **Snap Origin** — per-object setting in the Properties panel (Common section); choose which point of the object snaps to the grid: Center, Top Left, Top Right, Bottom Left, or Bottom Right
- Edit object properties (position, rotation, alpha, depth, color, size, etc.) in the Properties panel
- Import/Export scenes as JSON
- Run scene scripts in Play mode

## Agent Notes

- `gridSize` and `snapToGrid` are top-level fields on `EditorState` (not nested in `SceneData`) so snap settings persist independently of scene JSON export/import.
- `snapOrigin` is an optional field on `BaseGameObject` (`types/scene.ts`) defaulting to `'center'` at runtime.
- Grid is drawn in `EditorScene.drawGrid()` using a `gridGraphics` Phaser Graphics layer at depth 0; updated via `updateSnapSettings()` without restarting the scene.
- Snap math lives in `EditorScene.applySnap()` — calculates snap-point offset for each object type/origin, snaps that point, then back-calculates the new object origin position.
- When scene restarts (play toggle, resize), `gridSize` and `snapToGrid` are passed through `EditorSceneInitData`.