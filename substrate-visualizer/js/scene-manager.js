/* ============================================================================
   SCENE MANAGER
   Manages scene library and persistence
   ============================================================================ */

const SceneManager = (() => {
  // Registry of available scenes
  const scenes = new Map();
  let initialized = false;

  // Scene metadata storage key
  const SCENES_STORAGE_KEY = 'ssotme-visualizer-scenes';

  // Default built-in scenes
  const builtInScenes = {
    'name-format-debate': {
      id: 'name-format-debate',
      title: 'What is a Customer?',
      description: 'PM and CTO discuss customer name formatting approaches',
      category: 'planning',
      version: 1,
      stage: { width: 960, height: 540, background: '#f8f9fa' },
      entities: {
        pm: { type: 'stickActor', x: 180, y: 380, scale: 1, head: '🙂', name: 'PM' },
        cto: { type: 'stickActor', x: 780, y: 380, scale: 1, head: '🤔', name: 'CTO' },
        chat: { type: 'chatPanel', x: 600, y: 20, width: 340, height: 280 },
        code: { type: 'codeEditor', x: 20, y: 20, width: 540, height: 180 },
        title: { type: 'title', x: 280, y: 220, width: 400, text: 'Name Format Discussion', fontSize: 20 }
      },
      timeline: [
        { do: 'fadeIn', args: { duration: 0.5 } },
        { do: 'wait', args: { duration: 0.5 } },

        { par: [
          { do: 'moveTo', target: 'pm', args: { x: 220, y: 380, duration: 0.6 } },
          { do: 'moveTo', target: 'cto', args: { x: 740, y: 380, duration: 0.6 } }
        ]},

        { do: 'pose', target: 'pm', args: { name: 'neutral', duration: 0.3 } },
        { do: 'bubbleSay', target: 'pm', args: { text: 'How should we format customer names?', hold: 2 } },
        { do: 'chatSay', args: { speaker: 'PM', text: 'How should we format customer names?' } },

        { do: 'pose', target: 'cto', args: { name: 'think', duration: 0.4 } },
        { do: 'setHead', target: 'cto', args: { emoji: '🧐' } },
        { do: 'bubbleSay', target: 'cto', args: { text: 'First Last is user-friendly...', hold: 2 } },
        { do: 'chatSay', args: { speaker: 'CTO', text: 'First Last is user-friendly for display' } },

        { do: 'pose', target: 'pm', args: { name: 'point', duration: 0.3 } },
        { do: 'bubbleSay', target: 'pm', args: { text: 'But Last, First sorts better!', hold: 2 } },
        { do: 'chatSay', args: { speaker: 'PM', text: 'But Last, First sorts better alphabetically' } },

        { do: 'pose', target: 'cto', args: { name: 'shrug', duration: 0.4 } },
        { do: 'setHead', target: 'cto', args: { emoji: '💡' } },
        { do: 'bubbleSay', target: 'cto', args: { text: 'Store both, compute displayName!', hold: 2.5 } },
        { do: 'chatSay', args: { speaker: 'CTO', text: 'Store first/last separately, compute displayName' } },

        { do: 'typeCode', args: { target: 'code', text: 'customer = {\n  firstName: "John",\n  lastName: "Doe",\n  get displayName() {\n    return `${firstName} ${lastName}`;\n  }\n};', speedCps: 25 } },

        { do: 'pose', target: 'pm', args: { name: 'handsUp', duration: 0.4 } },
        { do: 'setHead', target: 'pm', args: { emoji: '🎉' } },
        { do: 'bubbleSay', target: 'pm', args: { text: 'Perfect solution!', hold: 1.5 } },

        { do: 'wait', args: { duration: 1 } },
        { do: 'fadeOut', args: { duration: 0.5 } }
      ]
    },

    'tech-stack-decision': {
      id: 'tech-stack-decision',
      title: 'Tech Stack Decision',
      description: 'Team decides on backend, database, and frontend',
      category: 'planning',
      version: 1,
      stage: { width: 960, height: 540, background: '#f0f4f8' },
      entities: {
        dev: { type: 'stickActor', x: 480, y: 400, scale: 1.2, head: '👨‍💻', name: 'Lead Dev' },
        chat: { type: 'chatPanel', x: 20, y: 20, width: 300, height: 500 },
        code: { type: 'codeEditor', x: 340, y: 20, width: 600, height: 320 }
      },
      timeline: [
        { do: 'fadeIn', args: { duration: 0.4 } },
        { do: 'chatSay', args: { speaker: 'System', text: 'Tech stack discussion starting...' } },

        { do: 'pose', target: 'dev', args: { name: 'think', duration: 0.5 } },
        { do: 'bubbleSay', target: 'dev', args: { text: "Let's define our stack...", hold: 1.5 } },

        { do: 'typeCode', args: { target: 'code', text: '// Tech Stack Decision\n\nBackend:   Go (fast, typed, simple)\nDatabase:  PostgreSQL (reliable, SQL)\nFrontend:  React (component-based)', speedCps: 30 } },

        { do: 'chatSay', args: { speaker: 'Dev', text: 'Go for backend - fast and maintainable' } },
        { do: 'chatSay', args: { speaker: 'Dev', text: 'PostgreSQL for data - reliable and proven' } },
        { do: 'chatSay', args: { speaker: 'Dev', text: 'React for UI - great ecosystem' } },

        { do: 'pose', target: 'dev', args: { name: 'handsUp', duration: 0.4 } },
        { do: 'setHead', target: 'dev', args: { emoji: '✅' } },
        { do: 'bubbleSay', target: 'dev', args: { text: 'Stack decided!', hold: 1.5 } },

        { do: 'wait', args: { duration: 0.5 } },
        { do: 'fadeOut', args: { duration: 0.4 } }
      ]
    },

    'ssot-introduction': {
      id: 'ssot-introduction',
      title: 'SSOT Introduction',
      description: 'Introduction to Single Source of Truth concept',
      category: 'overview',
      version: 1,
      stage: { width: 960, height: 540, background: '#1a1a2e' },
      entities: {
        narrator: { type: 'stickActor', x: 480, y: 420, scale: 1.3, head: '🎓', name: 'Instructor' },
        chat: { type: 'chatPanel', x: 20, y: 20, width: 320, height: 400 },
        code: { type: 'codeEditor', x: 360, y: 20, width: 580, height: 320 }
      },
      timeline: [
        { do: 'fadeIn', args: { duration: 0.6 } },

        { do: 'pose', target: 'narrator', args: { name: 'neutral', duration: 0.3 } },
        { do: 'bubbleSay', target: 'narrator', args: { text: "Welcome! Let's talk about SSOT...", hold: 2 } },
        { do: 'chatSay', args: { speaker: 'Instructor', text: 'Welcome to SSOT - Single Source of Truth' } },

        { do: 'pose', target: 'narrator', args: { name: 'point', duration: 0.3 } },
        { do: 'typeCode', args: { target: 'code', text: '// The Problem: Multiple Sources\n\n// Database schema\nCREATE TABLE customers (name VARCHAR);\n\n// API response\n{ "customer_name": "..." }\n\n// Frontend form\n<input name="customerName" />', speedCps: 30 } },

        { do: 'bubbleSay', target: 'narrator', args: { text: 'When the same concept exists in multiple places, they drift apart.', hold: 3 } },
        { do: 'chatSay', args: { speaker: 'Instructor', text: "Notice: 'name', 'customer_name', 'customerName' - all different!" } },

        { do: 'wait', args: { duration: 1 } },
        { do: 'fadeOut', args: { duration: 0.5 } }
      ]
    }
  };

  // Load scenes from localStorage (fallback)
  function loadStoredScenesFromLocalStorage() {
    try {
      const json = localStorage.getItem(SCENES_STORAGE_KEY);
      if (!json) return;

      const stored = JSON.parse(json);
      for (const [id, scene] of Object.entries(stored)) {
        scenes.set(id, scene);
      }
      console.log(`SceneManager: Loaded ${Object.keys(stored).length} scenes from localStorage`);
    } catch (e) {
      console.error('SceneManager: Failed to load stored scenes', e);
    }
  }

  // Load scenes from server (disk)
  async function loadStoredScenesFromDisk() {
    if (typeof FileAPI === 'undefined' || !FileAPI.isServerMode()) {
      return loadStoredScenesFromLocalStorage();
    }

    try {
      const list = await FileAPI.listScenes();
      for (const { id } of list) {
        const scene = await FileAPI.loadScene(id);
        if (scene) {
          scenes.set(id, scene);
        }
      }
      console.log(`SceneManager: Loaded ${list.length} scenes from disk`);
    } catch (e) {
      console.error('SceneManager: Failed to load from disk, falling back to localStorage', e);
      loadStoredScenesFromLocalStorage();
    }
  }

  // Save scenes to localStorage (fallback)
  function saveToLocalStorage() {
    try {
      const toStore = {};
      for (const [id, scene] of scenes) {
        if (!builtInScenes[id]) {
          toStore[id] = scene;
        }
      }
      localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('SceneManager: Failed to save scenes', e);
    }
  }

  // Save a single scene to disk (or localStorage fallback)
  async function saveSceneToDisk(sceneId) {
    const scene = scenes.get(sceneId);
    if (!scene) return false;

    if (typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      const result = await FileAPI.saveScene(sceneId, scene);
      if (result.success) {
        EventBus.emit('scene:saved', { sceneId, toDisk: true });
        return true;
      }
    }

    // Fallback to localStorage
    saveToLocalStorage();
    EventBus.emit('scene:saved', { sceneId, toDisk: false });
    return true;
  }

  // Legacy wrapper
  function saveStoredScenes() {
    saveToLocalStorage();
  }

  // Initialize scene manager
  async function init() {
    if (initialized) return;
    initialized = true;

    // Load built-in scenes
    for (const [id, scene] of Object.entries(builtInScenes)) {
      scenes.set(id, scene);
    }

    // Load user-stored scenes (from disk if server mode, else localStorage)
    await loadStoredScenesFromDisk();

    console.log(`SceneManager: Initialized with ${scenes.size} scenes`);
  }

  // Register a new scene
  function registerScene(scene) {
    if (!scene.id) {
      scene.id = 'scene-' + Date.now();
    }
    scenes.set(scene.id, scene);
    saveStoredScenes();
    EventBus.emit('scene:registered', { sceneId: scene.id, scene });
    return scene.id;
  }

  // Remove a scene
  function removeScene(sceneId) {
    if (builtInScenes[sceneId]) {
      console.warn('SceneManager: Cannot remove built-in scene');
      return false;
    }
    scenes.delete(sceneId);
    saveStoredScenes();
    EventBus.emit('scene:removed', { sceneId });
    return true;
  }

  // Get a scene by ID
  function getScene(sceneId) {
    return scenes.get(sceneId);
  }

  // Get all scenes
  function getAllScenes() {
    return Array.from(scenes.values());
  }

  // Get scenes by category
  function getScenesByCategory(category) {
    return getAllScenes().filter(s => s.category === category);
  }

  // Import scene from JSON
  function importScene(json) {
    try {
      const scene = typeof json === 'string' ? JSON.parse(json) : json;
      return registerScene(scene);
    } catch (e) {
      console.error('SceneManager: Failed to import scene', e);
      return null;
    }
  }

  // Export scene as JSON
  function exportScene(sceneId) {
    const scene = scenes.get(sceneId);
    if (!scene) return null;
    return JSON.stringify(scene, null, 2);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVENTURE-SCOPED SCENES
  // Scenes that belong to a specific adventure (stored in adventure folder)
  // ─────────────────────────────────────────────────────────────────────────────

  // Cache for adventure scenes: Map<adventureId, Map<sceneId, scene>>
  const adventureSceneCache = new Map();

  // Load scenes for a specific adventure from disk
  async function loadAdventureScenes(adventureId) {
    if (typeof FileAPI === 'undefined' || !FileAPI.isServerMode()) {
      return [];
    }

    try {
      const list = await FileAPI.listAdventureScenes(adventureId);
      const cache = new Map();

      for (const { id } of list) {
        const scene = await FileAPI.loadAdventureScene(adventureId, id);
        if (scene) {
          cache.set(id, scene);
        }
      }

      adventureSceneCache.set(adventureId, cache);
      console.log(`SceneManager: Loaded ${cache.size} scenes for adventure "${adventureId}"`);
      return Array.from(cache.values());
    } catch (e) {
      console.error(`SceneManager: Failed to load scenes for adventure "${adventureId}"`, e);
      return [];
    }
  }

  // Get a scene from an adventure (checks adventure cache first, then global, then built-in)
  async function getAdventureScene(adventureId, sceneId) {
    // Check adventure cache
    let cache = adventureSceneCache.get(adventureId);

    // If not cached, try loading from disk
    if (!cache) {
      await loadAdventureScenes(adventureId);
      cache = adventureSceneCache.get(adventureId);
    }

    // Check adventure scenes
    if (cache && cache.has(sceneId)) {
      return cache.get(sceneId);
    }

    // Fallback to global scenes (for built-in scenes)
    return scenes.get(sceneId);
  }

  // Get scene synchronously (from cache only) - for adventure player
  function getAdventureSceneSync(adventureId, sceneId) {
    const cache = adventureSceneCache.get(adventureId);
    if (cache && cache.has(sceneId)) {
      return cache.get(sceneId);
    }
    // Fallback to global scenes
    return scenes.get(sceneId);
  }

  // Save a scene to an adventure folder
  async function saveAdventureScene(adventureId, sceneId, scene) {
    if (typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      const result = await FileAPI.saveAdventureScene(adventureId, sceneId, scene);
      if (result.success) {
        // Update cache
        if (!adventureSceneCache.has(adventureId)) {
          adventureSceneCache.set(adventureId, new Map());
        }
        adventureSceneCache.get(adventureId).set(sceneId, scene);
        EventBus.emit('scene:saved', { adventureId, sceneId, toDisk: true });
        return true;
      }
    }
    return false;
  }

  // Delete a scene from an adventure folder
  async function deleteAdventureScene(adventureId, sceneId) {
    if (typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      try {
        await FileAPI.deleteAdventureScene(adventureId, sceneId);
        // Update cache
        const cache = adventureSceneCache.get(adventureId);
        if (cache) {
          cache.delete(sceneId);
        }
        EventBus.emit('scene:removed', { adventureId, sceneId });
        return true;
      } catch (e) {
        console.error('SceneManager: Failed to delete adventure scene', e);
      }
    }
    return false;
  }

  // List scenes for an adventure (from cache)
  function getAdventureScenes(adventureId) {
    const cache = adventureSceneCache.get(adventureId);
    return cache ? Array.from(cache.values()) : [];
  }

  // Create empty scene template for an adventure
  function createEmptyScene(adventureId) {
    const id = 'scene-' + Date.now();
    return {
      id,
      title: 'New Scene',
      description: '',
      category: 'custom',
      version: 1,
      stage: { width: 960, height: 540, background: '#f8f9fa' },
      entities: {
        actor1: { type: 'stickActor', x: 200, y: 380, scale: 1, head: '🙂', name: 'Actor 1' },
        actor2: { type: 'stickActor', x: 760, y: 380, scale: 1, head: '🤔', name: 'Actor 2' }
      },
      timeline: [
        { do: 'fadeIn', args: { duration: 0.5 } },
        { do: 'bubbleSay', target: 'actor1', args: { text: 'Hello!', hold: 2 } },
        { do: 'bubbleSay', target: 'actor2', args: { text: 'Hi there!', hold: 2 } },
        { do: 'fadeOut', args: { duration: 0.5 } }
      ]
    };
  }

  return {
    init,
    registerScene,
    removeScene,
    getScene,
    getAllScenes,
    getScenesByCategory,
    importScene,
    exportScene,
    saveSceneToDisk,  // Save to disk (or localStorage fallback)

    // Adventure-scoped scenes
    loadAdventureScenes,
    getAdventureScene,
    getAdventureSceneSync,
    saveAdventureScene,
    deleteAdventureScene,
    getAdventureScenes,
    createEmptyScene,

    // For debugging
    get scenes() { return scenes; },
    get builtInScenes() { return builtInScenes; },
    get adventureSceneCache() { return adventureSceneCache; }
  };
})();
