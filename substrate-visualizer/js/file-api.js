/* ============================================================================
   FILE API
   Client-side API for saving/loading scenes and scripts to disk via server
   ============================================================================ */

const FileAPI = (() => {
  // Detect if we're running via the dev server (not file://)
  function isServerMode() {
    return window.location.protocol !== 'file:';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENES API
  // ─────────────────────────────────────────────────────────────────────────────

  async function listScenes() {
    if (!isServerMode()) return [];
    try {
      const res = await fetch('/api/scenes');
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  }

  async function loadScene(id) {
    if (!isServerMode()) return null;
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(id)}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  async function saveScene(id, scene) {
    if (!isServerMode()) {
      console.warn('FileAPI: Cannot save - running in static file mode');
      return { success: false, error: 'Static file mode' };
    }
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene)
      });
      const result = await res.json();
      if (result.success) {
        console.log(`FileAPI: Saved scene "${id}" to disk`);
      }
      return result;
    } catch (err) {
      console.error('FileAPI: Save failed', err);
      return { success: false, error: err.message };
    }
  }

  async function deleteScene(id) {
    if (!isServerMode()) return { success: false, error: 'Static file mode' };
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res.ok ? await res.json() : { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVENTURES API (branching narratives / choose-your-own-adventure)
  // Stored in: adventures/{id}/adventure.json
  // ─────────────────────────────────────────────────────────────────────────────

  async function listAdventures() {
    if (!isServerMode()) return [];
    try {
      const res = await fetch('/api/adventures');
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  }

  async function loadAdventure(id) {
    if (!isServerMode()) return null;
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(id)}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  async function saveAdventure(id, adventure) {
    if (!isServerMode()) {
      console.warn('FileAPI: Cannot save - running in static file mode');
      return { success: false, error: 'Static file mode' };
    }
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adventure)
      });
      const result = await res.json();
      if (result.success) {
        console.log(`FileAPI: Saved adventure "${id}" to disk`);
      }
      return result;
    } catch (err) {
      console.error('FileAPI: Save failed', err);
      return { success: false, error: err.message };
    }
  }

  async function deleteAdventure(id) {
    if (!isServerMode()) return { success: false, error: 'Static file mode' };
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res.ok ? await res.json() : { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Legacy aliases for backward compatibility
  const listScripts = listAdventures;
  const loadScript = loadAdventure;
  const saveScript = saveAdventure;
  const deleteScript = deleteAdventure;

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVENTURE SCENES API - scenes embedded within an adventure
  // Stored in: adventures/{adventureId}/scenes/{sceneId}/scene.json
  // ─────────────────────────────────────────────────────────────────────────────

  async function listAdventureScenes(adventureId) {
    if (!isServerMode()) return [];
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(adventureId)}/scenes`);
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  }

  async function loadAdventureScene(adventureId, sceneId) {
    if (!isServerMode()) return null;
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(adventureId)}/scenes/${encodeURIComponent(sceneId)}`);
      if (!res.ok) return null;
      const scene = await res.json();
      // Attach basePath so relative resources (like svgSrc) can be resolved
      scene._basePath = `adventures/${adventureId}/scenes/${sceneId}/`;
      return scene;
    } catch {
      return null;
    }
  }

  async function saveAdventureScene(adventureId, sceneId, scene) {
    if (!isServerMode()) {
      console.warn('FileAPI: Cannot save - running in static file mode');
      return { success: false, error: 'Static file mode' };
    }
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(adventureId)}/scenes/${encodeURIComponent(sceneId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene)
      });
      const result = await res.json();
      if (result.success) {
        console.log(`FileAPI: Saved scene "${sceneId}" in adventure "${adventureId}" to disk`);
      }
      return result;
    } catch (err) {
      console.error('FileAPI: Save failed', err);
      return { success: false, error: err.message };
    }
  }

  async function deleteAdventureScene(adventureId, sceneId) {
    if (!isServerMode()) return { success: false, error: 'Static file mode' };
    try {
      const res = await fetch(`/api/adventures/${encodeURIComponent(adventureId)}/scenes/${encodeURIComponent(sceneId)}`, {
        method: 'DELETE'
      });
      return res.ok ? await res.json() : { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return {
    isServerMode,
    // Global Scenes (legacy - for built-in scenes)
    listScenes,
    loadScene,
    saveScene,
    deleteScene,
    // Adventures
    listAdventures,
    loadAdventure,
    saveAdventure,
    deleteAdventure,
    // Adventure-scoped Scenes (new pattern)
    listAdventureScenes,
    loadAdventureScene,
    saveAdventureScene,
    deleteAdventureScene,
    // Legacy aliases
    listScripts,
    loadScript,
    saveScript,
    deleteScript
  };
})();
