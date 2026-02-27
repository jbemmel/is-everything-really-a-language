# Scenes Directory

This directory contains JSON scene definitions for the stick figure scene player.

## Scene Structure

Each scene is a JSON file with the following structure:

```json
{
  "id": "unique-scene-id",
  "title": "Human Readable Title",
  "description": "Brief description of the scene",
  "category": "planning|implementation|testing|overview",
  "version": 1,

  "stage": {
    "width": 960,
    "height": 540,
    "background": "#ffffff"
  },

  "entities": {
    "entityId": {
      "type": "stickActor|chatPanel|codeEditor|title",
      ...entityProperties
    }
  },

  "timeline": [
    { "do": "skillName", "target": "entityId", "args": { ... } },
    { "par": [ ...parallelSteps ] }
  ]
}
```

## Entity Types

### stickActor
Animated stick figure with poseable arms.

```json
{
  "type": "stickActor",
  "x": 200,
  "y": 380,
  "scale": 1,
  "head": "🙂",
  "name": "Character Name",
  "bodyColor": "#111"
}
```

### chatPanel
Scrollable chat log panel.

```json
{
  "type": "chatPanel",
  "x": 20,
  "y": 20,
  "width": 320,
  "height": 400
}
```

### codeEditor
Dark-themed code display with typing animation support.

```json
{
  "type": "codeEditor",
  "x": 360,
  "y": 20,
  "width": 580,
  "height": 320,
  "initialText": ""
}
```

### title
Simple text title element.

```json
{
  "type": "title",
  "x": 280,
  "y": 100,
  "width": 400,
  "text": "Scene Title",
  "fontSize": 24,
  "color": "#333"
}
```

## Timeline Skills

### fadeIn / fadeOut
Fade the entire stage in or out.

```json
{ "do": "fadeIn", "args": { "duration": 0.5 } }
```

### wait
Pause execution for a duration.

```json
{ "do": "wait", "args": { "duration": 1.5 } }
```

### moveTo
Animate an actor to a new position.

```json
{ "do": "moveTo", "target": "actorId", "args": { "x": 300, "y": 400, "duration": 0.8 } }
```

### pose
Set actor pose using presets or custom angles.

Presets: `neutral`, `shrug`, `wave`, `think`, `point`, `handsUp`, `crossed`

```json
{ "do": "pose", "target": "actorId", "args": { "name": "wave", "duration": 0.4 } }
```

Custom angles:
```json
{ "do": "pose", "target": "actorId", "args": {
  "angles": { "shoulderL": -60, "elbowL": -30 },
  "duration": 0.3
}}
```

### setHead
Change actor's head emoji.

```json
{ "do": "setHead", "target": "actorId", "args": { "emoji": "😊" } }
```

### bubbleSay
Show a speech bubble above an actor.

```json
{ "do": "bubbleSay", "target": "actorId", "args": {
  "text": "Hello world!",
  "hold": 2.5
}}
```

### chatSay
Add a message to a chat panel.

```json
{ "do": "chatSay", "args": {
  "speaker": "PM",
  "text": "Let's discuss...",
  "target": "chat"
}}
```

### typeCode
Type text into a code editor with cursor animation.

```json
{ "do": "typeCode", "args": {
  "target": "code",
  "text": "const x = 42;",
  "speedCps": 25,
  "append": true
}}
```

### clearCode
Clear a code editor.

```json
{ "do": "clearCode", "args": { "target": "code" } }
```

## Parallel Execution

Use `par` to run multiple steps simultaneously:

```json
{
  "par": [
    { "do": "moveTo", "target": "alice", "args": { "x": 200, "duration": 1 } },
    { "do": "moveTo", "target": "bob", "args": { "x": 700, "duration": 1 } }
  ]
}
```

## URL Routing

Scenes are accessible via URL:

- Scene list: `#/scene`
- Specific scene: `#/scene/scene-id`

Example: `index.html#/scene/name-format-debate`

## Adding Custom Scenes

1. Create a JSON file in this directory
2. Register it programmatically:
   ```js
   SceneManager.importScene(jsonString);
   ```

Or use the in-app scene editor (click "Create New Scene" on the scene list page).

## Storage

User-created scenes are persisted to localStorage automatically.
Built-in scenes (defined in `scene-manager.js`) are always available.
