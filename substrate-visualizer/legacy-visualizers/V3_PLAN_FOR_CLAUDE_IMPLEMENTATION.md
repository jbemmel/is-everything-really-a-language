# Effortless Visualizer — V3 Implementation Plan (Hand-off Spec)

---

## Implementation Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 — Skeleton | **COMPLETE** | Header, tabs, empty stages, core infrastructure, all 21 headless tests pass |
| M1 — Planning stage | **COMPLETE** | ChatWindow component, Planning chat animation, Agreement badge |
| M2 — Implementation (Traditional) | **COMPLETE** | Substrates cluster, chat gating, drift injection, counters |
| M3 — Implementation (Effortless) | **COMPLETE** | Token flow animation, parallel builds, English LLM chat |
| M4 — Testing stage | **COMPLETE** | Side-by-side scoring, delta overlay, fork animation |
| M5 — Polish | Pending | Tooltips, drawer, accessibility |

### M0 Completion Details (2024-02-27)

**What's implemented:**
- Header with mode toggle, speed selector (0.5x/1x/2x/4x), play/pause/step/reset controls
- Live counter displays (re-negotiations, re-implementations, drift events, runtime)
- Left tabs (Planning, Implementation, Testing) - always clickable, no gating
- All three stage layouts with placeholders
- Planning controls: name format radio, SSOT selector, Effortless CLI checkbox, 10 substrates grid
- Implementation layout: SSOT panel, Implementation Engine (updates per mode+CLI), Rule Card
- Testing layout: split-screen Traditional vs Effortless columns

**Core infrastructure:**
- `EventBus` - pub/sub with on/emit/once
- `Store` - global state with path-based get/set, clone-based immutability
- `Timeline` - animation sequencer with speed scaling, play/pause/reset/step
- `Components` - factory registry with create/destroy/reset
- `StageController` - manages stage transitions, builds per-stage timelines

**Headless test coverage:** 21 tests covering navigation, state persistence, mode switching, counters, infrastructure modules

**Test infrastructure:**
- `test-skeleton.mjs` - Puppeteer-based headless tests
- Run with: `node test-skeleton.mjs`
- Tests verify acceptance criteria from Section 12

**Minor deviations from spec:**
- Used `tech.substrates` instead of `tech.substratesSelected` (functionally equivalent)
- Used `runtimeMs` instead of `runtimeSeconds` (displays as seconds in UI)
- Added `stageState` object for per-stage transient state (not in original spec but useful)

### M1 Completion Details (2024-02-27)

**What's implemented:**
- ChatWindow component with typing animation and participant avatars
- PLANNING_PARTICIPANTS constant with You, Stakeholder, Implementer, LLM
- ChatScripts data with planning(), implementationTraditional(), and englishBuild() scripts
- Planning stage timeline that creates and plays ChatWindow on Play
- "Agreement reached ✓" badge that appears after chat completes
- Speed-scaled typing and message delays

**How it works:**
1. Click Play button to start the Planning stage timeline
2. ChatWindow mounts into the planning-chat-area
3. Chat messages appear with typing indicators and typewriter effect
4. After final message, Agreement badge appears
5. Store.stageState.planning.agreementReached is set to true

**Acceptance criteria met:**
- [x] Chat plays in Planning in both modes
- [x] "Agreement reached ✓" appears after chat completes
- [x] Rule card reflects selection (from M0)

### M2 Completion Details (2026-02-27)

**What's implemented:**
- `ImplementationController` module with full Traditional mode timeline
- Substrate nodes grid in implementation canvas (5x2 layout)
- Node states: pending, active (with working dots animation), complete (with checkmark), drift (with warning icon)
- Chat overlay that appears before each substrate step
- IMPLEMENTATION_PARTICIPANTS constant (Developer, LLM)
- Counter increments during timeline: renegotiations, manualReimplementations, driftEvents

**How it works (Traditional mode):**
1. Click Implementation tab to render substrate nodes
2. Click Play to start the Traditional timeline
3. For each selected substrate:
   - Chat overlay appears with implementationTraditional script
   - Re-negotiations counter increments
   - Chat plays with typing animation
   - Chat closes, node becomes "active" with working dots
   - Re-implementations counter increments
   - After work beat, node becomes "complete"
   - If binary/english: drift counter increments, node shows ⚠ warning
4. Timeline completes after all substrates processed

**CSS additions:**
- `.impl-substrates-container` - 5x2 grid layout
- `.impl-substrate-node` with state classes (pending/active/complete/drift)
- `.working-indicator` - animated dots for active state
- `.impl-chat-overlay` - semi-transparent overlay for implementation chats
- `@keyframes workingPulse` - animation for working dots

**Acceptance criteria met:**
- [x] Traditional: chat appears before each substrate step
- [x] Traditional: 3–5s manual work per substrate (speed-scaled via Timeline)
- [x] Drift appears at least on binary + english (⚠ warning icon)
- [x] Counters increment during Traditional timeline

### M3 Completion Details (2026-02-27)

**What's implemented:**
- Token flow animation from SSOT panel → Effortless CLI (green gradient line with glow)
- Single injection moment with panel highlight effects
- Parallel/staggered builds for fast substrates (~800ms each, 150ms stagger)
- Slower builds: OWL (~2s), English (~3s with LLM chat)
- Effortless-specific green styling (`.ssotme-mode` class)
- `setNodeStateSsotme()` - completes nodes WITHOUT drift markers
- `showEnglishChat()` - uses ChatScripts.englishBuild() for LLM interpretation
- `triggerTokenFlow()` - animates token line and highlights panels
- No counter increments during Effortless mode (deterministic = no renegotiation/drift)

**How it works (Effortless mode):**
1. Enable "Effortless CLI" checkbox in Planning, select Effortless mode
2. Click Implementation tab → nodes rendered
3. Click Play to start Effortless timeline:
   - Intro beat adds `.ssotme-mode` class, updates engine label to "Effortless CLI"
   - Injection beat triggers token flow animation (SSOT → CLI)
   - Builds-start beat activates all non-English nodes simultaneously
   - Fast substrates complete in staggered order (~600ms + 150ms per node)
   - OWL builds separately (2s duration)
   - English shows brief LLM chat overlay then completes
4. No counters increment (deterministic generation)
5. All nodes complete with green checkmarks, no drift warnings

**CSS additions:**
- `.token-flow-line` with `@keyframes tokenFlow` - animated injection line
- `.token-particle` (optional) - particle effects
- `.ssotme-mode .impl-substrate-node.active` - green-tinted active state
- `.ssotme-mode .working-indicator span` - green working dots
- `position: relative` on `#implementation-stage` for token flow positioning

**Visual distinction from Traditional:**
- Green glow effects instead of blue
- Single token flow vs repeated chat overlays

### M4 Completion Details (2026-02-27)

**What's implemented:**
- `TestingController` module with full testing stage timeline
- Test fork animation (Postgres origin → fork lines to both columns)
- Side-by-side scoring with Traditional running first, then Effortless
- ScoreBar-style rows with animated bar fills and score colors
- Delta indicators per row (↑ improved, ↓ regressed, = same)
- Delta overlay showing overall improvement percentage
- Column states: running (blue border), complete (checkmark after title)
- Drift indicators on Traditional rows where score < 100%

**How it works:**
1. Click Testing tab to render substrate rows in both columns
2. Click Play to start Testing timeline:
   - Intro renders fresh rows, resets scores
   - Fork animation shows "🐘 Postgres" dispatch to both columns
   - Traditional column runs first: each substrate shows running → complete with score
   - Brief pause between columns
   - Effortless column runs second: faster execution, shows delta indicators
3. Delta overlay appears with overall improvement (e.g., "+5.2%")
4. Both columns show completion checkmarks

**CSS additions:**
- `.test-substrate-row.pending/running/complete/drift` - row state styles
- `.test-substrate-score.score-high/mid/low` - green/yellow/red based on score
- `.test-fork-container`, `.test-fork-origin`, `.test-fork-line` - fork animation
- `@keyframes forkLeft/forkRight` - animated fork line spread
- `.test-delta-overlay` - centered overlay with improvement percentage
- `.delta-indicator.improved/regressed/same` - per-row delta arrows

**Acceptance criteria met:**
- [x] Single canonical test set forks to both columns
- [x] Traditional column fills first
- [x] Effortless fills second
- [x] Delta overlay appears after both complete
- [ ] English testing can show LLM variance tooltip (M5 polish)
- Fast parallel completion vs sequential chat-gated steps
- No drift warnings on completed nodes
- No counter increments visible

**Acceptance criteria met:**
- [x] Token flow SSOT → Effortless CLI visible during injection
- [x] Fast parallel builds for most substrates (~800ms)
- [x] Slower builds for OWL (~2s) and English (~3s with chat)
- [x] No drift/counters incrementing (deterministic mode)
- [x] Visual distinction from Traditional mode

### Bug Fixes (2026-02-27)

**Store.updateStageState added:**
- ChatWindow component was calling `Store.updateStageState()` but this method didn't exist
- Added `updateStageState(stage, updates)` method that does partial merge into stageState
- Now `agreementReached` is properly tracked after planning chat completes

### Known Minor Issues

1. **Fallback banner is subtle**: When Effortless mode is selected without CLI, the engine label changes to "Human + LLM (fallback)" but there's no prominent banner. The plan specifies a more visible fallback banner text. This is a polish item for M5.

2. **Testing stage is placeholder only**: The testing stage HTML structure exists but has no TestingController or animation timeline yet. This is the scope of M4.

---

**Goal:** Build a local, deterministic, presenter-friendly interactive visualization that tells the V3 story:
- **Planning:** humans/LLMs negotiate meaning once (legit + expected).
- **Implementation:** contrast *Traditional* (chat-gated + repeated re-implementation) vs *Effortless-build* (deterministic projection).
- **Testing:** same tests + canonical answers grade **both** pipelines side-by-side; only implementation differs.

This plan is written to be implemented locally (single-page app), with animations derived from a single global state and a per-stage timeline controller.

---

## 0) North Star Story

### Story beats
1. Everyone recognizes the pain:
   - meaning is negotiated repeatedly,
   - then re-implemented repeatedly,
   - drift + latency + mismatch emerge,
   - you discover it late in testing.
2. Effortless-build contrast:
   - agree once,
   - inject deterministically,
   - conformance testing becomes boring (good boring).

### Non-negotiable framing
- **Talking is legitimate in Planning** (both modes).
- **Only Implementation differs** between modes.
- **Testing is the same** (same blank tests + answer keys) and therefore acts as the “controlled experiment.”

---

## 1) Product Requirements

### 1.1 Top-level UI (Header)
- **Mode radio (required):**
  - `Traditional: Chat-gated implementation`
  - `Effortless-build: Deterministic generator`
- **Speed selector (required):** e.g., `0.5× / 1× / 2× / 4×`
- **Controls (optional but recommended):**
  - Play / Pause
  - Step (advance to next sub-beat inside current stage)
  - Reset stage
- **Details drawer (recommended):**
  - Shows “What’s happening” explanation and current counters (time, renegotiations, drift events).

### 1.2 Left Tabs (always visible)
- `Planning`
- `Implementation`
- `Testing`

**Tab navigation requirements**
1. Clicking a tab:
   - Immediately jumps to that stage’s layout.
   - Resets that stage’s timeline to its start (no lingering animations).
2. Must preserve planning choices:
   - rule choice
   - SSOT choice
   - substrate selection
   - Effortless CLI checkbox
3. No “unlocking” tabs; rewind anytime.

---

## 2) Global State Model (Single Source of UI Truth)

### 2.1 State shape
Use one state object (serializable, inspectable).

```js
state = {
  mode: "traditional" | "ssotme",

  stage: "planning" | "implementation" | "testing",

  rule: { nameFormat: "firstLast" | "lastFirst" },

  ssot: "airtable" | "excel" | "notion",

  tech: {
    hasEffortlessCLI: boolean,
    substratesSelected: Set<SubstrateId>
  },

  // Presentation/animation
  speed: 0.5 | 1 | 2 | 4,
  playing: boolean,

  // Derived counters (can be computed live, but OK to store for UI)
  counters: {
    renegotiations: number,
    manualReimplementations: number,
    driftEvents: number,
    runtimeSeconds: number
  }
}
```

### 2.2 Substrate IDs
Minimum default set (match V3 narrative):
- `python`, `golang`, `xlsx`, `csv`, `yaml`, `uml`, `binary`, `explaindag`, `owl`, `english`

### 2.3 Core rule card
Displayed in Planning + Implementation:
- `full_name = "First Last"` or `full_name = "Last, First"` (text + example)
- Example payload:
  - `John Doe` -> `John Doe` (firstLast)
  - `John Doe` -> `Doe, John` (lastFirst)

---

## 3) Behavior Matrix (Truth Table)

Implementation behavior depends on `state.mode` and `state.tech.hasEffortlessCLI`.

| Mode         | Effortless CLI? | Implementation behavior |
|--------------|----------------:|-------------------------|
| Traditional  | No              | Chat before each step + 3–5s manual work per substrate |
| Traditional  | Yes             | Still chat-heavy; show “we *could* auto-generate, but it isn’t the authority” |
| Effortless-build | Yes             | No chat between steps; ~1s deterministic builds for most; OWL/English slower |
| Effortless-build | No              | Fallback: forced into traditional patterns (reinforces generator leverage) |

**Note:** Planning always uses conversation in both modes.

---

## 4) Visual Language & Layout System

### 4.1 Shared canvas metaphor
Keep a “stage” canvas and token flows (from V2), but **each tab has its own layout**.
Reuse components:
- Hover tooltips per node
- Builder box animation (deterministic build)
- Chat window animation (conversation gating)
- Test box animation
- English-specific chat testing
- Score bars + runtime counters

### 4.2 No extra “schema/codegen/docs” nodes
Model only what the story needs:
- **SSOT node** (icon changes: Airtable/Excel/Notion)
- **Rule Card** (small panel)
- **Implementation Engine node**
  - Traditional: “Human + LLM Implementation”
  - Effortless: “Effortless CLI”
- **Substrates cluster** (selected only)
- **Testing nodes**:
  - Canonical compute (“Postgres”)
  - Blank tests + answer keys
  - Orchestrator
  - Report/Score area

---

## 5) Stage Specifications

## 5.1 Planning Tab

### Purpose
Show that agreeing on meaning is inherently social (humans + LLMs), and that’s fine.

### Layout
- Top quarter: Planning control panel (on-canvas)
- Bottom: meeting/chat stage with participants

### Planning controls
1. Name format: `First Last` / `Last, First`
2. SSOT choice: `Airtable` / `Excel` / `Notion`
3. Tech selection:
   - substrate checklist (multi-select)
   - checkbox: `Effortless CLI (deterministic generator)`

### Planning chat animation
Participants row:
- You (person avatar)
- Stakeholder (person avatar)
- Implementer (person avatar)
- LLM (logo/avatar)

Scripted chat:
- Debate “John Doe” formatting
- Decide “where truth lives” (SSOT)
- Ends with “Agreement reached ✓” badge (non-gating)

**Acceptance criteria**
- Changing controls updates state immediately.
- Replaying Planning chat does not alter prior control choices unless the script explicitly selects them.
- Planning always allows chat regardless of mode.

---

## 5.2 Implementation Tab

### Purpose
Show the difference between repeated implementation vs deterministic injection.

### Shared layout elements
- SSOT node (left)
- Rule Card (side panel)
- Implementation Engine (center)
- Substrates cluster (right)

### Traditional mode (or Effortless fallback when no CLI)
For each substrate in selection order:
1. Chat window pops near active substrate:
   - “How do we implement the name format in <substrate>?”
2. Manual work animation (3–5 seconds; scaled by speed)
3. Artifact appears on substrate node: “implemented ✓”
4. Drift occasionally appears:
   - Always drift: `binary`, `english` (obvious)
   - Optional minor drift: choose 1–2 additional (e.g., `yaml`, `xlsx`) to feel relatable

**Live counters**
- `renegotiations++` each time chat opens
- `manualReimplementations++` per substrate
- `driftEvents++` when a substrate deviates from canonical

### Effortless-build mode with Effortless CLI
Sequence:
1. Rule Card updates
2. **Single injection** moment: token flow `SSOT -> Effortless CLI`
3. Builds:
   - Most substrates: ~1 second builder animation (pipeline overlap OK)
   - OWL: slower build (e.g., 3–6 seconds)
   - English: chat-based build (still slow)

**No negotiation chats between steps** (except English build if desired).

**Acceptance criteria**
- Switching mode changes the implementation engine label and behavior immediately.
- When `mode=ssotme` and `hasEffortlessCLI=false`, show explicit fallback banner and run traditional behavior.

---

## 5.3 Testing Tab (Conformance)

### Purpose
Grade **both paths side-by-side** using the same tests and canonical answer keys.

### Layout (Split screen)
Left half: Traditional pipeline
Right half: Effortless pipeline

Each column contains:
- Postgres canonical compute
- Blank tests + answer keys
- Orchestrator
- Substrate lineup
- Report: score bars + runtime

### Animation choreography (recommended)
1. Postgres emits tests + answer keys once; visual fork to both sides.
2. Run **Traditional** column first (to reveal pain).
3. Run **Effortless** second (boring in a good way).
4. Show delta overlay:
   - green up arrows where Effortless improves
   - highlight mismatches/drift on traditional side

English testing can be chat-based (like V2); show “LLM interpretation variance” tooltip.

**Acceptance criteria**
- Both columns receive identical “test set” objects (same seed).
- Only implementation-derived artifacts differ.
- Delta overlay is purely computed from scores.

---

## 6) Chat Window Component (Reusable)

### UI spec
- Floating near active node
- Participants row includes:
  - You (always)
  - others per stage
- Message types:
  - typed animation
  - LLM “thinking…” indicator
  - optional “quote card” with final agreed rule text

### Where chat appears
- Planning: always
- Implementation:
  - Traditional: before each substrate step
  - Effortless: only for English build (and optionally OWL)
- Testing:
  - English substrate test execution may use chat

---

## 7) Data & Scoring Model

### 7.1 Canonical test set (blank tests + answer keys)
Represent as an object:
```js
testSet = {
  id: "run-<seed>",
  seed: number,
  cases: [
    { input: { first: "John", last: "Doe" }, expected: "John Doe" },
    ...
  ]
}
```

### 7.2 Per-substrate evaluation
Each substrate returns:
- `passCount`, `failCount`
- `score` (0–100)
- `runtimeSeconds` (per substrate)
- `notes` (optional; drift description)

### 7.3 Real vs captured runs (recommended)
Support two modes internally:
- **Captured run:** use deterministic fixture JSON for scores/timings (fast, consistent demo)
- **Live simulated run:** generate scores based on scripted rules + drift injection (still deterministic via seed)

Implementation can start with captured fixtures, then upgrade later.

---

## 8) Animation System (Derived From State)

### Principle
**State is truth.** Animations are a view-layer timeline derived from:
- `state.stage`
- `state.mode`
- `state.tech.hasEffortlessCLI`
- `state.tech.substratesSelected`
- `state.rule`, `state.ssot`

### Suggested architecture
- `StageController` per stage:
  - `reset()`
  - `play() / pause()`
  - `step()`
  - `tick(dt)` (dt scaled by speed)
  - emits `StageEvents` (e.g., “chat_opened”, “build_started”, “score_updated”)

- A pure function:
  - `buildTimeline(state) -> Timeline` for each stage

### Cancellation requirement
On tab switch:
- cancel in-flight animations cleanly
- clear transient UI (tokens, open chat) and restart stage timeline

---

## 9) Presenter Runbook (Scripted Demo)

### Opening (5–10s)
Say:
> “Everyone agrees on the rule. The problem is what happens next: we re-negotiate and re-implement the same meaning over and over, and then we’re surprised when it drifts.”

Action:
- Select **Traditional** mode.

### Planning tab
- Play planning chat; end with Agreement reached ✓
- Choose:
  - name format
  - SSOT
  - substrates (≥6 + English + OWL + Binary)
  - Effortless CLI unchecked

Say:
> “Talking isn’t the problem. Talking is the right tool for agreement.”

### Implementation tab (Traditional pain)
- Run sequence across substrates

Say:
> “This is slow, expensive, and non-deterministic—even in good faith.”

### Testing tab (Traditional results)
- Run tests; populate left column first

Say:
> “We discover the mismatch late—because meaning doesn’t survive translation unless you force it to.”

### Switch to Effortless-build
Action:
- Switch mode to Effortless-build
- Go back to Planning
- Check Effortless CLI (keep other selections)

Say:
> “Agreement stays social. Execution becomes mechanical.”

### Implementation (Effortless)
- Injection once, fast builds, English/OWL slower

### Testing (side-by-side)
- Run both columns and show deltas

Close:
> “Same tests. Same canonical answers. Two different implementation pipelines.”

---

## 10) File/Project Structure (Suggested)

```
/src
  index.html
  main.js
  styles.css

  /state
    store.js           // global state + reducers
    selectors.js       // derived state helpers

  /stages
    planning.js        // render + controller
    implementation.js
    testing.js

  /components
    Header.js
    Tabs.js
    StageCanvas.js
    Node.js
    TokenFlow.js
    ChatWindow.js
    RuleCard.js
    CountersPanel.js
    ScoreBars.js
    Tooltip.js
    Drawer.js

  /data
    fixtures.capturedRun.json
    chatScripts.json
    testSets.json
```

---

## 11) Milestones (Build Order)

### M0 — Skeleton (1 sitting)
- Header + tabs + empty stage layouts
- Global state wired
- Tab switching resets stage timelines

### M1 — Planning stage
- Planning controls + scripted chat + Agreement badge
- Rule card updates live

**M1 Implementation Notes (ready to start):**
1. ChatWindow component already specified in Section 17.1 - implement as written
2. Chat area placeholder exists at `.planning-chat-area` - mount ChatWindow there
3. Need to add participant avatars (You, Stakeholder, Implementer, LLM)
4. Create chat script data in `DATA: Chat Scripts` section
5. Add "Agreement reached ✓" badge that appears after chat completes
6. Wire chat playback to the Planning stage timeline
7. Timeline should call `onComplete` to set `stageState.planning.agreementReached = true`

### M2 — Implementation stage (Traditional)
- Substrates cluster
- Chat gating + manual work animations
- Drift injection on binary + english
- Counters increment

### M3 — Implementation stage (Effortless)
- Effortless CLI injection + fast builds
- Slow OWL + chat build for English
- Fallback banner when CLI absent

### M4 — Testing stage (side-by-side)
- Shared test set fork
- Traditional then Effortless grading
- Score bars + delta overlay

### M5 — Polish
- Tooltips
- Drawer explanations
- Smooth cancellation on tab switches
- Accessibility pass

---

## 12) Acceptance Test Checklist

### Navigation & state (M0 - COMPLETE)
- [x] Tabs always clickable; no gating
- [x] Tab click resets that stage timeline
- [x] Planning selections persist across tabs and resets
- [x] Mode toggle immediately changes behavior on Implementation/Testing

### Planning (M1 - COMPLETE)
- [x] Chat plays in Planning in both modes
- [x] “Agreement reached ✓” appears after chat completes
- [x] Rule card reflects selection *(M0: live updates work)*

### Implementation (M2/M3 - COMPLETE)
- [x] Traditional: chat appears before each substrate step
- [x] Traditional: 3–5s manual work per substrate (speed-scaled)
- [x] Drift appears at least on binary + english (⚠ indicator)
- [x] Counters increment during Traditional timeline (renegotiations, reimplementations, drift)
- [x] Effortless+CLI: single injection event; no chats between deterministic builds
- [x] Effortless without CLI: fallback banner + traditional pattern *(M0: engine label shows “fallback”)*

### Testing (M4 - COMPLETE)
- [x] Single canonical test set forks to both columns
- [x] Traditional column fills first
- [x] Effortless fills second
- [x] Delta overlay appears after both complete
- [ ] English testing can show LLM variance tooltip *(deferred to M5)*

### Robustness (M5 - PARTIAL)
- [x] Switching tabs mid-animation cancels cleanly (no stuck tokens/windows) *(M0: timeline reset on tab switch)*
- [x] Reset stage returns to consistent start state *(M0: StageController.reset works)*
- [x] Speed changes affect ongoing animations smoothly *(M0: Timeline reads speed from Store each tick)*

---

## 13) Implementation Notes (Pragmatic Choices)

- Prefer deterministic timelines and scripted events over fragile “physics.”
- Start with captured fixtures for scoring; move to live simulated scoring later.
- Keep animations readable at 1×; ensure 2×/4× doesn’t skip key beats (use minimum durations).
- Avoid clutter: only render selected substrates.

---

## 14) Copy (Short UI Text)

- Mode labels:
  - “Traditional: Chat-gated implementation”
  - “Effortless-build: Deterministic generator”
- Fallback banner:
  - “Effortless selected, but no deterministic generator present → falling back to traditional implementation.”
- Counter labels:
  - “Re-negotiations”
  - “Manual re-implementations”
  - “Drift events”
  - “Runtime”

---

## 15) Single-File Architecture (Zero Dependencies)

### 15.1 Design Philosophy

The entire application lives in one HTML file, but is **architecturally organized** as if it were a multi-file project. This gives us:
- **Zero dependencies** — works offline, no build step, no CDN failures
- **Copy-paste deployable** — drag into any browser
- **Clean separation** — each "module" is isolated by convention and clear markers
- **Reusable components** — shared primitives (ChatWindow, TokenFlow) used across stages

### 15.2 File Structure (Conceptual → Actual)

```
CONCEPTUAL (if split)              →  ACTUAL (single file sections)
─────────────────────────────────────────────────────────────────────
/styles/variables.css              →  <style> /* ═══ CSS VARIABLES ═══ */
/styles/layout.css                 →  <style> /* ═══ LAYOUT ═══ */
/styles/components.css             →  <style> /* ═══ COMPONENTS ═══ */
/styles/animations.css             →  <style> /* ═══ ANIMATIONS ═══ */

index.html                         →  <body> <!-- ═══ HTML STRUCTURE ═══ -->

/lib/EventBus.js                   →  <script> /* ═══ EVENT BUS ═══ */
/lib/Store.js                      →  <script> /* ═══ STATE STORE ═══ */
/lib/Timeline.js                   →  <script> /* ═══ TIMELINE ENGINE ═══ */
/lib/ComponentRegistry.js          →  <script> /* ═══ COMPONENT REGISTRY ═══ */

/components/ChatWindow.js          →  <script> /* ═══ COMPONENT: ChatWindow ═══ */
/components/TokenFlow.js           →  <script> /* ═══ COMPONENT: TokenFlow ═══ */
/components/Node.js                →  <script> /* ═══ COMPONENT: Node ═══ */
/components/RuleCard.js            →  <script> /* ═══ COMPONENT: RuleCard ═══ */
/components/ScoreBar.js            →  <script> /* ═══ COMPONENT: ScoreBar ═══ */
/components/Tooltip.js             →  <script> /* ═══ COMPONENT: Tooltip ═══ */
/components/Drawer.js              →  <script> /* ═══ COMPONENT: Drawer ═══ */
/components/CounterPanel.js        →  <script> /* ═══ COMPONENT: CounterPanel ═══ */

/stages/PlanningStage.js           →  <script> /* ═══ STAGE: Planning ═══ */
/stages/ImplementationStage.js     →  <script> /* ═══ STAGE: Implementation ═══ */
/stages/TestingStage.js            →  <script> /* ═══ STAGE: Testing ═══ */

/data/chatScripts.js               →  <script> /* ═══ DATA: Chat Scripts ═══ */
/data/substrateConfig.js           →  <script> /* ═══ DATA: Substrate Config ═══ */
/data/testFixtures.js              →  <script> /* ═══ DATA: Test Fixtures ═══ */

/main.js                           →  <script> /* ═══ MAIN: Bootstrap ═══ */
```

### 15.3 Section Markers (Required Convention)

Every logical section uses this exact format for easy navigation:

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  SECTION NAME                                                            ║
   ║  Brief description of what this section does                             ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
```

Subsections use:
```javascript
// ────────────────────────────────────────────────────────────────────────────
// Subsection Name
// ────────────────────────────────────────────────────────────────────────────
```

---

## 16) Core Infrastructure Modules

### 16.1 Event Bus

Central pub/sub for decoupled communication. Components never call each other directly.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  EVENT BUS                                                               ║
   ║  Pub/sub system for decoupled component communication                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const EventBus = (() => {
  const listeners = new Map();

  return {
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event).delete(callback); // unsubscribe
    },

    emit(event, payload) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(cb => cb(payload));
      }
    },

    once(event, callback) {
      const unsub = this.on(event, (payload) => {
        unsub();
        callback(payload);
      });
    }
  };
})();
```

**Standard Events:**
| Event | Payload | Emitted By |
|-------|---------|------------|
| `state:changed` | `{ key, value, prev }` | Store |
| `stage:enter` | `{ stage }` | StageController |
| `stage:exit` | `{ stage }` | StageController |
| `timeline:beat` | `{ beatId, stage }` | Timeline |
| `chat:opened` | `{ participants, context }` | ChatWindow |
| `chat:message` | `{ from, text }` | ChatWindow |
| `chat:closed` | `{ result }` | ChatWindow |
| `token:started` | `{ from, to, label }` | TokenFlow |
| `token:arrived` | `{ from, to, label }` | TokenFlow |
| `counter:increment` | `{ counter, value }` | CounterPanel |
| `substrate:built` | `{ id, mode }` | ImplementationStage |
| `substrate:tested` | `{ id, score }` | TestingStage |

---

### 16.2 State Store

Single source of truth. Immutable updates with change notifications.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  STATE STORE                                                             ║
   ║  Global state with immutable updates and change subscriptions            ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const Store = (() => {
  // Initial state
  let state = {
    // Mode
    mode: 'traditional',  // 'traditional' | 'ssotme'

    // Current stage
    stage: 'planning',    // 'planning' | 'implementation' | 'testing'

    // Rule configuration (set in Planning)
    rule: {
      nameFormat: 'firstLast'  // 'firstLast' | 'lastFirst'
    },

    // SSOT choice
    ssot: 'airtable',  // 'airtable' | 'excel' | 'notion'

    // Technology selections
    tech: {
      hasEffortlessCLI: false,
      substrates: new Set(['python', 'golang', 'xlsx', 'csv', 'yaml', 'uml',
                           'binary', 'explaindag', 'owl', 'english'])
    },

    // Playback
    speed: 1,       // 0.5 | 1 | 2 | 4
    playing: false,

    // Counters (reset per run)
    counters: {
      renegotiations: 0,
      manualReimplementations: 0,
      driftEvents: 0,
      runtimeMs: 0
    },

    // Stage-specific transient state
    stageState: {
      planning: { agreementReached: false },
      implementation: { currentSubstrate: null, completedSubstrates: new Set() },
      testing: { traditionalResults: {}, ssotmeResults: {}, phase: 'idle' }
    }
  };

  // Deep clone for immutability
  const clone = obj => JSON.parse(JSON.stringify(obj, (k, v) =>
    v instanceof Set ? { __set: [...v] } : v
  ), (k, v) => v?.__set ? new Set(v.__set) : v);

  return {
    get(path) {
      return path.split('.').reduce((o, k) => o?.[k], state);
    },

    set(path, value) {
      const keys = path.split('.');
      const prev = this.get(path);

      // Immutable update
      const newState = clone(state);
      let obj = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      state = newState;

      EventBus.emit('state:changed', { key: path, value, prev });
    },

    // Batch updates
    update(changes) {
      Object.entries(changes).forEach(([path, value]) => this.set(path, value));
    },

    // Full state snapshot (for debugging)
    snapshot() { return clone(state); }
  };
})();
```

---

### 16.3 Timeline Engine

Scriptable animation sequencer. Each stage builds a timeline from state.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  TIMELINE ENGINE                                                         ║
   ║  Deterministic animation sequencer with speed scaling                    ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const Timeline = (() => {

  // A Beat is one unit of animation
  // { id, duration, action, onStart?, onComplete?, parallel?: Beat[] }

  function createTimeline(beats) {
    let currentIndex = 0;
    let currentBeatStart = 0;
    let elapsed = 0;
    let paused = true;
    let rafId = null;
    let lastTick = 0;

    const instance = {
      beats,

      play() {
        if (!paused) return;
        paused = false;
        lastTick = performance.now();
        rafId = requestAnimationFrame(tick);
      },

      pause() {
        paused = true;
        if (rafId) cancelAnimationFrame(rafId);
      },

      reset() {
        this.pause();
        currentIndex = 0;
        currentBeatStart = 0;
        elapsed = 0;
        // Clean up any active animations
        EventBus.emit('timeline:reset', {});
      },

      step() {
        // Advance to next beat instantly
        if (currentIndex < beats.length) {
          const beat = beats[currentIndex];
          beat.onComplete?.();
          currentIndex++;
          if (currentIndex < beats.length) {
            beats[currentIndex].onStart?.();
          }
        }
      },

      get progress() {
        return currentIndex / beats.length;
      },

      get currentBeat() {
        return beats[currentIndex];
      }
    };

    function tick(now) {
      if (paused) return;

      const dt = (now - lastTick) * Store.get('speed');
      lastTick = now;
      elapsed += dt;

      const beat = beats[currentIndex];
      if (!beat) {
        instance.pause();
        EventBus.emit('timeline:complete', {});
        return;
      }

      // First tick of this beat
      if (elapsed - currentBeatStart < dt + 1) {
        beat.onStart?.();
        EventBus.emit('timeline:beat', { beatId: beat.id, index: currentIndex });
      }

      // Run the beat's action (for continuous animations)
      const beatElapsed = elapsed - currentBeatStart;
      const beatProgress = Math.min(1, beatElapsed / beat.duration);
      beat.action?.(beatProgress, beatElapsed);

      // Beat complete?
      if (beatElapsed >= beat.duration) {
        beat.onComplete?.();
        currentIndex++;
        currentBeatStart = elapsed;
      }

      rafId = requestAnimationFrame(tick);
    }

    return instance;
  }

  return { createTimeline };
})();
```

---

### 16.4 Component Registry

Factory pattern for creating and managing reusable UI components.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT REGISTRY                                                      ║
   ║  Factory for creating and managing reusable UI components                ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const Components = (() => {
  const registry = new Map();
  const instances = new Map();
  let instanceIdCounter = 0;

  return {
    // Register a component class/factory
    register(name, factory) {
      registry.set(name, factory);
    },

    // Create a new instance
    create(name, props = {}) {
      const factory = registry.get(name);
      if (!factory) throw new Error(`Unknown component: ${name}`);

      const id = `${name}-${++instanceIdCounter}`;
      const instance = factory({ id, ...props });
      instances.set(id, instance);

      return instance;
    },

    // Get existing instance
    get(id) {
      return instances.get(id);
    },

    // Destroy instance
    destroy(id) {
      const instance = instances.get(id);
      if (instance?.destroy) instance.destroy();
      instances.delete(id);
    },

    // Destroy all instances of a type
    destroyAll(namePrefix) {
      for (const [id, instance] of instances) {
        if (id.startsWith(namePrefix)) {
          if (instance?.destroy) instance.destroy();
          instances.delete(id);
        }
      }
    },

    // Clean up everything (stage transition)
    reset() {
      for (const [id, instance] of instances) {
        if (instance?.destroy) instance.destroy();
      }
      instances.clear();
    }
  };
})();
```

---

## 17) Reusable Component Specifications

### 17.1 ChatWindow Component

The most complex reusable component. Used in Planning and Implementation stages.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: ChatWindow                                                   ║
   ║  Animated chat dialog with typing effects and participant avatars        ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('ChatWindow', ({ id, anchor, participants, script, onComplete }) => {
  /*
   * anchor: { x, y } or element reference for positioning
   * participants: [{ id, name, avatar, color }]
   * script: [{ speaker, text, delay?, typing? }]
   * onComplete: callback when script finishes
   */

  // DOM structure
  const el = document.createElement('div');
  el.className = 'chat-window';
  el.innerHTML = `
    <div class="chat-header">
      <div class="chat-participants"></div>
      <div class="chat-title">Discussion</div>
    </div>
    <div class="chat-messages"></div>
    <div class="chat-typing" hidden>
      <span class="typing-indicator">●●●</span>
      <span class="typing-name"></span> is typing...
    </div>
  `;

  const participantsEl = el.querySelector('.chat-participants');
  const messagesEl = el.querySelector('.chat-messages');
  const typingEl = el.querySelector('.chat-typing');
  const typingNameEl = el.querySelector('.typing-name');

  // Render participants
  participants.forEach(p => {
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.style.background = p.color;
    avatar.textContent = p.avatar;
    avatar.title = p.name;
    participantsEl.appendChild(avatar);
  });

  // Script playback state
  let scriptIndex = 0;
  let isPlaying = false;

  const instance = {
    id,
    el,

    mount(container) {
      container.appendChild(el);
      // Position relative to anchor
      if (anchor) {
        el.style.left = `${anchor.x}px`;
        el.style.top = `${anchor.y}px`;
      }
      el.classList.add('visible');
      EventBus.emit('chat:opened', { id, participants });
    },

    async play() {
      isPlaying = true;

      while (scriptIndex < script.length && isPlaying) {
        const line = script[scriptIndex];
        const speaker = participants.find(p => p.id === line.speaker);

        // Show typing indicator
        if (line.typing !== false) {
          typingNameEl.textContent = speaker?.name || line.speaker;
          typingEl.hidden = false;
          await sleep((line.delay || 800) / Store.get('speed'));
          typingEl.hidden = true;
        }

        // Add message
        const msg = document.createElement('div');
        msg.className = 'chat-message';
        msg.innerHTML = `
          <div class="chat-avatar" style="background:${speaker?.color || '#666'}">
            ${speaker?.avatar || '?'}
          </div>
          <div class="chat-bubble">
            <div class="chat-speaker">${speaker?.name || line.speaker}</div>
            <div class="chat-text"></div>
          </div>
        `;
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Typewriter effect
        const textEl = msg.querySelector('.chat-text');
        if (line.typing !== false) {
          await typewriter(textEl, line.text, 30 / Store.get('speed'));
        } else {
          textEl.textContent = line.text;
        }

        EventBus.emit('chat:message', { id, speaker: line.speaker, text: line.text });

        scriptIndex++;
        await sleep((line.pause || 400) / Store.get('speed'));
      }

      if (isPlaying) {
        EventBus.emit('chat:closed', { id, result: 'complete' });
        onComplete?.();
      }
    },

    pause() {
      isPlaying = false;
    },

    destroy() {
      isPlaying = false;
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
    }
  };

  return instance;
});

// Helper functions (defined once at module level)
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typewriter(el, text, charDelay) {
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await sleep(charDelay);
  }
}
```

**CSS for ChatWindow:**
```css
/* ═══ COMPONENT: ChatWindow Styles ═══ */

.chat-window {
  position: absolute;
  width: 380px;
  max-height: 400px;
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  opacity: 0;
  transform: translateY(10px) scale(0.95);
  transition: opacity 250ms ease, transform 250ms ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.chat-window.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--stroke);
}

.chat-participants {
  display: flex;
  gap: -8px; /* overlap */
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 2px solid var(--panel);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-message {
  display: flex;
  gap: 10px;
  animation: messageIn 200ms ease;
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-bubble {
  background: var(--panel2);
  border-radius: 12px;
  padding: 8px 12px;
  max-width: 280px;
}

.chat-speaker {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}

.chat-typing {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--muted);
}

.typing-indicator {
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  25% { opacity: 0.3; }
}
```

---

### 17.2 TokenFlow Component

Animated tokens moving between nodes on the SVG canvas.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: TokenFlow                                                    ║
   ║  Animated token moving along a bezier path between SVG nodes             ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('TokenFlow', ({ id, svg, from, to, color, label, duration, onArrive }) => {
  /*
   * svg: SVG element reference
   * from: { x, y } start position
   * to: { x, y } end position
   * color: token fill color
   * label: short text inside token
   * duration: ms for travel (speed-adjusted internally)
   * onArrive: callback when token reaches destination
   */

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'token-flow');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', '14');
  circle.setAttribute('fill', color);
  circle.setAttribute('filter', 'url(#glow)');

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dy', '4');
  text.setAttribute('fill', '#0b0f14');
  text.setAttribute('font-size', '11');
  text.setAttribute('font-weight', '700');
  text.textContent = label;

  g.appendChild(circle);
  g.appendChild(text);

  // Bezier control points (curved path)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cp1 = { x: from.x + dx * 0.2, y: from.y + dy * 0.6 };
  const cp2 = { x: from.x + dx * 0.8, y: from.y + dy * 0.6 };

  function bezier(t) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*from.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*to.x,
      y: mt*mt*mt*from.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*to.y
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
  }

  let startTime = null;
  let rafId = null;
  let destroyed = false;

  function animate(now) {
    if (destroyed) return;
    if (!startTime) startTime = now;

    const elapsed = now - startTime;
    const adjustedDuration = duration / Store.get('speed');
    const progress = Math.min(1, elapsed / adjustedDuration);
    const eased = easeInOutCubic(progress);

    const pos = bezier(eased);
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

    // Scale up slightly at arrival
    if (progress > 0.9) {
      const scale = 1 + (progress - 0.9) * 3;
      circle.setAttribute('r', 14 * scale);
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      EventBus.emit('token:arrived', { id, from, to, label });
      onArrive?.();
      // Fade out
      g.style.transition = 'opacity 150ms';
      g.style.opacity = '0';
      setTimeout(() => g.remove(), 150);
    }
  }

  const instance = {
    id,
    el: g,

    start() {
      svg.querySelector('#tokens').appendChild(g);
      g.setAttribute('transform', `translate(${from.x}, ${from.y})`);
      EventBus.emit('token:started', { id, from, to, label });
      rafId = requestAnimationFrame(animate);
    },

    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      g.remove();
    }
  };

  return instance;
});
```

---

### 17.3 Node Component

SVG node with hover states, tooltips, and status indicators.

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: Node                                                         ║
   ║  SVG node with hover, tooltip, and status badge support                  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('Node', ({ id, svg, x, y, label, kind, tooltip, onClick }) => {
  /*
   * kind: 'source' | 'hub' | 'postgres' | 'substrate' | 'process' | 'artifact'
   * tooltip: { title, desc }
   */

  const STYLES = {
    source:    { stroke: 'var(--yellow)', width: 180 },
    hub:       { stroke: 'var(--blue)',   width: 260 },
    postgres:  { stroke: '#7ee787',       width: 220 },
    substrate: { stroke: 'var(--green)',  width: 160 },
    substrateSlow: { stroke: 'var(--yellow)', width: 160 },
    substrateFail: { stroke: 'var(--red)', width: 160 },
    process:   { stroke: 'var(--purple)', width: 240 },
    artifact:  { stroke: 'var(--blue)',   width: 200 },
  };

  const style = STYLES[kind] || STYLES.artifact;
  const height = 58;

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-node-id', id);
  g.setAttribute('transform', `translate(${x}, ${y})`);
  g.style.cursor = onClick ? 'pointer' : 'default';

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', -style.width / 2);
  rect.setAttribute('y', -height / 2);
  rect.setAttribute('width', style.width);
  rect.setAttribute('height', height);
  rect.setAttribute('rx', 14);
  rect.setAttribute('fill', 'rgba(14,22,33,0.95)');
  rect.setAttribute('stroke', style.stroke);
  rect.setAttribute('stroke-width', 2);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'var(--ink)');
  text.setAttribute('font-size', '13');

  const lines = label.split('\n');
  lines.forEach((line, i) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('x', 0);
    tspan.setAttribute('dy', i === 0 ? (lines.length > 1 ? '-6' : '4') : '16');
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  // Status badge (hidden by default)
  const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  badge.setAttribute('class', 'node-badge');
  badge.setAttribute('transform', `translate(${style.width/2 - 16}, ${-height/2 - 8})`);
  badge.style.opacity = '0';

  const badgeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  badgeCircle.setAttribute('r', '12');
  badgeCircle.setAttribute('fill', 'var(--green)');

  const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  badgeText.setAttribute('text-anchor', 'middle');
  badgeText.setAttribute('dy', '4');
  badgeText.setAttribute('fill', '#fff');
  badgeText.setAttribute('font-size', '12');
  badgeText.textContent = '✓';

  badge.appendChild(badgeCircle);
  badge.appendChild(badgeText);

  g.appendChild(rect);
  g.appendChild(text);
  g.appendChild(badge);

  // Hover effects
  g.addEventListener('mouseenter', () => {
    rect.style.strokeWidth = '3';
    rect.style.filter = 'url(#glow)';
    if (tooltip) {
      EventBus.emit('tooltip:show', { x, y, ...tooltip });
    }
  });

  g.addEventListener('mouseleave', () => {
    rect.style.strokeWidth = '2';
    rect.style.filter = '';
    EventBus.emit('tooltip:hide', {});
  });

  if (onClick) {
    g.addEventListener('click', onClick);
  }

  const instance = {
    id,
    el: g,
    x, y,

    mount(container) {
      container.appendChild(g);
    },

    setStatus(status) {
      // status: 'none' | 'complete' | 'error' | 'warning'
      if (status === 'none') {
        badge.style.opacity = '0';
      } else {
        badge.style.opacity = '1';
        badge.style.transition = 'opacity 200ms';

        const colors = { complete: 'var(--green)', error: 'var(--red)', warning: 'var(--yellow)' };
        const icons = { complete: '✓', error: '✗', warning: '!' };

        badgeCircle.setAttribute('fill', colors[status]);
        badgeText.textContent = icons[status];
      }
    },

    setKind(newKind) {
      const newStyle = STYLES[newKind] || STYLES.artifact;
      rect.setAttribute('stroke', newStyle.stroke);
    },

    highlight(on) {
      rect.style.strokeWidth = on ? '4' : '2';
      rect.style.filter = on ? 'url(#glow)' : '';
    },

    destroy() {
      g.remove();
    }
  };

  return instance;
});
```

---

### 17.4 Additional Components (Signatures)

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: RuleCard                                                     ║
   ║  Floating card showing current rule formula and example                  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('RuleCard', ({ id, x, y }) => {
  // Shows: formula, input example, expected output
  // Updates when Store.get('rule.nameFormat') changes
  // ...
});

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: CounterPanel                                                 ║
   ║  Live counters for renegotiations, reimplementations, drift, runtime     ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('CounterPanel', ({ id }) => {
  // 4 counter cards, animate on increment
  // Subscribes to state.counters changes
  // ...
});

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: ScoreBar                                                     ║
   ║  Horizontal progress bar showing substrate conformance score             ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

Components.register('ScoreBar', ({ id, label, score, time }) => {
  // label | ████████░░░░ | 87%
  // Color: green >90, yellow 70-90, red <70
  // ...
});

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: Tooltip                                                      ║
   ║  Global floating tooltip (singleton)                                     ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

// Listens to 'tooltip:show' and 'tooltip:hide' events
// Positions near mouse/anchor point
// ...

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  COMPONENT: Drawer                                                       ║
   ║  Right-side panel with details, controls, and event log                  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

// Toggle with gear button
// Contains: mode selector, counters, event log, debug state view
// ...
```

---

## 18) Stage Controller Architecture

Each stage has a controller that:
1. Builds its layout (nodes, edges)
2. Builds its timeline from current state
3. Handles stage-specific user interactions
4. Cleans up on exit

### 18.1 Stage Controller Interface

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  STAGE CONTROLLER BASE                                                   ║
   ║  Interface that all stage controllers implement                          ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const StageController = {
  // Active controller reference
  current: null,

  // Register stages
  stages: {},

  register(name, controller) {
    this.stages[name] = controller;
  },

  // Switch to a stage
  async switchTo(stageName) {
    // Exit current
    if (this.current) {
      await this.current.exit();
    }

    // Clean up all transient components
    Components.reset();

    // Enter new
    const next = this.stages[stageName];
    if (!next) throw new Error(`Unknown stage: ${stageName}`);

    this.current = next;
    Store.set('stage', stageName);

    EventBus.emit('stage:enter', { stage: stageName });

    await next.enter();
  }
};
```

### 18.2 Planning Stage Controller

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  STAGE: Planning                                                         ║
   ║  Rule selection, SSOT choice, substrate selection, agreement chat        ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

StageController.register('planning', {
  timeline: null,
  nodes: [],

  async enter() {
    // 1. Build layout
    this.buildLayout();

    // 2. Build timeline from state
    this.timeline = this.buildTimeline();

    // 3. Setup interactive controls (rule selector, checkboxes)
    this.setupControls();

    // 4. Auto-play if Store.get('playing')
    if (Store.get('playing')) {
      this.timeline.play();
    }
  },

  buildLayout() {
    const svg = document.getElementById('svg');
    const nodesGroup = svg.querySelector('#nodes');

    // Create SSOT node (changes icon based on ssot selection)
    const ssotNode = Components.create('Node', {
      svg, x: 200, y: 150,
      label: `${Store.get('ssot').toUpperCase()}\nSingle Source of Truth`,
      kind: 'source',
      tooltip: { title: 'SSOT', desc: 'Where canonical business rules are defined.' }
    });
    ssotNode.mount(nodesGroup);
    this.nodes.push(ssotNode);

    // Create participant avatars for planning chat
    // ... etc
  },

  buildTimeline() {
    const participants = [
      { id: 'you', name: 'You', avatar: '👤', color: 'var(--blue)' },
      { id: 'stakeholder', name: 'Stakeholder', avatar: '👔', color: 'var(--purple)' },
      { id: 'dev', name: 'Developer', avatar: '💻', color: 'var(--green)' },
      { id: 'llm', name: 'AI Assistant', avatar: '🤖', color: 'var(--yellow)' }
    ];

    const chatScript = ChatScripts.planning(Store.get('rule.nameFormat'));

    return Timeline.createTimeline([
      {
        id: 'intro',
        duration: 1000,
        onStart: () => {
          // Fade in nodes
        }
      },
      {
        id: 'chat',
        duration: chatScript.estimatedDuration,
        onStart: () => {
          const chat = Components.create('ChatWindow', {
            anchor: { x: 400, y: 200 },
            participants,
            script: chatScript.messages,
            onComplete: () => {
              Store.set('stageState.planning.agreementReached', true);
            }
          });
          chat.mount(document.getElementById('stageContainer'));
          chat.play();
        }
      },
      {
        id: 'agreement',
        duration: 800,
        onStart: () => {
          // Show "Agreement Reached ✓" badge
        }
      }
    ]);
  },

  setupControls() {
    // Rule format selector
    document.querySelectorAll('[data-rule-option]').forEach(el => {
      el.addEventListener('click', () => {
        Store.set('rule.nameFormat', el.dataset.ruleOption);
      });
    });

    // SSOT selector
    // Substrate checkboxes
    // Effortless CLI toggle
    // ...
  },

  async exit() {
    if (this.timeline) {
      this.timeline.pause();
      this.timeline.reset();
    }
    this.nodes.forEach(n => n.destroy());
    this.nodes = [];
  },

  play() { this.timeline?.play(); },
  pause() { this.timeline?.pause(); },
  reset() {
    this.timeline?.reset();
    // Reset stage-specific state but keep user choices
  },
  step() { this.timeline?.step(); }
});
```

### 18.3 Implementation Stage Controller (Outline)

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  STAGE: Implementation                                                   ║
   ║  Traditional vs Effortless build paths                                       ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

StageController.register('implementation', {

  buildTimeline() {
    const mode = Store.get('mode');
    const hasCLI = Store.get('tech.hasEffortlessCLI');
    const substrates = [...Store.get('tech.substrates')];

    if (mode === 'traditional' || (mode === 'ssotme' && !hasCLI)) {
      return this.buildTraditionalTimeline(substrates);
    } else {
      return this.buildSsotmeTimeline(substrates);
    }
  },

  buildTraditionalTimeline(substrates) {
    const beats = [];

    substrates.forEach((subId, i) => {
      // 1. Chat opens
      beats.push({
        id: `chat-${subId}`,
        duration: 2500,
        onStart: () => {
          Store.set('counters.renegotiations', Store.get('counters.renegotiations') + 1);
          // Open ChatWindow asking "How do we implement in {subId}?"
        }
      });

      // 2. Manual work animation
      beats.push({
        id: `work-${subId}`,
        duration: 3500,
        onStart: () => {
          Store.set('counters.manualReimplementations',
                    Store.get('counters.manualReimplementations') + 1);
          // Show "working..." animation
        }
      });

      // 3. Complete (maybe with drift)
      beats.push({
        id: `done-${subId}`,
        duration: 500,
        onStart: () => {
          const drifts = ['binary', 'english'];
          if (drifts.includes(subId)) {
            Store.set('counters.driftEvents', Store.get('counters.driftEvents') + 1);
          }
          // Mark substrate complete
        }
      });
    });

    return Timeline.createTimeline(beats);
  },

  buildSsotmeTimeline(substrates) {
    const beats = [];

    // Single injection moment
    beats.push({
      id: 'inject',
      duration: 1200,
      onStart: () => {
        // TokenFlow: SSOT → Effortless CLI
      }
    });

    // Parallel builds (visually staggered)
    substrates.forEach((subId, i) => {
      const duration = subId === 'owl' ? 4000 : subId === 'english' ? 6000 : 800;

      beats.push({
        id: `build-${subId}`,
        duration,
        onStart: () => {
          // Fast builder animation
          // For English: brief chat-based build
        }
      });
    });

    return Timeline.createTimeline(beats);
  }

  // ... enter, exit, etc.
});
```

### 18.4 Testing Stage Controller (Outline)

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  STAGE: Testing                                                          ║
   ║  Side-by-side conformance grading                                        ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

StageController.register('testing', {

  buildLayout() {
    // Split screen: left = Traditional, right = Effortless
    // Both share: Postgres at top → forks to both sides
    // Each side: Substrates → Orchestrator → Report
  },

  buildTimeline() {
    const beats = [];
    const substrates = [...Store.get('tech.substrates')];

    // 1. Postgres emits tests
    beats.push({
      id: 'emit-tests',
      duration: 1500,
      onStart: () => {
        // Token: Postgres → Blank Tests (forks to both sides)
      }
    });

    // 2. Run Traditional side first
    substrates.forEach(subId => {
      beats.push({
        id: `traditional-${subId}`,
        duration: this.getTestDuration(subId, 'traditional'),
        onStart: () => {
          // Test animation with score reveal
          // Show drift/mismatch indicators
        }
      });
    });

    // 3. Pause for effect
    beats.push({ id: 'pause', duration: 1000 });

    // 4. Run Effortless side
    substrates.forEach(subId => {
      beats.push({
        id: `ssotme-${subId}`,
        duration: this.getTestDuration(subId, 'ssotme'),
        onStart: () => {
          // Same tests, different (better) results
        }
      });
    });

    // 5. Delta overlay
    beats.push({
      id: 'delta',
      duration: 2000,
      onStart: () => {
        // Green up-arrows on Effortless advantages
        // Highlight drift on Traditional side
      }
    });

    return Timeline.createTimeline(beats);
  },

  getTestDuration(subId, mode) {
    // Use fixture data or calculate
    return TestFixtures.getRuntime(subId, mode);
  }
});
```

---

## 19) Data Layer

### 19.1 Chat Scripts

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  DATA: Chat Scripts                                                      ║
   ║  Scripted conversations for each stage/context                           ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const ChatScripts = {

  planning(nameFormat) {
    const expected = nameFormat === 'firstLast' ? 'John Doe' : 'Doe, John';

    return {
      estimatedDuration: 12000,
      messages: [
        { speaker: 'stakeholder', text: "We need to standardize how names appear across all systems." },
        { speaker: 'you', text: "Good idea. What format should we use?" },
        { speaker: 'stakeholder', text: `I think "${expected}" reads naturally.` },
        { speaker: 'dev', text: "Works for me. We just need to be consistent everywhere." },
        { speaker: 'llm', text: `Confirmed. The rule is: full_name = ${nameFormat === 'firstLast' ? 'First + " " + Last' : 'Last + ", " + First'}` },
        { speaker: 'you', text: "Perfect. Let's lock that in as our single source of truth." }
      ]
    };
  },

  implementationTraditional(substrate) {
    return {
      estimatedDuration: 3000,
      messages: [
        { speaker: 'dev', text: `Okay, now how do we implement this in ${substrate}?` },
        { speaker: 'llm', text: `For ${substrate}, you'll want to...`, typing: true },
        { speaker: 'dev', text: "Got it. Let me code that up.", delay: 500 }
      ]
    };
  },

  englishBuild() {
    return {
      estimatedDuration: 6000,
      messages: [
        { speaker: 'llm', text: "Generating natural language description...", delay: 1500 },
        { speaker: 'llm', text: "The full name is formed by combining the first name and last name...", delay: 2000 },
        { speaker: 'llm', text: "Note: LLM interpretations may vary slightly.", delay: 1000 }
      ]
    };
  }
};
```

### 19.2 Test Fixtures

```javascript
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  DATA: Test Fixtures                                                     ║
   ║  Deterministic test results for demo consistency                         ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const TestFixtures = {

  // Scores per substrate per mode
  scores: {
    traditional: {
      python: 100, golang: 100, xlsx: 98, csv: 100, yaml: 97,
      uml: 100, binary: 79.9, explaindag: 100, owl: 100, english: 71.7
    },
    ssotme: {
      python: 100, golang: 100, xlsx: 100, csv: 100, yaml: 100,
      uml: 100, binary: 100, explaindag: 100, owl: 100, english: 85.2
    }
  },

  // Runtime in ms (real-world equivalent)
  runtimes: {
    python: 100, golang: 100, xlsx: 120, csv: 90, yaml: 110,
    uml: 120, binary: 180, explaindag: 130, owl: 10000, english: 35000
  },

  // Drift descriptions for Traditional mode
  driftNotes: {
    binary: "Edge case: null handling differs from spec",
    english: "LLM occasionally swaps name order",
    xlsx: "Formula uses CONCATENATE instead of &"
  },

  getScore(substrate, mode) {
    return this.scores[mode]?.[substrate] ?? 100;
  },

  getRuntime(substrate, mode) {
    // Traditional has overhead from chat
    const base = this.runtimes[substrate];
    return mode === 'traditional' ? base * 1.5 : base;
  },

  getDriftNote(substrate) {
    return this.driftNotes[substrate] || null;
  }
};
```

---

## 20) HTML Structure Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Effortless Visualizer — V3</title>

  <style>
    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  CSS VARIABLES                                                     ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    :root { /* ... */ }

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  LAYOUT                                                            ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    /* ... */

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  COMPONENTS                                                        ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    /* ... */

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  ANIMATIONS                                                        ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    /* ... */
  </style>
</head>

<body>
  <!-- ╔════════════════════════════════════════════════════════════════════╗
       ║  HTML STRUCTURE                                                    ║
       ╚════════════════════════════════════════════════════════════════════╝ -->

  <div id="app" class="app">
    <header class="header">
      <!-- Mode toggle, speed, controls -->
    </header>

    <nav class="tabs">
      <!-- Planning | Implementation | Testing -->
    </nav>

    <main id="stageContainer" class="stage-container">
      <svg id="svg" viewBox="0 0 1200 740">
        <defs><!-- filters, markers --></defs>
        <g id="lanes"></g>
        <g id="edges"></g>
        <g id="nodes"></g>
        <g id="tokens"></g>
      </svg>
    </main>

    <aside id="drawer" class="drawer">
      <!-- Details panel -->
    </aside>

    <div id="tooltip" class="tooltip"></div>
  </div>

  <script>
    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  EVENT BUS                                                         ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  STATE STORE                                                       ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  TIMELINE ENGINE                                                   ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  COMPONENT REGISTRY                                                ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  COMPONENT: ChatWindow                                             ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  COMPONENT: TokenFlow                                              ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ... more components ... */

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  STAGE: Planning                                                   ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  STAGE: Implementation                                             ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  STAGE: Testing                                                    ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  DATA: Chat Scripts                                                ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  DATA: Test Fixtures                                               ║
       ╚════════════════════════════════════════════════════════════════════╝ */
    // ...

    /* ╔════════════════════════════════════════════════════════════════════╗
       ║  MAIN: Bootstrap                                                   ║
       ╚════════════════════════════════════════════════════════════════════╝ */

    document.addEventListener('DOMContentLoaded', () => {
      // Wire up header controls
      // Initialize tooltip listener
      // Start on Planning stage
      StageController.switchTo('planning');
    });
  </script>
</body>
</html>
```

---

## 21) Revised Milestones

### M0 — Infrastructure Skeleton (COMPLETE)
- [x] Full HTML template with section markers
- [x] EventBus, Store, Timeline, ComponentRegistry modules
- [x] Header with mode toggle, speed, play/pause/reset
- [x] Tab navigation wired to StageController.enter()
- [x] Stage enter/exit lifecycle works

### M1 — Planning Stage Complete (COMPLETE)
- [x] Planning layout with SSOT node, participant avatars
- [x] ChatWindow component with typing animation
- [x] Rule selector, SSOT selector, substrate checkboxes
- [x] Effortless CLI toggle
- [x] "Agreement Reached" badge
- [x] Planning timeline runs end-to-end

### M2 — Implementation Stage: Traditional (COMPLETE)
- [x] Layout: SSOT → Engine → Substrates
- [x] TokenFlow component working
- [x] Chat-per-substrate loop
- [x] CounterPanel showing live increments
- [x] Drift indicators on binary/english
- [x] Full Traditional timeline

### M3 — Implementation Stage: Effortless (COMPLETE)
- [x] Single injection token flow
- [x] Parallel builder animations
- [x] OWL/English slower builds
- [x] Fallback banner when CLI absent (subtle - engine label text)
- [x] Mode switch updates behavior immediately

### M4 — Testing Stage (4-5 hours) ✓ COMPLETE
- [x] Split-screen layout
- [x] ScoreBar component (integrated into test rows)
- [x] Test dispatch animation (fork from Postgres)
- [x] Traditional column runs first
- [x] Effortless column runs second
- [x] Delta overlay with improvement arrows
- [x] Final report summary (delta overlay shows improvement)

### M5 — Polish & Presenter Mode (2-3 hours)
- [ ] Drawer with full details
- [ ] Tooltips on all nodes
- [ ] Smooth animation cancellation
- [ ] Keyboard shortcuts (space=play/pause, arrows=step)
- [ ] URL params for presets (?mode=ssotme&stage=testing)
- [ ] Accessibility: focus management, ARIA labels

---

**Deliverable expectation:** A single locally runnable HTML/JS app with the above UI and behavior, using deterministic scripted animation and a state-driven timeline architecture.
