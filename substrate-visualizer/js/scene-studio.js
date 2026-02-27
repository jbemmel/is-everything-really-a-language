/* ============================================================================
   SCENE STUDIO
   Main UI controller for the scene-focused interface
   ============================================================================ */

const SceneStudio = (() => {
  let currentView = 'list';  // 'list' | 'player' | 'builder' | 'script'
  let currentScene = null;
  let currentPlayer = null;
  let editingScene = null;
  let editingEntity = null;
  let editingAction = null;
  let editingActionIndex = -1;
  let scriptSequence = [];
  let selectedEntityId = null;
  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };

  // Properties panel state
  let selectedMode = null; // 'entity' | 'action' | null
  let selectedActionIndex = -1;

  // Available poses from stick-scene-player.js
  const AVAILABLE_POSES = [
    { name: 'neutral', icon: '🧍', label: 'Neutral' },
    { name: 'shrug', icon: '🤷', label: 'Shrug' },
    { name: 'wave', icon: '👋', label: 'Wave' },
    { name: 'think', icon: '🤔', label: 'Think' },
    { name: 'point', icon: '👉', label: 'Point' },
    { name: 'handsUp', icon: '🙌', label: 'Hands Up' },
    { name: 'crossed', icon: '🙅', label: 'Crossed' },
    { name: 'pointLeft', icon: '👈', label: 'Point Left' },
    { name: 'pointRight', icon: '👉', label: 'Point Right' },
    { name: 'pointUp', icon: '☝️', label: 'Point Up' },
    { name: 'pointUpLeft', icon: '↖️', label: 'Up Left' },
    { name: 'pointUpRight', icon: '↗️', label: 'Up Right' },
    { name: 'pointUpBoth', icon: '🙆', label: 'Up Both' },
    { name: 'pointDown', icon: '👇', label: 'Point Down' },
    { name: 'presentLeft', icon: '🤲', label: 'Present L' },
    { name: 'presentRight', icon: '🤲', label: 'Present R' },
    { name: 'presentBoth', icon: '🙆', label: 'Present Both' },
    { name: 'handsDown', icon: '🧍', label: 'Hands Down' },
    { name: 'welcome', icon: '🤗', label: 'Welcome' }
  ];

  // Common emojis for head picker
  const HEAD_EMOJIS = [
    '😀', '😃', '🙂', '😐', '😕', '😮', '🤔', '🧐', '😎', '🤓',
    '😴', '😤', '😠', '🤯', '🥳', '😢', '😭', '🤩', '😇', '🤖'
  ];

  // Position presets for moveTo (960x540 stage)
  const POSITION_PRESETS = [
    { name: 'Left', x: 150, y: 350 },
    { name: 'Center', x: 480, y: 350 },
    { name: 'Right', x: 810, y: 350 },
    { name: 'Top Left', x: 150, y: 150 },
    { name: 'Top Center', x: 480, y: 150 },
    { name: 'Top Right', x: 810, y: 150 }
  ];

  // Create responsive wrapper for scene player
  function createResponsiveWrapper(container, sceneWidth, sceneHeight) {
    // Clear container
    container.innerHTML = '';

    // Create wrapper with aspect ratio
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-player-stage-wrapper';
    wrapper.style.aspectRatio = `${sceneWidth} / ${sceneHeight}`;

    container.appendChild(wrapper);

    // Apply scaling after mount
    const applyScale = () => {
      const sspRoot = wrapper.querySelector('.ssp-root');
      if (!sspRoot) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const scaleX = wrapperRect.width / sceneWidth;
      const scaleY = wrapperRect.height / sceneHeight;
      const scale = Math.min(scaleX, scaleY);

      sspRoot.style.transform = `scale(${scale})`;
    };

    // Observe resize
    const resizeObserver = new ResizeObserver(applyScale);
    resizeObserver.observe(wrapper);

    return { wrapper, applyScale, resizeObserver };
  }

  // View elements
  const views = {
    list: () => document.getElementById('scene-list-view'),
    player: () => document.getElementById('scene-player-view'),
    builder: () => document.getElementById('scene-builder-view'),
    script: () => document.getElementById('script-builder-view'),
    adventures: () => document.getElementById('adventure-list-view'),
    'adventure-player': () => document.getElementById('adventure-player-view'),
    'adventure-tree-editor': () => document.getElementById('adventure-tree-editor-view')
  };

  // Show a specific view
  function showView(viewName) {
    currentView = viewName;

    Object.keys(views).forEach(name => {
      const el = views[name]();
      if (el) {
        el.classList.toggle('active', name === viewName);
      }
    });

    // Update URL
    if (viewName === 'list') {
      RouteManager.navigate('scenes');
    } else if (viewName === 'player' && currentScene) {
      RouteManager.navigate('scene', { id: currentScene.id });
    } else if (viewName === 'builder') {
      RouteManager.navigate('builder', editingScene ? { id: editingScene.id } : {});
    } else if (viewName === 'adventures') {
      RouteManager.navigate('adventures');
    }
  }

  // Populate scene grid
  function renderSceneList() {
    const grid = document.getElementById('scene-grid');
    if (!grid) return;

    const scenes = SceneManager.getAllScenes();

    if (scenes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <h3>No Scenes Yet</h3>
          <p>Create your first scene to get started</p>
          <button class="scene-action-btn" onclick="SceneStudio.openBuilder()">+ Create Scene</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = scenes.map(scene => `
      <div class="scene-card" data-scene-id="${scene.id}">
        <div class="scene-card-preview">
          <div class="scene-card-icon">🎬</div>
        </div>
        <div class="scene-card-info">
          <div class="scene-card-title">${scene.title || scene.id}</div>
          <div class="scene-card-desc">${scene.description || 'No description'}</div>
          <div class="scene-card-meta">
            <span class="scene-card-category">${scene.category || 'general'}</span>
          </div>
        </div>
        <div class="scene-card-actions">
          <button class="card-action-btn play" title="Play">▶</button>
          <button class="card-action-btn edit" title="Edit">✏️</button>
          <button class="card-action-btn delete" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    grid.querySelectorAll('.scene-card').forEach(card => {
      const sceneId = card.dataset.sceneId;

      card.querySelector('.play')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playScene(sceneId);
      });

      card.querySelector('.edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openBuilder(sceneId);
      });

      card.querySelector('.delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteScene(sceneId);
      });

      // Click on card plays it
      card.addEventListener('click', () => playScene(sceneId));
    });
  }

  // Play a scene
  let currentResizeObserver = null;

  async function playScene(sceneId) {
    const scene = SceneManager.getScene(sceneId);
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    currentScene = scene;
    showView('player');

    // Update title
    const titleEl = document.getElementById('scene-player-title');
    if (titleEl) titleEl.textContent = scene.title || scene.id;

    // Get stage container
    const stageContainer = document.getElementById('scene-player-stage');
    if (!stageContainer) return;

    // Cleanup previous player and observer
    if (currentPlayer) {
      currentPlayer.destroy();
      currentPlayer = null;
    }
    if (currentResizeObserver) {
      currentResizeObserver.disconnect();
      currentResizeObserver = null;
    }

    // Get scene dimensions
    const sceneWidth = scene.stage?.width || 960;
    const sceneHeight = scene.stage?.height || 540;

    // Create responsive wrapper
    const { wrapper, applyScale, resizeObserver } = createResponsiveWrapper(
      stageContainer, sceneWidth, sceneHeight
    );
    currentResizeObserver = resizeObserver;

    // Create new player mounted in wrapper
    currentPlayer = StickScenePlayer.create({ mount: wrapper });
    await currentPlayer.load(scene);

    // Apply initial scale after load
    requestAnimationFrame(applyScale);

    await currentPlayer.play();
  }

  // Open scene builder
  function openBuilder(sceneId = null) {
    if (sceneId) {
      editingScene = SceneManager.getScene(sceneId);
    } else {
      editingScene = createEmptyScene();
    }

    showView('builder');
    populateBuilderForm();
  }

  // Create empty scene template
  function createEmptyScene() {
    return {
      id: 'scene-' + Date.now(),
      title: 'New Scene',
      description: '',
      category: 'general',
      version: 1,
      stage: { width: 960, height: 540, background: '#f8f9fa' },
      entities: {
        actor1: { type: 'stickActor', x: 480, y: 380, scale: 1, head: '🙂', name: 'Actor' }
      },
      timeline: [
        { do: 'fadeIn', args: { duration: 0.5 } },
        { do: 'bubbleSay', target: 'actor1', args: { text: 'Hello!', hold: 2 } },
        { do: 'fadeOut', args: { duration: 0.5 } }
      ]
    };
  }

  // Populate builder form with scene data
  function populateBuilderForm() {
    if (!editingScene) return;

    const titleInput = document.getElementById('scene-title-input');
    if (titleInput) titleInput.value = editingScene.title || '';

    const widthInput = document.getElementById('stage-width');
    if (widthInput) widthInput.value = editingScene.stage?.width || 960;

    const heightInput = document.getElementById('stage-height');
    if (heightInput) heightInput.value = editingScene.stage?.height || 540;

    const bgInput = document.getElementById('stage-bg');
    if (bgInput) bgInput.value = editingScene.stage?.background || '#f8f9fa';

    const timelineInput = document.getElementById('timeline-json');
    if (timelineInput) {
      timelineInput.value = JSON.stringify(editingScene.timeline || [], null, 2);
    }

    renderEntityList();
    renderBuilderPreview();
  }

  // Render entity list in builder (with drag/drop and edit support)
  function renderEntityList() {
    const list = document.getElementById('entity-list');
    if (!list || !editingScene) return;

    const entities = editingScene.entities || {};

    list.innerHTML = Object.entries(entities).map(([id, entity], index) => `
      <div class="entity-item ${selectedMode === 'entity' && selectedEntityId === id ? 'selected' : ''}" data-entity-id="${id}" data-index="${index}" data-id="${id}" draggable="true">
        <span class="entity-drag-handle">⋮⋮</span>
        <span class="entity-icon">${entity.head || getEntityIcon(entity.type)}</span>
        <span class="entity-name">${entity.name || id}</span>
        <div class="entity-item-actions">
          <button class="entity-edit-btn" title="Edit in modal">✏️</button>
          <button class="entity-remove" title="Remove">×</button>
        </div>
      </div>
    `).join('');

    // Attach handlers
    list.querySelectorAll('.entity-item').forEach(item => {
      const entityId = item.dataset.entityId;

      // Click to select (show in properties panel)
      item.addEventListener('click', (e) => {
        if (e.target.closest('.entity-edit-btn') || e.target.closest('.entity-remove')) return;
        selectEntity(entityId);
      });

      item.querySelector('.entity-edit-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntityEditor(entityId);
      });

      item.querySelector('.entity-remove')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Remove this entity?')) {
          delete editingScene.entities[entityId];
          renderEntityList();
          renderBuilderPreview();
        }
      });

      // Drag/drop for reordering
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', entityId);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        list.querySelectorAll('.entity-item').forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== entityId) {
          reorderEntities(draggedId, entityId);
        }
        item.classList.remove('drag-over');
      });
    });

    // Also render visual timeline if available
    renderVisualTimeline();
  }

  function getEntityIcon(type) {
    const icons = {
      stickActor: '🧍',
      chatPanel: '💬',
      codeEditor: '📝',
      whiteboard: '📋',
      title: '📌'
    };
    return icons[type] || '❓';
  }

  // Render live preview in builder
  function renderBuilderPreview() {
    const preview = document.getElementById('builder-preview');
    if (!preview || !editingScene) return;

    // Simple SVG preview of entities with drag support
    const { width, height, background } = editingScene.stage || {};

    let entitiesHtml = '';
    const entities = editingScene.entities || {};

    for (const [id, entity] of Object.entries(entities)) {
      const isSelected = id === selectedEntityId;
      const selectionStroke = isSelected ? '#58a6ff' : 'transparent';

      if (entity.type === 'stickActor') {
        const x = entity.x || 100;
        const y = entity.y || 300;
        entitiesHtml += `
          <g class="draggable-entity" data-entity-id="${id}" transform="translate(${x}, ${y})" style="cursor: move;">
            ${isSelected ? `<circle r="70" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5"/>` : ''}
            <rect x="-40" y="-100" width="80" height="180" fill="transparent" class="entity-hitarea"/>
            <line x1="0" y1="-60" x2="0" y2="0" stroke="#111" stroke-width="4" stroke-linecap="round" style="pointer-events: none;"/>
            <line x1="0" y1="-50" x2="-20" y2="-20" stroke="#111" stroke-width="4" stroke-linecap="round" style="pointer-events: none;"/>
            <line x1="0" y1="-50" x2="20" y2="-20" stroke="#111" stroke-width="4" stroke-linecap="round" style="pointer-events: none;"/>
            <line x1="0" y1="0" x2="-18" y2="48" stroke="#111" stroke-width="4" stroke-linecap="round" style="pointer-events: none;"/>
            <line x1="0" y1="0" x2="18" y2="48" stroke="#111" stroke-width="4" stroke-linecap="round" style="pointer-events: none;"/>
            <text x="0" y="-60" text-anchor="middle" font-size="56" style="pointer-events: none;">${entity.head || '🙂'}</text>
            <text x="0" y="70" text-anchor="middle" font-size="12" fill="#666" style="pointer-events: none;">${entity.name || id}</text>
          </g>
        `;
      } else if (entity.type === 'chatPanel') {
        entitiesHtml += `
          <g class="draggable-entity" data-entity-id="${id}" style="cursor: move;">
            ${isSelected ? `<rect x="${(entity.x || 0) - 4}" y="${(entity.y || 0) - 4}" width="${(entity.width || 320) + 8}" height="${(entity.height || 200) + 8}" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" rx="10"/>` : ''}
            <rect x="${entity.x || 0}" y="${entity.y || 0}"
                  width="${entity.width || 320}" height="${entity.height || 200}"
                  fill="rgba(255,255,255,0.9)" stroke="#111" stroke-width="2" rx="8"/>
            <text x="${(entity.x || 0) + 10}" y="${(entity.y || 0) + 20}" font-size="12" fill="#666" style="pointer-events: none;">Chat Panel</text>
          </g>
        `;
      } else if (entity.type === 'codeEditor') {
        entitiesHtml += `
          <g class="draggable-entity" data-entity-id="${id}" style="cursor: move;">
            ${isSelected ? `<rect x="${(entity.x || 0) - 4}" y="${(entity.y || 0) - 4}" width="${(entity.width || 400) + 8}" height="${(entity.height || 200) + 8}" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" rx="10"/>` : ''}
            <rect x="${entity.x || 0}" y="${entity.y || 0}"
                  width="${entity.width || 400}" height="${entity.height || 200}"
                  fill="#1e1e1e" stroke="#333" stroke-width="2" rx="8"/>
            <text x="${(entity.x || 0) + 10}" y="${(entity.y || 0) + 20}" font-size="12" fill="#888" style="pointer-events: none;">Code Editor</text>
          </g>
        `;
      } else if (entity.type === 'whiteboard') {
        entitiesHtml += `
          <g class="draggable-entity" data-entity-id="${id}" style="cursor: move;">
            ${isSelected ? `<rect x="${(entity.x || 0) - 4}" y="${(entity.y || 0) - 4}" width="${(entity.width || 400) + 8}" height="${(entity.height || 300) + 8}" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" rx="6"/>` : ''}
            <rect x="${entity.x || 0}" y="${entity.y || 0}"
                  width="${entity.width || 400}" height="${entity.height || 300}"
                  fill="#fff" stroke="#444" stroke-width="3" rx="4"/>
            <text x="${(entity.x || 0) + 12}" y="${(entity.y || 0) + 30}" font-size="18" fill="#2c3e50" font-family="cursive" style="pointer-events: none;">Whiteboard</text>
          </g>
        `;
      } else if (entity.type === 'title') {
        const fontSize = entity.fontSize || 24;
        const displayText = entity.text || entity.name || 'Title';
        const textWidth = entity.width || Math.max(displayText.length * fontSize * 0.6, 100);
        const textHeight = fontSize + 20;
        entitiesHtml += `
          <g class="draggable-entity" data-entity-id="${id}" style="cursor: move;">
            ${isSelected ? `<rect x="${(entity.x || 0) - 4}" y="${(entity.y || 0) - 4}" width="${textWidth + 8}" height="${textHeight + 8}" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" rx="4"/>` : ''}
            <rect x="${entity.x || 0}" y="${entity.y || 0}"
                  width="${textWidth}" height="${textHeight}"
                  fill="rgba(255,255,255,0.8)" stroke="#ccc" stroke-width="1" rx="4" class="entity-hitarea"/>
            <text x="${(entity.x || 0) + 10}" y="${(entity.y || 0) + fontSize}" font-size="${fontSize}" fill="#333" font-weight="bold" style="pointer-events: none;">${displayText}</text>
          </g>
        `;
      }
    }

    preview.innerHTML = `
      <svg id="builder-svg" viewBox="0 0 ${width || 960} ${height || 540}"
           style="width: 100%; height: 100%; background: ${background || '#f8f9fa'}; border-radius: 8px;">
        ${entitiesHtml}
      </svg>
    `;

    // Attach drag handlers
    attachPreviewDragHandlers();
  }

  // Drag handlers for builder preview
  function attachPreviewDragHandlers() {
    const svg = document.getElementById('builder-svg');
    if (!svg) return;

    svg.querySelectorAll('.draggable-entity').forEach(group => {
      const entityId = group.dataset.entityId;

      group.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Select the entity (updates properties panel and highlights)
        selectEntity(entityId);
        isDragging = true;

        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / svgRect.width;
        const scaleY = viewBox.height / svgRect.height;

        const entity = editingScene.entities[entityId];
        dragStartPos = {
          x: e.clientX,
          y: e.clientY,
          entityX: entity.x || 0,
          entityY: entity.y || 0,
          scaleX,
          scaleY
        };
      });
    });

    // Click on empty space deselects
    svg.addEventListener('mousedown', (e) => {
      if (e.target === svg) {
        clearSelection();
        renderBuilderPreview();
      }
    });
  }

  // Global mouse handlers for dragging
  function handlePreviewDragMove(e) {
    if (!isDragging || !selectedEntityId || !editingScene) return;

    const entity = editingScene.entities[selectedEntityId];
    if (!entity) return;

    const dx = (e.clientX - dragStartPos.x) * dragStartPos.scaleX;
    const dy = (e.clientY - dragStartPos.y) * dragStartPos.scaleY;

    entity.x = Math.round(dragStartPos.entityX + dx);
    entity.y = Math.round(dragStartPos.entityY + dy);

    renderBuilderPreview();
  }

  function handlePreviewDragEnd() {
    if (isDragging) {
      isDragging = false;
      renderEntityList(); // Update entity list to reflect new positions
    }
  }

  // Set up global listeners once
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handlePreviewDragMove);
    window.addEventListener('mouseup', handlePreviewDragEnd);
  }

  // Save scene from builder
  async function saveScene() {
    if (!editingScene) return;

    // Gather form data
    const titleInput = document.getElementById('scene-title-input');
    const widthInput = document.getElementById('stage-width');
    const heightInput = document.getElementById('stage-height');
    const bgInput = document.getElementById('stage-bg');
    const timelineInput = document.getElementById('timeline-json');

    editingScene.title = titleInput?.value || 'Untitled';
    editingScene.stage = {
      width: parseInt(widthInput?.value) || 960,
      height: parseInt(heightInput?.value) || 540,
      background: bgInput?.value || '#f8f9fa'
    };

    try {
      editingScene.timeline = JSON.parse(timelineInput?.value || '[]');
    } catch (e) {
      alert('Invalid timeline JSON: ' + e.message);
      return;
    }

    // Check if we're editing an adventure-scoped scene
    const adventureContext = sessionStorage.getItem('editingAdventureScene');
    if (adventureContext) {
      try {
        const { adventureId, sceneId } = JSON.parse(adventureContext);
        // Save to adventure folder
        await SceneManager.saveAdventureScene(adventureId, editingScene.id, editingScene);
        console.log(`Scene "${editingScene.id}" saved to adventure "${adventureId}"`);

        // Return to adventure editor
        const returnTo = sessionStorage.getItem('returnToAdventure');
        sessionStorage.removeItem('editingAdventureScene');
        sessionStorage.removeItem('returnToAdventure');

        if (returnTo) {
          showView('adventure-tree-editor');
          if (typeof AdventureTreeEditor !== 'undefined') {
            AdventureTreeEditor.init();
            AdventureTreeEditor.loadAdventure(returnTo);
          }
          return;
        }
      } catch (e) {
        console.error('Error parsing adventure context:', e);
      }
    }

    // Regular scene: register/update in global registry
    SceneManager.registerScene(editingScene);

    // Save to disk (or localStorage fallback)
    const saved = await SceneManager.saveSceneToDisk(editingScene.id);
    if (saved && typeof FileAPI !== 'undefined' && FileAPI.isServerMode()) {
      console.log(`Scene "${editingScene.id}" saved to disk`);
    }

    showView('list');
    renderSceneList();
  }

  // Preview scene from builder
  async function previewScene() {
    if (!editingScene) return;

    // Save current form state
    const timelineInput = document.getElementById('timeline-json');
    try {
      editingScene.timeline = JSON.parse(timelineInput?.value || '[]');
    } catch (e) {
      alert('Invalid timeline JSON: ' + e.message);
      return;
    }

    currentScene = editingScene;
    showView('player');

    const titleEl = document.getElementById('scene-player-title');
    if (titleEl) titleEl.textContent = editingScene.title || 'Preview';

    const stageContainer = document.getElementById('scene-player-stage');
    if (!stageContainer) return;

    // Cleanup previous player and observer
    if (currentPlayer) {
      currentPlayer.destroy();
      currentPlayer = null;
    }
    if (currentResizeObserver) {
      currentResizeObserver.disconnect();
      currentResizeObserver = null;
    }

    // Get scene dimensions
    const sceneWidth = editingScene.stage?.width || 960;
    const sceneHeight = editingScene.stage?.height || 540;

    // Create responsive wrapper
    const { wrapper, applyScale, resizeObserver } = createResponsiveWrapper(
      stageContainer, sceneWidth, sceneHeight
    );
    currentResizeObserver = resizeObserver;

    // Create new player mounted in wrapper
    currentPlayer = StickScenePlayer.create({ mount: wrapper });
    await currentPlayer.load(editingScene);

    // Apply initial scale after load
    requestAnimationFrame(applyScale);

    await currentPlayer.play();
  }

  // Delete a scene
  function deleteScene(sceneId) {
    if (!confirm('Delete this scene?')) return;
    SceneManager.removeScene(sceneId);
    renderSceneList();
  }

  // Add new entity in builder
  function addEntity() {
    if (!editingScene) return;

    const id = 'entity-' + Date.now();
    editingScene.entities[id] = {
      type: 'stickActor',
      x: 200 + Math.random() * 500,
      y: 350,
      scale: 1,
      head: '🙂',
      name: 'New Actor'
    };

    renderEntityList();
    renderBuilderPreview();
  }

  // Import scene from JSON
  function importScene() {
    const json = prompt('Paste scene JSON:');
    if (!json) return;

    try {
      const scene = JSON.parse(json);
      SceneManager.registerScene(scene);
      renderSceneList();
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  }

  // Toggle between scene mode and legacy mode
  function showLegacyMode() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('legacy-app').classList.remove('hidden');
    RouteManager.navigate('legacy');
  }

  function showSceneMode() {
    document.getElementById('legacy-app').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    showView('list');
    renderSceneList();
  }

  // ============================================================================
  // VISUAL TIMELINE EDITOR
  // ============================================================================

  function renderVisualTimeline() {
    if (!editingScene) return;

    const jsonEl = document.getElementById('timeline-editor');
    const visualEl = document.getElementById('visual-timeline');

    // Sync JSON to visual
    const list = document.getElementById('timeline-actions-list');
    if (!list) return;

    const timeline = editingScene.timeline || [];
    list.innerHTML = timeline.map((action, index) => `
      <div class="timeline-action-item ${selectedMode === 'action' && selectedActionIndex === index ? 'selected' : ''}" data-index="${index}" draggable="true">
        <span class="timeline-action-handle">⋮⋮</span>
        <span class="timeline-action-icon">${getActionIcon(action.do)}</span>
        <div class="timeline-action-info">
          <span class="timeline-action-type">${action.do}</span>
          <span class="timeline-action-target">${action.target || ''} ${getActionSummary(action)}</span>
        </div>
        <button class="timeline-action-edit" title="Edit in modal">✏️</button>
        <button class="timeline-action-delete" title="Delete action">×</button>
      </div>
    `).join('');

    // Attach handlers
    list.querySelectorAll('.timeline-action-item').forEach(item => {
      const index = parseInt(item.dataset.index);

      // Click to select (show in properties panel)
      item.addEventListener('click', (e) => {
        if (e.target.closest('.timeline-action-edit') || e.target.closest('.timeline-action-delete')) return;
        selectAction(index);
      });

      item.querySelector('.timeline-action-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openActionEditor(index);
      });

      item.querySelector('.timeline-action-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAction(index);
      });

      // Drag/drop for reordering
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', index.toString());
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        list.querySelectorAll('.timeline-action-item').forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = index;
        if (fromIndex !== toIndex) {
          reorderActions(fromIndex, toIndex);
        }
        item.classList.remove('drag-over');
      });
    });
  }

  function getActionIcon(actionType) {
    const icons = {
      fadeIn: '🌅', fadeOut: '🌆', wait: '⏳',
      moveTo: '➡️', setHead: '😀', pose: '🧍', bubbleSay: '💬',
      chatSay: '💭', typeCode: '⌨️', clearCode: '🗑️', setTitle: '📝',
      writeBoard: '✍️', eraseLines: '🧽', crossOut: '❌', clearBoard: '🗑️'
    };
    return icons[actionType] || '⚡';
  }

  function getActionSummary(action) {
    if (action.args?.text) return `"${action.args.text.substring(0, 20)}..."`;
    if (action.args?.duration) return `${action.args.duration}s`;
    if (action.args?.emoji) return action.args.emoji;
    return '';
  }

  function reorderActions(fromIndex, toIndex) {
    if (!editingScene?.timeline) return;
    const [moved] = editingScene.timeline.splice(fromIndex, 1);
    editingScene.timeline.splice(toIndex, 0, moved);
    renderVisualTimeline();
    syncTimelineToJson();
  }

  function deleteAction(index) {
    if (!editingScene?.timeline) return;
    if (!confirm('Delete this action?')) return;
    editingScene.timeline.splice(index, 1);
    renderVisualTimeline();
    syncTimelineToJson();
  }

  function syncTimelineToJson() {
    const textarea = document.getElementById('timeline-json');
    if (textarea && editingScene) {
      textarea.value = JSON.stringify(editingScene.timeline || [], null, 2);
    }
  }

  function syncJsonToTimeline() {
    const textarea = document.getElementById('timeline-json');
    if (textarea && editingScene) {
      try {
        editingScene.timeline = JSON.parse(textarea.value || '[]');
        renderVisualTimeline();
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }

  // ============================================================================
  // ENTITY EDITOR
  // ============================================================================

  function openEntityEditor(entityId) {
    if (!editingScene || !editingScene.entities[entityId]) return;

    editingEntity = { id: entityId, ...editingScene.entities[entityId] };
    const modal = document.getElementById('entity-editor-modal');
    if (!modal) return;

    // Populate form
    document.getElementById('entity-id').value = entityId;
    document.getElementById('entity-name').value = editingEntity.name || '';
    document.getElementById('entity-type').value = editingEntity.type || 'stickActor';
    document.getElementById('entity-x').value = editingEntity.x || 0;
    document.getElementById('entity-y').value = editingEntity.y || 0;
    document.getElementById('entity-scale').value = editingEntity.scale || 1;
    document.getElementById('entity-width').value = editingEntity.width || 320;
    document.getElementById('entity-height').value = editingEntity.height || 200;

    // Movement fields
    const moveDirEl = document.getElementById('entity-move-direction');
    const moveDistEl = document.getElementById('entity-move-distance');
    const moveDurEl = document.getElementById('entity-move-duration');
    if (moveDirEl) moveDirEl.value = editingEntity.moveDirection || 0;
    if (moveDistEl) moveDistEl.value = editingEntity.moveDistance || 0;
    if (moveDurEl) moveDurEl.value = editingEntity.moveDuration || 0.8;

    // Speech fields
    const speechTextEl = document.getElementById('entity-speech-text');
    const speechHoldEl = document.getElementById('entity-speech-hold');
    if (speechTextEl) speechTextEl.value = editingEntity.speechText || '';
    if (speechHoldEl) speechHoldEl.value = editingEntity.speechHold || 2;

    // Whiteboard initial text
    const initialTextEl = document.getElementById('entity-initial-text');
    if (initialTextEl) initialTextEl.value = editingEntity.initialText || '';

    // Title text and font size
    const titleTextEl = document.getElementById('entity-title-text');
    const titleFontSizeEl = document.getElementById('entity-title-fontsize');
    if (titleTextEl) titleTextEl.value = editingEntity.text || '';
    if (titleFontSizeEl) titleFontSizeEl.value = editingEntity.fontSize || 24;

    // Head emoji
    document.getElementById('entity-head-custom').value = editingEntity.head || '';
    document.querySelectorAll('.head-emoji-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.emoji === editingEntity.head);
    });

    // Pose
    document.querySelectorAll('.pose-preset').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.pose === editingEntity.initialPose);
    });
    const customPoseFields = document.getElementById('custom-pose-fields');
    if (customPoseFields) {
      customPoseFields.style.display = editingEntity.initialPose === 'custom' ? 'block' : 'none';
    }

    if (editingEntity.customPose) {
      const els = ['pose-shoulderL', 'pose-elbowL', 'pose-shoulderR', 'pose-elbowR'];
      const vals = [editingEntity.customPose.shoulderL || -30, editingEntity.customPose.elbowL || -20,
                    editingEntity.customPose.shoulderR || 30, editingEntity.customPose.elbowR || 20];
      els.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = vals[i];
      });
    }

    // Show/hide sections based on type
    updateEntityEditorSections(editingEntity.type);

    modal.classList.add('active');
  }

  function updateEntityEditorSections(type) {
    const actorSection = document.getElementById('actor-section');
    const movementSection = document.getElementById('movement-section');
    const speechSection = document.getElementById('speech-section');
    const whiteboardSection = document.getElementById('whiteboard-section');
    const titleSection = document.getElementById('title-section');
    const widthField = document.getElementById('entity-width-field');
    const heightField = document.getElementById('entity-height-field');

    const isActor = type === 'stickActor';
    const isWhiteboard = type === 'whiteboard';
    const isTitle = type === 'title';
    const hasSize = type === 'chatPanel' || type === 'codeEditor' || type === 'whiteboard' || type === 'title';

    if (actorSection) actorSection.style.display = isActor ? 'block' : 'none';
    if (movementSection) movementSection.style.display = isActor ? 'block' : 'none';
    if (speechSection) speechSection.style.display = isActor ? 'block' : 'none';
    if (whiteboardSection) whiteboardSection.style.display = isWhiteboard ? 'block' : 'none';
    if (titleSection) titleSection.style.display = isTitle ? 'block' : 'none';
    if (widthField) widthField.style.display = hasSize ? 'block' : 'none';
    if (heightField) heightField.style.display = hasSize ? 'block' : 'none';
  }

  function closeEntityEditor() {
    editingEntity = null;
    document.getElementById('entity-editor-modal')?.classList.remove('active');
  }

  function saveEntityFromEditor() {
    if (!editingEntity || !editingScene) return;

    const entityId = editingEntity.id;
    const entity = editingScene.entities[entityId];
    if (!entity) return;

    entity.name = document.getElementById('entity-name').value || entityId;
    entity.type = document.getElementById('entity-type').value;
    entity.x = parseInt(document.getElementById('entity-x').value) || 0;
    entity.y = parseInt(document.getElementById('entity-y').value) || 0;
    entity.scale = parseFloat(document.getElementById('entity-scale').value) || 1;
    entity.width = parseInt(document.getElementById('entity-width').value) || 320;
    entity.height = parseInt(document.getElementById('entity-height').value) || 200;

    // Movement
    const moveDirEl = document.getElementById('entity-move-direction');
    const moveDistEl = document.getElementById('entity-move-distance');
    const moveDurEl = document.getElementById('entity-move-duration');
    if (moveDirEl) entity.moveDirection = parseInt(moveDirEl.value) || 0;
    if (moveDistEl) entity.moveDistance = parseInt(moveDistEl.value) || 0;
    if (moveDurEl) entity.moveDuration = parseFloat(moveDurEl.value) || 0.8;

    // Speech
    const speechTextEl = document.getElementById('entity-speech-text');
    const speechHoldEl = document.getElementById('entity-speech-hold');
    if (speechTextEl) entity.speechText = speechTextEl.value || '';
    if (speechHoldEl) entity.speechHold = parseFloat(speechHoldEl.value) || 2;

    // Whiteboard initial text
    const initialTextEl = document.getElementById('entity-initial-text');
    if (initialTextEl && entity.type === 'whiteboard') {
      entity.initialText = initialTextEl.value || '';
    }

    // Title text and font size
    if (entity.type === 'title') {
      const titleTextEl = document.getElementById('entity-title-text');
      const titleFontSizeEl = document.getElementById('entity-title-fontsize');
      if (titleTextEl) entity.text = titleTextEl.value || '';
      if (titleFontSizeEl) entity.fontSize = parseInt(titleFontSizeEl.value) || 24;
    }

    // Head
    const customHead = document.getElementById('entity-head-custom').value;
    if (customHead) entity.head = customHead;

    // Pose
    const selectedPose = document.querySelector('.pose-preset.selected');
    if (selectedPose) {
      entity.initialPose = selectedPose.dataset.pose;
      if (entity.initialPose === 'custom') {
        entity.customPose = {
          shoulderL: parseInt(document.getElementById('pose-shoulderL')?.value) || -30,
          elbowL: parseInt(document.getElementById('pose-elbowL')?.value) || -20,
          shoulderR: parseInt(document.getElementById('pose-shoulderR')?.value) || 30,
          elbowR: parseInt(document.getElementById('pose-elbowR')?.value) || 20
        };
      }
    }

    closeEntityEditor();
    renderEntityList();
    renderBuilderPreview();
  }

  // ============================================================================
  // ACTION EDITOR
  // ============================================================================

  function openActionEditor(index = -1) {
    editingActionIndex = index;
    editingAction = index >= 0 && editingScene?.timeline
      ? { ...editingScene.timeline[index] }
      : { do: 'wait', args: { duration: 1 } };

    const modal = document.getElementById('action-editor-modal');
    if (!modal) return;

    document.getElementById('action-type').value = editingAction.do || 'wait';
    populateActionTargets();
    document.getElementById('action-target').value = editingAction.target || '';
    renderActionArgs();

    modal.classList.add('active');
  }

  function populateActionTargets() {
    const select = document.getElementById('action-target');
    if (!select || !editingScene) return;

    const actionType = document.getElementById('action-type')?.value;

    // Filter entities based on action type
    const actorActions = ['moveTo', 'setHead', 'pose', 'bubbleSay'];
    const chatActions = ['chatSay'];
    const codeActions = ['typeCode', 'clearCode'];
    const boardActions = ['writeBoard', 'eraseLines', 'crossOut', 'clearBoard'];
    const titleActions = ['setTitle'];

    let filterFn = () => true;
    if (actorActions.includes(actionType)) filterFn = (e) => e.type === 'stickActor';
    if (chatActions.includes(actionType)) filterFn = (e) => e.type === 'chatPanel';
    if (codeActions.includes(actionType)) filterFn = (e) => e.type === 'codeEditor';
    if (boardActions.includes(actionType)) filterFn = (e) => e.type === 'whiteboard';
    if (titleActions.includes(actionType)) filterFn = (e) => e.type === 'title';

    const entities = Object.entries(editingScene.entities || {}).filter(([id, e]) => filterFn(e));

    select.innerHTML = '<option value="">Select target...</option>';
    entities.forEach(([id, entity]) => {
      select.innerHTML += `<option value="${id}">${entity.name || id}</option>`;
    });

    // Auto-select if there's exactly one matching entity and no current target
    if (entities.length === 1 && !editingAction.target) {
      select.value = entities[0][0];
      editingAction.target = entities[0][0];
    } else if (editingAction.target) {
      select.value = editingAction.target;
    }
  }

  function renderActionArgs() {
    const container = document.getElementById('action-args-container');
    if (!container) return;

    const actionType = document.getElementById('action-type').value;
    const args = editingAction.args || {};

    const argDefs = {
      fadeIn: [{ name: 'duration', type: 'number', label: 'Duration (s)', default: 0.5 }],
      fadeOut: [{ name: 'duration', type: 'number', label: 'Duration (s)', default: 0.5 }],
      wait: [{ name: 'duration', type: 'number', label: 'Duration (s)', default: 1 }],
      moveTo: [
        { name: 'x', type: 'number', label: 'X Position', default: 0 },
        { name: 'y', type: 'number', label: 'Y Position', default: 0 },
        { name: 'duration', type: 'number', label: 'Duration (s)', default: 0.5 }
      ],
      setHead: [{ name: 'emoji', type: 'text', label: 'Head Emoji', default: '🙂' }],
      pose: [
        { name: 'name', type: 'text', label: 'Pose Name', default: 'neutral' },
        { name: 'headDirection', type: 'select', label: 'Head Direction', default: 1, options: [{ value: 1, label: 'Right →' }, { value: -1, label: '← Left' }] },
        { name: 'duration', type: 'number', label: 'Duration (s)', default: 0.3 }
      ],
      bubbleSay: [
        { name: 'text', type: 'text', label: 'Speech Text', default: 'Hello!' },
        { name: 'hold', type: 'number', label: 'Hold (s)', default: 2 }
      ],
      chatSay: [
        { name: 'speaker', type: 'text', label: 'Speaker', default: 'System' },
        { name: 'text', type: 'text', label: 'Message', default: '' }
      ],
      typeCode: [
        { name: 'target', type: 'text', label: 'Code Editor ID', default: 'codeEditor' },
        { name: 'text', type: 'textarea', label: 'Code', default: '' },
        { name: 'speedCps', type: 'number', label: 'Speed (chars/sec)', default: 30 }
      ],
      clearCode: [{ name: 'target', type: 'text', label: 'Code Editor ID', default: 'codeEditor' }],
      writeBoard: [
        { name: 'target', type: 'text', label: 'Whiteboard ID', default: 'board' },
        { name: 'text', type: 'textarea', label: 'Text', default: '' },
        { name: 'speedCps', type: 'number', label: 'Speed (chars/sec)', default: 12 }
      ],
      eraseLines: [
        { name: 'target', type: 'text', label: 'Whiteboard ID', default: 'board' },
        { name: 'lines', type: 'number', label: 'Lines to Erase', default: 1 },
        { name: 'speedCps', type: 'number', label: 'Speed (chars/sec)', default: 20 }
      ],
      crossOut: [
        { name: 'target', type: 'text', label: 'Whiteboard ID', default: 'board' },
        { name: 'text', type: 'text', label: 'Text to Cross Out', default: '' },
        { name: 'duration', type: 'number', label: 'Duration (s)', default: 1 }
      ],
      clearBoard: [{ name: 'target', type: 'text', label: 'Whiteboard ID', default: 'board' }],
      setTitle: [{ name: 'text', type: 'text', label: 'Title Text', default: '' }]
    };

    const defs = argDefs[actionType] || [];
    container.innerHTML = defs.map(def => {
      const currentVal = args[def.name] ?? def.default;
      let inputHtml;
      if (def.type === 'textarea') {
        inputHtml = `<textarea id="action-arg-${def.name}" rows="3">${currentVal}</textarea>`;
      } else if (def.type === 'select') {
        inputHtml = `<select id="action-arg-${def.name}">
          ${def.options.map(opt => `<option value="${opt.value}" ${opt.value == currentVal ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>`;
      } else {
        inputHtml = `<input type="${def.type}" id="action-arg-${def.name}" value="${currentVal}">`;
      }
      return `<div class="entity-field"><label>${def.label}</label>${inputHtml}</div>`;
    }).join('');
  }

  function closeActionEditor() {
    editingAction = null;
    editingActionIndex = -1;
    document.getElementById('action-editor-modal')?.classList.remove('active');
  }

  function saveActionFromEditor() {
    if (!editingScene) return;

    const actionType = document.getElementById('action-type').value;
    const target = document.getElementById('action-target').value;

    const action = { do: actionType };
    if (target) action.target = target;

    // Collect args
    const argInputs = document.querySelectorAll('#action-args-container input, #action-args-container textarea, #action-args-container select');
    const args = {};
    argInputs.forEach(input => {
      const name = input.id.replace('action-arg-', '');
      let val;
      if (input.type === 'number') {
        val = parseFloat(input.value);
      } else if (input.tagName === 'SELECT') {
        val = parseFloat(input.value) || input.value; // Parse as number if possible
      } else {
        val = input.value;
      }
      if (val !== '' && val !== null && !isNaN(val)) args[name] = val;
    });
    if (Object.keys(args).length > 0) action.args = args;

    if (!editingScene.timeline) editingScene.timeline = [];

    if (editingActionIndex >= 0) {
      editingScene.timeline[editingActionIndex] = action;
    } else {
      editingScene.timeline.push(action);
    }

    closeActionEditor();
    renderVisualTimeline();
    syncTimelineToJson();
  }

  // ============================================================================
  // PROPERTIES PANEL - Inline editing for entities and actions
  // ============================================================================

  function selectAction(index) {
    selectedMode = 'action';
    selectedActionIndex = index;
    selectedEntityId = null;
    renderPropertiesPanel();
    updateSelectionHighlights();
    // Update preview to show scene state at this action
    updatePreviewToAction(index);
  }

  function selectEntity(entityId) {
    selectedMode = 'entity';
    selectedEntityId = entityId;
    selectedActionIndex = -1;
    renderPropertiesPanel();
    updateSelectionHighlights();
  }

  function clearSelection() {
    selectedMode = null;
    selectedEntityId = null;
    selectedActionIndex = -1;
    renderPropertiesPanel();
    updateSelectionHighlights();
    // Reset preview to initial entity state (before any timeline actions)
    renderBuilderPreview();
  }

  function updateSelectionHighlights() {
    // Update timeline action highlights
    document.querySelectorAll('.timeline-action-item').forEach(item => {
      const index = parseInt(item.dataset.index);
      item.classList.toggle('selected', selectedMode === 'action' && index === selectedActionIndex);
    });

    // Update entity list highlights
    document.querySelectorAll('.entity-item').forEach(item => {
      item.classList.toggle('selected', selectedMode === 'entity' && item.dataset.id === selectedEntityId);
    });
  }

  function renderPropertiesPanel() {
    const emptyEl = document.getElementById('properties-empty');
    const contentEl = document.getElementById('properties-content');

    if (!emptyEl || !contentEl) return;

    if (!selectedMode) {
      emptyEl.style.display = 'flex';
      contentEl.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    if (selectedMode === 'action') {
      renderActionProperties();
    } else if (selectedMode === 'entity') {
      renderEntityProperties();
    }
  }

  function renderEntityProperties() {
    const contentEl = document.getElementById('properties-content');
    if (!contentEl || !selectedEntityId || !editingScene) return;

    const entity = editingScene.entities?.[selectedEntityId];
    if (!entity) return;

    contentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">🎭</span> ${entity.name || selectedEntityId}</h3>
        <button class="properties-close" id="props-close">×</button>
      </div>
      <div class="properties-content">
        <div class="property-section">
          <div class="property-section-title">Basic</div>
          <div class="property-field">
            <label>Type</label>
            <input type="text" value="${entity.type}" readonly style="opacity: 0.6;">
          </div>
          <div class="property-field">
            <label>Name</label>
            <input type="text" id="prop-entity-name" value="${entity.name || ''}">
          </div>
        </div>
        <div class="property-section">
          <div class="property-section-title">Position</div>
          <div class="property-field-row">
            <div class="property-field">
              <label>X</label>
              <input type="number" id="prop-entity-x" value="${entity.x || 0}">
            </div>
            <div class="property-field">
              <label>Y</label>
              <input type="number" id="prop-entity-y" value="${entity.y || 0}">
            </div>
          </div>
          <div class="property-field">
            <label>Scale</label>
            <input type="number" id="prop-entity-scale" value="${entity.scale || 1}" step="0.1" min="0.1" max="3">
          </div>
        </div>
        ${entity.type === 'stickActor' ? renderActorProperties(entity) : ''}
      </div>
    `;

    // Attach event handlers
    contentEl.querySelector('#props-close')?.addEventListener('click', clearSelection);

    // Auto-save on input change
    contentEl.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('change', () => saveEntityFromProperties());
      input.addEventListener('input', debounce(() => saveEntityFromProperties(), 300));
    });
  }

  function renderActorProperties(entity) {
    const currentHead = entity.head || '🙂';
    const currentPose = entity.pose || 'neutral';

    return `
      <div class="property-section">
        <div class="property-section-title">Appearance</div>
        <div class="property-field">
          <label>Head / Face</label>
          <div class="emoji-grid" id="entity-emoji-grid">
            ${HEAD_EMOJIS.map(emoji => `
              <button class="emoji-option ${emoji === currentHead ? 'selected' : ''}" data-emoji="${emoji}">${emoji}</button>
            `).join('')}
          </div>
          <input type="text" id="prop-entity-head" value="${currentHead}" placeholder="Custom emoji">
        </div>
        <div class="property-field">
          <label>Pose</label>
          <div class="pose-grid" id="entity-pose-grid">
            ${AVAILABLE_POSES.slice(0, 8).map(pose => `
              <button class="pose-option ${pose.name === currentPose ? 'selected' : ''}" data-pose="${pose.name}">
                <span class="pose-option-icon">${pose.icon}</span>
                ${pose.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function saveEntityFromProperties() {
    if (!editingScene || !selectedEntityId) return;

    const entity = editingScene.entities?.[selectedEntityId];
    if (!entity) return;

    // Basic properties
    const name = document.getElementById('prop-entity-name')?.value;
    const x = parseFloat(document.getElementById('prop-entity-x')?.value) || 0;
    const y = parseFloat(document.getElementById('prop-entity-y')?.value) || 0;
    const scale = parseFloat(document.getElementById('prop-entity-scale')?.value) || 1;

    if (name !== undefined) entity.name = name;
    entity.x = x;
    entity.y = y;
    entity.scale = scale;

    // Actor-specific properties
    if (entity.type === 'stickActor') {
      const head = document.getElementById('prop-entity-head')?.value;
      if (head) entity.head = head;
    }

    // Re-render preview
    renderBuilderPreview();
    renderEntityList();
  }

  // Update preview to show scene state at a specific action (instantly, no animation)
  let previewPlayer = null;

  async function updatePreviewToAction(actionIndex) {
    if (!editingScene || actionIndex < 0) return;

    const timeline = editingScene.timeline || [];
    if (actionIndex >= timeline.length) return;

    // Create a scene snapshot with all actions up to this point applied instantly
    const previewScene = JSON.parse(JSON.stringify(editingScene));
    previewScene.timeline = [];

    // Add instant versions of all actions up to and including the target
    for (let i = 0; i <= actionIndex; i++) {
      const action = JSON.parse(JSON.stringify(timeline[i]));
      // Make all actions instant (no animation) - use tiny values, not 0
      if (action.args) {
        if (action.args.duration !== undefined) action.args.duration = 0.001;
        if (action.args.hold !== undefined) action.args.hold = 0.001;
        if (action.args.speedCps !== undefined) action.args.speedCps = 100000; // instant typing
        if (action.args.pause !== undefined) action.args.pause = 0;
      }
      previewScene.timeline.push(action);
    }

    // Get the builder preview container
    const previewContainer = document.getElementById('builder-preview');
    if (!previewContainer) return;

    // Stop any existing preview player
    if (previewPlayer) {
      previewPlayer.stop();
      previewPlayer = null;
    }

    // Clear and create new player
    previewContainer.innerHTML = '';

    const stageWidth = previewScene.stage?.width || 960;
    const stageHeight = previewScene.stage?.height || 540;

    // Create responsive wrapper
    const { wrapper, applyScale } = createResponsiveWrapper(previewContainer, stageWidth, stageHeight);

    // Create player using the correct API
    previewPlayer = StickScenePlayer.create({ mount: wrapper });
    await previewPlayer.load(previewScene);

    // Apply initial scaling
    requestAnimationFrame(applyScale);

    // Play through instantly (durations are near-zero)
    await previewPlayer.play();
  }

  function renderActionProperties() {
    const contentEl = document.getElementById('properties-content');
    if (!contentEl || selectedActionIndex < 0 || !editingScene) return;

    const action = editingScene.timeline?.[selectedActionIndex];
    if (!action) return;

    const actionType = action.do;
    const args = action.args || {};

    contentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">${getActionIcon(actionType)}</span> ${actionType}</h3>
        <button class="properties-close" id="props-close">×</button>
      </div>
      <div class="properties-content">
        <div class="property-section">
          <div class="property-section-title">Action Type</div>
          <div class="property-field">
            <select id="prop-action-type" class="entity-dropdown">
              <optgroup label="Scene Control">
                <option value="fadeIn" ${actionType === 'fadeIn' ? 'selected' : ''}>Fade In</option>
                <option value="fadeOut" ${actionType === 'fadeOut' ? 'selected' : ''}>Fade Out</option>
                <option value="wait" ${actionType === 'wait' ? 'selected' : ''}>Wait</option>
              </optgroup>
              <optgroup label="Actor Actions">
                <option value="moveTo" ${actionType === 'moveTo' ? 'selected' : ''}>Move To</option>
                <option value="setHead" ${actionType === 'setHead' ? 'selected' : ''}>Set Head/Face</option>
                <option value="pose" ${actionType === 'pose' ? 'selected' : ''}>Set Pose</option>
                <option value="bubbleSay" ${actionType === 'bubbleSay' ? 'selected' : ''}>Speech Bubble</option>
              </optgroup>
              <optgroup label="Chat Panel">
                <option value="chatSay" ${actionType === 'chatSay' ? 'selected' : ''}>Chat Message</option>
              </optgroup>
              <optgroup label="Code Editor">
                <option value="typeCode" ${actionType === 'typeCode' ? 'selected' : ''}>Type Code</option>
                <option value="clearCode" ${actionType === 'clearCode' ? 'selected' : ''}>Clear Code</option>
              </optgroup>
              <optgroup label="Whiteboard">
                <option value="writeBoard" ${actionType === 'writeBoard' ? 'selected' : ''}>Write on Board</option>
                <option value="eraseLines" ${actionType === 'eraseLines' ? 'selected' : ''}>Erase Lines</option>
                <option value="crossOut" ${actionType === 'crossOut' ? 'selected' : ''}>Cross Out Text</option>
                <option value="clearBoard" ${actionType === 'clearBoard' ? 'selected' : ''}>Clear Board</option>
              </optgroup>
              <optgroup label="Other">
                <option value="setTitle" ${actionType === 'setTitle' ? 'selected' : ''}>Set Title</option>
              </optgroup>
            </select>
          </div>
          ${renderTargetDropdown(action)}
        </div>
        <div class="property-section" id="action-args-section">
          <div class="property-section-title">Arguments</div>
          ${renderEnhancedActionArgs(actionType, args, action.target)}
        </div>
      </div>
    `;

    // Attach event handlers
    contentEl.querySelector('#props-close')?.addEventListener('click', clearSelection);

    // Action type change
    contentEl.querySelector('#prop-action-type')?.addEventListener('change', (e) => {
      const newType = e.target.value;
      editingScene.timeline[selectedActionIndex].do = newType;
      editingScene.timeline[selectedActionIndex].args = {};
      renderActionProperties();
      renderVisualTimeline();
      syncTimelineToJson();
    });

    // Target change
    contentEl.querySelector('#prop-action-target')?.addEventListener('change', (e) => {
      const newTarget = e.target.value;
      if (newTarget) {
        editingScene.timeline[selectedActionIndex].target = newTarget;
      } else {
        delete editingScene.timeline[selectedActionIndex].target;
      }
      renderVisualTimeline();
      syncTimelineToJson();
    });

    // Wire up all input handlers
    wireUpActionPropertyHandlers(contentEl, actionType);
  }

  function renderTargetDropdown(action) {
    if (!editingScene) return '';

    const actorActions = ['moveTo', 'setHead', 'pose', 'bubbleSay'];
    const chatActions = ['chatSay'];
    const codeActions = ['typeCode', 'clearCode'];
    const boardActions = ['writeBoard', 'eraseLines', 'crossOut', 'clearBoard'];
    const titleActions = ['setTitle'];
    const noTargetActions = ['fadeIn', 'fadeOut', 'wait'];

    const actionType = action.do;

    if (noTargetActions.includes(actionType)) return '';

    let filterFn = () => true;
    if (actorActions.includes(actionType)) filterFn = (e) => e.type === 'stickActor';
    if (chatActions.includes(actionType)) filterFn = (e) => e.type === 'chatPanel';
    if (codeActions.includes(actionType)) filterFn = (e) => e.type === 'codeEditor';
    if (boardActions.includes(actionType)) filterFn = (e) => e.type === 'whiteboard';
    if (titleActions.includes(actionType)) filterFn = (e) => e.type === 'title';

    const entities = Object.entries(editingScene.entities || {}).filter(([id, e]) => filterFn(e));

    return `
      <div class="property-field">
        <label>Target</label>
        <select id="prop-action-target" class="entity-dropdown">
          <option value="">Select target...</option>
          ${entities.map(([id, e]) => `
            <option value="${id}" ${action.target === id ? 'selected' : ''}>${e.name || id}</option>
          `).join('')}
        </select>
      </div>
    `;
  }

  function renderEnhancedActionArgs(actionType, args, target) {
    switch (actionType) {
      case 'pose':
        return renderPoseEditor(args);
      case 'setHead':
        return renderSetHeadEditor(args);
      case 'bubbleSay':
        return renderBubbleSayEditor(args);
      case 'moveTo':
        return renderMoveToEditor(args);
      case 'fadeIn':
      case 'fadeOut':
      case 'wait':
        return renderDurationEditor(args, actionType);
      case 'chatSay':
        return renderChatSayEditor(args);
      case 'typeCode':
      case 'writeBoard':
        return renderTypingEditor(args, actionType);
      case 'eraseLines':
        return renderEraseLinesEditor(args);
      case 'crossOut':
        return renderCrossOutEditor(args);
      case 'setTitle':
        return renderSetTitleEditor(args);
      default:
        return '<p style="color: var(--muted); font-size: 12px;">No additional arguments</p>';
    }
  }

  function renderPoseEditor(args) {
    const currentPose = args.name || 'neutral';
    const duration = args.duration || 0.3;
    const headDirection = args.headDirection || 1;

    return `
      <div class="property-field">
        <label>Pose</label>
        <div class="pose-grid" id="action-pose-grid">
          ${AVAILABLE_POSES.map(pose => `
            <button class="pose-option ${pose.name === currentPose ? 'selected' : ''}" data-pose="${pose.name}">
              <span class="pose-option-icon">${pose.icon}</span>
              ${pose.label}
            </button>
          `).join('')}
        </div>
        <input type="hidden" id="prop-pose-name" value="${currentPose}">
      </div>
      <div class="property-field">
        <label>Head Direction</label>
        <select id="prop-pose-direction" class="entity-dropdown">
          <option value="1" ${headDirection === 1 ? 'selected' : ''}>Right →</option>
          <option value="-1" ${headDirection === -1 ? 'selected' : ''}>← Left</option>
        </select>
      </div>
      <div class="slider-field">
        <label>Duration <span class="slider-value" id="pose-duration-val">${duration}s</span></label>
        <input type="range" class="slider-input" id="prop-pose-duration" min="0.1" max="2" step="0.1" value="${duration}">
        <div class="slider-presets">
          <button class="slider-preset" data-value="0.1">Quick</button>
          <button class="slider-preset" data-value="0.3">Normal</button>
          <button class="slider-preset" data-value="0.5">Slow</button>
          <button class="slider-preset" data-value="1">Dramatic</button>
        </div>
      </div>
    `;
  }

  function renderSetHeadEditor(args) {
    const currentEmoji = args.emoji || '🙂';

    return `
      <div class="property-field">
        <label>Head Emoji</label>
        <div class="emoji-grid" id="action-emoji-grid">
          ${HEAD_EMOJIS.map(emoji => `
            <button class="emoji-option ${emoji === currentEmoji ? 'selected' : ''}" data-emoji="${emoji}">${emoji}</button>
          `).join('')}
        </div>
        <input type="text" id="prop-sethead-emoji" value="${currentEmoji}" placeholder="Or type custom emoji">
      </div>
    `;
  }

  function renderBubbleSayEditor(args) {
    const text = args.text || '';
    const hold = args.hold || 2;
    const autoCalc = !args.hold;

    return `
      <div class="property-field">
        <label>Speech Text</label>
        <textarea id="prop-bubble-text" rows="3" placeholder="What should they say?">${text}</textarea>
        <div class="char-count"><span id="bubble-char-count">${text.length}</span> characters</div>
      </div>
      <div class="auto-calculate-row">
        <input type="checkbox" id="prop-bubble-auto" ${autoCalc ? 'checked' : ''}>
        <label for="prop-bubble-auto">Auto-calculate hold time</label>
      </div>
      <div class="slider-field" id="bubble-hold-slider" ${autoCalc ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
        <label>Hold Duration <span class="slider-value" id="bubble-hold-val">${hold}s</span></label>
        <input type="range" class="slider-input" id="prop-bubble-hold" min="0.5" max="8" step="0.5" value="${hold}">
        <div class="slider-presets">
          <button class="slider-preset" data-value="1">Quick</button>
          <button class="slider-preset" data-value="2">Normal</button>
          <button class="slider-preset" data-value="4">Long</button>
          <button class="slider-preset" data-value="6">Very Long</button>
        </div>
      </div>
    `;
  }

  function renderMoveToEditor(args) {
    const x = args.x || 480;
    const y = args.y || 350;
    const duration = args.duration || 0.5;

    return `
      <div class="position-picker">
        <label>Position</label>
        <div class="position-picker-preview" id="position-picker-preview">
          <div class="position-picker-marker" id="position-marker" style="left: ${(x / 960) * 100}%; top: ${(y / 540) * 100}%;"></div>
        </div>
        <div class="position-presets">
          ${POSITION_PRESETS.map(preset => `
            <button class="position-preset ${x === preset.x && y === preset.y ? 'active' : ''}" data-x="${preset.x}" data-y="${preset.y}">${preset.name}</button>
          `).join('')}
        </div>
      </div>
      <div class="property-field-row">
        <div class="property-field">
          <label>X</label>
          <input type="number" id="prop-move-x" value="${x}" min="0" max="960">
        </div>
        <div class="property-field">
          <label>Y</label>
          <input type="number" id="prop-move-y" value="${y}" min="0" max="540">
        </div>
      </div>
      <div class="slider-field">
        <label>Duration <span class="slider-value" id="move-duration-val">${duration}s</span></label>
        <input type="range" class="slider-input" id="prop-move-duration" min="0.1" max="3" step="0.1" value="${duration}">
      </div>
    `;
  }

  function renderDurationEditor(args, actionType) {
    const duration = args.duration || (actionType === 'wait' ? 1 : 0.5);
    const max = actionType === 'wait' ? 10 : 3;

    const presets = actionType === 'wait'
      ? [{ label: 'Brief', value: 0.5 }, { label: 'Normal', value: 1 }, { label: 'Long', value: 2 }, { label: 'Pause', value: 4 }]
      : [{ label: 'Quick', value: 0.25 }, { label: 'Normal', value: 0.5 }, { label: 'Slow', value: 1 }, { label: 'Dramatic', value: 2 }];

    return `
      <div class="slider-field">
        <label>Duration <span class="slider-value" id="duration-val">${duration}s</span></label>
        <input type="range" class="slider-input" id="prop-duration" min="0.1" max="${max}" step="0.1" value="${duration}">
        <div class="slider-presets">
          ${presets.map(p => `<button class="slider-preset ${duration === p.value ? 'active' : ''}" data-value="${p.value}">${p.label}</button>`).join('')}
        </div>
      </div>
    `;
  }

  function renderChatSayEditor(args) {
    const speaker = args.speaker || '';
    const text = args.text || '';
    const pause = args.pause || 0;

    // Get actor entities for speaker dropdown
    const actors = Object.entries(editingScene?.entities || {})
      .filter(([id, e]) => e.type === 'stickActor')
      .map(([id, e]) => ({ id, name: e.name || id }));

    return `
      <div class="property-field">
        <label>Speaker</label>
        <select id="prop-chat-speaker" class="entity-dropdown">
          <option value="">Custom...</option>
          ${actors.map(a => `<option value="${a.name}" ${speaker === a.name ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
        <input type="text" id="prop-chat-speaker-custom" value="${speaker}" placeholder="Speaker name" style="margin-top: 6px;">
      </div>
      <div class="property-field">
        <label>Message</label>
        <textarea id="prop-chat-text" rows="3">${text}</textarea>
      </div>
      <div class="slider-field">
        <label>Pause After <span class="slider-value" id="chat-pause-val">${pause}s</span></label>
        <input type="range" class="slider-input" id="prop-chat-pause" min="0" max="2" step="0.1" value="${pause}">
      </div>
    `;
  }

  function renderTypingEditor(args, actionType) {
    const text = args.text || '';
    const speedCps = args.speedCps || (actionType === 'typeCode' ? 30 : 12);
    const append = args.append || false;

    return `
      <div class="property-field">
        <label>${actionType === 'typeCode' ? 'Code' : 'Text'}</label>
        <textarea id="prop-typing-text" rows="5" style="font-family: var(--font-mono);">${text}</textarea>
      </div>
      <div class="auto-calculate-row">
        <input type="checkbox" id="prop-typing-append" ${append ? 'checked' : ''}>
        <label for="prop-typing-append">Append to existing content</label>
      </div>
      <div class="slider-field">
        <label>Speed <span class="slider-value" id="speed-val">${speedCps} chars/sec</span></label>
        <input type="range" class="slider-input" id="prop-typing-speed" min="5" max="100" step="5" value="${speedCps}">
        <div class="slider-presets">
          <button class="slider-preset" data-value="10">Slow</button>
          <button class="slider-preset" data-value="18">Normal</button>
          <button class="slider-preset" data-value="30">Fast</button>
          <button class="slider-preset" data-value="100">Instant</button>
        </div>
      </div>
    `;
  }

  function renderEraseLinesEditor(args) {
    const lines = args.lines || 1;
    const speedCps = args.speedCps || 20;

    return `
      <div class="property-field">
        <label>Lines to Erase</label>
        <input type="number" id="prop-erase-lines" value="${lines}" min="1" max="20">
      </div>
      <div class="slider-field">
        <label>Speed <span class="slider-value" id="erase-speed-val">${speedCps} chars/sec</span></label>
        <input type="range" class="slider-input" id="prop-erase-speed" min="5" max="50" step="5" value="${speedCps}">
      </div>
    `;
  }

  function renderCrossOutEditor(args) {
    const text = args.text || '';
    const duration = args.duration || 1;

    return `
      <div class="property-field">
        <label>Text to Cross Out</label>
        <input type="text" id="prop-crossout-text" value="${text}">
      </div>
      <div class="slider-field">
        <label>Duration <span class="slider-value" id="crossout-duration-val">${duration}s</span></label>
        <input type="range" class="slider-input" id="prop-crossout-duration" min="0.25" max="3" step="0.25" value="${duration}">
      </div>
    `;
  }

  function renderSetTitleEditor(args) {
    const text = args.text || '';

    return `
      <div class="property-field">
        <label>Title Text</label>
        <input type="text" id="prop-title-text" value="${text}" style="font-size: 16px; font-weight: 600; text-align: center;">
      </div>
    `;
  }

  function wireUpActionPropertyHandlers(container, actionType) {
    // Pose picker
    container.querySelectorAll('#action-pose-grid .pose-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#action-pose-grid .pose-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('prop-pose-name').value = btn.dataset.pose;
        saveActionFromProperties();
      });
    });

    // Entity pose picker
    container.querySelectorAll('#entity-pose-grid .pose-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#entity-pose-grid .pose-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (editingScene?.entities?.[selectedEntityId]) {
          editingScene.entities[selectedEntityId].pose = btn.dataset.pose;
          renderBuilderPreview();
        }
      });
    });

    // Emoji picker (for setHead)
    container.querySelectorAll('#action-emoji-grid .emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#action-emoji-grid .emoji-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const input = document.getElementById('prop-sethead-emoji');
        if (input) input.value = btn.dataset.emoji;
        saveActionFromProperties();
      });
    });

    // Entity emoji picker
    container.querySelectorAll('#entity-emoji-grid .emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#entity-emoji-grid .emoji-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const input = document.getElementById('prop-entity-head');
        if (input) input.value = btn.dataset.emoji;
        saveEntityFromProperties();
      });
    });

    // Slider value displays
    const sliderMappings = [
      { slider: 'prop-pose-duration', display: 'pose-duration-val', suffix: 's' },
      { slider: 'prop-bubble-hold', display: 'bubble-hold-val', suffix: 's' },
      { slider: 'prop-move-duration', display: 'move-duration-val', suffix: 's' },
      { slider: 'prop-duration', display: 'duration-val', suffix: 's' },
      { slider: 'prop-chat-pause', display: 'chat-pause-val', suffix: 's' },
      { slider: 'prop-typing-speed', display: 'speed-val', suffix: ' chars/sec' },
      { slider: 'prop-erase-speed', display: 'erase-speed-val', suffix: ' chars/sec' },
      { slider: 'prop-crossout-duration', display: 'crossout-duration-val', suffix: 's' }
    ];

    sliderMappings.forEach(({ slider, display, suffix }) => {
      const sliderEl = document.getElementById(slider);
      const displayEl = document.getElementById(display);
      if (sliderEl && displayEl) {
        sliderEl.addEventListener('input', () => {
          displayEl.textContent = sliderEl.value + suffix;
        });
        sliderEl.addEventListener('change', saveActionFromProperties);
      }
    });

    // Slider presets
    container.querySelectorAll('.slider-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const slider = btn.closest('.slider-field')?.querySelector('.slider-input');
        if (slider) {
          slider.value = btn.dataset.value;
          slider.dispatchEvent(new Event('input'));
          slider.dispatchEvent(new Event('change'));
        }
      });
    });

    // Position picker
    const positionPicker = document.getElementById('position-picker-preview');
    if (positionPicker) {
      positionPicker.addEventListener('click', (e) => {
        const rect = positionPicker.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 960);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 540);
        document.getElementById('prop-move-x').value = x;
        document.getElementById('prop-move-y').value = y;
        updatePositionMarker(x, y);
        saveActionFromProperties();
      });
    }

    // Position presets
    container.querySelectorAll('.position-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const x = parseInt(btn.dataset.x);
        const y = parseInt(btn.dataset.y);
        document.getElementById('prop-move-x').value = x;
        document.getElementById('prop-move-y').value = y;
        updatePositionMarker(x, y);
        saveActionFromProperties();
      });
    });

    // Bubble text character count
    const bubbleText = document.getElementById('prop-bubble-text');
    if (bubbleText) {
      bubbleText.addEventListener('input', () => {
        const count = bubbleText.value.length;
        document.getElementById('bubble-char-count').textContent = count;

        // Auto-calculate hold if checked
        const autoCalc = document.getElementById('prop-bubble-auto');
        if (autoCalc?.checked) {
          const hold = Math.min(Math.max(count / 15, 1.5), 4);
          const holdSlider = document.getElementById('prop-bubble-hold');
          if (holdSlider) {
            holdSlider.value = hold;
            document.getElementById('bubble-hold-val').textContent = hold.toFixed(1) + 's';
          }
        }
      });
    }

    // Auto-calculate checkbox
    const autoCalcCheckbox = document.getElementById('prop-bubble-auto');
    if (autoCalcCheckbox) {
      autoCalcCheckbox.addEventListener('change', () => {
        const holdSlider = document.getElementById('bubble-hold-slider');
        if (holdSlider) {
          holdSlider.style.opacity = autoCalcCheckbox.checked ? '0.5' : '1';
          holdSlider.style.pointerEvents = autoCalcCheckbox.checked ? 'none' : 'auto';
        }
        if (autoCalcCheckbox.checked && bubbleText) {
          bubbleText.dispatchEvent(new Event('input'));
        }
      });
    }

    // Chat speaker dropdown
    const speakerDropdown = document.getElementById('prop-chat-speaker');
    if (speakerDropdown) {
      speakerDropdown.addEventListener('change', () => {
        const customInput = document.getElementById('prop-chat-speaker-custom');
        if (customInput && speakerDropdown.value) {
          customInput.value = speakerDropdown.value;
        }
      });
    }

    // Regular input change handlers
    const saveableInputs = [
      'prop-sethead-emoji', 'prop-bubble-text', 'prop-bubble-hold',
      'prop-move-x', 'prop-move-y', 'prop-typing-text', 'prop-typing-append',
      'prop-erase-lines', 'prop-crossout-text', 'prop-title-text',
      'prop-chat-speaker-custom', 'prop-chat-text', 'prop-pose-direction'
    ];

    saveableInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', saveActionFromProperties);
        if (el.tagName === 'TEXTAREA' || el.type === 'text') {
          el.addEventListener('input', debounce(saveActionFromProperties, 300));
        }
      }
    });
  }

  function updatePositionMarker(x, y) {
    const marker = document.getElementById('position-marker');
    if (marker) {
      marker.style.left = `${(x / 960) * 100}%`;
      marker.style.top = `${(y / 540) * 100}%`;
    }

    // Update preset highlighting
    document.querySelectorAll('.position-preset').forEach(btn => {
      const presetX = parseInt(btn.dataset.x);
      const presetY = parseInt(btn.dataset.y);
      btn.classList.toggle('active', x === presetX && y === presetY);
    });
  }

  function saveActionFromProperties() {
    if (!editingScene || selectedActionIndex < 0) return;

    const action = editingScene.timeline[selectedActionIndex];
    if (!action) return;

    const actionType = action.do;
    const args = {};

    switch (actionType) {
      case 'pose':
        args.name = document.getElementById('prop-pose-name')?.value || 'neutral';
        args.duration = parseFloat(document.getElementById('prop-pose-duration')?.value) || 0.3;
        const dir = document.getElementById('prop-pose-direction')?.value;
        if (dir) args.headDirection = parseInt(dir);
        break;

      case 'setHead':
        args.emoji = document.getElementById('prop-sethead-emoji')?.value || '🙂';
        break;

      case 'bubbleSay':
        args.text = document.getElementById('prop-bubble-text')?.value || '';
        const autoCalc = document.getElementById('prop-bubble-auto')?.checked;
        if (autoCalc) {
          args.hold = Math.min(Math.max(args.text.length / 15, 1.5), 4);
        } else {
          args.hold = parseFloat(document.getElementById('prop-bubble-hold')?.value) || 2;
        }
        break;

      case 'moveTo':
        args.x = parseInt(document.getElementById('prop-move-x')?.value) || 480;
        args.y = parseInt(document.getElementById('prop-move-y')?.value) || 350;
        args.duration = parseFloat(document.getElementById('prop-move-duration')?.value) || 0.5;
        break;

      case 'fadeIn':
      case 'fadeOut':
      case 'wait':
        args.duration = parseFloat(document.getElementById('prop-duration')?.value) || 0.5;
        break;

      case 'chatSay':
        args.speaker = document.getElementById('prop-chat-speaker-custom')?.value || '';
        args.text = document.getElementById('prop-chat-text')?.value || '';
        const pause = parseFloat(document.getElementById('prop-chat-pause')?.value);
        if (pause > 0) args.pause = pause;
        break;

      case 'typeCode':
      case 'writeBoard':
        args.text = document.getElementById('prop-typing-text')?.value || '';
        args.speedCps = parseInt(document.getElementById('prop-typing-speed')?.value) || 18;
        if (document.getElementById('prop-typing-append')?.checked) args.append = true;
        break;

      case 'eraseLines':
        args.lines = parseInt(document.getElementById('prop-erase-lines')?.value) || 1;
        args.speedCps = parseInt(document.getElementById('prop-erase-speed')?.value) || 20;
        break;

      case 'crossOut':
        args.text = document.getElementById('prop-crossout-text')?.value || '';
        args.duration = parseFloat(document.getElementById('prop-crossout-duration')?.value) || 1;
        break;

      case 'setTitle':
        args.text = document.getElementById('prop-title-text')?.value || '';
        break;
    }

    action.args = args;
    renderVisualTimeline();
    syncTimelineToJson();
    // Update preview to show the change immediately
    updatePreviewToAction(selectedActionIndex);
  }

  // Utility debounce function
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // ============================================================================
  // SCRIPT BUILDER
  // ============================================================================

  function openScriptBuilder() {
    scriptSequence = [];
    showView('script');
    renderAvailableScenes();
    renderScriptSequence();
  }

  function renderAvailableScenes() {
    const list = document.getElementById('available-scenes-list');
    if (!list) return;

    const scenes = SceneManager.getAllScenes();
    list.innerHTML = scenes.map(scene => `
      <div class="available-scene-item" data-scene-id="${scene.id}" draggable="true">
        <span class="scene-item-icon">🎬</span>
        <span class="scene-item-title">${scene.title || scene.id}</span>
        <button class="scene-item-add">+</button>
      </div>
    `).join('');

    list.querySelectorAll('.available-scene-item').forEach(item => {
      const sceneId = item.dataset.sceneId;

      item.querySelector('.scene-item-add')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addSceneToScript(sceneId);
      });

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', sceneId);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });
  }

  function addSceneToScript(sceneId) {
    const scene = SceneManager.getScene(sceneId);
    if (!scene) return;
    scriptSequence.push({ id: sceneId, title: scene.title || sceneId });
    renderScriptSequence();
  }

  function renderScriptSequence() {
    const container = document.getElementById('script-sequence');
    if (!container) return;

    if (scriptSequence.length === 0) {
      container.innerHTML = '<div class="script-sequence-empty">Drag scenes here to build your script</div>';
      return;
    }

    container.innerHTML = scriptSequence.map((item, index) => `
      <div class="script-scene-item" data-index="${index}" draggable="true">
        <span class="script-scene-order">${index + 1}</span>
        <span class="script-scene-title">${item.title}</span>
        <button class="script-scene-remove">×</button>
      </div>
    `).join('');

    container.querySelectorAll('.script-scene-item').forEach(item => {
      const index = parseInt(item.dataset.index);

      item.querySelector('.script-scene-remove')?.addEventListener('click', (e) => {
        e.stopPropagation();
        scriptSequence.splice(index, 1);
        renderScriptSequence();
      });

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', index.toString());
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    // Drop zone
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      const data = e.dataTransfer.getData('text/plain');
      // Check if it's a scene ID (from available) or index (reorder)
      if (!isNaN(parseInt(data)) && parseInt(data) < scriptSequence.length) {
        // Reorder - not fully implemented
      } else {
        // Add from available
        addSceneToScript(data);
      }
    });
  }

  async function playScript() {
    for (const item of scriptSequence) {
      await playScene(item.id);
      // Wait for scene to finish
      await new Promise(resolve => {
        const checkFinished = setInterval(() => {
          if (!currentPlayer?.isPlaying) {
            clearInterval(checkFinished);
            resolve();
          }
        }, 100);
      });
    }
  }

  function exportScript() {
    const script = {
      title: document.getElementById('script-title-input')?.value || 'Untitled Script',
      scenes: scriptSequence.map(s => s.id)
    };
    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function reorderEntities(fromId, toId) {
    if (!editingScene?.entities) return;
    // Convert to array, reorder, convert back
    const entries = Object.entries(editingScene.entities);
    const fromIdx = entries.findIndex(([id]) => id === fromId);
    const toIdx = entries.findIndex(([id]) => id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = entries.splice(fromIdx, 1);
    entries.splice(toIdx, 0, moved);
    editingScene.entities = Object.fromEntries(entries);
    renderEntityList();
    renderBuilderPreview();
  }

  // Initialize
  function init() {
    console.log('SceneStudio: Initializing...');

    // Scene list actions
    document.getElementById('btn-new-scene')?.addEventListener('click', () => openBuilder());
    document.getElementById('btn-new-script')?.addEventListener('click', () => openScriptBuilder());
    document.getElementById('btn-import-scene')?.addEventListener('click', importScene);

    // Script builder controls
    document.getElementById('btn-script-back')?.addEventListener('click', () => showView('list'));
    document.getElementById('btn-play-script')?.addEventListener('click', playScript);
    document.getElementById('btn-export-script')?.addEventListener('click', exportScript);

    // Entity editor controls
    document.getElementById('entity-editor-close')?.addEventListener('click', closeEntityEditor);
    document.getElementById('entity-editor-cancel')?.addEventListener('click', closeEntityEditor);
    document.getElementById('entity-editor-save')?.addEventListener('click', saveEntityFromEditor);
    document.getElementById('entity-type')?.addEventListener('change', (e) => {
      updateEntityEditorSections(e.target.value);
    });

    // Emoji picker
    document.querySelectorAll('.head-emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.head-emoji-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('entity-head-custom').value = btn.dataset.emoji;
      });
    });

    // Pose presets
    document.querySelectorAll('.pose-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pose-preset').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const customFields = document.getElementById('custom-pose-fields');
        if (customFields) {
          customFields.style.display = btn.dataset.pose === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Action editor controls
    document.getElementById('action-editor-close')?.addEventListener('click', closeActionEditor);
    document.getElementById('action-editor-cancel')?.addEventListener('click', closeActionEditor);
    document.getElementById('action-editor-save')?.addEventListener('click', saveActionFromEditor);
    document.getElementById('action-type')?.addEventListener('change', () => {
      populateActionTargets(); // Re-filter targets based on new action type
      renderActionArgs();
    });
    document.getElementById('btn-add-action')?.addEventListener('click', () => openActionEditor());

    // Timeline mode tabs
    document.querySelectorAll('.timeline-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.timeline-mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        const visual = document.getElementById('visual-timeline');
        const json = document.getElementById('timeline-editor');
        if (mode === 'visual') {
          if (visual) visual.style.display = 'flex';
          if (json) json.style.display = 'none';
          syncJsonToTimeline();
        } else {
          if (visual) visual.style.display = 'none';
          if (json) json.style.display = 'block';
          syncTimelineToJson();
        }
      });
    });

    // Player controls
    document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
      if (currentPlayer) currentPlayer.stop();
      showView('list');
    });

    document.getElementById('btn-player-play')?.addEventListener('click', () => {
      if (currentPlayer && !currentPlayer.isPlaying) currentPlayer.play();
    });

    document.getElementById('btn-player-pause')?.addEventListener('click', () => {
      if (currentPlayer) currentPlayer.pause();
    });

    document.getElementById('btn-player-reset')?.addEventListener('click', () => {
      if (currentPlayer) currentPlayer.reset();
    });

    // Speed control
    document.getElementById('speed-slider')?.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      const speedValueEl = document.getElementById('speed-value');
      if (speedValueEl) speedValueEl.textContent = speed + 'x';
      if (currentPlayer) currentPlayer.setSpeed(speed);
    });

    document.getElementById('btn-player-edit')?.addEventListener('click', () => {
      if (currentScene) openBuilder(currentScene.id);
    });

    // Builder controls
    document.getElementById('btn-builder-back')?.addEventListener('click', () => {
      showView('list');
    });

    document.getElementById('btn-preview-scene')?.addEventListener('click', previewScene);
    document.getElementById('btn-save-scene')?.addEventListener('click', saveScene);
    document.getElementById('btn-add-entity')?.addEventListener('click', addEntity);

    // Builder form changes
    ['stage-width', 'stage-height', 'stage-bg'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (editingScene) {
          editingScene.stage = {
            width: parseInt(document.getElementById('stage-width')?.value) || 960,
            height: parseInt(document.getElementById('stage-height')?.value) || 540,
            background: document.getElementById('stage-bg')?.value || '#f8f9fa'
          };
          renderBuilderPreview();
        }
      });
    });

    // Mode switching
    document.getElementById('btn-legacy-mode')?.addEventListener('click', showLegacyMode);
    document.getElementById('btn-back-to-scenes')?.addEventListener('click', showSceneMode);

    // Adventure controls
    document.getElementById('btn-view-adventures')?.addEventListener('click', showAdventures);
    document.getElementById('btn-back-to-scenes')?.addEventListener('click', () => showView('list'));
    document.getElementById('btn-new-adventure')?.addEventListener('click', () => openAdventureBuilder());
    document.getElementById('btn-adventure-back')?.addEventListener('click', exitAdventure);
    document.getElementById('btn-adventure-restart')?.addEventListener('click', () => {
      if (typeof AdventurePlayer !== 'undefined') AdventurePlayer.restart();
    });
    document.getElementById('btn-adventure-exit')?.addEventListener('click', exitAdventure);
    document.getElementById('btn-adventure-builder-back')?.addEventListener('click', () => showView('adventures'));

    // Keyboard shortcuts for properties panel
    document.addEventListener('keydown', (e) => {
      // Escape to clear selection
      if (e.key === 'Escape') {
        if (selectedMode) {
          clearSelection();
        }
      }

      // Arrow keys to navigate actions when in action selection mode
      if (selectedMode === 'action' && editingScene?.timeline) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const newIndex = Math.min(selectedActionIndex + 1, editingScene.timeline.length - 1);
          selectAction(newIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const newIndex = Math.max(selectedActionIndex - 1, 0);
          selectAction(newIndex);
        }
      }
    });

    // Handle initial route
    const route = RouteManager.current();
    if (route.path === '/legacy' || route.path.startsWith('/legacy')) {
      showLegacyMode();
    } else if (route.path.startsWith('/scene/') && route.sceneId) {
      playScene(route.sceneId);
    } else if (route.path === '/builder') {
      openBuilder(route.params?.id);
    } else if (route.path === '/adventures') {
      showAdventures();
    } else if (route.path.startsWith('/adventure/') && route.adventureId) {
      playAdventure(route.adventureId);
    } else if (route.path.startsWith('/adventure-builder')) {
      openAdventureBuilder(route.adventureId);
    } else {
      showSceneMode();
    }

    // Render initial list
    renderSceneList();

    console.log('SceneStudio: Ready');
  }

  // ========================================================================
  // ADVENTURE FUNCTIONS
  // ========================================================================

  function showAdventures() {
    showView('adventures');
    renderAdventureList();
  }

  function renderAdventureList() {
    const grid = document.getElementById('adventure-grid');
    if (!grid) return;

    if (typeof AdventureManager === 'undefined') {
      grid.innerHTML = '<div class="adventure-empty"><p>AdventureManager not loaded</p></div>';
      return;
    }

    const adventures = AdventureManager.getAllAdventures();

    if (adventures.length === 0) {
      grid.innerHTML = `
        <div class="adventure-empty">
          <div class="adventure-empty-icon">🎮</div>
          <h3>No Adventures Yet</h3>
          <p>Create your first choose-your-own-adventure experience</p>
          <button class="scene-action-btn" onclick="SceneStudio.openAdventureBuilder()">+ Create Adventure</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = adventures.map(adv => `
      <div class="adventure-card" data-adventure-id="${adv.id}">
        <div class="adventure-card-icon">🎮</div>
        <div class="adventure-card-title">${adv.title || adv.id}</div>
        <div class="adventure-card-description">${adv.description || 'No description'}</div>
        <div class="adventure-card-meta">
          <span>${Object.keys(adv.nodes || {}).length} nodes</span>
        </div>
        <div class="adventure-card-actions">
          <button class="adventure-card-btn play">▶ Play</button>
          <button class="adventure-card-btn edit">Edit</button>
          <button class="adventure-card-btn delete">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    grid.querySelectorAll('.adventure-card').forEach(card => {
      const advId = card.dataset.adventureId;

      card.querySelector('.play')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playAdventure(advId);
      });

      card.querySelector('.edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdventureBuilder(advId);
      });

      card.querySelector('.delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAdventure(advId);
      });

      card.addEventListener('click', () => playAdventure(advId));
    });
  }

  async function playAdventure(adventureId) {
    showView('adventure-player');
    RouteManager.navigate('adventure-player', { id: adventureId });

    if (typeof AdventurePlayer !== 'undefined') {
      AdventurePlayer.init();
      await AdventurePlayer.play(adventureId);
    }
  }

  function exitAdventure() {
    if (typeof AdventurePlayer !== 'undefined') {
      AdventurePlayer.stop();
    }
    showAdventures();
  }

  function openAdventureBuilder(adventureId) {
    console.log('openAdventureBuilder called with:', adventureId);
    const viewEl = document.getElementById('adventure-tree-editor-view');
    console.log('Tree editor view element:', viewEl);

    showView('adventure-tree-editor');

    if (adventureId) {
      RouteManager.navigate('adventure-builder', { id: adventureId });
    } else {
      RouteManager.navigate('adventure-builder');
    }
    // Use the new tree editor
    if (typeof AdventureTreeEditor !== 'undefined') {
      console.log('Initializing AdventureTreeEditor');
      AdventureTreeEditor.init();
      AdventureTreeEditor.loadAdventure(adventureId);
    } else {
      console.error('AdventureTreeEditor is not defined');
    }
  }

  function renderAdventureBuilder(adventureId) {
    // Populate available scenes
    const scenesEl = document.getElementById('adventure-available-scenes');
    if (scenesEl) {
      const scenes = SceneManager.getAllScenes();
      scenesEl.innerHTML = scenes.map(s => `
        <div class="adventure-scene-item" data-scene-id="${s.id}">
          ${s.title || s.id}
        </div>
      `).join('');
    }

    // Load adventure if editing
    let adventure;
    if (adventureId && typeof AdventureManager !== 'undefined') {
      adventure = AdventureManager.getAdventure(adventureId);
    }

    if (adventure) {
      document.getElementById('adventure-title-input').value = adventure.title || '';
      renderAdventureNodes(adventure);
    } else {
      document.getElementById('adventure-title-input').value = '';
      document.getElementById('adventure-nodes-list').innerHTML =
        '<p class="properties-empty">Add nodes to build your adventure</p>';
    }
  }

  function renderAdventureNodes(adventure) {
    const nodesEl = document.getElementById('adventure-nodes-list');
    if (!nodesEl || !adventure?.nodes) return;

    const nodeEntries = Object.entries(adventure.nodes);
    if (nodeEntries.length === 0) {
      nodesEl.innerHTML = '<p class="properties-empty">No nodes yet</p>';
      return;
    }

    nodesEl.innerHTML = nodeEntries.map(([id, node]) => `
      <div class="adventure-node-item ${node.type}" data-node-id="${id}">
        <span class="node-type-badge">${node.type}</span>
        <div class="node-title">${id}${id === adventure.startNode ? ' (start)' : ''}</div>
      </div>
    `).join('');
  }

  async function deleteAdventure(adventureId) {
    if (!confirm('Delete this adventure?')) return;

    if (typeof AdventureManager !== 'undefined') {
      await AdventureManager.removeAdventure(adventureId);
      renderAdventureList();
    }
  }

  return {
    init,
    showView,
    renderSceneList,
    playScene,
    openBuilder,
    saveScene,
    previewScene,
    deleteScene,
    addEntity,
    importScene,
    showLegacyMode,
    showSceneMode,
    openEntityEditor,
    openScriptBuilder,
    playScript,
    // Adventure functions
    showAdventures,
    renderAdventureList,
    playAdventure,
    exitAdventure,
    openAdventureBuilder,
    deleteAdventure,

    get currentScene() { return currentScene; },
    get currentPlayer() { return currentPlayer; },
    get editingScene() { return editingScene; }
  };
})();
