# Substrate Visualizer - Architecture

## CRITICAL: File Structure

This project uses a **modular development** architecture. DO NOT modify the bundled file directly.

### Development Files (EDIT THESE)
```
index-dev.html     <- Main HTML (loads modular JS)
css/styles.css     <- All CSS
js/
  ├── main.js              <- Entry point, initialization
  ├── scene-studio.js      <- Scene Studio UI controller
  ├── scene-manager.js     <- Scene data management
  ├── stick-scene-player.js <- Animation player
  ├── route-manager.js     <- Hash-based routing
  ├── storage-manager.js   <- LocalStorage persistence
  ├── event-bus.js         <- Pub/sub events
  ├── store.js             <- State management
  └── ... other modules
```

### Bundled File (DO NOT EDIT DIRECTLY)
```
bundled-visualizer.html   <- Single-file build with ALL CSS/JS inlined
                             This is for deployment, not development
                             Regenerate by concatenating source files
```

## Development Workflow

1. **Edit source files**: `index-dev.html`, `css/styles.css`, `js/*.js`
2. **Test locally**: Open `index-dev.html` in browser
3. **To bundle**: (if needed) concatenate all JS/CSS into single HTML file

## Adding New Features

### New JavaScript functionality:
- Add to existing module (e.g., `js/scene-studio.js`) OR
- Create new module file (e.g., `js/my-feature.js`)
- Add `<script src="js/my-feature.js"></script>` to `index-dev.html`

### New CSS:
- Add to `css/styles.css`

### New HTML elements:
- Add to `index-dev.html`

## URL to use for testing
```
file:///path/to/substrate-visualizer/index-dev.html#/scenes
```

## Key Modules

| Module | Purpose |
|--------|---------|
| `scene-studio.js` | Main UI: scene list, player, builder views |
| `scene-manager.js` | CRUD operations on scenes |
| `stick-scene-player.js` | SVG animation engine |
| `route-manager.js` | `#/scenes`, `#/scene/:id`, `#/builder` routing |
| `storage-manager.js` | Persist scenes to localStorage |
