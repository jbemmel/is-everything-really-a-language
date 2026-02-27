/* ============================================================================
   INITIALIZATION
   ============================================================================ */

async function init() {
  console.log('Effortless Scene Studio - Initializing...');

  // Initialize storage manager first (restores persisted state)
  StorageManager.init();

  // Initialize route manager
  RouteManager.init();

  // Initialize scene manager (async - loads scenes from disk)
  await SceneManager.init();

  // Initialize adventure manager (async - loads adventures from disk)
  if (typeof AdventureManager !== 'undefined') {
    await AdventureManager.init();
  }

  // Initialize scene studio (primary UI)
  SceneStudio.init();

  // Initialize legacy UI (hidden by default)
  initLegacyUI();

  console.log('Effortless Scene Studio - Ready');
}

// Initialize the legacy demo UI
function initLegacyUI() {
  // Only init if legacy elements exist
  if (!document.getElementById('legacy-app')) return;

  // Initialize UI components
  initSubstratesGrid();
  initControls();
  updateRuleCard();
  updateSsotDisplay();
  updateImplementationEngine();
  updateCounters();
  initTestSubstrates();

  // Subscribe to state changes
  EventBus.on('state:changed', ({ key, value }) => {
    if (key === 'counters') {
      updateCounters();
    }
    if (key.startsWith('tech.substrates')) {
      initTestSubstrates();
    }
  });

  // Don't auto-enter planning stage - let route determine this
  console.log('Legacy UI initialized (hidden)');
}

// Boot
document.addEventListener('DOMContentLoaded', init);
