/* ============================================================================
   ADVENTURE MANAGER
   Manages adventure library and persistence
   Adventures are DAGs of scenes with choices controlling flow
   ============================================================================ */

const AdventureManager = (() => {
  // Registry of available adventures
  const adventures = new Map();
  let initialized = false;

  // Adventure metadata storage key
  const ADVENTURES_STORAGE_KEY = 'ssotme-visualizer-adventures';

  // Built-in adventures (none by default - loaded from disk)
  const builtInAdventures = {};

  // Load adventures from localStorage (fallback)
  function loadStoredAdventuresFromLocalStorage() {
    try {
      const json = localStorage.getItem(ADVENTURES_STORAGE_KEY);
      if (!json) return;

      const stored = JSON.parse(json);
      for (const [id, adventure] of Object.entries(stored)) {
        adventures.set(id, adventure);
      }
      console.log(`AdventureManager: Loaded ${Object.keys(stored).length} adventures from localStorage`);
    } catch (e) {
      console.error('AdventureManager: Failed to load stored adventures', e);
    }
  }

  // Load adventures from server (disk) - uses FileAPI scripts endpoints
  async function loadStoredAdventuresFromDisk() {
    if (typeof FileAPI === 'undefined' || !FileAPI.isServerMode()) {
      return loadStoredAdventuresFromLocalStorage();
    }

    try {
      const list = await FileAPI.listScripts();
      for (const { id, lastModified } of list) {
        const adventure = await FileAPI.loadScript(id);
        if (adventure) {
          // Preserve lastModified from file system metadata
          adventure.lastModified = lastModified;
          adventures.set(id, adventure);
        }
      }
      console.log(`AdventureManager: Loaded ${list.length} adventures from disk`);
    } catch (e) {
      console.error('AdventureManager: Failed to load from disk, falling back to localStorage', e);
      loadStoredAdventuresFromLocalStorage();
    }
  }

  // Save adventures to localStorage (fallback)
  function saveToLocalStorage() {
    try {
      const toStore = {};
      for (const [id, adventure] of adventures) {
        if (!builtInAdventures[id]) {
          toStore[id] = adventure;
        }
      }
      localStorage.setItem(ADVENTURES_STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('AdventureManager: Failed to save adventures', e);
    }
  }

  // Save a single adventure to disk (or localStorage fallback)
  async function saveAdventureToDisk(adventureId) {
    const adventure = adventures.get(adventureId);
    if (!adventure) return false;

    if (typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      const result = await FileAPI.saveScript(adventureId, adventure);
      if (result.success) {
        EventBus.emit('adventure:saved', { adventureId, toDisk: true });
        return true;
      }
    }

    // Fallback to localStorage
    saveToLocalStorage();
    EventBus.emit('adventure:saved', { adventureId, toDisk: false });
    return true;
  }

  // Delete adventure from disk
  async function deleteAdventureFromDisk(adventureId) {
    if (typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      try {
        await FileAPI.deleteScript(adventureId);
        return true;
      } catch (e) {
        console.error('AdventureManager: Failed to delete from disk', e);
      }
    }
    return false;
  }

  // Legacy wrapper
  function saveStoredAdventures() {
    saveToLocalStorage();
  }

  // Initialize adventure manager
  async function init() {
    if (initialized) return;
    initialized = true;

    // Load built-in adventures
    for (const [id, adventure] of Object.entries(builtInAdventures)) {
      adventures.set(id, adventure);
    }

    // Load user-stored adventures (from disk if server mode, else localStorage)
    await loadStoredAdventuresFromDisk();

    console.log(`AdventureManager: Initialized with ${adventures.size} adventures`);
  }

  // Register a new adventure
  function registerAdventure(adventure) {
    if (!adventure.id) {
      adventure.id = 'adventure-' + Date.now();
    }
    adventures.set(adventure.id, adventure);
    saveStoredAdventures();
    EventBus.emit('adventure:registered', { adventureId: adventure.id, adventure });
    return adventure.id;
  }

  // Remove an adventure
  async function removeAdventure(adventureId) {
    if (builtInAdventures[adventureId]) {
      console.warn('AdventureManager: Cannot remove built-in adventure');
      return false;
    }
    adventures.delete(adventureId);
    saveStoredAdventures();
    await deleteAdventureFromDisk(adventureId);
    EventBus.emit('adventure:removed', { adventureId });
    return true;
  }

  // Get an adventure by ID
  function getAdventure(adventureId) {
    return adventures.get(adventureId);
  }

  // Get all adventures
  function getAllAdventures(options = {}) {
    let result = Array.from(adventures.values());

    // Filter by archived status (default: show non-archived)
    if (options.includeArchived === true) {
      // Show all
    } else if (options.archivedOnly === true) {
      result = result.filter(a => a.isArchived === true);
    } else {
      // Default: exclude archived
      result = result.filter(a => a.isArchived !== true);
    }

    // Filter by group
    if (options.group) {
      result = result.filter(a => a.group === options.group);
    }

    return result;
  }

  // Get unique groups from all adventures
  function getGroups() {
    const groups = new Set();
    for (const adventure of adventures.values()) {
      if (adventure.group) {
        groups.add(adventure.group);
      }
    }
    return Array.from(groups).sort();
  }

  // Archive/unarchive an adventure
  async function setArchived(adventureId, isArchived) {
    const adventure = adventures.get(adventureId);
    if (!adventure) return false;

    adventure.isArchived = isArchived;
    await saveAdventureToDisk(adventureId);
    EventBus.emit('adventure:archived', { adventureId, isArchived });
    return true;
  }

  // Set group for an adventure
  async function setGroup(adventureId, group) {
    const adventure = adventures.get(adventureId);
    if (!adventure) return false;

    if (group) {
      adventure.group = group;
    } else {
      delete adventure.group;
    }
    await saveAdventureToDisk(adventureId);
    EventBus.emit('adventure:grouped', { adventureId, group });
    return true;
  }

  // Import adventure from JSON
  function importAdventure(json) {
    try {
      const adventure = typeof json === 'string' ? JSON.parse(json) : json;
      return registerAdventure(adventure);
    } catch (e) {
      console.error('AdventureManager: Failed to import adventure', e);
      return null;
    }
  }

  // Export adventure as JSON
  function exportAdventure(adventureId) {
    const adventure = adventures.get(adventureId);
    if (!adventure) return null;
    return JSON.stringify(adventure, null, 2);
  }

  // Create empty adventure template
  function createEmptyAdventure() {
    return {
      id: 'adventure-' + Date.now(),
      title: 'New Adventure',
      description: '',
      version: 1,
      startNode: 'start',
      nodes: {
        start: {
          type: 'choice',
          prompt: 'What would you like to do?',
          options: [
            { label: 'Option A', description: 'First choice', icon: '🅰️', next: 'end' },
            { label: 'Option B', description: 'Second choice', icon: '🅱️', next: 'end' }
          ]
        },
        end: {
          type: 'end',
          summary: 'Adventure complete!'
        }
      }
    };
  }

  return {
    init,
    registerAdventure,
    removeAdventure,
    getAdventure,
    getAllAdventures,
    getGroups,
    setArchived,
    setGroup,
    importAdventure,
    exportAdventure,
    saveAdventureToDisk,
    createEmptyAdventure,

    // For debugging
    get adventures() { return adventures; },
    get builtInAdventures() { return builtInAdventures; }
  };
})();
