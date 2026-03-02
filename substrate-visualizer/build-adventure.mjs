#!/usr/bin/env node

/**
 * CLI script to build standalone adventure HTML files
 * Usage: node build-adventure.mjs <adventure-id>
 * Example: node build-adventure.mjs the-pain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load adventure
function loadAdventure(adventureId) {
  const adventurePath = path.join(__dirname, 'adventures', adventureId, 'adventure.json');
  if (!fs.existsSync(adventurePath)) {
    throw new Error(`Adventure not found: ${adventureId}`);
  }
  return JSON.parse(fs.readFileSync(adventurePath, 'utf8'));
}

// Load scene - looks in adventure-specific folder first, then global scenes
function loadScene(sceneId, adventureId = null) {
  let scenePath;
  let sceneDir;

  // Try adventure-specific scene first
  if (adventureId) {
    sceneDir = path.join(__dirname, 'adventures', adventureId, 'scenes', sceneId);
    scenePath = path.join(sceneDir, 'scene.json');
    if (fs.existsSync(scenePath)) {
      const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
      // Inline any SVG resources
      inlineSvgResources(scene, sceneDir);
      return scene;
    }
  }

  // Fall back to global scenes
  sceneDir = path.join(__dirname, 'scenes', sceneId);
  scenePath = path.join(sceneDir, 'scene.json');
  if (!fs.existsSync(scenePath)) {
    console.warn(`Scene not found: ${sceneId}`);
    return null;
  }
  const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
  // Inline any SVG resources
  inlineSvgResources(scene, sceneDir);
  return scene;
}

// Inline SVG files referenced by svgCanvas entities
function inlineSvgResources(scene, sceneDir) {
  if (!scene.entities) return;

  for (const [entityId, entity] of Object.entries(scene.entities)) {
    if (entity.type === 'svgCanvas' && entity.svgSrc && !entity.svgContent) {
      // Resolve path relative to scene directory
      const svgPath = path.join(sceneDir, entity.svgSrc);
      try {
        if (fs.existsSync(svgPath)) {
          entity.svgContent = fs.readFileSync(svgPath, 'utf8');
          console.log(`    Inlined SVG: ${entity.svgSrc}`);
          // Keep svgSrc for reference but svgContent takes precedence at runtime
        } else {
          console.warn(`    Warning: SVG not found: ${svgPath}`);
        }
      } catch (e) {
        console.warn(`    Warning: Could not read SVG ${svgPath}: ${e.message}`);
      }
    }
  }
}

// Collect all scenes referenced by an adventure
function collectScenes(adventure, adventureId) {
  const scenes = {};
  const visited = new Set();

  // New nested format: adventure.scenes[] array
  if (adventure.scenes && Array.isArray(adventure.scenes)) {
    function walkNestedItem(item) {
      if (!item) return;

      if (item.type === 'scene') {
        const sceneId = item.sceneRef || item.sceneId;
        if (sceneId && !visited.has(sceneId)) {
          visited.add(sceneId);
          const scene = loadScene(sceneId, adventureId);
          if (scene) {
            scenes[sceneId] = scene;
          }
        }
      } else if (item.type === 'choice') {
        // Walk each choice branch
        for (const choice of (item.choices || [])) {
          for (const nestedItem of (choice.scenes || [])) {
            walkNestedItem(nestedItem);
          }
        }
      }
      // 'end' type has no scenes to collect
    }

    for (const item of adventure.scenes) {
      walkNestedItem(item);
    }
    return scenes;
  }

  // Legacy format: adventure.nodes{} with startNode
  function walkNode(nodeId) {
    if (!nodeId || visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = adventure.nodes[nodeId];
    if (!node) return;

    if (node.type === 'scene' && node.sceneId) {
      const scene = loadScene(node.sceneId, adventureId);
      if (scene) {
        scenes[node.sceneId] = scene;
      }
      if (node.next) walkNode(node.next);
    } else if (node.type === 'choice') {
      for (const option of (node.options || [])) {
        if (option.next) walkNode(option.next);
      }
    }
  }

  walkNode(adventure.startNode);
  return scenes;
}

// Escape HTML
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Get minimal CSS
function getMinimalCSS() {
  return `
:root {
  --bg: #0d1117;
  --panel: #161b22;
  --panel2: #21262d;
  --stroke: #30363d;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #7c3aed;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#adventure-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  position: relative;
}

#adventure-stage {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

/* Gear button - top right corner */
#settings-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: 1px solid var(--stroke);
  border-radius: 50%;
  background: var(--panel);
  color: var(--text);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0.6;
  transition: opacity 0.2s, transform 0.2s;
}

#settings-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Settings popup */
#settings-popup {
  position: fixed;
  top: 70px;
  right: 16px;
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 16px;
  z-index: 999;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  display: none;
}

#settings-popup.show {
  display: block;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--muted);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.settings-row label {
  font-size: 13px;
  color: var(--text);
}

.settings-row select {
  background: var(--panel2);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  color: var(--text);
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.settings-row button {
  background: var(--panel2);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  color: var(--text);
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
}

.settings-row button:hover {
  background: var(--stroke);
}

#step-counter {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

#choice-overlay, #end-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.choice-content, .end-content {
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  text-align: center;
}

#choice-prompt {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
}

#choice-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-option-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 20px;
  background: var(--panel2);
  border: 2px solid var(--stroke);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  color: var(--text);
}

.choice-option-btn:hover {
  border-color: var(--accent);
  background: rgba(124, 58, 237, 0.1);
}

.choice-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.choice-label {
  font-size: 16px;
  font-weight: 600;
}

.choice-desc {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}

.end-content h2 {
  font-size: 28px;
  margin-bottom: 16px;
  color: var(--accent);
}

.end-content p {
  font-size: 16px;
  color: var(--muted);
  margin-bottom: 24px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.end-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 12px 24px;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  background: var(--panel2);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  border-color: var(--accent);
}

.action-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
}

.action-btn.primary:hover {
  background: #6d28d9;
}


.lessons-list {
  text-align: left;
  margin: 16px 0;
  padding-left: 24px;
}

.lessons-list li {
  margin: 8px 0;
  color: var(--muted);
}
`;
}

// Get StickScenePlayer code (inlined from the file)
function getStickScenePlayerCode() {
  const playerPath = path.join(__dirname, 'js', 'stick-scene-player.js');
  if (fs.existsSync(playerPath)) {
    // Read and extract the player code, removing module exports if any
    let code = fs.readFileSync(playerPath, 'utf8');
    return code;
  }
  // Fallback to embedded minimal version
  return getMinimalStickScenePlayer();
}

function getMinimalStickScenePlayer() {
  return `
const StickScenePlayer = (() => {
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function parseSmilTime(t) { if (!t) return null; const s = String(t).trim(); if (s.endsWith('ms')) return parseFloat(s) / 1000; if (s.endsWith('s')) return parseFloat(s); return parseFloat(s); }
  function formatSmilTime(sec) { return sec + 's'; }
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(c);
    return n;
  }
  function svgEl(tag, attrs = {}) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  }
  async function tween({ duration = 0.5, onUpdate, ease = easeOutCubic }) {
    const start = performance.now();
    const ms = duration * 1000;
    return new Promise((resolve) => {
      function frame(now) {
        const t = clamp01((now - start) / ms);
        const e = ease(t);
        onUpdate(e, t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  class StickActor {
    constructor(stage, id, spec) {
      this.stage = stage;
      this.id = id;
      this.x = spec.x ?? 100;
      this.y = spec.y ?? 300;
      this.scale = spec.scale ?? 1;
      this.head = spec.head ?? "🙂";
      this.bodyColor = spec.bodyColor ?? "#111";
      this.name = spec.name ?? id;
      this.pose = {
        shoulderL: spec.shoulderL ?? -30, elbowL: spec.elbowL ?? -20,
        shoulderR: spec.shoulderR ?? 30, elbowR: spec.elbowR ?? 20,
        headDirection: spec.headDirection ?? 1,
      };
      this.g = svgEl("g");
      this.stage.svg.appendChild(this.g);
      this.torso = svgEl("line", { x1: 0, y1: -60, x2: 0, y2: 0, stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.headText = svgEl("text", { x: 0, y: -60, "text-anchor": "middle", "font-size": 56 });
      this.headText.textContent = this.head;
      this.nameLabelGroup = svgEl("g");
      this.nameLabelBg = svgEl("rect", { rx: 6, ry: 6, fill: "#ffffff", stroke: "#e53935", "stroke-width": 2 });
      this.nameLabel = svgEl("text", { "text-anchor": "start", "font-size": 14, fill: "#333", "font-family": "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive", "font-weight": "bold" });
      this.nameLabel.textContent = this.name;
      this.nameLabelGroup.append(this.nameLabelBg, this.nameLabel);
      this.armLU = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armLL = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armRU = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armRL = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.legL = svgEl("line", { x1: 0, y1: 0, x2: -18, y2: 48, stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.legR = svgEl("line", { x1: 0, y1: 0, x2: 18, y2: 48, stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.g.append(this.torso, this.armLU, this.armLL, this.armRU, this.armRL, this.legL, this.legR, this.headText, this.nameLabelGroup);
      this.render();
    }
    setHead(emoji) { this.head = emoji; this.headText.textContent = emoji; }
    setPose(p) { Object.assign(this.pose, p); this.render(); }
    _armPoints(side) {
      const shoulder = { x: 0, y: -50 };
      const upperLen = 28, lowerLen = 26;
      const sA = (side === "L" ? this.pose.shoulderL : this.pose.shoulderR) * Math.PI / 180;
      const eA = (side === "L" ? this.pose.elbowL : this.pose.elbowR) * Math.PI / 180;
      const elbow = { x: shoulder.x + Math.cos(sA) * upperLen, y: shoulder.y + Math.sin(sA) * upperLen };
      const wrist = { x: elbow.x + Math.cos(sA + eA) * lowerLen, y: elbow.y + Math.sin(sA + eA) * lowerLen };
      return { shoulder, elbow, wrist };
    }
    render() {
      this.g.setAttribute("transform", \`translate(\${this.x}, \${this.y}) scale(\${this.scale})\`);
      const L = this._armPoints("L"), R = this._armPoints("R");
      this.armLU.setAttribute("x1", L.shoulder.x); this.armLU.setAttribute("y1", L.shoulder.y);
      this.armLU.setAttribute("x2", L.elbow.x); this.armLU.setAttribute("y2", L.elbow.y);
      this.armLL.setAttribute("x1", L.elbow.x); this.armLL.setAttribute("y1", L.elbow.y);
      this.armLL.setAttribute("x2", L.wrist.x); this.armLL.setAttribute("y2", L.wrist.y);
      this.armRU.setAttribute("x1", R.shoulder.x); this.armRU.setAttribute("y1", R.shoulder.y);
      this.armRU.setAttribute("x2", R.elbow.x); this.armRU.setAttribute("y2", R.elbow.y);
      this.armRL.setAttribute("x1", R.elbow.x); this.armRL.setAttribute("y1", R.elbow.y);
      this.armRL.setAttribute("x2", R.wrist.x); this.armRL.setAttribute("y2", R.wrist.y);
      const headDir = this.pose.headDirection ?? 1;
      this.headText.setAttribute("transform", \`scale(\${headDir}, 1)\`);
      this._renderNameLabel();
    }
    _renderNameLabel() {
      const padding = 8, labelScale = 1.2, labelY = 65;
      const fontSize = 14 * labelScale;
      const textWidth = this.name.length * (9 * labelScale), textHeight = 16 * labelScale;
      const bgWidth = textWidth + padding * 2, bgHeight = textHeight + padding * 2;
      const xPos = -bgWidth / 2;
      this.nameLabelGroup.setAttribute("transform", \`translate(\${xPos}, \${labelY})\`);
      this.nameLabel.setAttribute("font-size", fontSize);
      this.nameLabelBg.setAttribute("x", 0); this.nameLabelBg.setAttribute("y", 0);
      this.nameLabelBg.setAttribute("width", bgWidth); this.nameLabelBg.setAttribute("height", bgHeight);
      this.nameLabel.setAttribute("x", padding); this.nameLabel.setAttribute("y", bgHeight / 2 + textHeight / 4);
    }
    getAnchorScreenPoint() { return { x: this.x, y: this.y - 90 * this.scale }; }
    destroy() { this.g.remove(); }
  }

  class SceneStage {
    constructor({ mount, width, height, background }) {
      this.mount = mount;
      this.width = width;
      this.height = height;
      this.root = el("div", { className: "ssp-root" });
      this.root.style.cssText = \`position: relative; width: \${width}px; height: \${height}px; overflow: hidden; background: \${background || "#fff"}; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);\`;
      this.svg = svgEl("svg", { width, height, viewBox: \`0 0 \${width} \${height}\` });
      this.svg.style.cssText = "position: absolute; left: 0; top: 0;";
      this.overlay = el("div");
      this.overlay.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;";
      this.fade = el("div");
      this.fade.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: #000; opacity: 0; pointer-events: none; transition: opacity 0.1s;";
      this.root.appendChild(this.svg);
      this.root.appendChild(this.overlay);
      this.root.appendChild(this.fade);
      mount.appendChild(this.root);
      this._ensureStyles();
    }
    _ensureStyles() {
      if (document.getElementById("ssp-styles")) return;
      const style = el("style", { id: "ssp-styles" });
      style.textContent = \`
        .ssp-bubble { position: absolute; max-width: 320px; padding: 10px 14px; border-radius: 12px; background: #fff; color: #111; border: 2px solid #111; font: 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial; box-shadow: 0 6px 20px rgba(0,0,0,0.15); pointer-events: none; white-space: pre-wrap; z-index: 100; }
        .ssp-bubble::before { content: ""; position: absolute; bottom: -10px; left: 55px; border: 10px solid transparent; border-top-color: #111; border-bottom: 0; }
        .ssp-bubble::after { content: ""; position: absolute; bottom: -6px; left: 57px; border: 8px solid transparent; border-top-color: #fff; border-bottom: 0; }
        .ssp-chat { position: absolute; background: rgba(255,255,255,0.95); border: 2px solid #111; border-radius: 12px; padding: 12px; box-sizing: border-box; font: 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial; overflow-y: auto; pointer-events: auto; }
        .ssp-chat .row { margin: 8px 0; }
        .ssp-chat .who { font-weight: 700; margin-right: 6px; color: #333; }
        .ssp-chat .msg { color: #555; }
        .ssp-code { position: absolute; background: #1e1e1e; border: 2px solid #333; border-radius: 8px; padding: 12px 14px; box-sizing: border-box; font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #d4d4d4; white-space: pre-wrap; overflow: hidden; pointer-events: none; }
        .ssp-cursor { display: inline-block; width: 8px; background: #569cd6; animation: ssp-blink 1s step-start infinite; }
        @keyframes ssp-blink { 50% { opacity: 0; } }
        .ssp-title { position: absolute; font: bold 24px/1.2 system-ui, sans-serif; color: #111; text-align: center; }
        .ssp-whiteboard { position: absolute; background: #fff; border: 3px solid #444; border-radius: 4px; padding: 20px 24px; box-sizing: border-box; font: 26px/1.5 'Architects Daughter', 'Comic Sans MS', 'Brush Script MT', cursive; color: #1a5fb4; white-space: pre-wrap; overflow: hidden; pointer-events: none; box-shadow: 2px 4px 12px rgba(0,0,0,0.15); }
        .ssp-svg-canvas { position: absolute; overflow: hidden; border-radius: 8px; }
        .ssp-svg-canvas svg { width: 100%; height: 100%; display: block; }
      \`;
      document.head.appendChild(style);
    }
    destroy() { this.root.remove(); }
  }

  class Player {
    constructor({ mount, adapters = {} }) {
      this.mount = mount;
      this.adapters = adapters;
      this.stage = null;
      this.scene = null;
      this.entities = new Map();
      this.skills = new Map();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentStepIndex = 0;
      this.speedMultiplier = 1;
      this._registerCoreSkills();
    }
    setSpeed(multiplier) { this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier)); this._updateSvgAnimationSpeeds(); }
    _updateSvgAnimationSpeeds() {
      const speed = this.speedMultiplier;
      for (const [id, entity] of this.entities) {
        if (entity.kind !== 'svgCanvas' || !entity.svg) continue;
        try { const anims = entity.svg.getAnimations({ subtree: true }); for (const a of anims) a.playbackRate = speed; } catch (e) {}
        if (entity.originalSmilAttrs) {
          for (const attr of entity.originalSmilAttrs) {
            if (attr.dur) { const d = parseSmilTime(attr.dur); if (d !== null) attr.element.setAttribute('dur', formatSmilTime(d / speed)); }
            if (attr.begin) { const b = parseSmilTime(attr.begin); if (b !== null) attr.element.setAttribute('begin', formatSmilTime(b / speed)); }
          }
        }
      }
    }
    async load(sceneJson) {
      this.scene = sceneJson;
      const { stage } = sceneJson;
      this.mount.innerHTML = "";
      this.stage = new SceneStage({ mount: this.mount, width: stage?.width ?? 960, height: stage?.height ?? 540, background: stage?.background ?? "#fff" });
      this.entities.clear();
      const entities = sceneJson.entities ?? {};
      for (const [id, spec] of Object.entries(entities)) {
        if (spec.type === "stickActor") {
          this.entities.set(id, new StickActor(this.stage, id, spec));
        } else if (spec.type === "chatPanel") {
          const panel = el("div", { className: "ssp-chat" });
          panel.style.left = (spec.x ?? 0) + "px"; panel.style.top = (spec.y ?? 0) + "px";
          panel.style.width = (spec.width ?? 320) + "px"; panel.style.height = (spec.height ?? 240) + "px";
          this.stage.overlay.appendChild(panel);
          this.entities.set(id, { kind: "chatPanel", el: panel });
        } else if (spec.type === "codeEditor") {
          const editor = el("div", { className: "ssp-code" });
          editor.style.left = (spec.x ?? 0) + "px"; editor.style.top = (spec.y ?? 0) + "px";
          editor.style.width = (spec.width ?? 560) + "px"; editor.style.height = (spec.height ?? 260) + "px";
          editor.textContent = spec.initialText ?? "";
          this.stage.overlay.appendChild(editor);
          this.entities.set(id, { kind: "codeEditor", el: editor, text: spec.initialText ?? "" });
        } else if (spec.type === "title") {
          const title = el("div", { className: "ssp-title" });
          title.style.left = (spec.x ?? 0) + "px"; title.style.top = (spec.y ?? 0) + "px";
          title.style.width = (spec.width ?? 400) + "px";
          title.textContent = spec.text ?? "";
          if (spec.fontSize) title.style.fontSize = spec.fontSize + "px";
          if (spec.color) title.style.color = spec.color;
          this.stage.overlay.appendChild(title);
          this.entities.set(id, { kind: "title", el: title });
        } else if (spec.type === "whiteboard") {
          const board = el("div", { className: "ssp-whiteboard" });
          board.style.left = (spec.x ?? 0) + "px"; board.style.top = (spec.y ?? 0) + "px";
          board.style.width = (spec.width ?? 400) + "px"; board.style.height = (spec.height ?? 300) + "px";
          board.textContent = spec.initialText ?? "";
          if (spec.fontSize) board.style.fontSize = spec.fontSize + "px";
          if (spec.color) board.style.color = spec.color;
          this.stage.overlay.appendChild(board);
          this.entities.set(id, { kind: "whiteboard", el: board, text: spec.initialText ?? "" });
        } else if (spec.type === "svgCanvas") {
          const container = el("div", { className: "ssp-svg-canvas" });
          container.style.cssText = \`position: absolute; left: \${spec.x ?? 0}px; top: \${spec.y ?? 0}px; width: \${spec.width ?? 400}px; height: \${spec.height ?? 300}px; overflow: hidden; pointer-events: none;\`;
          const originalSmilAttrs = [];
          if (spec.svgContent) {
            container.innerHTML = spec.svgContent;
            const svgElement = container.querySelector("svg");
            if (svgElement) {
              svgElement.setAttribute("width", "100%");
              svgElement.setAttribute("height", "100%");
              svgElement.style.display = "block";
              const smilElements = svgElement.querySelectorAll('animate, animateMotion, animateTransform, set');
              smilElements.forEach((el) => { originalSmilAttrs.push({ element: el, dur: el.getAttribute('dur'), begin: el.getAttribute('begin') }); });
            }
          }
          this.stage.overlay.appendChild(container);
          this.entities.set(id, { kind: "svgCanvas", el: container, svg: container.querySelector("svg"), spec, originalSmilAttrs });
        }
      }
      this.currentStepIndex = 0;
      this._updateSvgAnimationSpeeds();
      EventBus.emit('scene:loaded', { sceneId: sceneJson.id, scene: sceneJson });
      return this;
    }
    registerSkill(name, fn) { this.skills.set(name, fn); }
    async play() {
      if (!this.scene) throw new Error("No scene loaded.");
      this.isPlaying = true; this.isPaused = false;
      EventBus.emit('scene:play', { sceneId: this.scene.id });
      try {
        const timeline = this.scene.timeline ?? [];
        for (let i = this.currentStepIndex; i < timeline.length; i++) {
          if (!this.isPlaying) break;
          while (this.isPaused && this.isPlaying) { await sleep(50); }
          this.currentStepIndex = i;
          await this._runStep(timeline[i]);
        }
      } finally {
        this.isPlaying = false;
        EventBus.emit('scene:complete', { sceneId: this.scene.id });
      }
    }
    pause() { this.isPaused = true; EventBus.emit('scene:pause', { sceneId: this.scene?.id }); }
    resume() { this.isPaused = false; EventBus.emit('scene:resume', { sceneId: this.scene?.id }); }
    stop() { this.isPlaying = false; this.isPaused = false; EventBus.emit('scene:stop', { sceneId: this.scene?.id }); }
    reset() { this.stop(); this.currentStepIndex = 0; if (this.scene) this.load(this.scene); }
    destroy() { this.stop(); this.entities.clear(); if (this.stage) { this.stage.destroy(); this.stage = null; } }
    async _runStep(step) {
      if (!this.isPlaying) return;
      if (step.par) { await Promise.all(step.par.map(s => this._runStep(s))); return; }
      const action = step.do;
      if (!action) return;
      const fn = this.skills.get(action);
      if (!fn) { console.warn(\`Unknown skill: \${action}\`); return; }
      await fn(this._ctx(), step);
    }
    _ctx() {
      const self = this;
      const speedMult = this.speedMultiplier;
      return {
        stage: this.stage, entities: this.entities, adapters: this.adapters, player: this,
        entity: (id) => this.entities.get(id),
        wait: (seconds) => sleep((seconds ?? 0) * 1000 / speedMult),
        tween: (opts) => tween({ ...opts, duration: (opts.duration || 0.5) / speedMult }),
        getActor: (id) => { const a = this.entities.get(id); if (!(a instanceof StickActor)) throw new Error(\`Entity "\${id}" is not a stickActor\`); return a; },
        runSkill: async (skillName, step) => { const fn = self.skills.get(skillName); if (fn) await fn(self._ctx(), step); }
      };
    }
    _registerCoreSkills() {
      this.registerSkill("fadeIn", async (ctx, step) => { const dur = step.args?.duration ?? 0.4; ctx.stage.fade.style.opacity = "1"; await ctx.tween({ duration: dur, onUpdate: (e) => ctx.stage.fade.style.opacity = String(1 - e) }); ctx.stage.fade.style.opacity = "0"; });
      this.registerSkill("fadeOut", async (ctx, step) => { const dur = step.args?.duration ?? 0.4; ctx.stage.fade.style.opacity = "0"; await ctx.tween({ duration: dur, onUpdate: (e) => ctx.stage.fade.style.opacity = String(e) }); ctx.stage.fade.style.opacity = "1"; });
      this.registerSkill("wait", async (ctx, step) => { await ctx.wait(step.args?.duration ?? 1); });
      this.registerSkill("moveTo", async (ctx, step) => { const id = step.target; const a = ctx.getActor(id); const { x, y, duration = 0.8 } = step.args ?? {}; const x0 = a.x, y0 = a.y; const targetX = x ?? x0; const targetY = y ?? y0; await ctx.tween({ duration, onUpdate: (e) => { a.x = x0 + (targetX - x0) * e; a.y = y0 + (targetY - y0) * e; a.render(); } }); });
      this.registerSkill("setHead", async (ctx, step) => { ctx.getActor(step.target).setHead(step.args?.emoji ?? "🙂"); });
      this.registerSkill("pose", async (ctx, step) => {
        const a = ctx.getActor(step.target);
        const dur = step.args?.duration ?? 0.3;
        const name = step.args?.name;
        const presets = { neutral: { shoulderL: -30, elbowL: -20, shoulderR: 30, elbowR: 20 }, shrug: { shoulderL: -75, elbowL: 10, shoulderR: 75, elbowR: -10 }, wave: { shoulderR: -70, elbowR: -40 }, think: { shoulderR: -120, elbowR: -90 }, point: { shoulderR: -10, elbowR: 0 }, handsUp: { shoulderL: -150, elbowL: -30, shoulderR: 150, elbowR: 30 }, crossed: { shoulderL: 30, elbowL: 60, shoulderR: -30, elbowR: -60 }, pointLeft: { shoulderL: -170, elbowL: 0, shoulderR: 30, elbowR: 20 }, pointRight: { shoulderL: -30, elbowL: -20, shoulderR: 10, elbowR: 0 }, pointUp: { shoulderL: -30, elbowL: -20, shoulderR: -90, elbowR: 0 }, presentLeft: { shoulderL: -150, elbowL: -20, shoulderR: 30, elbowR: 20 }, presentRight: { shoulderL: -30, elbowL: -20, shoulderR: -30, elbowR: 20 }, presentBoth: { shoulderL: -150, elbowL: -20, shoulderR: -30, elbowR: 20 }, handsDown: { shoulderL: 60, elbowL: 20, shoulderR: 120, elbowR: -20 }, welcome: { shoulderL: -120, elbowL: -10, shoulderR: -60, elbowR: 10 }, thinkingChin: { shoulderL: -30, elbowL: -20, shoulderR: -100, elbowR: -120 }, facepalm: { shoulderL: -30, elbowL: -20, shoulderR: -120, elbowR: -150 } };
        const headDir = step.args?.headDirection !== undefined ? { headDirection: step.args.headDirection } : {};
        const targetPose = { ...a.pose, ...(name ? (presets[name] ?? {}) : {}), ...(step.args?.angles ?? {}), ...headDir };
        const startPose = { ...a.pose };
        await ctx.tween({ duration: dur, onUpdate: (e) => { const p = {}; for (const k of Object.keys(targetPose)) { p[k] = startPose[k] + (targetPose[k] - startPose[k]) * e; } a.setPose(p); } });
      });
      this.registerSkill("bubbleSay", async (ctx, step) => {
        const a = ctx.getActor(step.target);
        const text = step.args?.text ?? "";
        const hold = step.args?.hold ?? Math.max(1.5, Math.min(4, text.length / 15));
        const b = el("div", { className: "ssp-bubble" });
        b.textContent = text;
        ctx.stage.overlay.appendChild(b);
        const { x, y } = a.getAnchorScreenPoint();
        b.style.left = Math.round(x - 60) + "px"; b.style.top = Math.round(y - 90) + "px";
        b.style.opacity = "0"; b.style.transform = "translateY(10px)";
        await ctx.tween({ duration: 0.15, onUpdate: (e) => { b.style.opacity = String(e); b.style.transform = \`translateY(\${10 * (1 - e)}px)\`; } });
        await ctx.wait(hold);
        await ctx.tween({ duration: 0.15, onUpdate: (e) => { b.style.opacity = String(1 - e); b.style.transform = \`translateY(\${-10 * e}px)\`; } });
        b.remove();
      });
      this.registerSkill("chatSay", async (ctx, step) => {
        const speaker = step.args?.speaker ?? "Narrator";
        const text = step.args?.text ?? "";
        const targetId = step.target ?? step.args?.target ?? "chat";
        const panel = ctx.entity(targetId);
        if (!panel || panel.kind !== "chatPanel") return;
        const row = el("div", { className: "row" }, [ el("span", { className: "who", textContent: speaker + ":" }), el("span", { className: "msg", textContent: " " + text }) ]);
        panel.el.appendChild(row);
        panel.el.scrollTop = panel.el.scrollHeight;
        await ctx.wait(step.args?.pause ?? 0.3);
      });
      this.registerSkill("typeCode", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "code";
        const editor = ctx.entity(targetId);
        if (!editor || editor.kind !== "codeEditor") return;
        const text = step.args?.text ?? "";
        const speedCps = step.args?.speedCps ?? 18;
        const append = step.args?.append ?? true;
        if (!append) { editor.text = ""; }
        const cursor = el("span", { className: "ssp-cursor", textContent: " " });
        editor.el.textContent = editor.text;
        editor.el.appendChild(cursor);
        for (let i = 0; i < text.length; i++) { editor.text += text[i]; editor.el.textContent = editor.text; editor.el.appendChild(cursor); await sleep(1000 / speedCps / ctx.player.speedMultiplier); }
        await ctx.wait(step.args?.cursorHold ?? 0.5);
        cursor.remove();
      });
      this.registerSkill("clearCode", async (ctx, step) => { const targetId = step.target ?? step.args?.target ?? "code"; const editor = ctx.entity(targetId); if (editor && editor.kind === "codeEditor") { editor.text = ""; editor.el.textContent = ""; } });
      this.registerSkill("setTitle", async (ctx, step) => { const targetId = step.target ?? step.args?.target ?? "title"; const title = ctx.entity(targetId); if (title && title.kind === "title") { title.el.textContent = step.args?.text ?? ""; } });
      this.registerSkill("writeBoard", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);
        if (!board || board.kind !== "whiteboard") return;
        const text = step.args?.text ?? "";
        const speedCps = step.args?.speedCps ?? 12;
        const append = step.args?.append ?? true;
        if (!append) { board.text = ""; }
        board.el.textContent = board.text;
        for (let i = 0; i < text.length; i++) { board.text += text[i]; board.el.textContent = board.text; await sleep(1000 / speedCps / ctx.player.speedMultiplier); }
        await ctx.wait(step.args?.hold ?? 0.3);
      });
      this.registerSkill("clearBoard", async (ctx, step) => { const targetId = step.target ?? step.args?.target ?? "board"; const board = ctx.entity(targetId); if (board && board.kind === "whiteboard") { board.text = ""; board.el.textContent = ""; } });
      this.registerSkill("eraseLines", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);
        if (!board || board.kind !== "whiteboard") return;
        const linesToErase = step.args?.lines ?? 1;
        const speedCps = step.args?.speedCps ?? 20;
        const lines = board.text.split('\\n');
        let erasedCount = 0;
        while (erasedCount < linesToErase && lines.length > 0) {
          let lastLine = lines[lines.length - 1];
          while (lastLine.length > 0) { lastLine = lastLine.slice(0, -1); lines[lines.length - 1] = lastLine; board.text = lines.join('\\n'); board.el.textContent = board.text; await sleep(1000 / speedCps / ctx.player.speedMultiplier); }
          lines.pop(); board.text = lines.join('\\n'); board.el.textContent = board.text; erasedCount++;
          if (erasedCount < linesToErase && lines.length > 0) { await sleep(100); }
        }
        await ctx.wait(step.args?.hold ?? 0.2);
      });
      this.registerSkill("crossOut", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);
        if (!board || board.kind !== "whiteboard") return;
        const lineNumber = step.args?.lineNumber;
        const textToFind = step.args?.text ?? "";
        const duration = step.args?.duration ?? 1;
        let searchText = textToFind;
        if (lineNumber !== undefined) {
          const lines = board.text.split('\\n');
          if (lineNumber > 0 && lineNumber <= lines.length) {
            searchText = lines[lineNumber - 1];
          }
        }
        if (!searchText) return;
        const startIndex = board.text.indexOf(searchText);
        if (startIndex === -1) return;
        const delayPerChar = (duration * 1000) / searchText.length / ctx.player.speedMultiplier;
        const beforeText = board.text.slice(0, startIndex);
        const afterText = board.text.slice(startIndex + searchText.length);
        for (let i = 1; i <= searchText.length; i++) {
          const crossedPart = searchText.slice(0, i).split('').map(c => c + '\\u0336').join('');
          const remainingPart = searchText.slice(i);
          board.el.textContent = beforeText + crossedPart + remainingPart + afterText;
          await sleep(delayPerChar);
        }
        const fullyCrossed = searchText.split('').map(c => c + '\\u0336').join('');
        board.text = beforeText + fullyCrossed + afterText;
        await ctx.wait(step.args?.hold ?? 0.3);
      });
    }
  }

  return {
    Player, StickActor, SceneStage, tween, sleep, el, svgEl, easeOutCubic, easeInOutCubic,
    create({ mount, adapters = {} }) { return new Player({ mount, adapters }); }
  };
})();
`;
}

// Get AdventurePlayer code
function getAdventurePlayerCode() {
  return `
const AdventurePlayer = (() => {
  let currentAdventure = null;
  let currentNodeId = null;
  let history = [];
  let scenePlayer = null;
  let isPlaying = false;
  let speedMultiplier = 1;

  let stageEl, choiceOverlay, choicePrompt, choiceOptions, endOverlay, endSummary, endTitle, stepCounterEl, pauseBtnEl, speedSelectEl, restartBtnEl, lessonsList;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function init() {
    stageEl = document.getElementById('adventure-stage');
    choiceOverlay = document.getElementById('choice-overlay');
    choicePrompt = document.getElementById('choice-prompt');
    choiceOptions = document.getElementById('choice-options');
    endOverlay = document.getElementById('end-overlay');
    endSummary = document.getElementById('end-summary');
    endTitle = document.querySelector('.end-content h2');
    stepCounterEl = document.getElementById('step-counter');
    pauseBtnEl = document.getElementById('btn-pause');
    speedSelectEl = document.getElementById('speed-select');
    restartBtnEl = document.getElementById('btn-restart');
    lessonsList = document.getElementById('lessons-list');

    // Settings popup toggle
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPopup = document.getElementById('settings-popup');
    const restartSettingsBtn = document.getElementById('btn-restart-settings');

    settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPopup?.classList.toggle('show');
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      if (settingsPopup?.classList.contains('show') && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
        settingsPopup.classList.remove('show');
      }
    });

    speedSelectEl?.addEventListener('change', (e) => {
      setSpeed(parseFloat(e.target.value));
    });

    pauseBtnEl?.addEventListener('click', () => {
      if (scenePlayer) {
        if (scenePlayer.isPaused) { resume(); pauseBtnEl.textContent = '▶️ Play'; }
        else { pause(); pauseBtnEl.textContent = '⏸ Pause'; }
      }
    });

    restartBtnEl?.addEventListener('click', restart);
    restartSettingsBtn?.addEventListener('click', () => {
      settingsPopup?.classList.remove('show');
      restart();
    });

    EventBus.on('scene:complete', handleSceneComplete);
  }

  async function play(adventureId) {
    currentAdventure = AdventureManager.getAdventure(adventureId);
    if (!currentAdventure) return;
    isPlaying = true;
    history = [];
    hideAllOverlays();
    await navigateToNode(currentAdventure.startNode);
    EventBus.emit('adventure:start', { adventureId, adventure: currentAdventure });
  }

  async function navigateToNode(nodeId) {
    if (!currentAdventure || !isPlaying) return;
    const node = currentAdventure.nodes[nodeId];
    if (!node) return;
    currentNodeId = nodeId;
    history.push(nodeId);
    updateProgress();
    switch (node.type) {
      case 'scene': await playSceneNode(node); break;
      case 'choice': showChoiceNode(node); break;
      case 'end': showEndNode(node); break;
    }
  }

  async function playSceneNode(node) {
    hideAllOverlays();
    const scene = SceneManager.getScene(node.sceneId);
    if (!scene) { if (node.next) { await sleep(500); await navigateToNode(node.next); } return; }
    if (scenePlayer) scenePlayer.destroy();
    scenePlayer = StickScenePlayer.create({ mount: stageEl });
    scenePlayer.setSpeed(speedMultiplier);
    await scenePlayer.load(scene);
    if (pauseBtnEl) pauseBtnEl.textContent = '⏸';
    scenePlayer._adventureNextNode = node.next;
    await scenePlayer.play();
  }

  function handleSceneComplete({ sceneId }) {
    if (!isPlaying || !scenePlayer) return;
    const nextNode = scenePlayer._adventureNextNode;
    if (nextNode) { sleep(300).then(() => { if (isPlaying) navigateToNode(nextNode); }); }
  }

  function showChoiceNode(node) {
    if (stageEl) stageEl.style.display = 'none';
    if (choiceOverlay) choiceOverlay.style.display = 'flex';
    if (choicePrompt) choicePrompt.textContent = node.prompt || 'What would you like to do?';
    if (choiceOptions) {
      choiceOptions.innerHTML = '';
      for (const option of (node.options || [])) {
        const btn = document.createElement('button');
        btn.className = 'choice-option-btn';
        btn.innerHTML = \`<span class="choice-icon">\${option.icon || ''}</span><span class="choice-label">\${option.label}</span>\${option.description ? \`<span class="choice-desc">\${option.description}</span>\` : ''}\`;
        btn.addEventListener('click', () => selectChoice(option.next));
        choiceOptions.appendChild(btn);
      }
    }
    EventBus.emit('adventure:choice', { nodeId: currentNodeId, node });
  }

  async function selectChoice(nextNodeId) {
    hideAllOverlays();
    if (stageEl) stageEl.style.display = 'flex';
    await navigateToNode(nextNodeId);
  }

  function showEndNode(node) {
    isPlaying = false;
    if (scenePlayer) { scenePlayer.destroy(); scenePlayer = null; }
    if (stageEl) stageEl.style.display = 'none';
    if (endOverlay) endOverlay.style.display = 'flex';
    if (endTitle) endTitle.textContent = node.title || 'Adventure Complete';
    if (endSummary) endSummary.textContent = node.summary || 'Adventure complete!';
    if (lessonsList && node.lessons && node.lessons.length > 0) {
      lessonsList.innerHTML = '';
      node.lessons.forEach(lesson => {
        const li = document.createElement('li');
        li.textContent = lesson;
        lessonsList.appendChild(li);
      });
      lessonsList.style.display = 'block';
    } else if (lessonsList) {
      lessonsList.style.display = 'none';
    }
    EventBus.emit('adventure:complete', { adventureId: currentAdventure?.id, path: history });
  }

  function hideAllOverlays() {
    if (choiceOverlay) choiceOverlay.style.display = 'none';
    if (endOverlay) endOverlay.style.display = 'none';
    if (stageEl) stageEl.style.display = 'flex';
  }

  function updateProgress() {
    if (stepCounterEl && currentAdventure) {
      stepCounterEl.textContent = \`Step \${history.length}\`;
    }
  }

  async function restart() { if (currentAdventure) await play(currentAdventure.id); }
  function stop() { isPlaying = false; if (scenePlayer) { scenePlayer.stop(); scenePlayer.destroy(); scenePlayer = null; } hideAllOverlays(); history = []; currentNodeId = null; }
  function setSpeed(multiplier) { speedMultiplier = Math.max(0.1, Math.min(10, multiplier)); if (scenePlayer) scenePlayer.setSpeed(speedMultiplier); }
  function pause() { if (scenePlayer) scenePlayer.pause(); }
  function resume() { if (scenePlayer) scenePlayer.resume(); }

  return { init, play, restart, stop, pause, resume, setSpeed, get isPlaying() { return isPlaying; } };
})();
`;
}

// Generate the complete HTML
function generateHTML(adventure, scenes) {
  const title = adventure.title || 'Adventure';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
${getMinimalCSS()}
  </style>
</head>
<body>
  <div id="adventure-container">
    <main id="adventure-stage"></main>

    <!-- Settings gear button -->
    <button id="settings-btn" title="Settings">⚙️</button>

    <!-- Settings popup -->
    <div id="settings-popup">
      <div class="settings-title">${escapeHTML(title)}</div>
      <div class="settings-row">
        <label>Speed</label>
        <select id="speed-select">
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </div>
      <div class="settings-row">
        <button id="btn-pause">⏸ Pause</button>
      </div>
      <div class="settings-row">
        <button id="btn-restart-settings">🔄 Restart</button>
      </div>
      <div id="step-counter">Step 1</div>
    </div>

    <div id="choice-overlay" style="display: none;">
      <div class="choice-content">
        <div id="choice-prompt">What would you like to do?</div>
        <div id="choice-options"></div>
      </div>
    </div>

    <div id="end-overlay" style="display: none;">
      <div class="end-content">
        <h2>Adventure Complete</h2>
        <p id="end-summary">Thanks for exploring!</p>
        <ul id="lessons-list" class="lessons-list" style="display: none;"></ul>
        <div class="end-actions">
          <button id="btn-restart" class="action-btn primary">Restart</button>
        </div>
      </div>
    </div>

  </div>

  <script>
// ============================================================================
// EMBEDDED DATA
// ============================================================================

const ADVENTURE = ${JSON.stringify(adventure, null, 2)};

const SCENES = ${JSON.stringify(scenes, null, 2)};

// ============================================================================
// MINIMAL EVENT BUS
// ============================================================================

const EventBus = (() => {
  const listeners = new Map();
  return {
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event).delete(callback);
    },
    emit(event, payload) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(cb => {
          try { cb(payload); } catch (e) { console.error(e); }
        });
      }
    },
    once(event, callback) {
      const unsub = this.on(event, (payload) => { unsub(); callback(payload); });
    }
  };
})();

// ============================================================================
// MINIMAL MANAGERS (shims)
// ============================================================================

const SceneManager = {
  getScene: (id) => SCENES[id]
};

const AdventureManager = {
  getAdventure: (id) => ADVENTURE
};

// ============================================================================
// STICK SCENE PLAYER
// ============================================================================

${getMinimalStickScenePlayer()}

// ============================================================================
// ADVENTURE PLAYER
// ============================================================================

${getAdventurePlayerCode()}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  AdventurePlayer.init();
  AdventurePlayer.play(ADVENTURE.id);
});

  </script>
</body>
</html>`;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node build-adventure.mjs <adventure-id>');
    console.log('Example: node build-adventure.mjs the-pain');
    process.exit(1);
  }

  const adventureId = args[0];

  try {
    console.log(`Building adventure: ${adventureId}`);

    // Load adventure
    const adventure = loadAdventure(adventureId);
    console.log(`  Title: ${adventure.title}`);

    // Collect scenes (with SVG inlining)
    const scenes = collectScenes(adventure, adventureId);
    const sceneCount = Object.keys(scenes).length;
    console.log(`  Scenes: ${sceneCount}`);

    // Generate HTML
    const html = generateHTML(adventure, scenes);

    // Write output
    const outputPath = path.join(__dirname, 'dist', `${adventureId}.html`);
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, html);

    console.log(`\nSuccess! Built: ${outputPath}`);
    console.log(`File size: ${(html.length / 1024).toFixed(1)} KB`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
