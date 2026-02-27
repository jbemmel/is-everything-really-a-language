/* ============================================================================
   IMPLEMENTATION STAGE: Render & Control
   Handles substrate visualization and Traditional/Effortless timelines
   ============================================================================ */

const ImplementationController = (() => {
  let implChatWindow = null;
  const DRIFT_SUBSTRATES = ['binary', 'english'];

  // Render substrate nodes in the canvas
  function renderSubstrates() {
    const container = document.getElementById('impl-substrates');
    const selectedSubstrates = Store.get('tech.substrates');

    container.innerHTML = [...selectedSubstrates].map(id => {
      const s = SUBSTRATES.find(x => x.id === id);
      if (!s) return '';
      return `
        <div class="impl-substrate-node pending" data-substrate="${id}">
          <span class="node-icon">${s.icon}</span>
          <span class="node-label">${s.name}</span>
          <div class="working-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Set substrate node state
  function setNodeState(substrateId, state) {
    const node = document.querySelector(`.impl-substrate-node[data-substrate="${substrateId}"]`);
    if (!node) return;

    // Remove all state classes
    node.classList.remove('pending', 'active', 'complete', 'drift');

    // Add new state
    node.classList.add(state);

    // If complete with drift
    if (state === 'complete' && DRIFT_SUBSTRATES.includes(substrateId)) {
      node.classList.add('drift');
    }
  }

  // Reset all nodes to pending
  function resetNodes() {
    document.querySelectorAll('.impl-substrate-node').forEach(node => {
      node.classList.remove('active', 'complete', 'drift');
      node.classList.add('pending');
    });
  }

  // Show implementation chat overlay
  function showChat(substrateName) {
    const overlay = document.getElementById('impl-chat-overlay');
    const chatArea = document.getElementById('impl-chat-area');

    overlay.classList.add('active');

    const script = ChatScripts.implementationTraditional(substrateName);
    implChatWindow = Components.create('ChatWindow', {
      container: chatArea,
      participants: IMPLEMENTATION_PARTICIPANTS,
      script: script.messages,
      onComplete: () => {
        console.log(`Implementation chat for ${substrateName} complete`);
      }
    });
    implChatWindow.mount();

    return implChatWindow;
  }

  // Hide implementation chat overlay
  function hideChat() {
    const overlay = document.getElementById('impl-chat-overlay');
    overlay.classList.remove('active');

    if (implChatWindow) {
      Components.destroy(implChatWindow.id);
      implChatWindow = null;
    }

    const chatArea = document.getElementById('impl-chat-area');
    chatArea.innerHTML = '';
  }

  // Build Traditional mode timeline beats
  function buildTraditionalBeats() {
    const substrates = [...Store.get('tech.substrates')];
    const beats = [];

    // Intro beat
    beats.push({
      id: 'impl-intro',
      duration: 500,
      onStart: () => {
        console.log('Implementation (Traditional) starting');
        renderSubstrates();

        // Remove Effortless mode class if present
        document.getElementById('implementation-stage').classList.remove('ssotme-mode');
      }
    });

    // For each substrate: chat -> work -> complete
    substrates.forEach((subId, index) => {
      const substrate = SUBSTRATES.find(x => x.id === subId);
      const name = substrate?.name || subId;
      const hasDrift = DRIFT_SUBSTRATES.includes(subId);

      // 1. Chat beat - show chat overlay
      beats.push({
        id: `chat-${subId}`,
        duration: 3500,
        onStart: () => {
          console.log(`Chat for ${name}`);
          // Increment re-negotiations counter
          Store.set('counters.renegotiations', Store.get('counters.renegotiations') + 1);
          updateCounters();

          // Show chat overlay
          const chatInstance = showChat(name);
          chatInstance.play();
        },
        onComplete: () => {
          hideChat();
        }
      });

      // 2. Work beat - show working animation
      beats.push({
        id: `work-${subId}`,
        duration: 3000,
        onStart: () => {
          console.log(`Working on ${name}`);
          setNodeState(subId, 'active');

          // Increment re-implementations counter
          Store.set('counters.manualReimplementations', Store.get('counters.manualReimplementations') + 1);
          updateCounters();
        }
      });

      // 3. Complete beat
      beats.push({
        id: `done-${subId}`,
        duration: 500,
        onStart: () => {
          console.log(`Completed ${name}${hasDrift ? ' (with drift)' : ''}`);
          setNodeState(subId, 'complete');

          // Increment drift counter if applicable
          if (hasDrift) {
            Store.set('counters.driftEvents', Store.get('counters.driftEvents') + 1);
            updateCounters();
          }
        }
      });
    });

    // Final beat
    beats.push({
      id: 'impl-complete',
      duration: 1000,
      onStart: () => {
        console.log('Implementation (Traditional) complete');
      }
    });

    return beats;
  }

  // Trigger token flow animation
  function triggerTokenFlow() {
    const tokenLine = document.getElementById('token-flow-line');
    if (!tokenLine) return;

    // Reset and trigger animation
    tokenLine.classList.remove('active');
    void tokenLine.offsetWidth; // Force reflow
    tokenLine.classList.add('active');

    // Highlight engine panel
    const enginePanel = document.querySelector('.impl-engine-panel');
    if (enginePanel) {
      enginePanel.style.boxShadow = '0 0 20px var(--ssotme)';
      setTimeout(() => {
        enginePanel.style.boxShadow = '';
      }, 1200);
    }
  }

  // Set node state for Effortless mode (no drift marking)
  function setNodeStateSsotme(substrateId, state) {
    const node = document.querySelector(`.impl-substrate-node[data-substrate="${substrateId}"]`);
    if (!node) return;

    // Remove all state classes
    node.classList.remove('pending', 'active', 'complete', 'drift');

    // Add new state - NO drift for Effortless (deterministic)
    node.classList.add(state);
  }

  // Show English LLM chat for Effortless mode
  function showEnglishChat() {
    const overlay = document.getElementById('impl-chat-overlay');
    const chatArea = document.getElementById('impl-chat-area');

    overlay.classList.add('active');

    const script = ChatScripts.englishBuild();
    implChatWindow = Components.create('ChatWindow', {
      container: chatArea,
      participants: [
        { id: 'llm', name: 'LLM Generator', avatar: '🤖', color: '#56d364' }
      ],
      script: script.messages,
      onComplete: () => {
        console.log('English LLM generation complete');
      }
    });
    implChatWindow.mount();

    return implChatWindow;
  }

  // Build Effortless mode timeline beats
  function buildSsotmeBeats() {
    const substrates = [...Store.get('tech.substrates')];
    const hasCLI = Store.get('tech.hasEffortlessCLI');

    // If no CLI, fall back to traditional
    if (!hasCLI) {
      console.log('Effortless without CLI - falling back to Traditional');
      return buildTraditionalBeats();
    }

    const beats = [];

    // Define build parameters per substrate type
    const BUILD_TIMING = {
      owl: { duration: 2000, delay: 200 },      // Slower: ontology generation
      english: { duration: 3000, delay: 400 },  // Slowest: LLM interpretation
      default: { duration: 800, delay: 100 }    // Fast: deterministic builds
    };

    // Intro beat
    beats.push({
      id: 'impl-intro',
      duration: 500,
      onStart: () => {
        console.log('Implementation (Effortless) starting');
        renderSubstrates();

        // Add Effortless mode class for green styling
        document.getElementById('implementation-stage').classList.add('ssotme-mode');

        // Update engine label to show Effortless mode
        const labelEl = document.getElementById('engine-label');
        const sublabelEl = document.getElementById('engine-sublabel');
        if (labelEl) labelEl.textContent = 'Effortless CLI';
        if (sublabelEl) sublabelEl.textContent = 'Deterministic generator';
      }
    });

    // Single injection moment - token flow from SSOT → Effortless CLI
    beats.push({
      id: 'inject',
      duration: 1500,
      onStart: () => {
        console.log('Injecting rule into Effortless CLI');
        triggerTokenFlow();

        // Pulse the SSOT panel
        const ssotPanel = document.querySelector('.impl-ssot-panel');
        if (ssotPanel) {
          ssotPanel.style.boxShadow = '0 0 15px var(--ssotme)';
          setTimeout(() => {
            ssotPanel.style.boxShadow = '';
          }, 800);
        }
      }
    });

    // Parallel builds - all start together with staggered visual progression
    // First, activate all nodes simultaneously
    beats.push({
      id: 'builds-start',
      duration: 300,
      onStart: () => {
        console.log('Starting parallel builds');
        substrates.forEach(subId => {
          // Skip english - it gets special treatment
          if (subId !== 'english') {
            setNodeStateSsotme(subId, 'active');
          }
        });
      }
    });

    // Fast substrates complete quickly (800ms each, staggered)
    const fastSubstrates = substrates.filter(id => id !== 'owl' && id !== 'english');
    const slowSubstrates = substrates.filter(id => id === 'owl' || id === 'english');

    // Staggered completion for fast substrates
    fastSubstrates.forEach((subId, index) => {
      const substrate = SUBSTRATES.find(x => x.id === subId);
      const name = substrate?.name || subId;
      const staggerDelay = index * 150; // 150ms stagger between completions

      beats.push({
        id: `build-${subId}`,
        duration: 600 + staggerDelay,
        onStart: () => {
          console.log(`Building ${name} (fast)`);
        },
        onComplete: () => {
          setNodeStateSsotme(subId, 'complete');
          console.log(`Completed ${name}`);
        }
      });
    });

    // OWL substrate - slower build
    if (slowSubstrates.includes('owl')) {
      const owlSub = SUBSTRATES.find(x => x.id === 'owl');
      beats.push({
        id: 'build-owl',
        duration: 2000,
        onStart: () => {
          console.log('Building OWL (ontology generation)');
          setNodeStateSsotme('owl', 'active');
        },
        onComplete: () => {
          setNodeStateSsotme('owl', 'complete');
          console.log('Completed OWL');
        }
      });
    }

    // English substrate - slowest, with brief LLM chat
    if (slowSubstrates.includes('english')) {
      beats.push({
        id: 'build-english-start',
        duration: 500,
        onStart: () => {
          console.log('Starting English build (LLM interpretation)');
          setNodeStateSsotme('english', 'active');
          const chatInstance = showEnglishChat();
          chatInstance.play();
        }
      });

      beats.push({
        id: 'build-english-chat',
        duration: 2500,
        onStart: () => {
          console.log('LLM generating English description...');
        },
        onComplete: () => {
          hideChat();
          setNodeStateSsotme('english', 'complete');
          console.log('Completed English');
        }
      });
    }

    // Final beat
    beats.push({
      id: 'impl-complete',
      duration: 500,
      onStart: () => {
        console.log('Implementation (Effortless) complete - no drift, no renegotiations');
      }
    });

    return beats;
  }

  return {
    renderSubstrates,
    resetNodes,
    setNodeState,
    showChat,
    hideChat,

    buildTimeline() {
      const mode = Store.get('mode');
      const hasCLI = Store.get('tech.hasEffortlessCLI');

      if (mode === 'traditional' || (mode === 'ssotme' && !hasCLI)) {
        return buildTraditionalBeats();
      } else {
        return buildSsotmeBeats();
      }
    },

    enter() {
      renderSubstrates();
    },

    exit() {
      hideChat();
      resetNodes();
      // Remove mode class and reset token flow
      document.getElementById('implementation-stage').classList.remove('ssotme-mode');
      const tokenLine = document.getElementById('token-flow-line');
      if (tokenLine) tokenLine.classList.remove('active');
    }
  };
})();
