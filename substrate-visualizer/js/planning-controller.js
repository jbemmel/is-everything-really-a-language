/* ============================================================================
   PLANNING CONTROLLER
   Manages the interactive planning stage with discussions and decisions
   ============================================================================ */

const PlanningController = (() => {
  let chatWindow = null;
  let isActive = false;
  let boundHandlers = null;

  // DOM references - cached on enter
  let els = null;

  function cacheElements() {
    els = {
      chatArea: document.getElementById('planning-chat-area'),
      decisionPanel: document.getElementById('decision-panel'),
      decisionTopic: document.getElementById('decision-topic'),
      decisionOptions: document.getElementById('decision-options'),
      decisionButtons: document.getElementById('decision-buttons'),
      btnAccept: document.getElementById('btn-accept'),
      btnDiscuss: document.getElementById('btn-discuss'),
      readmeContent: document.getElementById('readme-content'),
      readmeNames: document.getElementById('readme-names'),
      readmeTech: document.getElementById('readme-tech')
    };
  }

  // Topic configurations
  const TOPICS = {
    nameFormat: {
      title: 'Customer Name Format',
      options: [
        { value: 'firstLast', label: 'First Last', example: 'John Doe' },
        { value: 'lastFirst', label: 'Last, First', example: 'Doe, John' }
      ],
      getScript: (round) => ChatScripts.nameFormatDiscussion(round),
      onDecide: (value) => {
        const section = document.getElementById('readme-names');
        const valueEl = section.querySelector('.section-value');
        valueEl.textContent = value === 'firstLast'
          ? 'Format: First Last (e.g., John Doe)'
          : 'Format: Last, First (e.g., Doe, John)';
        section.classList.remove('pending');
        section.classList.add('confirmed', 'just-confirmed');
        setTimeout(() => section.classList.remove('just-confirmed'), 500);
      }
    },
    techStack: {
      title: 'Technology Stack',
      options: [], // No selection needed - just accept preset
      getScript: (round) => ChatScripts.techStackDiscussion(round),
      onDecide: () => {
        const section = document.getElementById('readme-tech');

        // Update tech values
        section.querySelector('[data-tech="backend"] .tech-value').textContent = 'Go';
        section.querySelector('[data-tech="database"] .tech-value').textContent = 'PostgreSQL';
        section.querySelector('[data-tech="frontend"] .tech-value').textContent = 'React';

        section.classList.remove('pending');
        section.classList.add('confirmed', 'just-confirmed');
        setTimeout(() => section.classList.remove('just-confirmed'), 500);
      }
    }
  };

  // Render decision options for current topic
  function renderDecisionOptions() {
    if (!els) return;

    const state = Store.get('stageState.planning');
    const topic = TOPICS[state.currentTopic];

    // Update topic title
    const topicValue = els.decisionTopic.querySelector('.topic-value');
    if (topicValue) {
      topicValue.textContent = topic.title;
    }

    // Render options
    if (topic.options.length > 0) {
      els.decisionOptions.innerHTML = topic.options.map(opt => `
        <button class="decision-option ${state.selectedOption === opt.value ? 'selected' : ''}"
                data-value="${opt.value}">
          <span class="option-label">${opt.label}</span>
          <span class="option-example">${opt.example}</span>
        </button>
      `).join('');

      // Wire up option clicks
      els.decisionOptions.querySelectorAll('.decision-option').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.updateStageState('planning', { selectedOption: btn.dataset.value });
          renderDecisionOptions(); // Re-render to show selection
        });
      });

      els.decisionOptions.style.display = 'flex';
    } else {
      els.decisionOptions.innerHTML = `
        <div class="tech-summary">
          <div class="tech-preset">
            <span class="preset-icon">🔷</span>
            <span class="preset-label">Backend: Go</span>
          </div>
          <div class="tech-preset">
            <span class="preset-icon">🐘</span>
            <span class="preset-label">Database: PostgreSQL</span>
          </div>
          <div class="tech-preset">
            <span class="preset-icon">⚛️</span>
            <span class="preset-label">Frontend: React</span>
          </div>
        </div>
      `;
      els.decisionOptions.style.display = 'block';
    }
  }

  // Start a discussion for the current topic
  async function startDiscussion() {
    if (!els || !isActive) return;

    const state = Store.get('stageState.planning');
    const topic = TOPICS[state.currentTopic];

    // Disable buttons during chat
    if (els.btnAccept) els.btnAccept.disabled = true;
    if (els.btnDiscuss) els.btnDiscuss.disabled = true;

    // Get the script for this round
    const script = topic.getScript(state.discussionRound);

    // Create and mount chat window
    if (chatWindow) {
      chatWindow.stop();
      Components.destroy(chatWindow.id);
    }

    chatWindow = Components.create('ChatWindow', {
      container: els.chatArea,
      participants: PLANNING_PARTICIPANTS,
      script: script.messages,
      onComplete: () => {
        if (!isActive) return;
        // Enable decision buttons when chat completes
        if (els.btnAccept) els.btnAccept.disabled = false;
        if (els.btnDiscuss) els.btnDiscuss.disabled = false;
        Store.updateStageState('planning', { pendingDecision: true });
        EventBus.emit('planning:awaitingDecision', { topic: state.currentTopic });
      }
    });

    chatWindow.mount();
    await new Promise(r => setTimeout(r, 300)); // Let mount animation complete
    if (isActive) {
      chatWindow.play();
    }
  }

  // Handle "Accept" button click
  function handleAccept() {
    if (!isActive) return;

    const state = Store.get('stageState.planning');
    const topic = TOPICS[state.currentTopic];

    // Record the decision
    const decisions = { ...state.decisions };
    if (state.currentTopic === 'nameFormat') {
      decisions.nameFormat = state.selectedOption;
      Store.set('rule.nameFormat', state.selectedOption); // Also update global rule
    }

    Store.updateStageState('planning', {
      decisions,
      pendingDecision: false
    });

    // Update README section
    topic.onDecide(state.selectedOption);

    EventBus.emit('planning:decisionMade', {
      topic: state.currentTopic,
      value: state.selectedOption
    });

    // Move to next topic or complete
    if (state.currentTopic === 'nameFormat') {
      // Mark tech section as pending
      if (els.readmeTech) {
        els.readmeTech.classList.add('pending');
      }

      // Move to tech stack
      Store.updateStageState('planning', {
        currentTopic: 'techStack',
        discussionRound: 0,
        selectedOption: null
      });
      renderDecisionOptions();
      startDiscussion();
    } else if (state.currentTopic === 'techStack') {
      // All decisions made - transition to implementation
      Store.updateStageState('planning', { agreementReached: true });
      EventBus.emit('planning:complete');

      // Show completion message
      if (els.decisionPanel) {
        els.decisionPanel.innerHTML = `
          <div class="planning-complete">
            <span class="complete-icon">✓</span>
            <span class="complete-text">Planning Complete! Transitioning to Implementation...</span>
          </div>
        `;
      }

      // Transition to implementation after brief delay
      setTimeout(() => {
        if (isActive) {
          StageController.enter('implementation');
        }
      }, 2000);
    }
  }

  // Handle "Discuss Further" button click
  function handleDiscussFurther() {
    if (!isActive) return;

    const state = Store.get('stageState.planning');

    // Increment discussion round
    Store.updateStageState('planning', {
      discussionRound: state.discussionRound + 1,
      pendingDecision: false
    });

    // Increment re-negotiations counter
    const counters = Store.get('counters');
    Store.set('counters.renegotiations', counters.renegotiations + 1);

    EventBus.emit('planning:discussFurther', {
      topic: state.currentTopic,
      round: state.discussionRound + 1
    });

    // Start next round of discussion
    startDiscussion();
  }

  return {
    enter() {
      if (isActive) return; // Prevent double initialization

      isActive = true;
      cacheElements();

      if (!els.chatArea) {
        console.error('Planning elements not found');
        return;
      }

      // Reset README sections
      if (els.readmeNames) {
        els.readmeNames.classList.remove('confirmed');
        els.readmeNames.classList.add('pending');
      }
      if (els.readmeTech) {
        els.readmeTech.classList.remove('confirmed', 'pending');
      }

      // Create bound handlers
      boundHandlers = {
        accept: handleAccept.bind(this),
        discuss: handleDiscussFurther.bind(this)
      };

      // Wire up decision buttons
      if (els.btnAccept) {
        els.btnAccept.addEventListener('click', boundHandlers.accept);
      }
      if (els.btnDiscuss) {
        els.btnDiscuss.addEventListener('click', boundHandlers.discuss);
      }

      // Render initial options
      renderDecisionOptions();
    },

    exit() {
      isActive = false;

      // Remove event listeners
      if (els && boundHandlers) {
        if (els.btnAccept) {
          els.btnAccept.removeEventListener('click', boundHandlers.accept);
        }
        if (els.btnDiscuss) {
          els.btnDiscuss.removeEventListener('click', boundHandlers.discuss);
        }
      }

      // Cleanup chat window
      if (chatWindow) {
        chatWindow.stop();
        Components.destroy(chatWindow.id);
        chatWindow = null;
      }

      els = null;
      boundHandlers = null;
    },

    startDiscussion,

    buildTimeline() {
      const self = this;
      return [
        {
          id: 'planning-init',
          duration: 500,
          onStart: () => {
            console.log('Planning stage initialized');
            self.enter();
          }
        },
        {
          id: 'planning-discussion',
          duration: 60000, // Allow plenty of time for interactive discussion
          onStart: () => {
            console.log('Starting planning discussion');
            self.startDiscussion();
          }
        }
      ];
    }
  };
})();
