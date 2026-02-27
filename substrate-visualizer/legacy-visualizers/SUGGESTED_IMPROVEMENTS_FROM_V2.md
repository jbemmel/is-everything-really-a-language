# Suggested Improvements from V2 Visualizer

These are polish effects from `visualizer_v2.html` that were lost in the V3 rewrite. They add significant visual storytelling and should be reintroduced once core functionality is stable.

---

## 1. SVG-Based Animated Token Flow

**What V2 had:**
- Glowing tokens that spawn and travel along bezier curves between nodes
- Tokens follow smooth cubic bezier paths with easing (`ease` function)
- Each token has: color, label (emoji or text), duration
- Glow filter (`<filter id="glow">`) makes tokens pop visually
- Tokens expand briefly on arrival before fading out

**Key code patterns:**
```javascript
// Spawn token from node A to node B
spawnToken("airtable", "rulebook", "var(--blue)", "📋", BASE()*0.6);

// Token follows bezier curve
const P0 = {x:A.x, y:A.y};
const P1 = {x:A.x + dx*0.20, y:A.y + dy*0.55};
const P2 = {x:A.x + dx*0.80, y:A.y + dy*0.55};
const P3 = {x:B.x, y:B.y};
```

**Why it matters:**
- Shows data/rules flowing through the system
- Makes abstract concepts (injection, testing) tangible
- Gives visual rhythm to the animation

---

## 2. Builder Box with Progress Animation

**What V2 had:**
- Center-stage "factory" box when generating each substrate
- Title: "Building PYTHON", "Building GOLANG", etc.
- Large emoji icon (🐍, 🔷, 📊) that fades in and scales from 50% → 100%
- Progress bar filling as the build completes
- Smooth zoom-out transition when done
- Node flies from builder position to final grid position
- Special chat animation for English substrate (LLM back-and-forth)

**Key dimensions:**
```javascript
const BUILDER_X = 600;
const BUILDER_Y = 450;
const BUILDER_SIZE = 180; // ~2 inches square
```

**Why it matters:**
- Shows "work is happening" not just "things appeared"
- English substrate chat makes LLM generation feel real
- Creates anticipation as each substrate is built

---

## 3. Typewriter Test-Taking Animation

**What V2 had:**
- Test box slides in from substrate position to center stage
- Fields fill character-by-character with cursor blink
- Three-phase animation:
  1. `first: j → jo → joh → john` (0-20% progress)
  2. `last: d → do → doe` (20-40% progress)
  3. `full_name: J → Jo → John → John D → John Doe` (50-90% progress)
- Cursor indicator (`▌`) while typing
- Checkmark (✓) appears at end
- Box shrinks and flies back to substrate position

**Key code pattern:**
```javascript
// Phase 3: Type out computed result
if (progress > 0.5 && progress <= 0.9) {
  const p = (progress - 0.5) / 0.4;
  const target = fullValue.dataset.target;
  const chars = Math.floor(p * target.length);
  fullValue.textContent = target.substring(0, chars) + (p < 1 ? "▌" : "");
}
```

**Why it matters:**
- Visualizes WHAT is being tested, not just THAT testing is happening
- Shows the rule being applied: inputs → computation → output
- Different substrates can show different computation speeds

---

## 4. Rich Hover Tooltips on Every Node

**What V2 had:**
- Floating tooltip that appears on hover
- Title + detailed description for each component
- Dynamic content based on current state:
  - Substrates show: execution time, formula, expected score
  - Core nodes explain their role in the pipeline
- Smooth opacity/transform transitions
- Positioned relative to node location in SVG coordinate space

**Example descriptions:**
```javascript
const nodeDescriptions = {
  airtable: {
    title: "Airtable",
    desc: "Single source of truth. All business rules, entities, and relationships are defined here."
  },
  postgres: {
    title: "PostgreSQL",
    desc: "The canonical compute engine. Executes rulebook logic as SQL functions and views."
  },
  // Substrates get dynamic descriptions with formula + expected output
};
```

**Why it matters:**
- Educational - explains what each component does
- Contextual - shows current formula/expected values
- Professional polish

---

## 5. Live Animated Dashed Lines

**What V2 had:**
- Dynamic SVG bezier curves drawn during testing
- `testLine`: blanktests → active substrate (blue dashed)
- `answerLine`: substrate → orchestrator (green/red based on pass/fail)
- Lines update position each animation frame as nodes move
- Smooth fade-out when connection ends
- Uses `stroke-dasharray: "8 6"` for dashed effect

**Key code pattern:**
```javascript
// Create and animate live line
const testLine = makeLiveLine(`testLine-${id}`, "rgba(88,166,255,.95)");

const updateLine = () => {
  if (!lineActive) return;
  const A = nodeById["blanktests"];
  const B = nodeById[id];
  if (A && B) setLiveLinePath(testLine, A, B);
  requestAnimationFrame(updateLine);
};
```

**Why it matters:**
- Shows "this substrate is taking its test RIGHT NOW"
- Visual feedback on data flow direction
- Color coding shows pass/fail status

---

## Additional Polish Effects

### 6. Phase Tabs with Vertical Text
- Left-edge tabs with `writing-mode: vertical-rl`
- Shows current phase: "Inject Rules" vs "Conformance Testing"
- Active tab highlighted in blue

### 7. Name Format Selector with Live Preview
- Interactive selector: "First Last" vs "Last, First"
- Shows preview: `john / doe → John Doe` or `john / doe → Doe, John`
- Updates formula display everywhere when changed

### 8. Animated Score Bars
- Score bars in drawer animate from 0% → final percentage
- Staggered timing (each bar starts 45ms after previous)
- Color coded: green (100%), yellow (partial), red (failing)

### 9. Two-Phase Layout Transitions
- Nodes tween smoothly from Phase 1 positions to Phase 2 positions
- Some nodes fade in/out during transition
- Lanes reorganize with animation
- Uses cubic bezier easing for natural motion

### 10. Glow Effects on Active/Hovered Nodes
- SVG filter: `<filter id="glow"><feGaussianBlur stdDeviation="3.5">`
- Applied on hover and during active operations
- Stroke width increases from 2 → 4 on hover
- Creates depth and focus

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| High | Token flow animation | Medium | High - core visual storytelling |
| High | Typewriter test animation | Medium | High - shows what's being tested |
| Medium | Builder box | Medium | Medium - shows generation process |
| Medium | Hover tooltips | Low | Medium - educational value |
| Low | Live dashed lines | Low | Medium - nice-to-have polish |
| Low | Score bar animations | Low | Low - drawer is secondary |

---

## Reference Files

- V2 implementation: `visualizer_v2.html` (lines 800-2200)
- Key SVG groups in V2: `#lanes`, `#edges`, `#liveLines`, `#nodes`, `#builderBox`, `#testBox`, `#tokens`
