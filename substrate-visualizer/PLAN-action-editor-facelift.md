# Action Editor Facelift Plan

## Executive Summary

Upgrade all "do" action editors to have specialized UIs tailored to each action type, fix scrolling/layout issues, and enable a unified "always-on" property panel workflow.

---

## Part 1: Layout Fixes

### 1.1 Visual Timeline Scrolling (Critical)

**Current Problem:** The `timeline-actions-list` grows indefinitely, making the entire page taller rather than scrolling within its container.

**Fix:**
- Ensure `.builder-timeline` has a fixed/flex height
- Make `.visual-timeline` use `flex: 1` with `overflow: hidden`
- Make `.timeline-actions-list` use `flex: 1` with `overflow-y: auto`
- Add `max-height: calc(100vh - 300px)` as a fallback

**Files:** [css/styles.css](css/styles.css), possibly [index-dev.html](index-dev.html) for layout adjustments

### 1.2 JSON Editor Panel Full Height

**Current Problem:** The `#timeline-json` textarea is constrained to ~80x25 size instead of filling the right panel.

**Fix:**
- Make `.timeline-editor` use `flex: 1` with full height
- Set `#timeline-json` to `width: 100%`, `height: 100%`, `resize: none`
- Use flexbox to ensure it stretches

**Files:** [css/styles.css](css/styles.css)

---

## Part 2: Always-On Property Panel Architecture

### 2.1 Unified Property Panel Component

**Goal:** Both Entity Editor and Action Editor should work inline (no modal) with immediate apply-on-change behavior.

**Design:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Scene Builder                                                       │
├────────────┬────────────────────────────┬──────────────────────────┤
│ Entities   │ Stage Preview              │ Properties Panel         │
│            │                            │ ┌──────────────────────┐ │
│ [actor1]   │   ┌──────────────────┐     │ │ Entity: actor1       │ │
│ [actor2]   │   │    Scene        │     │ │ Type: stickActor     │ │
│ [board]    │   │   Preview       │     │ │ ──────────────────── │ │
│            │   │                  │     │ │ Position: [x] [y]   │ │
│ + Add      │   └──────────────────┘     │ │ Head: [emoji picker] │ │
├────────────┼────────────────────────────┤ │ Pose: [dropdown]     │ │
│ Timeline   │                            │ └──────────────────────┘ │
│ ┌────────┐ │                            │                          │
│ │action1 │ │                            │ ── OR ──                 │
│ │action2 │ │                            │                          │
│ │action3 │ │                            │ ┌──────────────────────┐ │
│ │...     │ │                            │ │ Action: bubbleSay    │ │
│ │+ Add   │ │                            │ │ Target: actor1       │ │
│ └────────┘ │                            │ │ Text: [textarea]     │ │
│            │                            │ │ Hold: [slider] 2s    │ │
│            │                            │ └──────────────────────┘ │
└────────────┴────────────────────────────┴──────────────────────────┘
```

**Implementation:**
1. Add a `#properties-panel` div to the builder layout (right column)
2. Create `renderEntityProperties(entityId)` function
3. Create `renderActionProperties(actionIndex)` function
4. On any input change, immediately update the scene data and refresh preview
5. Add "Close" button (X) but no Save/Cancel (changes are live)

**Files:** [index-dev.html](index-dev.html), [js/scene-studio.js](js/scene-studio.js), [css/styles.css](css/styles.css)

### 2.2 Selection State

**New State Variables:**
```javascript
let selectedMode = 'entity' | 'action' | null;
let selectedEntityId = null;    // existing
let selectedActionIndex = -1;   // new
```

**Behaviors:**
- Clicking entity on stage or in entity list → shows Entity properties
- Clicking action in timeline list → shows Action properties
- Clicking elsewhere / pressing Escape → clears selection
- Current item highlighted in both lists

---

## Part 3: Action-Specific Editor Enhancements

### 3.1 Action Type: `pose`

**Current:** Text input for "Pose Name"

**Enhanced:**
- **Visual pose picker** with pose name buttons (thumbnail preview would be ideal)
- Available poses from [stick-scene-player.js:601-625](js/stick-scene-player.js#L601-L625):
  - `neutral`, `shrug`, `wave`, `think`, `point`, `handsUp`, `crossed`
  - `pointLeft`, `pointRight`, `pointUp`, `pointUpLeft`, `pointUpRight`, `pointUpBoth`, `pointDown`
  - `presentLeft`, `presentRight`, `presentBoth`
  - `handsDown`, `welcome`
- Duration slider (0.1s - 2s, default 0.3s)

**UI:**
```
┌─────────────────────────────────────┐
│ Pose                                │
│ ┌─────┬─────┬─────┬─────┬─────┐   │
│ │neut │shrug│wave │think│point│   │
│ └─────┴─────┴─────┴─────┴─────┘   │
│ ┌─────┬─────┬─────┬─────┬─────┐   │
│ │ ← pt│ → pt│ ↑ pt│welcm│cross│   │
│ └─────┴─────┴─────┴─────┴─────┘   │
│ Duration: [====●=====] 0.3s        │
└─────────────────────────────────────┘
```

### 3.2 Action Type: `setHead`

**Current:** Text input for emoji

**Enhanced:**
- **Emoji grid picker** with common expressions (reuse entity editor head picker)
- Custom emoji input field
- Categories: Happy, Thinking, Upset, Surprised, etc.

**Emoji Grid:**
```
😀 😃 🙂 😐 😕 😮 🤔 🧐 😎 🤓 😴 😤 😠 🤯 🥳
```

### 3.3 Action Type: `bubbleSay`

**Current:** Text input + hold number

**Enhanced:**
- **Multiline textarea** for text (not single-line input)
- **Auto-calculate hold** checkbox (hold = text.length / 15, clamped 1.5-4s)
- Hold slider when manual (0.5s - 8s)
- Character count display
- Preview of bubble appearance

### 3.4 Action Type: `moveTo`

**Current:** x, y, duration inputs

**Enhanced:**
- **Visual position picker** - click on mini stage preview
- Or numeric inputs with increment/decrement buttons
- **Preset positions dropdown**: "Left", "Center", "Right", "Top", "Bottom"
- Duration slider with easing preview

**Preset Positions (for 960x540 stage):**
| Preset | X | Y |
|--------|-----|-----|
| Left | 150 | 350 |
| Center | 480 | 350 |
| Right | 810 | 350 |
| Top Left | 150 | 150 |
| Top Right | 810 | 150 |

### 3.5 Action Type: `chatSay`

**Current:** speaker text + message text

**Enhanced:**
- **Speaker dropdown** populated from entities (stickActor names)
- **Target panel dropdown** populated from entities (chatPanel IDs)
- Multiline message textarea
- Pause duration slider (0s - 2s)

### 3.6 Action Type: `typeCode` / `writeBoard`

**Current:** target, text textarea, speedCps

**Enhanced:**
- **Target dropdown** populated from entities (codeEditor or whiteboard)
- **Code/text editor** with monospace font and syntax hints
- **Speed slider** with preview: "Slow (10)", "Normal (18)", "Fast (30)", "Instant"
- **Append checkbox** with explanation
- Live preview of typing effect

### 3.7 Action Type: `eraseLines`

**Current:** target, lines, speedCps

**Enhanced:**
- Target dropdown (whiteboard entities)
- Lines spinner (1-10)
- Speed slider
- Preview showing what will be erased

### 3.8 Action Type: `crossOut`

**Current:** target, text, duration

**Enhanced:**
- Target dropdown (whiteboard entities)
- **Text selector** - show current whiteboard content, let user select/highlight text to cross out
- Duration slider
- Preview of crossed-out appearance

### 3.9 Action Types: `fadeIn` / `fadeOut` / `wait`

**Current:** duration number input

**Enhanced:**
- **Duration slider** (0.1s - 5s)
- Duration presets: "Quick (0.25s)", "Normal (0.5s)", "Slow (1s)", "Dramatic (2s)"
- Visual preview bar showing timing

### 3.10 Action Type: `setTitle`

**Current:** text input

**Enhanced:**
- **Styled text input** (larger font, centered preview)
- Font size selector (if multiple title styles supported)
- Target dropdown (title entities)

---

## Part 4: Implementation Phases

### Phase 1: Layout Fixes (Day 1)
1. Fix timeline scrolling in CSS
2. Fix JSON editor full-height
3. Test scrolling with many actions

### Phase 2: Property Panel Architecture (Day 2-3)
1. Add properties panel column to builder layout
2. Create `renderPropertiesPanel()` function
3. Wire up selection events (click entity, click action)
4. Implement immediate-apply pattern (no Save/Cancel)
5. Add close button and escape key handling

### Phase 3: Enhanced Action Editors (Day 4-6)
1. Create `getActionEditorHTML(actionType, args)` function with action-specific renderers
2. Implement pose picker UI
3. Implement emoji picker (refactor from entity editor)
4. Implement sliders for duration/speed fields
5. Implement dropdown pickers for target entities
6. Add preset position picker for moveTo

### Phase 4: Polish (Day 7)
1. Add keyboard shortcuts (arrow keys to navigate actions)
2. Add duplicate action button
3. Add insert action above/below
4. Visual feedback for selected items
5. Test all action types thoroughly

---

## Part 5: File Changes Summary

| File | Changes |
|------|---------|
| [css/styles.css](css/styles.css) | Scrolling fixes, properties panel styling, slider/picker styles |
| [index-dev.html](index-dev.html) | Add properties panel column, restructure builder layout |
| [js/scene-studio.js](js/scene-studio.js) | Properties panel logic, action-specific editors, selection state |

---

## Part 6: New CSS Classes Needed

```css
/* Properties Panel */
.properties-panel { }
.properties-header { }
.properties-close { }
.property-section { }
.property-field { }
.property-label { }

/* Pose Picker */
.pose-grid { }
.pose-option { }
.pose-option.selected { }

/* Emoji Picker (refactored) */
.emoji-grid { }
.emoji-option { }

/* Sliders */
.slider-field { }
.slider-input { }
.slider-value { }

/* Target Dropdown */
.entity-dropdown { }

/* Selection States */
.timeline-action-item.selected { }
.entity-item.selected { }
```

---

## Part 7: Success Criteria

1. **Timeline scrolls independently** - 50+ actions don't break layout
2. **JSON editor fills panel** - Easy to read/edit large timelines
3. **Property panel works** - Click entity or action, edit inline, changes apply instantly
4. **Pose picker works** - All 18+ poses selectable visually
5. **Emoji picker works** - Easy to pick head emoji
6. **Duration sliders work** - Visual feedback, preset buttons
7. **Target dropdowns work** - Only show relevant entity types
8. **No regressions** - Modal editors still work as fallback

---

## Appendix: Current Action Types Reference

From [stick-scene-player.js](js/stick-scene-player.js#L542-L898):

| Action | Target | Args | Notes |
|--------|--------|------|-------|
| `fadeIn` | - | `duration` | Stage fade |
| `fadeOut` | - | `duration` | Stage fade |
| `wait` | - | `duration` | Pause timeline |
| `moveTo` | stickActor | `x`, `y`, `duration` | Animate position |
| `setHead` | stickActor | `emoji` | Change head |
| `pose` | stickActor | `name`, `duration`, `angles` | Preset or custom pose |
| `bubbleSay` | stickActor | `text`, `hold` | Speech bubble |
| `chatSay` | chatPanel | `speaker`, `text`, `pause` | Chat message |
| `typeCode` | codeEditor | `text`, `speedCps`, `append`, `cursorHold` | Typing animation |
| `clearCode` | codeEditor | - | Clear editor |
| `setTitle` | title | `text` | Set title text |
| `writeBoard` | whiteboard | `text`, `speedCps`, `append`, `hold` | Handwriting effect |
| `clearBoard` | whiteboard | - | Clear board |
| `eraseLines` | whiteboard | `lines`, `speedCps`, `hold` | Erase from bottom |
| `crossOut` | whiteboard | `text`, `duration`, `hold` | Strikethrough effect |
