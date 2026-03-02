/* ============================================================================
   STICK SCENE PLAYER
   JSON-driven scene player: SVG stick actors + HTML overlays + skills
   ============================================================================ */

const StickScenePlayer = (() => {
  // Easing functions
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Parse SMIL time value (e.g., "1.2s", "500ms", "2") to seconds
  function parseSmilTime(timeStr) {
    if (!timeStr) return null;
    const str = String(timeStr).trim();
    if (str.endsWith('ms')) return parseFloat(str) / 1000;
    if (str.endsWith('s')) return parseFloat(str);
    return parseFloat(str); // assume seconds if no unit
  }

  // Format seconds back to SMIL time string
  function formatSmilTime(seconds) {
    return seconds + 's';
  }

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

  // ============================================================================
  // STICK ACTOR
  // ============================================================================

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
      this.labelPosition = spec.labelPosition ?? "right"; // "right" or "left"

      // Pose state (angles in degrees, headDirection: 1=right, -1=left)
      this.pose = {
        shoulderL: spec.shoulderL ?? -30,
        elbowL: spec.elbowL ?? -20,
        shoulderR: spec.shoulderR ?? 30,
        elbowR: spec.elbowR ?? 20,
        headDirection: spec.headDirection ?? 1,
      };

      // Build SVG group
      this.g = svgEl("g");
      this.stage.svg.appendChild(this.g);

      // Body parts
      this.torso = svgEl("line", {
        x1: 0, y1: -60, x2: 0, y2: 0,
        stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round"
      });

      this.headText = svgEl("text", {
        x: 0, y: -60, "text-anchor": "middle", "font-size": 56
      });
      this.headText.textContent = this.head;

      // Name label group (positioned to the right or left of the actor)
      this.nameLabelGroup = svgEl("g");

      // Background rounded rect
      this.nameLabelBg = svgEl("rect", {
        rx: 6, ry: 6,
        fill: "#ffffff",
        stroke: "#e53935",
        "stroke-width": 2
      });

      // Name text with marker-style font
      this.nameLabel = svgEl("text", {
        "text-anchor": "start",
        "font-size": 14,
        fill: "#333",
        "font-family": "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive",
        "font-weight": "bold"
      });
      this.nameLabel.textContent = this.name;

      this.nameLabelGroup.append(this.nameLabelBg, this.nameLabel);

      // Arms: 2 segments each
      this.armLU = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armLL = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armRU = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });
      this.armRL = svgEl("line", { stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round" });

      // Legs
      this.legL = svgEl("line", {
        x1: 0, y1: 0, x2: -18, y2: 48,
        stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round"
      });
      this.legR = svgEl("line", {
        x1: 0, y1: 0, x2: 18, y2: 48,
        stroke: this.bodyColor, "stroke-width": 4, "stroke-linecap": "round"
      });

      this.g.append(
        this.torso,
        this.armLU, this.armLL,
        this.armRU, this.armRL,
        this.legL, this.legR,
        this.headText,
        this.nameLabelGroup
      );

      this.render();
    }

    setHead(emoji) {
      this.head = emoji;
      this.headText.textContent = emoji;
    }

    setLabelPosition(position) {
      this.labelPosition = position === "left" ? "left" : "right";
      this.render();
    }

    setPose(p) {
      Object.assign(this.pose, p);
      this.render();
    }

    // Forward kinematics for 2-segment arm
    _armPoints(side) {
      const shoulder = { x: 0, y: -50 };
      const upperLen = 28;
      const lowerLen = 26;

      const sA = (side === "L" ? this.pose.shoulderL : this.pose.shoulderR) * Math.PI / 180;
      const eA = (side === "L" ? this.pose.elbowL : this.pose.elbowR) * Math.PI / 180;

      const elbow = {
        x: shoulder.x + Math.cos(sA) * upperLen,
        y: shoulder.y + Math.sin(sA) * upperLen
      };
      const wrist = {
        x: elbow.x + Math.cos(sA + eA) * lowerLen,
        y: elbow.y + Math.sin(sA + eA) * lowerLen
      };
      return { shoulder, elbow, wrist };
    }

    render() {
      this.g.setAttribute("transform", `translate(${this.x}, ${this.y}) scale(${this.scale})`);

      const L = this._armPoints("L");
      const R = this._armPoints("R");

      // Left arm
      this.armLU.setAttribute("x1", L.shoulder.x);
      this.armLU.setAttribute("y1", L.shoulder.y);
      this.armLU.setAttribute("x2", L.elbow.x);
      this.armLU.setAttribute("y2", L.elbow.y);

      this.armLL.setAttribute("x1", L.elbow.x);
      this.armLL.setAttribute("y1", L.elbow.y);
      this.armLL.setAttribute("x2", L.wrist.x);
      this.armLL.setAttribute("y2", L.wrist.y);

      // Right arm
      this.armRU.setAttribute("x1", R.shoulder.x);
      this.armRU.setAttribute("y1", R.shoulder.y);
      this.armRU.setAttribute("x2", R.elbow.x);
      this.armRU.setAttribute("y2", R.elbow.y);

      this.armRL.setAttribute("x1", R.elbow.x);
      this.armRL.setAttribute("y1", R.elbow.y);
      this.armRL.setAttribute("x2", R.wrist.x);
      this.armRL.setAttribute("y2", R.wrist.y);

      // Head direction (scaleX flips for looking left)
      const headDir = this.pose.headDirection ?? 1;
      this.headText.setAttribute("transform", `scale(${headDir}, 1)`);

      // Position name label to the right or left of the actor
      this._renderNameLabel();
    }

    _renderNameLabel() {
      const padding = 8;
      const labelScale = 1.2; // 1.2x bigger
      const labelY = 65; // Below the feet (legs end at y: 48)

      // Measure text width (approximate based on font size and character count)
      const fontSize = 14 * labelScale;
      const textWidth = this.name.length * (9 * labelScale); // ~9px per character scaled
      const textHeight = 16 * labelScale;

      const bgWidth = textWidth + padding * 2;
      const bgHeight = textHeight + padding * 2;

      // Center the label below the actor
      const xPos = -bgWidth / 2;

      // Position the group
      this.nameLabelGroup.setAttribute("transform", `translate(${xPos}, ${labelY})`);

      // Update font size for the label
      this.nameLabel.setAttribute("font-size", fontSize);

      // Size and position the background rect
      this.nameLabelBg.setAttribute("x", 0);
      this.nameLabelBg.setAttribute("y", 0);
      this.nameLabelBg.setAttribute("width", bgWidth);
      this.nameLabelBg.setAttribute("height", bgHeight);

      // Position text inside the rect (centered vertically)
      this.nameLabel.setAttribute("x", padding);
      this.nameLabel.setAttribute("y", bgHeight / 2 + textHeight / 4);
    }

    getAnchorScreenPoint() {
      return { x: this.x, y: this.y - 90 * this.scale };
    }

    destroy() {
      this.g.remove();
    }
  }

  // ============================================================================
  // SCENE STAGE
  // ============================================================================

  class SceneStage {
    constructor({ mount, width, height, background }) {
      this.mount = mount;
      this.width = width;
      this.height = height;

      // Host root
      this.root = el("div", { className: "ssp-root" });
      this.root.style.cssText = `
        position: relative;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: ${background || "#fff"};
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      `;

      // SVG stage
      this.svg = svgEl("svg", { width, height, viewBox: `0 0 ${width} ${height}` });
      this.svg.style.cssText = "position: absolute; left: 0; top: 0;";

      // Overlay layer
      this.overlay = el("div");
      this.overlay.style.cssText = `
        position: absolute; left: 0; top: 0;
        width: 100%; height: 100%;
        pointer-events: none;
      `;

      // Fade overlay
      this.fade = el("div");
      this.fade.style.cssText = `
        position: absolute; left: 0; top: 0;
        width: 100%; height: 100%;
        background: #000; opacity: 0;
        pointer-events: none;
        transition: opacity 0.1s;
      `;

      this.root.appendChild(this.svg);
      this.root.appendChild(this.overlay);
      this.root.appendChild(this.fade);

      mount.appendChild(this.root);
      this._ensureStyles();
    }

    _ensureStyles() {
      if (document.getElementById("ssp-styles")) return;

      // Add Google Font for marker-style text
      if (!document.getElementById("ssp-fonts")) {
        const fontLink = el("link", {
          id: "ssp-fonts",
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Permanent+Marker&display=swap"
        });
        document.head.appendChild(fontLink);
      }

      const style = el("style", { id: "ssp-styles" });
      style.textContent = `
        .ssp-bubble {
          position: absolute;
          max-width: 320px;
          padding: 10px 14px;
          border-radius: 12px;
          background: #fff;
          color: #111;
          border: 2px solid #111;
          font: 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          pointer-events: none;
          white-space: pre-wrap;
          z-index: 100;
        }
        .ssp-bubble::before {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 55px;
          border: 10px solid transparent;
          border-top-color: #111;
          border-bottom: 0;
        }
        .ssp-bubble::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 57px;
          border: 8px solid transparent;
          border-top-color: #fff;
          border-bottom: 0;
        }
        .ssp-chat {
          position: absolute;
          background: rgba(255,255,255,0.95);
          border: 2px solid #111;
          border-radius: 12px;
          padding: 12px;
          box-sizing: border-box;
          font: 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
          overflow-y: auto;
          pointer-events: auto;
        }
        .ssp-chat .row { margin: 8px 0; }
        .ssp-chat .who { font-weight: 700; margin-right: 6px; color: #333; }
        .ssp-chat .msg { color: #555; }
        .ssp-code {
          position: absolute;
          background: #1e1e1e;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 12px 14px;
          box-sizing: border-box;
          font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: #d4d4d4;
          white-space: pre-wrap;
          overflow: hidden;
          pointer-events: none;
        }
        .ssp-cursor {
          display: inline-block;
          width: 8px;
          background: #569cd6;
          animation: ssp-blink 1s step-start infinite;
        }
        @keyframes ssp-blink { 50% { opacity: 0; } }
        .ssp-title {
          position: absolute;
          font: bold 24px/1.2 system-ui, sans-serif;
          color: #111;
          text-align: center;
        }
        .ssp-whiteboard {
          position: absolute;
          background: #fff;
          border: 3px solid #444;
          border-radius: 4px;
          padding: 20px 24px;
          box-sizing: border-box;
          font: 26px/1.5 'Architects Daughter', 'Brush Script MT', cursive;
          color: #1a5fb4;
          white-space: pre-wrap;
          overflow: hidden;
          pointer-events: none;
          box-shadow: 2px 4px 12px rgba(0,0,0,0.15);
        }
      `;
      document.head.appendChild(style);
    }

    destroy() {
      this.root.remove();
    }
  }

  // ============================================================================
  // PLAYER CLASS
  // ============================================================================

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

    setSpeed(multiplier) {
      this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
      this._updateSvgAnimationSpeeds();
    }

    // Update animation speeds for all SVG canvas entities
    _updateSvgAnimationSpeeds() {
      const speed = this.speedMultiplier;

      for (const [id, entity] of this.entities) {
        if (entity.kind !== 'svgCanvas' || !entity.svg) continue;

        // Update CSS animations via Web Animations API
        try {
          const cssAnimations = entity.svg.getAnimations({ subtree: true });
          for (const anim of cssAnimations) {
            anim.playbackRate = speed;
          }
        } catch (e) {
          // getAnimations may not be supported in all browsers
        }

        // Update SMIL animations by scaling dur and begin attributes
        if (entity.originalSmilAttrs) {
          for (const attr of entity.originalSmilAttrs) {
            const el = attr.element;

            // Scale duration
            if (attr.dur) {
              const originalDur = parseSmilTime(attr.dur);
              if (originalDur !== null) {
                el.setAttribute('dur', formatSmilTime(originalDur / speed));
              }
            }

            // Scale begin time
            if (attr.begin) {
              const originalBegin = parseSmilTime(attr.begin);
              if (originalBegin !== null) {
                el.setAttribute('begin', formatSmilTime(originalBegin / speed));
              }
            }
          }
        }
      }
    }

    async load(sceneJson) {
      this.scene = sceneJson;
      const { stage } = sceneJson;

      // Reset mount
      this.mount.innerHTML = "";

      this.stage = new SceneStage({
        mount: this.mount,
        width: stage?.width ?? 960,
        height: stage?.height ?? 540,
        background: stage?.background ?? "#fff"
      });

      // Build entities
      this.entities.clear();
      const entities = sceneJson.entities ?? {};

      for (const [id, spec] of Object.entries(entities)) {
        if (spec.type === "stickActor") {
          const actor = new StickActor(this.stage, id, spec);
          this.entities.set(id, actor);
        } else if (spec.type === "chatPanel") {
          const panel = el("div", { className: "ssp-chat" });
          panel.style.left = (spec.x ?? 0) + "px";
          panel.style.top = (spec.y ?? 0) + "px";
          panel.style.width = (spec.width ?? 320) + "px";
          panel.style.height = (spec.height ?? 240) + "px";
          this.stage.overlay.appendChild(panel);
          this.entities.set(id, { kind: "chatPanel", el: panel });
        } else if (spec.type === "codeEditor") {
          const editor = el("div", { className: "ssp-code" });
          editor.style.left = (spec.x ?? 0) + "px";
          editor.style.top = (spec.y ?? 0) + "px";
          editor.style.width = (spec.width ?? 560) + "px";
          editor.style.height = (spec.height ?? 260) + "px";
          editor.textContent = spec.initialText ?? "";
          this.stage.overlay.appendChild(editor);
          this.entities.set(id, { kind: "codeEditor", el: editor, text: spec.initialText ?? "" });
        } else if (spec.type === "title") {
          const title = el("div", { className: "ssp-title" });
          title.style.left = (spec.x ?? 0) + "px";
          title.style.top = (spec.y ?? 0) + "px";
          title.style.width = (spec.width ?? 400) + "px";
          title.textContent = spec.text ?? "";
          if (spec.fontSize) title.style.fontSize = spec.fontSize + "px";
          if (spec.color) title.style.color = spec.color;
          this.stage.overlay.appendChild(title);
          this.entities.set(id, { kind: "title", el: title });
        } else if (spec.type === "whiteboard") {
          const board = el("div", { className: "ssp-whiteboard" });
          board.style.left = (spec.x ?? 0) + "px";
          board.style.top = (spec.y ?? 0) + "px";
          board.style.width = (spec.width ?? 400) + "px";
          board.style.height = (spec.height ?? 300) + "px";
          board.textContent = spec.initialText ?? "";
          if (spec.fontSize) board.style.fontSize = spec.fontSize + "px";
          if (spec.color) board.style.color = spec.color;
          this.stage.overlay.appendChild(board);
          this.entities.set(id, { kind: "whiteboard", el: board, text: spec.initialText ?? "" });
        } else if (spec.type === "svgCanvas") {
          // Create container div for SVG
          const container = el("div", { className: "ssp-svg-canvas" });
          container.style.cssText = `
            position: absolute;
            left: ${spec.x ?? 0}px;
            top: ${spec.y ?? 0}px;
            width: ${spec.width ?? 400}px;
            height: ${spec.height ?? 300}px;
            overflow: hidden;
            pointer-events: none;
          `;

          // Get SVG content - inline or load from file
          let svgContent = spec.svgContent;
          if (!svgContent && spec.svgSrc) {
            // Dev mode: load from file
            // Resolve relative paths using scene's _basePath if available
            let svgUrl = spec.svgSrc;
            if (svgUrl.startsWith('./') && sceneJson._basePath) {
              svgUrl = sceneJson._basePath + svgUrl.slice(2);
            } else if (!svgUrl.startsWith('/') && !svgUrl.startsWith('http') && sceneJson._basePath) {
              svgUrl = sceneJson._basePath + svgUrl;
            }
            try {
              const resp = await fetch(svgUrl);
              svgContent = await resp.text();
            } catch (e) {
              console.warn(`svgCanvas: Failed to load ${svgUrl}`, e);
              svgContent = `<svg viewBox="0 0 400 100"><text x="10" y="30" fill="red">Failed to load SVG</text></svg>`;
            }
          }

          // Parse and insert SVG
          const svgWrapper = document.createElement("div");
          svgWrapper.innerHTML = svgContent || `<svg viewBox="0 0 400 100"><text x="10" y="30" fill="#888">No SVG content</text></svg>`;
          const svgElement = svgWrapper.querySelector("svg");

          // Store original SMIL animation attributes for speed scaling
          const originalSmilAttrs = [];
          if (svgElement) {
            svgElement.setAttribute("width", "100%");
            svgElement.setAttribute("height", "100%");
            svgElement.style.display = "block";
            container.appendChild(svgElement);

            // Find all SMIL animation elements and store original timing
            const smilElements = svgElement.querySelectorAll('animate, animateMotion, animateTransform, set');
            smilElements.forEach((el, idx) => {
              originalSmilAttrs.push({
                element: el,
                dur: el.getAttribute('dur'),
                begin: el.getAttribute('begin')
              });
            });
          }

          this.stage.overlay.appendChild(container);
          this.entities.set(id, {
            kind: "svgCanvas",
            el: container,
            svg: svgElement,
            spec: spec,
            currentStep: null,
            animationState: {},
            originalSmilAttrs: originalSmilAttrs
          });
        } else {
          // Unknown type
          this.entities.set(id, { kind: "unknown", spec });
        }
      }

      this.currentStepIndex = 0;

      // Apply current speed to any SVG animations
      this._updateSvgAnimationSpeeds();

      EventBus.emit('scene:loaded', { sceneId: sceneJson.id, scene: sceneJson });
      return this;
    }

    registerSkill(name, fn) {
      this.skills.set(name, fn);
    }

    async play() {
      if (!this.scene) throw new Error("No scene loaded.");
      this.isPlaying = true;
      this.isPaused = false;

      EventBus.emit('scene:play', { sceneId: this.scene.id });

      try {
        const timeline = this.scene.timeline ?? [];
        for (let i = this.currentStepIndex; i < timeline.length; i++) {
          if (!this.isPlaying) break;

          while (this.isPaused && this.isPlaying) {
            await sleep(50);
          }

          this.currentStepIndex = i;
          await this._runStep(timeline[i]);
        }
      } finally {
        this.isPlaying = false;
        EventBus.emit('scene:complete', { sceneId: this.scene.id });
      }
    }

    pause() {
      this.isPaused = true;
      EventBus.emit('scene:pause', { sceneId: this.scene?.id });
    }

    resume() {
      this.isPaused = false;
      EventBus.emit('scene:resume', { sceneId: this.scene?.id });
    }

    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      EventBus.emit('scene:stop', { sceneId: this.scene?.id });
    }

    reset() {
      this.stop();
      this.currentStepIndex = 0;
      if (this.scene) {
        this.load(this.scene);
      }
    }

    destroy() {
      this.stop();
      this.entities.clear();
      if (this.stage) {
        this.stage.destroy();
        this.stage = null;
      }
    }

    // ---- Core runtime ----

    async _runStep(step) {
      if (!this.isPlaying) return;

      if (step.par) {
        await Promise.all(step.par.map(s => this._runStep(s)));
        return;
      }

      const action = step.do;
      if (!action) return;

      const fn = this.skills.get(action);
      if (!fn) {
        console.warn(`StickScenePlayer: Unknown skill "${action}"`);
        return;
      }

      const ctx = this._ctx();
      await fn(ctx, step);
    }

    _ctx() {
      const self = this;
      const speedMult = this.speedMultiplier;
      return {
        stage: this.stage,
        entities: this.entities,
        adapters: this.adapters,
        player: this,

        entity: (id) => this.entities.get(id),
        wait: (seconds) => sleep((seconds ?? 0) * 1000 / speedMult),
        tween: (opts) => tween({ ...opts, duration: (opts.duration || 0.5) / speedMult }),

        getActor: (id) => {
          const a = this.entities.get(id);
          if (!(a instanceof StickActor)) throw new Error(`Entity "${id}" is not a stickActor`);
          return a;
        },

        // Run another skill from within a skill
        runSkill: async (skillName, step) => {
          const fn = self.skills.get(skillName);
          if (fn) await fn(self._ctx(), step);
        }
      };
    }

    _registerCoreSkills() {
      // fadeIn / fadeOut
      this.registerSkill("fadeIn", async (ctx, step) => {
        const dur = step.args?.duration ?? 0.4;
        ctx.stage.fade.style.opacity = "1";
        await ctx.tween({
          duration: dur,
          onUpdate: (e) => ctx.stage.fade.style.opacity = String(1 - e)
        });
        ctx.stage.fade.style.opacity = "0";
      });

      this.registerSkill("fadeOut", async (ctx, step) => {
        const dur = step.args?.duration ?? 0.4;
        ctx.stage.fade.style.opacity = "0";
        await ctx.tween({
          duration: dur,
          onUpdate: (e) => ctx.stage.fade.style.opacity = String(e)
        });
        ctx.stage.fade.style.opacity = "1";
      });

      // wait
      this.registerSkill("wait", async (ctx, step) => {
        const duration = step.args?.duration ?? 1;
        await ctx.wait(duration);
      });

      // moveTo
      this.registerSkill("moveTo", async (ctx, step) => {
        const id = step.target;
        const a = ctx.getActor(id);
        const { x, y, duration = 0.8 } = step.args ?? {};
        const x0 = a.x, y0 = a.y;
        const targetX = x ?? x0;
        const targetY = y ?? y0;

        await ctx.tween({
          duration,
          onUpdate: (e) => {
            a.x = x0 + (targetX - x0) * e;
            a.y = y0 + (targetY - y0) * e;
            a.render();
          }
        });
      });

      // setHead
      this.registerSkill("setHead", async (ctx, step) => {
        const a = ctx.getActor(step.target);
        a.setHead(step.args?.emoji ?? "🙂");
      });

      // pose
      this.registerSkill("pose", async (ctx, step) => {
        const a = ctx.getActor(step.target);
        const dur = step.args?.duration ?? 0.3;
        const name = step.args?.name;

        const presets = {
          neutral: { shoulderL: -30, elbowL: -20, shoulderR: 30, elbowR: 20 },
          shrug: { shoulderL: -75, elbowL: 10, shoulderR: 75, elbowR: -10 },
          wave: { shoulderR: -70, elbowR: -40 },
          think: { shoulderR: -120, elbowR: -90 },
          point: { shoulderR: -10, elbowR: 0 },
          handsUp: { shoulderL: -150, elbowL: -30, shoulderR: 150, elbowR: 30 },
          crossed: { shoulderL: 30, elbowL: 60, shoulderR: -30, elbowR: -60 },
          // Directional pointing
          pointLeft: { shoulderL: -170, elbowL: 0, shoulderR: 30, elbowR: 20 },
          pointRight: { shoulderL: -30, elbowL: -20, shoulderR: 10, elbowR: 0 },
          pointUp: { shoulderL: -30, elbowL: -20, shoulderR: -90, elbowR: 0 },
          pointUpLeft: { shoulderL: -130, elbowL: 0, shoulderR: 30, elbowR: 20 },
          pointUpRight: { shoulderL: -30, elbowL: -20, shoulderR: -50, elbowR: 0 },
          pointUpBoth: { shoulderL: -130, elbowL: 0, shoulderR: -50, elbowR: 0 },
          pointDown: { shoulderL: -30, elbowL: -20, shoulderR: 90, elbowR: 0 },
          // Presenting/gesturing
          presentLeft: { shoulderL: -150, elbowL: -20, shoulderR: 30, elbowR: 20 },
          presentRight: { shoulderL: -30, elbowL: -20, shoulderR: -30, elbowR: 20 },
          presentBoth: { shoulderL: -150, elbowL: -20, shoulderR: -30, elbowR: 20 },
          // Hands down
          handsDown: { shoulderL: 60, elbowL: 20, shoulderR: 120, elbowR: -20 },
          // Welcoming
          welcome: { shoulderL: -120, elbowL: -10, shoulderR: -60, elbowR: 10 },
        };

        const headDir = step.args?.headDirection !== undefined ? { headDirection: step.args.headDirection } : {};
        const targetPose = { ...a.pose, ...(name ? (presets[name] ?? {}) : {}), ...(step.args?.angles ?? {}), ...headDir };
        const startPose = { ...a.pose };

        await ctx.tween({
          duration: dur,
          onUpdate: (e) => {
            const p = {};
            for (const k of Object.keys(targetPose)) {
              p[k] = startPose[k] + (targetPose[k] - startPose[k]) * e;
            }
            a.setPose(p);
          }
        });
      });

      // bubbleSay
      this.registerSkill("bubbleSay", async (ctx, step) => {
        const a = ctx.getActor(step.target);
        const text = step.args?.text ?? "";
        const hold = step.args?.hold ?? Math.max(1.5, Math.min(4, text.length / 15));

        const b = el("div", { className: "ssp-bubble" });
        b.textContent = text;
        ctx.stage.overlay.appendChild(b);

        const { x, y } = a.getAnchorScreenPoint();
        // Position bubble well above the head, centered over the actor
        b.style.left = Math.round(x - 60) + "px";
        b.style.top = Math.round(y - 90) + "px";
        b.style.opacity = "0";
        b.style.transform = "translateY(10px)";

        await ctx.tween({
          duration: 0.15,
          onUpdate: (e) => {
            b.style.opacity = String(e);
            b.style.transform = `translateY(${10 * (1 - e)}px)`;
          }
        });

        await ctx.wait(hold);

        await ctx.tween({
          duration: 0.15,
          onUpdate: (e) => {
            b.style.opacity = String(1 - e);
            b.style.transform = `translateY(${-10 * e}px)`;
          }
        });

        b.remove();
      });

      // chatSay
      this.registerSkill("chatSay", async (ctx, step) => {
        const speaker = step.args?.speaker ?? "Narrator";
        const text = step.args?.text ?? "";
        const targetId = step.target ?? step.args?.target ?? "chat";
        const panel = ctx.entity(targetId);

        if (!panel || panel.kind !== "chatPanel") {
          console.warn(`chatSay: target "${targetId}" not found or not a chatPanel`);
          return;
        }

        const row = el("div", { className: "row" }, [
          el("span", { className: "who", textContent: speaker + ":" }),
          el("span", { className: "msg", textContent: " " + text })
        ]);

        panel.el.appendChild(row);
        panel.el.scrollTop = panel.el.scrollHeight;

        await ctx.wait(step.args?.pause ?? 0.3);
      });

      // typeCode
      this.registerSkill("typeCode", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "code";
        const editor = ctx.entity(targetId);

        if (!editor || editor.kind !== "codeEditor") {
          console.warn(`typeCode: target "${targetId}" not found or not a codeEditor`);
          return;
        }

        const text = step.args?.text ?? "";
        const speedCps = step.args?.speedCps ?? 18;
        const append = step.args?.append ?? true;

        // Clear if not appending
        if (!append) {
          editor.text = "";
        }

        const cursor = el("span", { className: "ssp-cursor", textContent: " " });
        editor.el.textContent = editor.text;
        editor.el.appendChild(cursor);

        for (let i = 0; i < text.length; i++) {
          editor.text += text[i];
          editor.el.textContent = editor.text;
          editor.el.appendChild(cursor);
          await sleep(1000 / speedCps);
        }

        await ctx.wait(step.args?.cursorHold ?? 0.5);
        cursor.remove();
      });

      // clearCode
      this.registerSkill("clearCode", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "code";
        const editor = ctx.entity(targetId);
        if (editor && editor.kind === "codeEditor") {
          editor.text = "";
          editor.el.textContent = "";
        }
      });

      // setTitle
      this.registerSkill("setTitle", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "title";
        const title = ctx.entity(targetId);
        if (title && title.kind === "title") {
          title.el.textContent = step.args?.text ?? "";
        }
      });

      // writeBoard (handwriting effect for whiteboard)
      this.registerSkill("writeBoard", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);

        if (!board || board.kind !== "whiteboard") {
          console.warn(`writeBoard: target "${targetId}" not found or not a whiteboard`);
          return;
        }

        const text = step.args?.text ?? "";
        const speedCps = step.args?.speedCps ?? 12; // Slower for handwriting feel
        const append = step.args?.append ?? true;

        // Clear if not appending
        if (!append) {
          board.text = "";
        }

        board.el.textContent = board.text;

        for (let i = 0; i < text.length; i++) {
          board.text += text[i];
          board.el.textContent = board.text;
          await sleep(1000 / speedCps);
        }

        await ctx.wait(step.args?.hold ?? 0.3);
      });

      // clearBoard
      this.registerSkill("clearBoard", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);
        if (board && board.kind === "whiteboard") {
          board.text = "";
          board.el.textContent = "";
        }
      });

      // eraseLines - erases N lines from the whiteboard, right to left
      this.registerSkill("eraseLines", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);

        if (!board || board.kind !== "whiteboard") {
          console.warn(`eraseLines: target "${targetId}" not found or not a whiteboard`);
          return;
        }

        const linesToErase = step.args?.lines ?? 1;
        const speedCps = step.args?.speedCps ?? 20; // Characters per second for erasing

        // Split into lines
        const lines = board.text.split('\n');
        let erasedCount = 0;

        while (erasedCount < linesToErase && lines.length > 0) {
          // Get the last line
          let lastLine = lines[lines.length - 1];

          // Erase characters from right to left
          while (lastLine.length > 0) {
            lastLine = lastLine.slice(0, -1);
            lines[lines.length - 1] = lastLine;
            board.text = lines.join('\n');
            board.el.textContent = board.text;
            await sleep(1000 / speedCps);
          }

          // Remove the empty line
          lines.pop();
          board.text = lines.join('\n');
          board.el.textContent = board.text;
          erasedCount++;

          if (erasedCount < linesToErase && lines.length > 0) {
            await sleep(100); // Small pause between lines
          }
        }

        await ctx.wait(step.args?.hold ?? 0.2);
      });

      // crossOut - finds text and crosses it out letter by letter
      this.registerSkill("crossOut", async (ctx, step) => {
        const targetId = step.target ?? step.args?.target ?? "board";
        const board = ctx.entity(targetId);

        if (!board || board.kind !== "whiteboard") {
          console.warn(`crossOut: target "${targetId}" not found or not a whiteboard`);
          return;
        }

        const textToFind = step.args?.text ?? "";
        const duration = step.args?.duration ?? 1; // Total duration in seconds

        if (!textToFind) return;

        // Find the text in the board
        const startIndex = board.text.indexOf(textToFind);
        if (startIndex === -1) {
          console.warn(`crossOut: text "${textToFind}" not found in whiteboard`);
          return;
        }

        // Calculate delay per character
        const delayPerChar = (duration * 1000) / textToFind.length;

        // Build the crossed out version character by character
        const beforeText = board.text.slice(0, startIndex);
        const afterText = board.text.slice(startIndex + textToFind.length);

        for (let i = 1; i <= textToFind.length; i++) {
          const crossedPart = textToFind.slice(0, i).split('').map(c => c + '\u0336').join('');
          const remainingPart = textToFind.slice(i);
          board.el.textContent = beforeText + crossedPart + remainingPart + afterText;
          await sleep(delayPerChar);
        }

        // Update the stored text with the fully crossed version
        const fullyCrossed = textToFind.split('').map(c => c + '\u0336').join('');
        board.text = beforeText + fullyCrossed + afterText;

        await ctx.wait(step.args?.hold ?? 0.3);
      });

      // Adapter-based skills (no-op if adapter not provided)
      this.registerSkill("submitFile", async (ctx, step) => {
        if (ctx.adapters.files?.submit) {
          await ctx.adapters.files.submit(step.args);
        } else {
          await ctx.wait(0.1);
        }
      });

      this.registerSkill("downloadFile", async (ctx, step) => {
        if (ctx.adapters.files?.download) {
          await ctx.adapters.files.download(step.args);
        } else {
          await ctx.wait(0.1);
        }
      });

      // ========================================================================
      // SVG CANVAS ANIMATION SKILLS
      // ========================================================================

      // Helper function for animating SVG elements
      const animateSvgElement = async (ctx, svg, anim) => {
        const targetEl = svg.querySelector(anim.selector);
        if (!targetEl) {
          console.warn(`animateSvgElement: selector "${anim.selector}" not found`);
          return;
        }

        const duration = anim.duration ?? 0.5;
        const from = anim.from || {};
        const to = anim.to || {};

        // Get initial values for attributes we're animating
        const initial = {};
        for (const key of Object.keys(to)) {
          initial[key] = parseFloat(targetEl.getAttribute(key)) || 0;
        }

        await ctx.tween({
          duration,
          onUpdate: (progress) => {
            for (const [key, targetValue] of Object.entries(to)) {
              const startValue = from[key] ?? initial[key];
              const current = startValue + (targetValue - startValue) * progress;
              targetEl.setAttribute(key, current);
            }
            // Handle style properties
            if (anim.toStyle) {
              for (const [prop, targetValue] of Object.entries(anim.toStyle)) {
                const fromValue = anim.fromStyle?.[prop] ?? (parseFloat(targetEl.style[prop]) || 0);
                if (typeof targetValue === 'number') {
                  const current = fromValue + (targetValue - fromValue) * progress;
                  targetEl.style[prop] = current;
                } else {
                  // For non-numeric values, just set at end
                  if (progress >= 1) targetEl.style[prop] = targetValue;
                }
              }
            }
          }
        });
      };

      // playSvgAnimation - play all animation steps in sequence
      this.registerSkill("playSvgAnimation", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") {
          console.warn(`playSvgAnimation: target "${step.target}" not found or not svgCanvas`);
          return;
        }

        const steps = entity.spec.animationSteps || {};
        const speed = step.args?.speed ?? 1;

        for (const [stepName, stepConfig] of Object.entries(steps)) {
          if (stepName === 'initial') continue; // Skip initial state
          await ctx.runSkill("stepSvgAnimation", {
            target: step.target,
            args: { step: stepName, speed }
          });
        }
      });

      // stepSvgAnimation - run a single named animation step
      this.registerSkill("stepSvgAnimation", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") {
          console.warn(`stepSvgAnimation: target "${step.target}" not found or not svgCanvas`);
          return;
        }

        const stepName = step.args?.step;
        const stepConfig = entity.spec.animationSteps?.[stepName];
        if (!stepConfig) {
          console.warn(`stepSvgAnimation: step "${stepName}" not found`);
          return;
        }

        // Execute element animations
        const animations = stepConfig.animations || [];
        const parallel = stepConfig.parallel ?? false;

        if (parallel) {
          await Promise.all(animations.map(anim => animateSvgElement(ctx, entity.svg, anim)));
        } else {
          for (const anim of animations) {
            await animateSvgElement(ctx, entity.svg, anim);
          }
        }

        // Wait after step if specified
        if (stepConfig.hold) {
          await ctx.wait(stepConfig.hold);
        }

        entity.currentStep = stepName;
      });

      // resetSvgAnimation - reset to initial state
      this.registerSkill("resetSvgAnimation", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") {
          console.warn(`resetSvgAnimation: target "${step.target}" not found or not svgCanvas`);
          return;
        }

        const initialState = entity.spec.animationSteps?.initial;
        if (initialState) {
          // Apply initial state instantly
          for (const anim of initialState.animations || []) {
            const targetEl = entity.svg.querySelector(anim.selector);
            if (targetEl) {
              for (const [key, value] of Object.entries(anim.to || {})) {
                targetEl.setAttribute(key, value);
              }
              if (anim.toStyle) {
                Object.assign(targetEl.style, anim.toStyle);
              }
            }
          }
        }
        entity.currentStep = null;
      });

      // setSvgState - directly set element attributes/styles
      this.registerSkill("setSvgState", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") {
          console.warn(`setSvgState: target "${step.target}" not found or not svgCanvas`);
          return;
        }

        for (const elem of step.args?.elements || []) {
          const targetEl = entity.svg.querySelector(elem.selector);
          if (targetEl) {
            // Set attributes
            for (const [attr, value] of Object.entries(elem.attrs || {})) {
              targetEl.setAttribute(attr, value);
            }
            // Set styles
            if (elem.style) {
              Object.assign(targetEl.style, elem.style);
            }
            // Set text content
            if (elem.text !== undefined) {
              targetEl.textContent = elem.text;
            }
          }
        }
      });

      // showSvgElement - fade in an element
      this.registerSkill("showSvgElement", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") return;

        const selector = step.args?.selector;
        const duration = step.args?.duration ?? 0.3;
        const targetEl = entity.svg.querySelector(selector);

        if (targetEl) {
          targetEl.style.opacity = "0";
          targetEl.style.display = "";
          await ctx.tween({
            duration,
            onUpdate: (p) => { targetEl.style.opacity = String(p); }
          });
        }
      });

      // hideSvgElement - fade out an element
      this.registerSkill("hideSvgElement", async (ctx, step) => {
        const entity = ctx.entity(step.target);
        if (!entity || entity.kind !== "svgCanvas") return;

        const selector = step.args?.selector;
        const duration = step.args?.duration ?? 0.3;
        const targetEl = entity.svg.querySelector(selector);

        if (targetEl) {
          await ctx.tween({
            duration,
            onUpdate: (p) => { targetEl.style.opacity = String(1 - p); }
          });
          targetEl.style.display = "none";
        }
      });
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    Player,
    StickActor,
    SceneStage,

    // Utilities
    tween,
    sleep,
    el,
    svgEl,
    easeOutCubic,
    easeInOutCubic,

    // Factory function
    create({ mount, adapters = {} }) {
      return new Player({ mount, adapters });
    }
  };
})();
