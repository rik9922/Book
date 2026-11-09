# 2D Book Studio & Spread Editor Specification

## 1. 5-Panel Creative Layout Anatomy

The Book Studio (PWA-64) operates as a high-performance publishing application rather than a form dashboard:

```
+-------------------------------------------------------------------------+
| Top Bar: Title, Save Status, Undo/Redo, 2D/3D Toggle, Preflight, Share  |
+------------+---------------------------------------------+--------------+
|            |                                             |              |
| Left Panel |             Center Canvas Area              | Right Panel  |
|            |                                             |              |
| - Memories |        +---------------------------+        | - Element    |
| - Layouts  |        |  Left Page  | Right Page  |        |   Inspector  |
| - Captions |        |  [Spread N] |  [Spread N] |        | - Typography |
| - Textures |        +---------------------------+        | - Color/Foil |
|            |                                             | - Alignment  |
|            |                                             |              |
+------------+---------------------------------------------+--------------+
| Bottom Strip: Spread Filmstrip, Page Reordering, Add Spread Button      |
+-------------------------------------------------------------------------+
```

## 2. Real-Time Bidirectional Synchronization
- Edits made on the 2D canvas (resizing an image, cropping a milestone photo, editing a story) update the active Zustand book state.
- When the user toggles to the **3D Interactive Reader (PWA-68)**, the dynamic WebGL page-curl shader renders the exact modified canvas spread texture without delay.
