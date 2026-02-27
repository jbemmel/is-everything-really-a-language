/* ============================================================================
   STORAGE MANAGER
   localStorage persistence synced with Store state
   ============================================================================ */

const StorageManager = (() => {
  const STORAGE_KEY = 'ssotme-visualizer-state';
  const VERSION = 1;

  // Fields to persist (whitelist approach)
  const persistedFields = [
    'mode',
    'stage',
    'rule.nameFormat',
    'ssot',
    'tech.hasEffortlessCLI',
    'tech.substrates',
    'speed',
    'stageState.planning.decisions',
    'stageState.planning.currentTopic',
    'stageState.planning.selectedOption',
    // Note: counters are NOT persisted (session-specific)
  ];

  // Fields to restore on load
  const restoreFields = [
    'mode',
    'rule.nameFormat',
    'ssot',
    'tech.hasEffortlessCLI',
    'tech.substrates',
    'speed',
    'stageState.planning.decisions',
  ];

  let initialized = false;
  let debounceTimer = null;
  const DEBOUNCE_MS = 250;

  // Deep get with dot notation
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  // Deep set with dot notation
  function setPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  // Serialize state for storage (handles Sets)
  function serialize(state) {
    const data = { version: VERSION, timestamp: Date.now(), fields: {} };

    for (const field of persistedFields) {
      const value = getPath(state, field);
      if (value !== undefined) {
        // Convert Sets to arrays for JSON
        if (value instanceof Set) {
          data.fields[field] = { __type: 'Set', values: [...value] };
        } else {
          data.fields[field] = value;
        }
      }
    }

    return JSON.stringify(data);
  }

  // Deserialize from storage (reconstructs Sets)
  function deserialize(json) {
    try {
      const data = JSON.parse(json);
      if (data.version !== VERSION) {
        console.warn('StorageManager: Version mismatch, ignoring stored state');
        return null;
      }

      // Reconstruct Sets
      for (const [key, value] of Object.entries(data.fields)) {
        if (value && typeof value === 'object' && value.__type === 'Set') {
          data.fields[key] = new Set(value.values);
        }
      }

      return data;
    } catch (e) {
      console.error('StorageManager: Failed to deserialize', e);
      return null;
    }
  }

  // Save current state to localStorage
  function save() {
    try {
      const state = Store.snapshot();
      const json = serialize(state);
      localStorage.setItem(STORAGE_KEY, json);
      console.log('StorageManager: Saved state');
    } catch (e) {
      console.error('StorageManager: Failed to save', e);
    }
  }

  // Debounced save
  function debouncedSave() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(save, DEBOUNCE_MS);
  }

  // Load state from localStorage
  function load() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) {
        console.log('StorageManager: No saved state found');
        return null;
      }

      const data = deserialize(json);
      if (!data) return null;

      console.log('StorageManager: Loaded state from', new Date(data.timestamp).toLocaleString());
      return data.fields;
    } catch (e) {
      console.error('StorageManager: Failed to load', e);
      return null;
    }
  }

  // Restore saved state into Store
  function restore() {
    const fields = load();
    if (!fields) return false;

    for (const field of restoreFields) {
      const value = fields[field];
      if (value !== undefined) {
        Store.set(field, value);
      }
    }

    console.log('StorageManager: Restored state');
    return true;
  }

  // Clear saved state
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('StorageManager: Cleared saved state');
  }

  // Get raw stored data for debugging
  function debug() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return deserialize(json);
  }

  // Initialize storage sync
  function init() {
    if (initialized) return;
    initialized = true;

    // Subscribe to state changes
    EventBus.on('state:changed', ({ key }) => {
      // Check if this field should be persisted
      const shouldPersist = persistedFields.some(f => key.startsWith(f) || f.startsWith(key));
      if (shouldPersist) {
        debouncedSave();
      }
    });

    // Try to restore saved state
    const restored = restore();

    console.log('StorageManager: Initialized', restored ? '(restored saved state)' : '(fresh start)');
    return restored;
  }

  // Export/import state as JSON (for sharing/backup)
  function exportState() {
    const state = Store.snapshot();
    return serialize(state);
  }

  function importState(json) {
    const data = deserialize(json);
    if (!data) throw new Error('Invalid state data');

    for (const [field, value] of Object.entries(data.fields)) {
      Store.set(field, value);
    }
    save();
    return true;
  }

  return {
    init,
    save,
    load,
    restore,
    clear,
    debug,
    exportState,
    importState,

    // Constants
    STORAGE_KEY,
    VERSION
  };
})();
