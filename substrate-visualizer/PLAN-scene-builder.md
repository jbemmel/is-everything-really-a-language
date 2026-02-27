# Scene Builder Plan

## Overview

Create `sh/builder` that compiles scene JSON files into a standalone `animation-player.html` artifact. The output is a single, self-contained HTML file that can be deployed anywhere (S3, GitHub Pages, etc.) without any server or build step.

## Architecture Distinction

```
LEGACY (visualizer.html)          SCENE BUILDER (new)
─────────────────────────         ──────────────────────
Large monolithic file              Minimal player core
Stage-specific controllers         Generic action interpreter
Planning/Implementation/Testing    Any scene from JSON
~3000 lines, growing               ~500 lines, stable
Behavior in code                   Behavior in data
```

## Key Insight

The **player** should be:
- Small and stable (rarely changes)
- A generic interpreter for scene JSON
- Contains only: Timeline, Entity types, Action handlers

The **scene** is:
- Pure JSON data
- All variation lives here
- No rebuild required to create new content

## Output: `animation-player.html`

A single HTML file containing:
```
┌─────────────────────────────────────┐
│  <style>   Player CSS (minimal)     │
├─────────────────────────────────────┤
│  <script>  Player Engine            │
│    - Timeline                       │
│    - Entity Registry                │
│    - Action Handlers                │
├─────────────────────────────────────┤
│  <script>  Scene Data (embedded)    │
│    const SCENE = { ... }            │
├─────────────────────────────────────┤
│  <body>    Canvas/Stage container   │
└─────────────────────────────────────┘
```

## Directory Structure

```
substrate-visualizer/
├── player/                    # NEW - Player source (extractable)
│   ├── core/
│   │   ├── timeline.js        # From visualizer.html lines 1598-1700
│   │   ├── store.js           # Minimal state (speed, playing)
│   │   └── event-bus.js       # Simple pub/sub
│   ├── entities/
│   │   ├── stick-actor.js     # StickActor rendering + poses
│   │   ├── chat-panel.js      # Chat message panel
│   │   ├── code-editor.js     # Code typing animation
│   │   └── title.js           # Text titles
│   ├── actions/
│   │   ├── fade.js            # fadeIn, fadeOut
│   │   ├── wait.js            # wait
│   │   ├── actor.js           # pose, setHead, bubbleSay, moveTo
│   │   ├── chat.js            # chatSay
│   │   └── code.js            # typeCode, clearCode
│   └── player.js              # Main entry: loadScene, play, pause
│
├── scenes/                    # Existing scene JSON files
│   ├── ssot-introduction.json
│   └── name-format-debate.json
│
├── build/                     # NEW - Build output
│   └── animation-player.html  # Final artifact
│
├── sh/
│   └── builder                # NEW - Build script
│
└── visualizer.html            # LEGACY - Keep as-is for now
```

## sh/builder Script

```bash
#!/bin/bash
# Usage: sh/builder [scene.json] [--output path]
# Default: builds all scenes in scenes/ directory
# Output: build/animation-player.html

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLAYER_DIR="$ROOT_DIR/player"
SCENES_DIR="$ROOT_DIR/scenes"
BUILD_DIR="$ROOT_DIR/build"

# Ensure build dir exists
mkdir -p "$BUILD_DIR"

# Build player (concatenate JS in order)
# OR use esbuild/rollup for more complex builds
```

## Build Options

### Option A: Simple Concatenation (Recommended for MVP)

```bash
#!/bin/bash
# sh/builder

cat > build/animation-player.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Animation Player</title>
  <style>
EOF

cat player/styles.css >> build/animation-player.html

cat >> build/animation-player.html << 'EOF'
  </style>
</head>
<body>
  <div id="stage"></div>
  <script>
EOF

# Concatenate player JS in dependency order
cat player/core/event-bus.js >> build/animation-player.html
cat player/core/store.js >> build/animation-player.html
cat player/core/timeline.js >> build/animation-player.html
cat player/entities/*.js >> build/animation-player.html
cat player/actions/*.js >> build/animation-player.html
cat player/player.js >> build/animation-player.html

# Embed scene data
echo "const SCENE = " >> build/animation-player.html
cat "$1" >> build/animation-player.html
echo ";" >> build/animation-player.html

cat >> build/animation-player.html << 'EOF'
  // Auto-start
  Player.loadScene(SCENE);
  Player.play();
  </script>
</body>
</html>
EOF
```

### Option B: Node.js Builder (More Flexible)

```javascript
// sh/builder.mjs
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const playerJS = [
  'player/core/event-bus.js',
  'player/core/store.js',
  'player/core/timeline.js',
  'player/entities/stick-actor.js',
  'player/entities/chat-panel.js',
  'player/entities/code-editor.js',
  'player/entities/title.js',
  'player/actions/fade.js',
  'player/actions/wait.js',
  'player/actions/actor.js',
  'player/actions/chat.js',
  'player/actions/code.js',
  'player/player.js'
].map(f => readFileSync(f, 'utf8')).join('\n');

const css = readFileSync('player/styles.css', 'utf8');
const scene = readFileSync(process.argv[2] || 'scenes/ssot-introduction.json', 'utf8');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Animation Player</title>
  <style>${css}</style>
</head>
<body>
  <div id="stage"></div>
  <script>
${playerJS}
const SCENE = ${scene};
Player.loadScene(SCENE);
Player.play();
  </script>
</body>
</html>`;

writeFileSync('build/animation-player.html', html);
console.log('Built: build/animation-player.html');
```

## Player Engine Design

### Scene Loading

```javascript
// player/player.js
const Player = (() => {
  let stage, entities, timeline;

  function loadScene(scene) {
    // 1. Set up stage
    stage = document.getElementById('stage');
    stage.style.width = scene.stage.width + 'px';
    stage.style.height = scene.stage.height + 'px';
    stage.style.background = scene.stage.background;

    // 2. Create entities
    entities = {};
    for (const [id, config] of Object.entries(scene.entities)) {
      entities[id] = EntityRegistry.create(config.type, { id, ...config });
      stage.appendChild(entities[id].element);
    }

    // 3. Compile timeline
    const beats = compileTimeline(scene.timeline, entities);
    timeline = Timeline.createTimeline(beats);
  }

  return { loadScene, play, pause, reset };
})();
```

### Action Compilation

```javascript
// Convert scene JSON actions to Timeline beats
function compileTimeline(actions, entities) {
  const beats = [];

  for (const action of actions) {
    if (action.par) {
      // Parallel actions - run simultaneously
      beats.push(compileParallel(action.par, entities));
    } else {
      beats.push(compileAction(action, entities));
    }
  }

  return beats;
}

function compileAction(action, entities) {
  const handler = ActionRegistry.get(action.do);
  const target = action.target ? entities[action.target] : null;

  return handler.compile(target, action.args);
}
```

### Action Registry

```javascript
// player/actions/actor.js
ActionRegistry.register('pose', {
  compile(actor, args) {
    return {
      duration: (args.duration || 0.3) * 1000,
      onStart() { actor.setPose(args.name); }
    };
  }
});

ActionRegistry.register('bubbleSay', {
  compile(actor, args) {
    return {
      duration: (args.hold || 2) * 1000,
      onStart() { actor.showBubble(args.text); },
      onComplete() { actor.hideBubble(); }
    };
  }
});

ActionRegistry.register('moveTo', {
  compile(actor, args) {
    const startX = actor.x, startY = actor.y;
    return {
      duration: (args.duration || 0.5) * 1000,
      action(progress) {
        actor.setPosition(
          lerp(startX, args.x, progress),
          lerp(startY, args.y, progress)
        );
      }
    };
  }
});
```

## Migration Strategy

### Phase 1: Extract Player Core (No Changes to visualizer.html)
- Create `player/` directory
- Extract Timeline, Store, EventBus from visualizer.html (copy, don't remove)
- Create entity types based on existing components
- Create action handlers based on scene JSON vocabulary

### Phase 2: Create Builder Script
- Implement `sh/builder` (bash or node)
- Test with existing scenes (ssot-introduction.json, name-format-debate.json)
- Validate output plays correctly in browser

### Phase 3: Iterate on Player Features
- Add missing action types as needed
- Optimize entity rendering
- Add playback controls (optional - can be minimal)

### Phase 4: (Future) Scene Editor
- Visual tool for creating/editing scene JSON
- Preview using the same player
- Export JSON files

## Scene JSON Vocabulary (Current)

From analyzing existing scenes:

### Actions
| Action | Target | Args | Description |
|--------|--------|------|-------------|
| `fadeIn` | - | `duration` | Fade in entire stage |
| `fadeOut` | - | `duration` | Fade out entire stage |
| `wait` | - | `duration` | Pause timeline |
| `pose` | actor | `name`, `duration` | Set actor pose |
| `setHead` | actor | `emoji` | Change actor head |
| `bubbleSay` | actor | `text`, `hold` | Speech bubble |
| `moveTo` | actor | `x`, `y`, `duration` | Move actor |
| `chatSay` | - | `speaker`, `text` | Add chat message |
| `typeCode` | - | `target`, `text`, `speedCps` | Type code animation |
| `clearCode` | - | `target` | Clear code editor |
| `par` | - | `[actions]` | Run actions in parallel |

### Entity Types
| Type | Properties |
|------|------------|
| `stickActor` | `x`, `y`, `scale`, `head`, `name` |
| `chatPanel` | `x`, `y`, `width`, `height` |
| `codeEditor` | `x`, `y`, `width`, `height` |
| `title` | `x`, `y`, `width`, `text`, `fontSize` |

## Success Criteria

1. **`sh/builder scenes/ssot-introduction.json`** produces `build/animation-player.html`
2. Opening that HTML file plays the animation correctly
3. Player file is under 500 lines (excluding embedded scene)
4. No build step required to view - just open in browser
5. Adding new scenes requires only JSON authoring, no code changes

## Non-Goals (For This Phase)

- Multi-scene playlists (future)
- Scene editor UI (future)
- Hot reload during development (future)
- Minification/optimization (future)
- Scene loading from URL (future - just embed for now)

## Relationship to Legacy Visualizer

The `visualizer.html` remains unchanged. It serves a different purpose:
- Interactive demo with stage selection (Planning/Implementation/Testing)
- Mode comparison (Traditional vs Effortless)
- Complex state management for educational walkthrough

The Scene Player is for:
- Standalone animations
- Embeddable content
- Simpler, focused presentations
- Content creators who just want to author JSON
