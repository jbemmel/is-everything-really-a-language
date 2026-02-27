/* ============================================================================
   ADVENTURE PLAYER
   Plays adventure DAGs with choices controlling flow between scenes

   Supports the new nested scenes format:
   {
     "scenes": [
       { "type": "scene", "sceneRef": "intro" },
       { "type": "choice", "prompt": "...", "choices": [
           { "name": "A", "scenes": [...] },
           { "name": "B", "scenes": [...] }
         ]
       }
     ]
   }
   ============================================================================ */

const AdventurePlayer = (() => {
  let currentAdventure = null;
  let playbackStack = [];  // Stack of { scenes: [], index: number }
  let history = [];  // For back navigation
  let scenePlayer = null;
  let isPlaying = false;
  let speedMultiplier = 1;

  // DOM references (set during init)
  let stageEl = null;
  let choiceOverlay = null;
  let choicePrompt = null;
  let choiceOptions = null;
  let endOverlay = null;
  let endSummary = null;
  let titleEl = null;
  let progressEl = null;
  let speedSliderEl = null;
  let speedValueEl = null;
  let playBtnEl = null;
  let pauseBtnEl = null;
  let stopBtnEl = null;
  let stepBackBtnEl = null;
  let stepForwardBtnEl = null;
  let resetBtnEl = null;

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Initialize DOM references
  function init() {
    stageEl = document.getElementById('adventure-stage');
    choiceOverlay = document.getElementById('adventure-choice-overlay');
    choicePrompt = document.getElementById('choice-prompt');
    choiceOptions = document.getElementById('choice-options');
    endOverlay = document.getElementById('adventure-end-overlay');
    endSummary = document.getElementById('adventure-end-summary');
    titleEl = document.getElementById('adventure-player-title');
    progressEl = document.getElementById('adventure-node-count');
    speedSliderEl = document.getElementById('adventure-player-speed');
    speedValueEl = document.getElementById('adventure-player-speed-value');
    playBtnEl = document.getElementById('btn-adventure-play');
    pauseBtnEl = document.getElementById('btn-adventure-pause');
    stopBtnEl = document.getElementById('btn-adventure-stop');
    stepBackBtnEl = document.getElementById('btn-adventure-step-back');
    stepForwardBtnEl = document.getElementById('btn-adventure-step-forward');
    resetBtnEl = document.getElementById('btn-adventure-reset');

    // Speed control
    speedSliderEl?.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      setSpeed(speed);
      if (speedValueEl) speedValueEl.textContent = speed + 'x';
    });

    // Play button - resume if paused, or replay current scene
    playBtnEl?.addEventListener('click', () => {
      if (scenePlayer) {
        if (scenePlayer.isPaused) {
          resume();
        } else if (!scenePlayer.isPlaying) {
          replayCurrentScene();
        }
      }
    });

    // Pause button
    pauseBtnEl?.addEventListener('click', () => {
      if (scenePlayer && scenePlayer.isPlaying && !scenePlayer.isPaused) {
        pause();
      }
    });

    // Stop button
    stopBtnEl?.addEventListener('click', () => {
      if (scenePlayer) {
        scenePlayer.stop();
      }
    });

    // Step back
    stepBackBtnEl?.addEventListener('click', () => {
      goBack();
    });

    // Step forward
    stepForwardBtnEl?.addEventListener('click', () => {
      stepForward();
    });

    // Reset button
    resetBtnEl?.addEventListener('click', () => {
      restart();
    });

    // Listen for scene completion
    EventBus.on('scene:complete', handleSceneComplete);
  }

  // Get current item from playback stack
  function getCurrentItem() {
    if (playbackStack.length === 0) return null;
    const frame = playbackStack[playbackStack.length - 1];
    if (frame.index >= frame.scenes.length) return null;
    return frame.scenes[frame.index];
  }

  // Advance to next item in current array, or pop stack
  function advancePlayback() {
    if (playbackStack.length === 0) return false;

    const frame = playbackStack[playbackStack.length - 1];
    frame.index++;

    // If we've exhausted this array, pop the stack
    while (playbackStack.length > 0) {
      const top = playbackStack[playbackStack.length - 1];
      if (top.index < top.scenes.length) {
        return true; // More items to play
      }
      playbackStack.pop(); // Pop exhausted frame

      // Advance parent's index
      if (playbackStack.length > 0) {
        playbackStack[playbackStack.length - 1].index++;
      }
    }

    return false; // Stack exhausted
  }

  // Start playing an adventure
  async function play(adventureId) {
    currentAdventure = AdventureManager.getAdventure(adventureId);
    if (!currentAdventure) {
      console.error('AdventurePlayer: Adventure not found:', adventureId);
      return;
    }

    // Preload adventure-scoped scenes
    await SceneManager.loadAdventureScenes(adventureId);

    // Check for scenes array (new format)
    if (!currentAdventure.scenes || currentAdventure.scenes.length === 0) {
      // Try legacy format conversion
      if (currentAdventure.nodes && currentAdventure.startNode) {
        console.log('AdventurePlayer: Converting legacy format');
        currentAdventure = convertLegacyToNested(currentAdventure);
      } else {
        console.error('AdventurePlayer: No scenes found in adventure');
        return;
      }
    }

    isPlaying = true;
    history = [];
    playbackStack = [{ scenes: currentAdventure.scenes, index: 0 }];

    // Update title
    if (titleEl) {
      titleEl.textContent = currentAdventure.name || currentAdventure.title;
    }

    hideAllOverlays();

    // Start playing
    await playNext();

    EventBus.emit('adventure:start', { adventureId, adventure: currentAdventure });
  }

  // Play the next item in the stack
  async function playNext() {
    if (!isPlaying) return;

    const item = getCurrentItem();
    if (!item) {
      // Adventure complete - show generic end
      showEndScreen({ summary: 'Adventure complete!' });
      return;
    }

    // Save state for back navigation
    history.push(JSON.stringify(playbackStack));
    updateProgress();

    // Handle by type
    if (typeof item === 'string') {
      // Scene reference string
      await playSceneRef(item);
    } else if (item.type === 'scene') {
      await playSceneItem(item);
    } else if (item.type === 'choice') {
      showChoiceItem(item);
    } else if (item.type === 'end') {
      showEndScreen(item);
    } else {
      console.warn('AdventurePlayer: Unknown item type:', item);
      if (advancePlayback()) {
        await playNext();
      } else {
        showEndScreen({ summary: 'Adventure complete!' });
      }
    }
  }

  // Play a scene by reference string
  async function playSceneRef(sceneId) {
    await playSceneById(sceneId, true);
  }

  // Play a scene item object
  async function playSceneItem(item) {
    const sceneId = item.sceneRef || item.sceneId || '';
    if (!sceneId) {
      console.warn('AdventurePlayer: Scene item has no sceneRef');
      if (advancePlayback()) {
        await playNext();
      }
      return;
    }
    await playSceneById(sceneId, true);
  }

  // Play a scene by ID
  async function playSceneById(sceneId, autoAdvance = true) {
    hideAllOverlays();

    // Look for scene in adventure context first, then fallback to global scenes
    const adventureId = currentAdventure?.id;
    const scene = adventureId
      ? SceneManager.getAdventureSceneSync(adventureId, sceneId)
      : SceneManager.getScene(sceneId);

    if (!scene) {
      console.error('AdventurePlayer: Scene not found:', sceneId, 'in adventure:', adventureId);
      if (autoAdvance && advancePlayback()) {
        await sleep(500);
        await playNext();
      }
      return;
    }

    // Destroy previous player
    if (scenePlayer) {
      scenePlayer.destroy();
    }

    // Create and play scene
    scenePlayer = StickScenePlayer.create({ mount: stageEl });
    scenePlayer.setSpeed(speedMultiplier);
    await scenePlayer.load(scene);

    if (pauseBtnEl) pauseBtnEl.textContent = '⏸';

    // Store auto-advance flag
    scenePlayer._autoAdvance = autoAdvance;

    await scenePlayer.play();
  }

  // Handle scene completion
  function handleSceneComplete({ sceneId }) {
    if (!isPlaying || !scenePlayer) return;

    if (scenePlayer._autoAdvance) {
      sleep(300).then(() => {
        if (isPlaying && advancePlayback()) {
          playNext();
        } else if (isPlaying) {
          showEndScreen({ summary: 'Adventure complete!' });
        }
      });
    }
  }

  // Show choice UI
  function showChoiceItem(item) {
    if (stageEl) stageEl.style.display = 'none';
    if (choiceOverlay) choiceOverlay.style.display = 'flex';

    if (choicePrompt) {
      choicePrompt.textContent = item.prompt || 'What would you like to do?';
    }

    if (choiceOptions) {
      choiceOptions.innerHTML = '';

      for (const choice of (item.choices || [])) {
        const btn = document.createElement('button');
        btn.className = 'choice-option-btn';
        btn.innerHTML = `
          <span class="choice-icon">${choice.icon || ''}</span>
          <span class="choice-label">${choice.name || choice.label || 'Choose'}</span>
          ${choice.description ? `<span class="choice-desc">${choice.description}</span>` : ''}
        `;
        btn.addEventListener('click', () => selectChoice(choice));
        choiceOptions.appendChild(btn);
      }
    }

    EventBus.emit('adventure:choice', { item });
  }

  // Handle choice selection
  async function selectChoice(choice) {
    hideAllOverlays();
    if (stageEl) stageEl.style.display = 'block';

    // Push the choice's scenes onto the stack
    if (choice.scenes && choice.scenes.length > 0) {
      playbackStack.push({ scenes: choice.scenes, index: 0 });
    } else {
      // No scenes in this choice, advance
      advancePlayback();
    }

    await playNext();
  }

  // Show end screen
  function showEndScreen(item) {
    isPlaying = false;

    if (scenePlayer) {
      scenePlayer.destroy();
      scenePlayer = null;
    }

    if (stageEl) stageEl.style.display = 'none';
    if (endOverlay) endOverlay.style.display = 'flex';

    if (endSummary) {
      endSummary.textContent = item.summary || 'Adventure complete!';
    }

    EventBus.emit('adventure:complete', {
      adventureId: currentAdventure?.id,
      historyLength: history.length
    });
  }

  // Hide all overlays
  function hideAllOverlays() {
    if (choiceOverlay) choiceOverlay.style.display = 'none';
    if (endOverlay) endOverlay.style.display = 'none';
    if (stageEl) stageEl.style.display = 'block';
  }

  // Update progress display
  function updateProgress() {
    if (progressEl) {
      progressEl.textContent = `Step ${history.length}`;
    }
  }

  // Restart the adventure
  async function restart() {
    if (!currentAdventure) return;
    await play(currentAdventure.id);
  }

  // Stop and cleanup
  function stop() {
    isPlaying = false;

    if (scenePlayer) {
      scenePlayer.stop();
      scenePlayer.destroy();
      scenePlayer = null;
    }

    hideAllOverlays();
    history = [];
    playbackStack = [];

    EventBus.emit('adventure:stop', { adventureId: currentAdventure?.id });
  }

  // Set playback speed
  function setSpeed(multiplier) {
    speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
    if (scenePlayer) {
      scenePlayer.setSpeed(speedMultiplier);
    }
  }

  // Pause playback
  function pause() {
    if (scenePlayer) {
      scenePlayer.pause();
    }
  }

  // Resume playback
  function resume() {
    if (scenePlayer) {
      scenePlayer.resume();
    }
  }

  // Step forward - skip to next item
  async function stepForward() {
    if (!isPlaying) return false;

    if (scenePlayer) {
      scenePlayer.stop();
    }

    const item = getCurrentItem();
    if (item && item.type === 'choice' && item.choices && item.choices.length > 0) {
      // Auto-select first choice
      await selectChoice(item.choices[0]);
      return true;
    }

    if (advancePlayback()) {
      await playNext();
      return true;
    }

    return false;
  }

  // Replay current scene
  async function replayCurrentScene() {
    const item = getCurrentItem();
    if (!item || item.type !== 'scene') return;

    if (scenePlayer) {
      scenePlayer.stop();
      scenePlayer.destroy();
      scenePlayer = null;
    }

    await playSceneItem(item);
  }

  // Go back to previous state
  async function goBack() {
    if (history.length <= 1) return false;

    history.pop(); // Remove current
    const prevState = history.pop(); // Get previous (will be re-added)

    if (prevState) {
      playbackStack = JSON.parse(prevState);
      await playNext();
      return true;
    }

    return false;
  }

  // Legacy format conversion
  function convertLegacyToNested(adventure) {
    if (!adventure.nodes) return adventure;
    if (adventure.scenes) return adventure;

    const newAdventure = {
      id: adventure.id,
      name: adventure.title || adventure.id,
      description: adventure.description || '',
      version: adventure.version || 1,
      scenes: []
    };

    const visited = new Set();

    function convertNode(nodeId) {
      if (!nodeId || visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = adventure.nodes[nodeId];
      if (!node) return null;

      if (node.type === 'scene') {
        const result = [{ type: 'scene', sceneRef: node.sceneId || '' }];
        if (node.next) {
          const nextItems = convertNode(node.next);
          if (nextItems) result.push(...nextItems);
        }
        return result;
      }

      if (node.type === 'choice') {
        return [{
          type: 'choice',
          prompt: node.prompt || '',
          choices: (node.options || []).map(opt => ({
            name: opt.label || '',
            description: opt.description || '',
            icon: opt.icon || '',
            scenes: convertNode(opt.next) || []
          }))
        }];
      }

      if (node.type === 'end') {
        return [{
          type: 'end',
          title: node.title || '',
          summary: node.summary || ''
        }];
      }

      return null;
    }

    newAdventure.scenes = convertNode(adventure.startNode) || [];
    return newAdventure;
  }

  // Get current state
  function getState() {
    return {
      adventure: currentAdventure,
      playbackStack: [...playbackStack],
      history: history.length,
      isPlaying
    };
  }

  return {
    init,
    play,
    restart,
    stop,
    pause,
    resume,
    setSpeed,
    goBack,
    stepForward,
    replayCurrentScene,
    selectChoice,
    getState,

    get currentItem() { return getCurrentItem(); },
    get adventure() { return currentAdventure; },
    get isPlaying() { return isPlaying; },
    get speed() { return speedMultiplier; }
  };
})();
