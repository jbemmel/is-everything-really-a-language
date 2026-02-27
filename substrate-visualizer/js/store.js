/* ============================================================================
   STATE STORE
   Global state with immutable updates and change subscriptions
   ============================================================================ */

const Store = (() => {
  // Default substrate set
  const DEFAULT_SUBSTRATES = ['python', 'golang', 'xlsx', 'csv', 'yaml', 'uml', 'binary', 'explaindag', 'owl', 'english'];

  // Initial state
  let state = {
    // Mode: 'traditional' | 'ssotme'
    mode: 'traditional',

    // Current stage: 'planning' | 'implementation' | 'testing'
    stage: 'planning',

    // Rule configuration
    rule: {
      nameFormat: 'firstLast'  // 'firstLast' | 'lastFirst'
    },

    // SSOT choice: 'airtable' | 'excel' | 'notion'
    ssot: 'airtable',

    // Technology selections
    tech: {
      hasEffortlessCLI: false,
      substrates: new Set(DEFAULT_SUBSTRATES)
    },

    // Playback
    speed: 1,       // 0.5 | 1 | 2 | 4
    playing: false,

    // Counters
    counters: {
      renegotiations: 0,
      manualReimplementations: 0,
      driftEvents: 0,
      runtimeMs: 0
    },

    // Stage-specific transient state
    stageState: {
      planning: {
        currentTopic: 'nameFormat',    // 'nameFormat' | 'techStack'
        discussionRound: 0,            // increments on "Discuss Further"
        selectedOption: 'firstLast',   // currently selected option
        decisions: {
          nameFormat: null,            // 'firstLast' | 'lastFirst'
          backend: 'golang',           // preset values
          database: 'postgres',
          frontend: 'react'
        },
        pendingDecision: false,        // true when waiting for user click
        agreementReached: false,
        chatPlayed: false
      },
      implementation: { currentSubstrate: null, completedSubstrates: new Set() },
      testing: { traditionalResults: {}, ssotmeResults: {}, phase: 'idle' }
    }
  };

  // Deep clone helper (handles Sets)
  const clone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Set) return new Set(obj);
    if (Array.isArray(obj)) return obj.map(clone);
    const cloned = {};
    for (const key in obj) {
      cloned[key] = clone(obj[key]);
    }
    return cloned;
  };

  return {
    get(path) {
      if (!path) return clone(state);
      return path.split('.').reduce((o, k) => o?.[k], state);
    },

    set(path, value) {
      const keys = path.split('.');
      const prev = this.get(path);

      // Navigate and update
      let obj = state;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;

      EventBus.emit('state:changed', { key: path, value, prev });
    },

    // Reset counters
    resetCounters() {
      state.counters = {
        renegotiations: 0,
        manualReimplementations: 0,
        driftEvents: 0,
        runtimeMs: 0
      };
      EventBus.emit('state:changed', { key: 'counters', value: state.counters });
    },

    // Reset stage state
    resetStageState(stage) {
      if (stage === 'planning') {
        state.stageState.planning = {
          currentTopic: 'nameFormat',
          discussionRound: 0,
          selectedOption: 'firstLast',
          decisions: {
            nameFormat: null,
            backend: 'golang',
            database: 'postgres',
            frontend: 'react'
          },
          pendingDecision: false,
          agreementReached: false,
          chatPlayed: false
        };
      } else if (stage === 'implementation') {
        state.stageState.implementation = { currentSubstrate: null, completedSubstrates: new Set() };
      } else if (stage === 'testing') {
        state.stageState.testing = { traditionalResults: {}, ssotmeResults: {}, phase: 'idle' };
      }
      EventBus.emit('state:changed', { key: `stageState.${stage}`, value: state.stageState[stage] });
    },

    // Update stage state (partial merge)
    updateStageState(stage, updates) {
      if (state.stageState[stage]) {
        Object.assign(state.stageState[stage], updates);
        EventBus.emit('state:changed', { key: `stageState.${stage}`, value: state.stageState[stage] });
      }
    },

    // Get full snapshot for debugging
    snapshot() {
      return clone(state);
    }
  };
})();
