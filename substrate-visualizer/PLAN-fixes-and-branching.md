# Scene Studio Fixes & Branching Plan

## Issue Summary

1. **Drag and drop broken in scene editor** - Entity positioning in the builder preview doesn't work
2. **Light gray text bubbles on white** - Speech bubble text color not set, inherits wrong color
3. **Missing speed slider** - Scene player has no playback speed control
4. **Branching narrative** - Design "Two Roads Diverged" choose-your-own-adventure system

---

## Fix 1: Drag and Drop in Scene Editor

### Problem Analysis

The builder preview ([builder-preview](substrate-visualizer/index-dev.html#L104)) renders entities as static SVG. There's no interactive positioning - users can only set X/Y coordinates via the entity editor modal.

Current limitations:
- No mouse event handlers on preview entities
- No visual feedback for dragging
- Entity editor modal is the only way to change position

### Solution: Interactive Entity Positioning

Add mouse-based drag-and-drop directly on the SVG preview.

#### Changes Required

**1. Update `renderBuilderPreview()` in [scene-studio.js](substrate-visualizer/js/scene-studio.js#L281):**

```javascript
function renderBuilderPreview() {
  const preview = document.getElementById('builder-preview');
  if (!preview || !editingScene) return;

  const { width, height, background } = editingScene.stage || {};

  let entitiesHtml = '';
  const entities = editingScene.entities || {};

  for (const [id, entity] of Object.entries(entities)) {
    const isSelected = id === selectedEntityId;
    const selectionClass = isSelected ? 'selected' : '';

    if (entity.type === 'stickActor') {
      const x = entity.x || 100;
      const y = entity.y || 300;
      entitiesHtml += `
        <g class="draggable-entity ${selectionClass}"
           data-entity-id="${id}"
           transform="translate(${x}, ${y})"
           style="cursor: move;">
          <!-- Selection ring when selected -->
          ${isSelected ? `<circle r="70" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5"/>` : ''}
          <text x="0" y="-85" text-anchor="middle" font-size="28">${entity.head || '🙂'}</text>
          <line x1="0" y1="-60" x2="0" y2="0" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <line x1="0" y1="-50" x2="-20" y2="-20" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <line x1="0" y1="-50" x2="20" y2="-20" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-18" y2="48" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="18" y2="48" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <text x="0" y="70" text-anchor="middle" font-size="12" fill="#666">${entity.name || id}</text>
          <!-- Hit area for easier clicking -->
          <rect x="-40" y="-100" width="80" height="180" fill="transparent"/>
        </g>
      `;
    }
    // ... similar for chatPanel, codeEditor
  }

  preview.innerHTML = `
    <svg id="builder-svg" viewBox="0 0 ${width || 960} ${height || 540}"
         style="width: 100%; height: 100%; background: ${background || '#f8f9fa'}; border-radius: 8px;">
      ${entitiesHtml}
    </svg>
  `;

  // Attach drag handlers after rendering
  attachDragHandlers();
}
```

**2. Add drag handler functions:**

```javascript
function attachDragHandlers() {
  const svg = document.getElementById('builder-svg');
  if (!svg) return;

  svg.querySelectorAll('.draggable-entity').forEach(group => {
    const entityId = group.dataset.entityId;

    group.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectedEntityId = entityId;
      isDragging = true;

      const svgRect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const scaleX = viewBox.width / svgRect.width;
      const scaleY = viewBox.height / svgRect.height;

      dragStartPos = {
        x: e.clientX,
        y: e.clientY,
        entityX: editingScene.entities[entityId].x || 0,
        entityY: editingScene.entities[entityId].y || 0,
        scaleX,
        scaleY
      };

      renderBuilderPreview(); // Re-render to show selection
    });
  });

  // Mouse move/up on window for smooth dragging
  window.addEventListener('mousemove', handleDragMove);
  window.addEventListener('mouseup', handleDragEnd);
}

function handleDragMove(e) {
  if (!isDragging || !selectedEntityId || !editingScene) return;

  const entity = editingScene.entities[selectedEntityId];
  if (!entity) return;

  const dx = (e.clientX - dragStartPos.x) * dragStartPos.scaleX;
  const dy = (e.clientY - dragStartPos.y) * dragStartPos.scaleY;

  entity.x = Math.round(dragStartPos.entityX + dx);
  entity.y = Math.round(dragStartPos.entityY + dy);

  renderBuilderPreview();
}

function handleDragEnd() {
  isDragging = false;
}
```

**3. Fix the typo in `reorderEntities()`:**

Line 982 calls `renderEntityListEnhanced()` which doesn't exist. Change to:
```javascript
renderEntityList();
```

---

## Fix 2: Speech Bubble Text Color

### Problem

In [stick-scene-player.js:239-251](substrate-visualizer/js/stick-scene-player.js#L239), the `.ssp-bubble` class doesn't set a text color:

```css
.ssp-bubble {
  position: absolute;
  max-width: 320px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  border: 2px solid #111;
  font: 14px/1.3 system-ui, ...
  /* NO COLOR DEFINED - inherits from parent */
}
```

The parent (`.ssp-root` overlay) inherits from `body`, which in the dark theme has `color: var(--text)` = `#e6edf3` (light gray).

### Solution

Add explicit text color to the bubble:

```css
.ssp-bubble {
  ...
  color: #111;  /* ADD THIS LINE */
  ...
}
```

**Change in [stick-scene-player.js:246](substrate-visualizer/js/stick-scene-player.js#L246):**

```javascript
style.textContent = `
  .ssp-bubble {
    position: absolute;
    max-width: 320px;
    padding: 10px 14px;
    border-radius: 12px;
    background: #fff;
    color: #111;  /* <-- ADD THIS */
    border: 2px solid #111;
    font: 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    pointer-events: none;
    white-space: pre-wrap;
    z-index: 100;
  }
  ...
`;
```

---

## Fix 3: Speed Slider for Scene Player

### Problem

The scene player view ([index-dev.html:47-64](substrate-visualizer/index-dev.html#L47)) has play/pause/reset buttons but no speed control. The legacy mode has a speed selector (line 444) that should be replicated.

### Solution

**1. Add speed control to player header in [index-dev.html](substrate-visualizer/index-dev.html#L54):**

```html
<div class="scene-player-controls">
  <button class="player-btn" id="btn-player-play" title="Play">▶</button>
  <button class="player-btn" id="btn-player-pause" title="Pause">⏸</button>
  <button class="player-btn" id="btn-player-reset" title="Reset">↻</button>

  <!-- ADD SPEED SLIDER -->
  <div class="speed-control">
    <label for="speed-slider">Speed:</label>
    <input type="range" id="speed-slider" min="0.25" max="4" step="0.25" value="1">
    <span id="speed-value">1x</span>
  </div>

  <button class="player-btn" id="btn-player-edit" title="Edit Scene">✏️</button>
</div>
```

**2. Add CSS for speed control in [styles.css](substrate-visualizer/css/styles.css):**

```css
.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.speed-control input[type="range"] {
  width: 80px;
  accent-color: var(--accent);
}

#speed-value {
  min-width: 32px;
  text-align: center;
  color: var(--text);
}
```

**3. Add speed multiplier to Player class in [stick-scene-player.js](substrate-visualizer/js/stick-scene-player.js#L323):**

```javascript
class Player {
  constructor({ mount, adapters = {} }) {
    this.mount = mount;
    this.adapters = adapters;
    this.speedMultiplier = 1;  // ADD THIS
    // ...
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
  }

  // Modify sleep and tween to respect speed
  _ctx() {
    const self = this;
    return {
      // ...
      wait: (seconds) => sleep((seconds ?? 0) * 1000 / self.speedMultiplier),
      tween: (opts) => tween({
        ...opts,
        duration: (opts.duration || 0.5) / self.speedMultiplier
      }),
      // ...
    };
  }
}
```

**4. Wire up control in [scene-studio.js init()](substrate-visualizer/js/scene-studio.js#L986):**

```javascript
// Speed control
document.getElementById('speed-slider')?.addEventListener('input', (e) => {
  const speed = parseFloat(e.target.value);
  document.getElementById('speed-value').textContent = speed + 'x';
  if (currentPlayer) {
    currentPlayer.setSpeed(speed);
  }
});
```

---

## Feature 4: Choose Your Own Adventure Branching

### Concept: "Two Roads Diverged"

Transform the linear script builder into a branching narrative system where viewers make choices that lead down different paths.

### Data Model

**Script JSON Structure:**

```json
{
  "title": "The SSOT Decision",
  "version": 1,
  "startNode": "intro",
  "nodes": {
    "intro": {
      "type": "scene",
      "sceneId": "opening-scene",
      "next": "first-choice"
    },
    "first-choice": {
      "type": "choice",
      "prompt": "How should we handle customer names?",
      "options": [
        {
          "label": "First Last (Simple)",
          "description": "Traditional approach: 'John Doe'",
          "icon": "👤",
          "next": "simple-path-1"
        },
        {
          "label": "Separate Fields (Flexible)",
          "description": "SSOT approach: First + Last stored separately",
          "icon": "🔧",
          "next": "flexible-path-1"
        }
      ]
    },
    "simple-path-1": {
      "type": "scene",
      "sceneId": "simple-implementation",
      "next": "simple-path-2"
    },
    "flexible-path-1": {
      "type": "scene",
      "sceneId": "flexible-implementation",
      "next": "flexible-path-2"
    },
    // ... more nodes leading to different endings
    "ending-simple": {
      "type": "scene",
      "sceneId": "ending-traditional",
      "next": null  // End of path
    },
    "ending-flexible": {
      "type": "scene",
      "sceneId": "ending-effortless",
      "next": null
    }
  }
}
```

### Node Types

| Type | Purpose | Properties |
|------|---------|------------|
| `scene` | Play a scene | `sceneId`, `next` |
| `choice` | Present options | `prompt`, `options[]`, `timeout?` |
| `merge` | Converge paths | `next` |
| `end` | Terminal node | `summary?` |

### Visual Script Builder UI

```
┌─────────────────────────────────────────────────────────────┐
│  Script: "The SSOT Decision"                    [Save] [Play]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌──────────┐                                            │
│     │  intro   │ ───────────────┐                           │
│     │ (scene)  │                │                           │
│     └──────────┘                ▼                           │
│                          ┌──────────────┐                   │
│                          │ first-choice │                   │
│                          │  (choice)    │                   │
│                          └──────┬───────┘                   │
│                      ┌──────────┴──────────┐                │
│                      ▼                     ▼                │
│               ┌────────────┐        ┌────────────┐          │
│               │ Simple     │        │ Flexible   │          │
│               │ Path       │        │ Path       │          │
│               └─────┬──────┘        └─────┬──────┘          │
│                     │                     │                 │
│                     ▼                     ▼                 │
│               ┌────────────┐        ┌────────────┐          │
│               │ Ending A   │        │ Ending B   │          │
│               │ (end)      │        │ (end)      │          │
│               └────────────┘        └────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Node Properties                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Type: [choice ▼]                                        │ │
│ │ Prompt: "How should we handle customer names?"          │ │
│ │ Options:                                                │ │
│ │   [+] Option 1: "Simple" → simple-path-1                │ │
│ │   [+] Option 2: "Flexible" → flexible-path-1            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Choice UI During Playback

When the player hits a `choice` node:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│      How should we handle customer names?       │
│                                                 │
│   ┌─────────────────┐   ┌─────────────────┐     │
│   │      👤         │   │       🔧        │     │
│   │                 │   │                 │     │
│   │  First Last     │   │ Separate Fields │     │
│   │   (Simple)      │   │   (Flexible)    │     │
│   │                 │   │                 │     │
│   │ "John Doe"      │   │ First + Last    │     │
│   │                 │   │ stored apart    │     │
│   └─────────────────┘   └─────────────────┘     │
│                                                 │
│            ━━━━━━━━━━━━━━━━━━━ 15s              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Data Model & Choice Player
1. Define script JSON schema with nodes
2. Create `BranchingPlayer` class that:
   - Traverses node graph
   - Plays scenes via `StickScenePlayer`
   - Pauses at choice nodes
   - Renders choice UI overlay
3. Wire up choice selection to continue playback

#### Phase 2: Visual Graph Editor
1. Create flow-chart style canvas
2. Drag-and-drop node placement
3. Connection lines between nodes
4. Node property panel

#### Phase 3: Analytics & Features
1. Track which paths users choose
2. Add timed auto-selection (default choice after timeout)
3. Path history / "what if" replay
4. Export paths as linear scripts

### BranchingPlayer Class Sketch

```javascript
class BranchingPlayer {
  constructor({ mount, script }) {
    this.mount = mount;
    this.script = script;
    this.scenePlayer = null;
    this.currentNodeId = script.startNode;
    this.history = [];
  }

  async play() {
    while (this.currentNodeId) {
      const node = this.script.nodes[this.currentNodeId];
      this.history.push(this.currentNodeId);

      switch (node.type) {
        case 'scene':
          await this.playSceneNode(node);
          this.currentNodeId = node.next;
          break;

        case 'choice':
          const chosen = await this.showChoice(node);
          this.currentNodeId = chosen.next;
          break;

        case 'end':
          await this.showEnding(node);
          this.currentNodeId = null;
          break;
      }
    }
  }

  async playSceneNode(node) {
    const scene = SceneManager.getScene(node.sceneId);
    this.scenePlayer = StickScenePlayer.create({ mount: this.mount });
    await this.scenePlayer.load(scene);
    await this.scenePlayer.play();
    this.scenePlayer.destroy();
  }

  async showChoice(node) {
    return new Promise((resolve) => {
      const overlay = this.createChoiceOverlay(node, resolve);
      this.mount.appendChild(overlay);
    });
  }

  createChoiceOverlay(node, onSelect) {
    const overlay = document.createElement('div');
    overlay.className = 'choice-overlay';
    overlay.innerHTML = `
      <div class="choice-prompt">${node.prompt}</div>
      <div class="choice-options">
        ${node.options.map((opt, i) => `
          <button class="choice-option" data-index="${i}">
            <span class="choice-icon">${opt.icon || '📌'}</span>
            <span class="choice-label">${opt.label}</span>
            <span class="choice-desc">${opt.description || ''}</span>
          </button>
        `).join('')}
      </div>
      ${node.timeout ? `<div class="choice-timer">${node.timeout}s</div>` : ''}
    `;

    overlay.querySelectorAll('.choice-option').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        overlay.remove();
        onSelect(node.options[i]);
      });
    });

    return overlay;
  }
}
```

### CSS for Choice Overlay

```css
.choice-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  z-index: 1000;
}

.choice-prompt {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  max-width: 600px;
}

.choice-options {
  display: flex;
  gap: 24px;
}

.choice-option {
  background: var(--panel);
  border: 2px solid var(--stroke);
  border-radius: 16px;
  padding: 24px 32px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-width: 200px;
}

.choice-option:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(88, 166, 255, 0.3);
}

.choice-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.choice-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 8px;
}

.choice-desc {
  font-size: 14px;
  color: var(--muted);
}
```

---

## Implementation Priority

| Priority | Fix/Feature | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Speech bubble text color | 5 min | High - visible bug |
| 2 | Speed slider | 30 min | Medium - user request |
| 3 | Drag-and-drop positioning | 2 hrs | Medium - usability |
| 4 | Branching narratives | 2-3 days | High - new capability |

---

## Files Modified

### Quick Fixes (1-2)
- `js/stick-scene-player.js` - Add `color: #111` to bubble style

### Speed Slider (3)
- `index-dev.html` - Add slider HTML
- `css/styles.css` - Add slider styles
- `js/stick-scene-player.js` - Add `speedMultiplier` and `setSpeed()`
- `js/scene-studio.js` - Wire up slider event

### Drag-and-Drop (3)
- `js/scene-studio.js` - Rewrite `renderBuilderPreview()`, add handlers, fix typo

### Branching (4)
- New: `js/branching-player.js`
- New: `js/branching-editor.js`
- `css/styles.css` - Choice overlay styles
- `index-dev.html` - Branching builder view
- `js/scene-studio.js` - Integration

---

## Feature 5: Node.js Backend for Scene Editor (Save to Disk)

### Problem

Currently the scene editor runs as a local HTML file. Edits are held in memory/localStorage but cannot be persisted back to the JSON files on disk. When you refresh (F5), changes are lost unless manually exported.

### Solution: Simple Node.js Dev Server

Create a lightweight Node.js backend that:
1. Serves the scene editor HTML/JS/CSS
2. Provides REST API endpoints to read/write JSON files
3. Enables F5 refresh to load previously saved state

The **bundled-visualizer.html** remains the readonly, static player for deployment.

### Architecture

```
substrate-visualizer/
├── server.mjs              # Node.js dev server
├── index-dev.html          # Editor (served by Node)
├── bundled-visualizer.html # Readonly player (static, no server needed)
├── data/
│   ├── scenes/             # Scene JSON files
│   │   ├── intro.json
│   │   ├── demo-chat.json
│   │   └── ...
│   └── scripts/            # Script JSON files (branching narratives)
│       ├── tutorial.json
│       └── ...
├── js/
│   └── ...
└── css/
    └── ...
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenes` | List all scene files |
| GET | `/api/scenes/:id` | Load a scene JSON |
| PUT | `/api/scenes/:id` | Save a scene JSON |
| DELETE | `/api/scenes/:id` | Delete a scene |
| GET | `/api/scripts` | List all script files |
| GET | `/api/scripts/:id` | Load a script JSON |
| PUT | `/api/scripts/:id` | Save a script JSON |

### server.mjs Implementation

```javascript
import express from 'express';
import { readdir, readFile, writeFile, unlink } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML/CSS/JS

const DATA_DIR = join(__dirname, 'data');
const SCENES_DIR = join(DATA_DIR, 'scenes');
const SCRIPTS_DIR = join(DATA_DIR, 'scripts');

// List scenes
app.get('/api/scenes', async (req, res) => {
  try {
    const files = await readdir(SCENES_DIR);
    const scenes = files
      .filter(f => f.endsWith('.json'))
      .map(f => ({ id: basename(f, '.json'), file: f }));
    res.json(scenes);
  } catch (err) {
    res.json([]);
  }
});

// Load scene
app.get('/api/scenes/:id', async (req, res) => {
  try {
    const filePath = join(SCENES_DIR, `${req.params.id}.json`);
    const data = await readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(404).json({ error: 'Scene not found' });
  }
});

// Save scene
app.put('/api/scenes/:id', async (req, res) => {
  try {
    const filePath = join(SCENES_DIR, `${req.params.id}.json`);
    await writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scene' });
  }
});

// Delete scene
app.delete('/api/scenes/:id', async (req, res) => {
  try {
    const filePath = join(SCENES_DIR, `${req.params.id}.json`);
    await unlink(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete scene' });
  }
});

// Same pattern for scripts...
app.get('/api/scripts', async (req, res) => {
  try {
    const files = await readdir(SCRIPTS_DIR);
    const scripts = files
      .filter(f => f.endsWith('.json'))
      .map(f => ({ id: basename(f, '.json'), file: f }));
    res.json(scripts);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/scripts/:id', async (req, res) => {
  try {
    const filePath = join(SCRIPTS_DIR, `${req.params.id}.json`);
    const data = await readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(404).json({ error: 'Script not found' });
  }
});

app.put('/api/scripts/:id', async (req, res) => {
  try {
    const filePath = join(SCRIPTS_DIR, `${req.params.id}.json`);
    await writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save script' });
  }
});

app.listen(PORT, () => {
  console.log(`Scene Editor running at http://localhost:${PORT}`);
  console.log(`  Editor: http://localhost:${PORT}/index-dev.html`);
  console.log(`  Data:   ${DATA_DIR}`);
});
```

### Client-Side Integration (scene-studio.js)

Add a `FileAPI` module to replace localStorage-only persistence:

```javascript
const FileAPI = {
  async listScenes() {
    const res = await fetch('/api/scenes');
    return res.json();
  },

  async loadScene(id) {
    const res = await fetch(`/api/scenes/${id}`);
    if (!res.ok) throw new Error('Scene not found');
    return res.json();
  },

  async saveScene(id, scene) {
    const res = await fetch(`/api/scenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scene)
    });
    return res.json();
  },

  async deleteScene(id) {
    const res = await fetch(`/api/scenes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Same for scripts...
  async listScripts() {
    const res = await fetch('/api/scripts');
    return res.json();
  },

  async loadScript(id) {
    const res = await fetch(`/api/scripts/${id}`);
    if (!res.ok) throw new Error('Script not found');
    return res.json();
  },

  async saveScript(id, script) {
    const res = await fetch(`/api/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(script)
    });
    return res.json();
  }
};
```

### Modified Scene Manager

Update `SceneManager` to use FileAPI when available (running via server) or fall back to localStorage (static file):

```javascript
const SceneManager = {
  isServerMode() {
    // If served by Node, we have API access
    return window.location.protocol !== 'file:';
  },

  async loadScenes() {
    if (this.isServerMode()) {
      const list = await FileAPI.listScenes();
      // Load each scene
      const scenes = {};
      for (const { id } of list) {
        scenes[id] = await FileAPI.loadScene(id);
      }
      return scenes;
    } else {
      // Fall back to embedded/localStorage
      return JSON.parse(localStorage.getItem('scenes') || '{}');
    }
  },

  async saveScene(id, scene) {
    if (this.isServerMode()) {
      await FileAPI.saveScene(id, scene);
    } else {
      const scenes = JSON.parse(localStorage.getItem('scenes') || '{}');
      scenes[id] = scene;
      localStorage.setItem('scenes', JSON.stringify(scenes));
    }
  },

  // ... similar for delete, scripts, etc.
};
```

### package.json

```json
{
  "name": "scene-editor",
  "type": "module",
  "scripts": {
    "dev": "node server.mjs",
    "start": "node server.mjs"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### Usage

```bash
cd substrate-visualizer
npm install
npm run dev
# Opens http://localhost:3000/index-dev.html
```

Now:
- Edit scenes in the browser
- Click Save → writes to `data/scenes/scene-name.json`
- Press F5 → reloads from disk
- bundled-visualizer.html still works standalone (readonly, no server)

### Deployment Modes

| Mode | URL | Save | Use Case |
|------|-----|------|----------|
| **Dev Server** | `localhost:3000/index-dev.html` | ✅ Disk | Authoring scenes |
| **Static File** | `file://...bundled-visualizer.html` | ❌ | Viewing/sharing |
| **Hosted Readonly** | `https://site.com/visualizer.html` | ❌ | Public embed |

### Files to Create

- `server.mjs` - Express server
- `package.json` - Dependencies
- `data/scenes/` - Scene storage directory
- `data/scripts/` - Script storage directory

### Files to Modify

- `js/scene-studio.js` - Add `FileAPI`, update `SceneManager`
- `index-dev.html` - Add save/load status indicator

---

## Updated Implementation Priority

| Priority | Fix/Feature | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Speech bubble text color | 5 min | High - visible bug |
| 2 | Speed slider | 30 min | Medium - user request |
| 3 | Drag-and-drop positioning | 2 hrs | Medium - usability |
| 4 | **Node.js save/load** | 1-2 hrs | **High - enables iteration** |
| 5 | Branching narratives | 2-3 days | High - new capability |
