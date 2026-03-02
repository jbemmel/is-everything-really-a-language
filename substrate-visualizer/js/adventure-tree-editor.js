/* ============================================================================
   ADVENTURE TREE EDITOR
   Tree-based visual editor for adventure DAGs

   Adventure format (nested scenes):
   {
     "name": "Adventure Name",
     "scenes": [
       { "sceneRef": "scene-id", "type": "scene" },
       { "type": "choice", "prompt": "What next?",
         "choices": [
           { "name": "Option A", "scenes": [...] },
           { "name": "Option B", "scenes": [...] }
         ]
       },
       { "type": "end", "summary": "The end" }
     ]
   }
   ============================================================================ */

const AdventureTreeEditor = (() => {
  // State
  let currentAdventure = null;
  let selectedPath = null;  // Path like [0, "choices", 1, "scenes", 0] to locate item
  let collapsedPaths = new Set();  // Paths that are collapsed (default: expanded)
  let previewPlayer = null;
  let previewPath = null;
  let initialized = false;

  // DOM references
  let treeEl = null;
  let propsContentEl = null;
  let propsEmptyEl = null;
  let previewStageEl = null;
  let breadcrumbEl = null;
  let speedSliderEl = null;
  let speedValueEl = null;
  let scenesSectionEl = null;
  let scenesListEl = null;
  let scenesCountEl = null;

  // Speed state
  let currentSpeed = 1;

  // Scenes section state
  let scenesCollapsed = false;

  // Debounce helper
  function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    // Re-cache DOM references (in case they were re-rendered)
    treeEl = document.getElementById('adventure-tree');
    propsContentEl = document.getElementById('tree-props-content');
    propsEmptyEl = document.getElementById('tree-props-empty');
    previewStageEl = document.getElementById('adventure-preview-stage');
    breadcrumbEl = document.getElementById('preview-breadcrumb');
    speedSliderEl = document.getElementById('adventure-speed-slider');
    speedValueEl = document.getElementById('adventure-speed-value');
    scenesSectionEl = document.getElementById('scenes-section-toggle');
    scenesListEl = document.getElementById('adventure-scenes-list');
    scenesCountEl = document.getElementById('adventure-scenes-count');

    // Only setup event listeners once
    if (!initialized) {
      setupEventListeners();
      initialized = true;
      console.log('AdventureTreeEditor: Initialized');
    }
  }

  function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('btn-add-tree-scene')?.addEventListener('click', () => addNode('scene'));
    document.getElementById('btn-add-tree-choice')?.addEventListener('click', () => addNode('choice'));
    document.getElementById('btn-add-tree-end')?.addEventListener('click', () => addNode('end'));

    // Preview controls
    document.getElementById('btn-preview-play')?.addEventListener('click', playPreview);
    document.getElementById('btn-preview-pause')?.addEventListener('click', pausePreview);
    document.getElementById('btn-preview-reset')?.addEventListener('click', resetPreview);
    document.getElementById('btn-preview-prev')?.addEventListener('click', previewPrev);
    document.getElementById('btn-preview-next')?.addEventListener('click', previewNext);

    // Speed control
    speedSliderEl?.addEventListener('input', (e) => {
      currentSpeed = parseFloat(e.target.value);
      if (speedValueEl) speedValueEl.textContent = currentSpeed + 'x';
      if (previewPlayer) previewPlayer.setSpeed(currentSpeed);
    });

    // Save/Test/Publish/Download MP4/Back
    document.getElementById('btn-save-tree-adventure')?.addEventListener('click', saveAdventure);
    document.getElementById('btn-test-adventure')?.addEventListener('click', testAdventure);
    document.getElementById('btn-publish-adventure')?.addEventListener('click', publishAdventure);
    document.getElementById('btn-download-mp4')?.addEventListener('click', downloadMP4);
    document.getElementById('btn-tree-editor-back')?.addEventListener('click', closeEditor);

    // Scenes section toggle
    document.getElementById('scenes-section-toggle')?.addEventListener('click', toggleScenesSection);
    document.getElementById('btn-create-adventure-scene')?.addEventListener('click', createNewAdventureScene);
  }

  // ============================================================================
  // PATH UTILITIES
  // ============================================================================

  function pathToString(path) {
    return JSON.stringify(path);
  }

  function getItemAtPath(adventure, path) {
    if (!adventure || !path || path.length === 0) return adventure;
    let current = adventure.scenes;
    for (let i = 0; i < path.length; i++) {
      if (current === undefined) return undefined;
      current = current[path[i]];
    }
    return current;
  }

  // ============================================================================
  // TREE RENDERING (NEW NESTED FORMAT)
  // ============================================================================

  function renderTree() {
    console.log('renderTree called. treeEl:', treeEl, 'currentAdventure:', currentAdventure?.name);
    if (!treeEl || !currentAdventure) {
      console.warn('renderTree: missing treeEl or currentAdventure');
      return;
    }

    if (!currentAdventure.scenes || currentAdventure.scenes.length === 0) {
      treeEl.innerHTML = '<div class="tree-empty">No scenes yet. Add a scene to get started.</div>';
      return;
    }

    let html = `<div class="tree-root" data-path="[]">`;
    html += renderScenesArray(currentAdventure.scenes, [], 0);
    html += `</div>`;

    treeEl.innerHTML = html;
    attachTreeEventHandlers();
    console.log('renderTree complete');
  }

  function renderScenesArray(scenes, parentPath, depth) {
    let html = '';
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const path = [...parentPath, i];
      html += renderSceneNode(scene, path, depth);
    }
    return html;
  }

  function renderSceneNode(scene, path, depth) {
    const pathStr = pathToString(path);
    const isCollapsed = collapsedPaths.has(pathStr);
    const isSelected = selectedPath && pathToString(selectedPath) === pathStr;

    // Handle string references (scene ID only)
    if (typeof scene === 'string') {
      return `
        <div class="tree-node scene-ref" data-path='${pathStr}' data-depth="${depth}">
          <div class="tree-node-row ${isSelected ? 'selected' : ''}">
            <span class="tree-indent" style="width: ${depth * 20}px"></span>
            <span class="tree-toggle-spacer"></span>
            <span class="tree-node-icon">📄</span>
            <span class="tree-node-label">${getSceneLabel(scene)}</span>
          </div>
        </div>
      `;
    }

    const type = scene.type || 'scene';
    const icon = getTypeIcon(type);
    const label = getNodeLabelNew(scene, type);

    // Determine if this node has children
    let hasChildren = false;
    if (type === 'choice' && scene.choices && scene.choices.length > 0) {
      hasChildren = true;
    }

    let html = `
      <div class="tree-node ${type}" data-path='${pathStr}' data-depth="${depth}">
        <div class="tree-node-row ${isSelected ? 'selected' : ''}">
          <span class="tree-indent" style="width: ${depth * 20}px"></span>
          ${hasChildren
            ? `<span class="tree-toggle ${isCollapsed ? '' : 'expanded'}">▶</span>`
            : '<span class="tree-toggle-spacer"></span>'}
          <span class="tree-node-icon">${icon}</span>
          <span class="tree-node-label">${label}</span>
        </div>
    `;

    // Render children for choices
    if (hasChildren && !isCollapsed) {
      html += `<div class="tree-children expanded">`;
      for (let i = 0; i < scene.choices.length; i++) {
        const choice = scene.choices[i];
        const choicePath = [...path, 'choices', i];
        html += renderChoiceBranch(choice, choicePath, depth + 1);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  function renderChoiceBranch(choice, path, depth) {
    const pathStr = pathToString(path);
    const isCollapsed = collapsedPaths.has(pathStr);
    const isSelected = selectedPath && pathToString(selectedPath) === pathStr;
    const hasChildren = choice.scenes && choice.scenes.length > 0;

    let html = `
      <div class="tree-node choice-branch" data-path='${pathStr}' data-depth="${depth}">
        <div class="tree-node-row ${isSelected ? 'selected' : ''}">
          <span class="tree-indent" style="width: ${depth * 20}px"></span>
          ${hasChildren
            ? `<span class="tree-toggle ${isCollapsed ? '' : 'expanded'}">▶</span>`
            : '<span class="tree-toggle-spacer"></span>'}
          <span class="tree-node-icon">↳</span>
          <span class="tree-node-label">[${choice.name || 'Unnamed Choice'}]</span>
        </div>
    `;

    if (hasChildren && !isCollapsed) {
      html += `<div class="tree-children expanded">`;
      for (let i = 0; i < choice.scenes.length; i++) {
        const scene = choice.scenes[i];
        const scenePath = [...path, 'scenes', i];
        html += renderSceneNode(scene, scenePath, depth + 1);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  function getTypeIcon(type) {
    const icons = {
      scene: '📄',
      choice: '🔀',
      end: '🏁'
    };
    return icons[type] || '❓';
  }

  function getSceneLabel(sceneId) {
    if (typeof SceneManager !== 'undefined') {
      // Try adventure context first, then global
      const adventureId = currentAdventure?.id;
      const scene = adventureId
        ? SceneManager.getAdventureSceneSync(adventureId, sceneId)
        : SceneManager.getScene(sceneId);
      if (scene) return scene.title || sceneId;
    }
    return sceneId;
  }

  function getNodeLabelNew(scene, type) {
    if (type === 'scene') {
      const sceneId = scene.sceneRef || scene.sceneId || '';
      return getSceneLabel(sceneId) || 'Untitled Scene';
    }
    if (type === 'choice') {
      const prompt = scene.prompt || '';
      return prompt.length > 30 ? prompt.substring(0, 30) + '...' : (prompt || 'Choice');
    }
    if (type === 'end') {
      const summary = scene.summary || '';
      return 'End: ' + (summary.length > 25 ? summary.substring(0, 25) + '...' : (summary || 'Complete'));
    }
    return 'Unknown';
  }

  // ============================================================================
  // LEGACY FORMAT CONVERSION
  // ============================================================================

  function convertLegacyToNested(adventure) {
    if (!adventure.nodes) return adventure;  // Already new format
    if (adventure.scenes) return adventure;  // Already has scenes

    console.log('Converting legacy adventure format to nested scenes...');

    const newAdventure = {
      id: adventure.id,
      name: adventure.title || adventure.id,
      description: adventure.description || '',
      version: adventure.version || 1,
      author: adventure.author || '',
      scenes: []
    };

    const visited = new Set();

    function convertNode(nodeId) {
      if (!nodeId || visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = adventure.nodes[nodeId];
      if (!node) return null;

      if (node.type === 'scene') {
        const sceneObj = {
          type: 'scene',
          sceneRef: node.sceneId || ''
        };
        const result = [sceneObj];
        if (node.next) {
          const nextItems = convertNode(node.next);
          if (nextItems) result.push(...nextItems);
        }
        return result;
      }

      if (node.type === 'choice') {
        const choiceObj = {
          type: 'choice',
          prompt: node.prompt || '',
          choices: (node.options || []).map(opt => ({
            name: opt.label || '',
            description: opt.description || '',
            icon: opt.icon || '',
            scenes: convertNode(opt.next) || []
          }))
        };
        return [choiceObj];
      }

      if (node.type === 'end') {
        return [{
          type: 'end',
          title: node.title || '',
          summary: node.summary || '',
          score: node.score,
          lessons: node.lessons
        }];
      }

      return null;
    }

    newAdventure.scenes = convertNode(adventure.startNode) || [];
    return newAdventure;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function attachTreeEventHandlers() {
    if (!treeEl) return;

    // Node selection (using path)
    treeEl.querySelectorAll('.tree-node-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-toggle')) return;
        const nodeEl = row.closest('.tree-node');
        const pathStr = nodeEl.dataset.path;
        if (pathStr) {
          const path = JSON.parse(pathStr);
          selectByPath(path);
        }
      });
    });

    // Toggle expand/collapse (using path)
    treeEl.querySelectorAll('.tree-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeEl = toggle.closest('.tree-node');
        const pathStr = nodeEl.dataset.path;
        if (pathStr) {
          toggleCollapse(pathStr);
        }
      });
    });
  }

  function selectByPath(path) {
    selectedPath = path;
    renderTree();
    renderProperties();
    previewByPath(path);
  }

  function clearSelection() {
    selectedPath = null;
    renderTree();
    showPropertiesEmpty();
  }

  function toggleCollapse(pathStr) {
    if (collapsedPaths.has(pathStr)) {
      collapsedPaths.delete(pathStr);
    } else {
      collapsedPaths.add(pathStr);
    }
    renderTree();
  }

  // ============================================================================
  // PROPERTIES PANEL (NEW PATH-BASED)
  // ============================================================================

  function showPropertiesEmpty() {
    if (propsEmptyEl) propsEmptyEl.style.display = 'flex';
    if (propsContentEl) propsContentEl.style.display = 'none';
  }

  function renderProperties() {
    if (!selectedPath || !currentAdventure) {
      showPropertiesEmpty();
      return;
    }

    const item = getItemAtPath(currentAdventure, selectedPath);
    if (!item) {
      showPropertiesEmpty();
      return;
    }

    if (propsEmptyEl) propsEmptyEl.style.display = 'none';
    if (propsContentEl) propsContentEl.style.display = 'block';

    // String reference (just a sceneRef)
    if (typeof item === 'string') {
      renderSceneRefProperties(item);
      return;
    }

    // Check if this is a choice branch (has 'name' and 'scenes')
    if (item.name !== undefined && item.scenes !== undefined) {
      renderChoiceBranchProperties(item);
      return;
    }

    const type = item.type || 'scene';
    switch (type) {
      case 'scene':
        renderSceneProperties(item);
        break;
      case 'choice':
        renderChoiceProperties(item);
        break;
      case 'end':
        renderEndProperties(item);
        break;
      default:
        showPropertiesEmpty();
    }
  }

  function renderSceneRefProperties(sceneId) {
    const scenes = getAvailableScenesForDropdown();

    propsContentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">📄</span> Scene Reference</h3>
        <button class="properties-close" id="props-close-tree">&times;</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Scene</div>
        <div class="property-field">
          <label>Scene ID</label>
          <select id="prop-scene-select">
            <option value="">-- Select Scene --</option>
            ${scenes.length > 0 && scenes.some(s => s.isAdventureScene) ? '<optgroup label="Adventure Scenes">' : ''}
            ${scenes.filter(s => s.isAdventureScene).map(s => `
              <option value="${s.id}" ${s.id === sceneId ? 'selected' : ''}>${s.title || s.id}</option>
            `).join('')}
            ${scenes.length > 0 && scenes.some(s => s.isAdventureScene) ? '</optgroup>' : ''}
            ${scenes.some(s => !s.isAdventureScene) ? '<optgroup label="Built-in Scenes">' : ''}
            ${scenes.filter(s => !s.isAdventureScene).map(s => `
              <option value="${s.id}" ${s.id === sceneId ? 'selected' : ''}>${s.title || s.id}</option>
            `).join('')}
            ${scenes.some(s => !s.isAdventureScene) ? '</optgroup>' : ''}
          </select>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Reorder</div>
        <div class="move-buttons">
          <button class="tree-action-btn" id="btn-move-up" ${canMoveUp(selectedPath) ? '' : 'disabled'}>↑ Move Up</button>
          <button class="tree-action-btn" id="btn-move-down" ${canMoveDown(selectedPath) ? '' : 'disabled'}>↓ Move Down</button>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Actions</div>
        <button class="tree-action-btn primary" id="btn-play-from-here">▶ Preview</button>
        <button class="tree-action-btn" id="btn-edit-scene">✏️ Edit Scene</button>
        <button class="tree-action-btn danger" id="btn-delete-item">Delete</button>
      </div>
    `;

    propsContentEl.querySelector('#props-close-tree')?.addEventListener('click', clearSelection);
    propsContentEl.querySelector('#prop-scene-select')?.addEventListener('change', (e) => {
      updateItemAtPath(selectedPath, e.target.value);
      renderTree();
      previewByPath(selectedPath);
    });
    propsContentEl.querySelector('#btn-move-up')?.addEventListener('click', () => moveItemUp(selectedPath));
    propsContentEl.querySelector('#btn-move-down')?.addEventListener('click', () => moveItemDown(selectedPath));
    propsContentEl.querySelector('#btn-play-from-here')?.addEventListener('click', () => previewByPath(selectedPath));
    propsContentEl.querySelector('#btn-edit-scene')?.addEventListener('click', () => {
      if (sceneId) editAdventureScene(sceneId);
    });
    propsContentEl.querySelector('#btn-delete-item')?.addEventListener('click', () => deleteAtPath(selectedPath));
  }

  function renderSceneProperties(scene) {
    const scenes = getAvailableScenesForDropdown();
    const currentSceneId = scene.sceneRef || scene.sceneId || '';

    propsContentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">📄</span> Scene</h3>
        <button class="properties-close" id="props-close-tree">&times;</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Scene</div>
        <div class="property-field">
          <label>Select Scene</label>
          <select id="prop-scene-select">
            <option value="">-- Select Scene --</option>
            ${scenes.length > 0 && scenes.some(s => s.isAdventureScene) ? '<optgroup label="Adventure Scenes">' : ''}
            ${scenes.filter(s => s.isAdventureScene).map(s => `
              <option value="${s.id}" ${s.id === currentSceneId ? 'selected' : ''}>${s.title || s.id}</option>
            `).join('')}
            ${scenes.length > 0 && scenes.some(s => s.isAdventureScene) ? '</optgroup>' : ''}
            ${scenes.some(s => !s.isAdventureScene) ? '<optgroup label="Built-in Scenes">' : ''}
            ${scenes.filter(s => !s.isAdventureScene).map(s => `
              <option value="${s.id}" ${s.id === currentSceneId ? 'selected' : ''}>${s.title || s.id}</option>
            `).join('')}
            ${scenes.some(s => !s.isAdventureScene) ? '</optgroup>' : ''}
          </select>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Reorder</div>
        <div class="move-buttons">
          <button class="tree-action-btn" id="btn-move-up" ${canMoveUp(selectedPath) ? '' : 'disabled'}>↑ Move Up</button>
          <button class="tree-action-btn" id="btn-move-down" ${canMoveDown(selectedPath) ? '' : 'disabled'}>↓ Move Down</button>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Actions</div>
        <button class="tree-action-btn primary" id="btn-play-from-here">▶ Preview</button>
        <button class="tree-action-btn" id="btn-edit-scene">✏️ Edit Scene</button>
        <button class="tree-action-btn danger" id="btn-delete-item">Delete</button>
      </div>
    `;

    propsContentEl.querySelector('#props-close-tree')?.addEventListener('click', clearSelection);
    propsContentEl.querySelector('#prop-scene-select')?.addEventListener('change', (e) => {
      scene.sceneRef = e.target.value;
      renderTree();
      previewByPath(selectedPath);
    });
    propsContentEl.querySelector('#btn-move-up')?.addEventListener('click', () => moveItemUp(selectedPath));
    propsContentEl.querySelector('#btn-move-down')?.addEventListener('click', () => moveItemDown(selectedPath));
    propsContentEl.querySelector('#btn-play-from-here')?.addEventListener('click', () => previewByPath(selectedPath));
    propsContentEl.querySelector('#btn-edit-scene')?.addEventListener('click', () => {
      if (currentSceneId) editAdventureScene(currentSceneId);
    });
    propsContentEl.querySelector('#btn-delete-item')?.addEventListener('click', () => deleteAtPath(selectedPath));
  }

  function renderChoiceProperties(choice) {
    const choicesList = choice.choices || [];

    propsContentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">🔀</span> Choice</h3>
        <button class="properties-close" id="props-close-tree">&times;</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Prompt</div>
        <div class="property-field">
          <label>Question</label>
          <textarea id="prop-choice-prompt" rows="3">${choice.prompt || ''}</textarea>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Choices (${choicesList.length})</div>
        <div class="choices-list">
          ${choicesList.map((c, i) => `
            <div class="choice-item">
              <span class="choice-name">${c.name || 'Unnamed'}</span>
              <span class="choice-scenes-count">${(c.scenes || []).length} scenes</span>
            </div>
          `).join('')}
        </div>
        <button class="add-option-btn" id="btn-add-choice">+ Add Choice</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Reorder</div>
        <div class="move-buttons">
          <button class="tree-action-btn" id="btn-move-up" ${canMoveUp(selectedPath) ? '' : 'disabled'}>↑ Move Up</button>
          <button class="tree-action-btn" id="btn-move-down" ${canMoveDown(selectedPath) ? '' : 'disabled'}>↓ Move Down</button>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Actions</div>
        <button class="tree-action-btn danger" id="btn-delete-item">Delete</button>
      </div>
    `;

    propsContentEl.querySelector('#props-close-tree')?.addEventListener('click', clearSelection);
    propsContentEl.querySelector('#prop-choice-prompt')?.addEventListener('input', debounce((e) => {
      choice.prompt = e.target.value;
      renderTree();
    }, 300));
    propsContentEl.querySelector('#btn-add-choice')?.addEventListener('click', () => {
      if (!choice.choices) choice.choices = [];
      choice.choices.push({ name: `Choice ${choice.choices.length + 1}`, scenes: [] });
      renderTree();
      renderProperties();
    });
    propsContentEl.querySelector('#btn-move-up')?.addEventListener('click', () => moveItemUp(selectedPath));
    propsContentEl.querySelector('#btn-move-down')?.addEventListener('click', () => moveItemDown(selectedPath));
    propsContentEl.querySelector('#btn-delete-item')?.addEventListener('click', () => deleteAtPath(selectedPath));
  }

  function renderChoiceBranchProperties(branch) {
    propsContentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">↳</span> Choice Branch</h3>
        <button class="properties-close" id="props-close-tree">&times;</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Branch</div>
        <div class="property-field">
          <label>Name</label>
          <input type="text" id="prop-branch-name" value="${branch.name || ''}">
        </div>
        <div class="property-field">
          <label>Description</label>
          <input type="text" id="prop-branch-desc" value="${branch.description || ''}">
        </div>
        <div class="property-field">
          <label>Icon</label>
          <input type="text" id="prop-branch-icon" value="${branch.icon || ''}" placeholder="emoji">
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Scenes in Branch</div>
        <p style="color: var(--muted); font-size: 13px;">
          ${(branch.scenes || []).length} scene(s) in this branch
        </p>
        <button class="tree-action-btn" id="btn-add-scene-to-branch">+ Add Scene</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">Reorder</div>
        <div class="move-buttons">
          <button class="tree-action-btn" id="btn-move-up" ${canMoveUp(selectedPath) ? '' : 'disabled'}>↑ Move Up</button>
          <button class="tree-action-btn" id="btn-move-down" ${canMoveDown(selectedPath) ? '' : 'disabled'}>↓ Move Down</button>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Actions</div>
        <button class="tree-action-btn danger" id="btn-delete-item">Delete Branch</button>
      </div>
    `;

    propsContentEl.querySelector('#props-close-tree')?.addEventListener('click', clearSelection);
    propsContentEl.querySelector('#prop-branch-name')?.addEventListener('input', debounce((e) => {
      branch.name = e.target.value;
      renderTree();
    }, 300));
    propsContentEl.querySelector('#prop-branch-desc')?.addEventListener('input', debounce((e) => {
      branch.description = e.target.value;
    }, 300));
    propsContentEl.querySelector('#prop-branch-icon')?.addEventListener('input', debounce((e) => {
      branch.icon = e.target.value;
    }, 300));
    propsContentEl.querySelector('#btn-add-scene-to-branch')?.addEventListener('click', () => {
      if (!branch.scenes) branch.scenes = [];
      branch.scenes.push({ type: 'scene', sceneRef: '' });
      renderTree();
      renderProperties();
    });
    propsContentEl.querySelector('#btn-move-up')?.addEventListener('click', () => moveItemUp(selectedPath));
    propsContentEl.querySelector('#btn-move-down')?.addEventListener('click', () => moveItemDown(selectedPath));
    propsContentEl.querySelector('#btn-delete-item')?.addEventListener('click', () => deleteAtPath(selectedPath));
  }

  function renderEndProperties(endNode) {
    propsContentEl.innerHTML = `
      <div class="properties-header">
        <h3><span class="properties-header-icon">🏁</span> End</h3>
        <button class="properties-close" id="props-close-tree">&times;</button>
      </div>
      <div class="property-section">
        <div class="property-section-title">End Details</div>
        <div class="property-field">
          <label>Title</label>
          <input type="text" id="prop-end-title" value="${endNode.title || ''}">
        </div>
        <div class="property-field">
          <label>Summary</label>
          <textarea id="prop-end-summary" rows="4">${endNode.summary || ''}</textarea>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Reorder</div>
        <div class="move-buttons">
          <button class="tree-action-btn" id="btn-move-up" ${canMoveUp(selectedPath) ? '' : 'disabled'}>↑ Move Up</button>
          <button class="tree-action-btn" id="btn-move-down" ${canMoveDown(selectedPath) ? '' : 'disabled'}>↓ Move Down</button>
        </div>
      </div>
      <div class="property-section">
        <div class="property-section-title">Actions</div>
        <button class="tree-action-btn danger" id="btn-delete-item">Delete</button>
      </div>
    `;

    propsContentEl.querySelector('#props-close-tree')?.addEventListener('click', clearSelection);
    propsContentEl.querySelector('#prop-end-title')?.addEventListener('input', debounce((e) => {
      endNode.title = e.target.value;
      renderTree();
    }, 300));
    propsContentEl.querySelector('#prop-end-summary')?.addEventListener('input', debounce((e) => {
      endNode.summary = e.target.value;
      renderTree();
    }, 300));
    propsContentEl.querySelector('#btn-move-up')?.addEventListener('click', () => moveItemUp(selectedPath));
    propsContentEl.querySelector('#btn-move-down')?.addEventListener('click', () => moveItemDown(selectedPath));
    propsContentEl.querySelector('#btn-delete-item')?.addEventListener('click', () => deleteAtPath(selectedPath));
  }

  // ============================================================================
  // PATH-BASED OPERATIONS
  // ============================================================================

  function updateItemAtPath(path, newValue) {
    if (!path || path.length === 0) return;

    let parent = currentAdventure;
    let key = 'scenes';

    // Navigate to parent
    for (let i = 0; i < path.length - 1; i++) {
      if (key === 'scenes' || key === 'choices') {
        parent = parent[key];
      }
      parent = parent[path[i]];
      if (i < path.length - 2) {
        key = path[i + 1];
      }
    }

    const lastKey = path[path.length - 1];
    if (parent.scenes) {
      parent.scenes[lastKey] = newValue;
    } else if (Array.isArray(parent)) {
      parent[lastKey] = newValue;
    }
  }

  function deleteAtPath(path) {
    if (!path || path.length === 0) return;

    // Find the parent array and index
    let parent = currentAdventure.scenes;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (typeof segment === 'number') {
        parent = parent[segment];
      } else {
        parent = parent[segment];
      }
    }

    const lastKey = path[path.length - 1];
    if (Array.isArray(parent) && typeof lastKey === 'number') {
      parent.splice(lastKey, 1);
    }

    selectedPath = null;
    renderTree();
    showPropertiesEmpty();
  }

  // Get the parent array and index for a path
  function getParentArrayAndIndex(path) {
    if (!path || path.length === 0) return null;

    let parent = currentAdventure.scenes;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      parent = parent[segment];
      if (parent === undefined) return null;
    }

    const lastKey = path[path.length - 1];
    if (Array.isArray(parent) && typeof lastKey === 'number') {
      return { array: parent, index: lastKey };
    }
    return null;
  }

  function canMoveUp(path) {
    const result = getParentArrayAndIndex(path);
    return result && result.index > 0;
  }

  function canMoveDown(path) {
    const result = getParentArrayAndIndex(path);
    return result && result.index < result.array.length - 1;
  }

  function moveItemUp(path) {
    const result = getParentArrayAndIndex(path);
    if (!result || result.index <= 0) return;

    const { array, index } = result;
    // Swap with previous item
    [array[index - 1], array[index]] = [array[index], array[index - 1]];

    // Update selected path to follow the moved item
    const newPath = [...path];
    newPath[newPath.length - 1] = index - 1;
    selectedPath = newPath;

    renderTree();
    renderProperties();
  }

  function moveItemDown(path) {
    const result = getParentArrayAndIndex(path);
    if (!result || result.index >= result.array.length - 1) return;

    const { array, index } = result;
    // Swap with next item
    [array[index], array[index + 1]] = [array[index + 1], array[index]];

    // Update selected path to follow the moved item
    const newPath = [...path];
    newPath[newPath.length - 1] = index + 1;
    selectedPath = newPath;

    renderTree();
    renderProperties();
  }

  // ============================================================================
  // PREVIEW PLAYER
  // ============================================================================

  function previewByPath(path) {
    if (!path || !currentAdventure) return;

    const item = getItemAtPath(currentAdventure, path);
    if (!item) return;

    previewPath = path;
    updateBreadcrumb();

    // String reference
    if (typeof item === 'string') {
      playScenePreview(item);
      return;
    }

    // Scene object
    if (item.type === 'scene') {
      const sceneId = item.sceneRef || item.sceneId || '';
      if (sceneId) {
        playScenePreview(sceneId);
      } else {
        showEmptyPreview('No scene selected');
      }
      return;
    }

    // Choice
    if (item.type === 'choice') {
      showChoicePreview(item);
      return;
    }

    // End
    if (item.type === 'end') {
      showEndPreview(item);
      return;
    }

    // Choice branch
    if (item.name !== undefined && item.scenes !== undefined) {
      showBranchPreview(item);
    }
  }

  function showEmptyPreview(message) {
    if (!previewStageEl) return;
    previewStageEl.innerHTML = `<div style="color: var(--muted); text-align: center; padding: 40px;">${message}</div>`;
  }

  function showBranchPreview(branch) {
    if (!previewStageEl) return;
    previewStageEl.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 32px; margin-bottom: 16px;">${branch.icon || '↳'}</div>
        <div style="font-size: 18px; font-weight: 600; color: var(--text);">${branch.name || 'Choice Branch'}</div>
        <div style="color: var(--muted); margin-top: 8px;">${branch.description || ''}</div>
        <div style="color: var(--muted); margin-top: 16px;">${(branch.scenes || []).length} scene(s)</div>
      </div>
    `;
  }

  async function playScenePreview(sceneId) {
    if (typeof SceneManager === 'undefined' || !previewStageEl) return;

    // Look for scene in adventure context first, then global
    const adventureId = currentAdventure?.id;
    const scene = adventureId
      ? SceneManager.getAdventureSceneSync(adventureId, sceneId)
      : SceneManager.getScene(sceneId);

    if (!scene) {
      previewStageEl.innerHTML = `<div style="color: var(--muted);">Scene "${sceneId}" not found</div>`;
      return;
    }

    if (previewPlayer) {
      previewPlayer.destroy();
    }

    previewStageEl.innerHTML = '';

    if (typeof StickScenePlayer !== 'undefined') {
      previewPlayer = StickScenePlayer.create({ mount: previewStageEl });
      previewPlayer.setSpeed(currentSpeed);
      await previewPlayer.load(scene);
      // Don't auto-play, let user click play button
    }
  }

  function showChoicePreview(choice) {
    if (!previewStageEl) return;

    const choices = choice.choices || [];
    previewStageEl.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 18px; margin-bottom: 24px; color: var(--text);">${choice.prompt || 'Choose an option'}</div>
        <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px; margin: 0 auto;">
          ${choices.map(c => `
            <div style="padding: 12px 16px; background: var(--panel2); border: 1px solid var(--stroke); border-radius: 8px; cursor: default;">
              <span style="margin-right: 8px;">${c.icon || ''}</span>
              <span>${c.name || 'Choice'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function showEndPreview(node) {
    if (!previewStageEl) return;

    previewStageEl.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">&#127881;</div>
        <div style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: var(--text);">Adventure Complete</div>
        <div style="color: var(--muted);">${node.summary || ''}</div>
      </div>
    `;
  }

  function playPreview() {
    if (previewPlayer && typeof previewPlayer.play === 'function') {
      previewPlayer.setSpeed(currentSpeed);
      previewPlayer.play();
    }
  }

  function pausePreview() {
    if (previewPlayer) {
      if (previewPlayer.isPaused) {
        previewPlayer.resume();
      } else {
        previewPlayer.pause();
      }
    }
  }

  function resetPreview() {
    if (previewPlayer) {
      previewPlayer.reset();
    }
  }

  function previewPrev() {
    // Navigate to previous item in path
    if (!previewPath || previewPath.length === 0) return;

    // Go to parent path
    if (previewPath.length > 1) {
      const parentPath = previewPath.slice(0, -1);
      // Skip 'scenes' or 'choices' segments
      if (typeof parentPath[parentPath.length - 1] === 'string') {
        parentPath.pop();
      }
      if (parentPath.length > 0) {
        selectByPath(parentPath);
      }
    }
  }

  function previewNext() {
    if (!previewPath || !currentAdventure) return;

    const item = getItemAtPath(currentAdventure, previewPath);
    if (!item) return;

    // If it's a scene in an array, go to next sibling
    const lastIdx = previewPath[previewPath.length - 1];
    if (typeof lastIdx === 'number') {
      const parentPath = previewPath.slice(0, -1);
      const parent = parentPath.length === 0 ? currentAdventure.scenes : getItemAtPath(currentAdventure, parentPath);
      if (Array.isArray(parent) && lastIdx + 1 < parent.length) {
        selectByPath([...parentPath, lastIdx + 1]);
        return;
      }
    }

    // If it's a choice, go to first choice branch
    if (item.type === 'choice' && item.choices && item.choices.length > 0) {
      selectByPath([...previewPath, 'choices', 0]);
    }
  }

  function updateBreadcrumb() {
    if (!breadcrumbEl || !currentAdventure || !previewPath) {
      if (breadcrumbEl) breadcrumbEl.innerHTML = '';
      return;
    }

    // Build breadcrumb from path
    const crumbs = [];
    let current = currentAdventure.scenes;
    for (let i = 0; i < previewPath.length; i++) {
      const segment = previewPath[i];
      if (typeof segment === 'number' && Array.isArray(current)) {
        const item = current[segment];
        if (item) {
          let label = '';
          if (typeof item === 'string') {
            label = getSceneLabel(item);
          } else if (item.type === 'scene') {
            label = getSceneLabel(item.sceneRef || item.sceneId || '');
          } else if (item.type === 'choice') {
            label = 'Choice';
          } else if (item.type === 'end') {
            label = 'End';
          } else if (item.name) {
            label = item.name;
          }
          if (label) crumbs.push(label);
        }
        current = item;
      } else if (segment === 'scenes' && current) {
        current = current.scenes;
      } else if (segment === 'choices' && current) {
        current = current.choices;
      }
    }

    breadcrumbEl.innerHTML = crumbs.map(c => `<span>${c}</span>`).join('<span class="separator">→</span>');
  }

  // ============================================================================
  // NODE CRUD OPERATIONS (NEW NESTED FORMAT)
  // ============================================================================

  function addNode(type) {
    console.log('addNode called:', type);

    if (!currentAdventure) {
      console.error('addNode: No adventure loaded!');
      return;
    }

    if (!currentAdventure.scenes) {
      currentAdventure.scenes = [];
    }

    const newItem = createDefaultItem(type);

    // Determine where to insert
    if (selectedPath && selectedPath.length > 0) {
      // Insert after selected item
      const parentPath = selectedPath.slice(0, -1);
      const idx = selectedPath[selectedPath.length - 1];

      if (typeof idx === 'number') {
        // Find the parent array
        let parent = currentAdventure.scenes;
        for (let i = 0; i < parentPath.length; i++) {
          const seg = parentPath[i];
          if (typeof seg === 'number') {
            parent = parent[seg];
          } else {
            parent = parent[seg];
          }
        }

        if (Array.isArray(parent)) {
          parent.splice(idx + 1, 0, newItem);
          selectByPath([...parentPath, idx + 1]);
          renderTree();
          return;
        }
      }
    }

    // Default: append to top-level scenes
    currentAdventure.scenes.push(newItem);
    selectByPath([currentAdventure.scenes.length - 1]);
    renderTree();
  }

  function createDefaultItem(type) {
    switch (type) {
      case 'scene':
        return { type: 'scene', sceneRef: '' };
      case 'choice':
        return {
          type: 'choice',
          prompt: 'What do you want to do?',
          choices: [
            { name: 'Option A', icon: '🅰️', scenes: [] },
            { name: 'Option B', icon: '🅱️', scenes: [] }
          ]
        };
      case 'end':
        return { type: 'end', title: 'The End', summary: 'Adventure complete!' };
      default:
        return { type: 'scene', sceneRef: '' };
    }
  }

  // ============================================================================
  // ADVENTURE SCENES MANAGEMENT
  // ============================================================================

  function toggleScenesSection() {
    scenesCollapsed = !scenesCollapsed;
    const header = document.getElementById('scenes-section-toggle');
    const content = document.getElementById('adventure-scenes-list');

    if (scenesCollapsed) {
      header?.classList.add('collapsed');
      content?.classList.add('collapsed');
    } else {
      header?.classList.remove('collapsed');
      content?.classList.remove('collapsed');
    }
  }

  async function loadAdventureScenes() {
    if (!currentAdventure) return;

    // Load scenes from adventure folder
    await SceneManager.loadAdventureScenes(currentAdventure.id);
    renderAdventureScenes();
  }

  function renderAdventureScenes() {
    if (!scenesListEl || !currentAdventure) return;

    const adventureId = currentAdventure.id;
    const scenes = SceneManager.getAdventureScenes(adventureId);

    // Update count
    if (scenesCountEl) {
      scenesCountEl.textContent = scenes.length;
    }

    if (scenes.length === 0) {
      scenesListEl.innerHTML = '<div class="scenes-empty">No scenes yet. Create one to get started.</div>';
      return;
    }

    scenesListEl.innerHTML = scenes.map(scene => `
      <div class="adventure-scene-item" data-scene-id="${scene.id}">
        <span class="scene-icon">📄</span>
        <span class="scene-title">${scene.title || scene.id}</span>
        <div class="scene-actions">
          <button class="scene-action-btn" data-action="edit" title="Edit scene">✏️</button>
          <button class="scene-action-btn" data-action="preview" title="Preview">▶</button>
          <button class="scene-action-btn danger" data-action="delete" title="Delete">🗑</button>
        </div>
      </div>
    `).join('');

    // Attach event handlers
    scenesListEl.querySelectorAll('.adventure-scene-item').forEach(item => {
      const sceneId = item.dataset.sceneId;

      item.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        editAdventureScene(sceneId);
      });

      item.querySelector('[data-action="preview"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        previewAdventureScene(sceneId);
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAdventureScene(sceneId);
      });

      // Click to select/preview
      item.addEventListener('click', () => previewAdventureScene(sceneId));
    });
  }

  async function createNewAdventureScene() {
    if (!currentAdventure) return;

    const scene = SceneManager.createEmptyScene(currentAdventure.id);
    scene.title = `Scene ${SceneManager.getAdventureScenes(currentAdventure.id).length + 1}`;

    await SceneManager.saveAdventureScene(currentAdventure.id, scene.id, scene);
    renderAdventureScenes();

    // Open scene editor
    editAdventureScene(scene.id);
  }

  function editAdventureScene(sceneId) {
    if (!currentAdventure) return;

    const adventureId = currentAdventure.id;
    const scene = SceneManager.getAdventureSceneSync(adventureId, sceneId);

    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    // Open the scene in the builder
    if (typeof SceneStudio !== 'undefined') {
      // Store context so we can return to the adventure editor
      sessionStorage.setItem('returnToAdventure', adventureId);
      sessionStorage.setItem('editingAdventureScene', JSON.stringify({ adventureId, sceneId }));

      // Navigate to scene builder with the scene loaded
      SceneStudio.openBuilder(scene);
    }
  }

  function previewAdventureScene(sceneId) {
    if (!currentAdventure) return;

    const scene = SceneManager.getAdventureSceneSync(currentAdventure.id, sceneId);
    if (!scene) {
      showEmptyPreview(`Scene "${sceneId}" not found`);
      return;
    }

    // Highlight the scene in the list
    scenesListEl?.querySelectorAll('.adventure-scene-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.sceneId === sceneId);
    });

    // Play preview
    playScenePreviewDirect(scene);
  }

  async function playScenePreviewDirect(scene) {
    if (!previewStageEl) return;

    if (previewPlayer) {
      previewPlayer.destroy();
    }

    previewStageEl.innerHTML = '';

    if (typeof StickScenePlayer !== 'undefined') {
      previewPlayer = StickScenePlayer.create({ mount: previewStageEl });
      previewPlayer.setSpeed(currentSpeed);
      await previewPlayer.load(scene);
    }
  }

  async function deleteAdventureScene(sceneId) {
    if (!currentAdventure) return;

    if (!confirm(`Delete scene "${sceneId}"? This cannot be undone.`)) return;

    await SceneManager.deleteAdventureScene(currentAdventure.id, sceneId);
    renderAdventureScenes();
  }

  // Get scenes for dropdown (adventure scenes first, then global)
  function getAvailableScenesForDropdown() {
    const adventureScenes = currentAdventure
      ? SceneManager.getAdventureScenes(currentAdventure.id)
      : [];
    const globalScenes = SceneManager.getAllScenes();

    // Combine with adventure scenes first
    const combined = [];
    const seenIds = new Set();

    // Add adventure scenes first with a group label
    for (const scene of adventureScenes) {
      combined.push({ ...scene, isAdventureScene: true });
      seenIds.add(scene.id);
    }

    // Add global scenes (built-in) that aren't duplicates
    for (const scene of globalScenes) {
      if (!seenIds.has(scene.id)) {
        combined.push({ ...scene, isAdventureScene: false });
      }
    }

    return combined;
  }

  // ============================================================================
  // SAVE / LOAD / TEST
  // ============================================================================

  async function loadAdventure(adventureId) {
    console.log('loadAdventure called with:', adventureId);

    if (typeof AdventureManager === 'undefined') {
      console.error('AdventureManager not available');
      return;
    }

    if (adventureId) {
      let adventure = AdventureManager.getAdventure(adventureId);
      console.log('Got adventure from manager:', adventure?.id);

      if (adventure) {
        // Convert legacy format if needed
        currentAdventure = convertLegacyToNested(adventure);
        console.log('Converted adventure:', currentAdventure.name);
      } else {
        console.log('Adventure not found, creating empty one');
        currentAdventure = createEmptyNestedAdventure(adventureId);
      }
    } else {
      console.log('No adventureId, creating empty adventure');
      currentAdventure = createEmptyNestedAdventure();
    }

    console.log('currentAdventure set:', currentAdventure?.name, 'scenes:', currentAdventure?.scenes?.length);

    const titleEl = document.getElementById('tree-adventure-title');
    if (titleEl) titleEl.value = currentAdventure.name || currentAdventure.title || '';

    // Start fully expanded (no collapsed paths)
    collapsedPaths.clear();

    selectedPath = null;
    renderTree();
    showPropertiesEmpty();

    // Load adventure-scoped scenes
    await loadAdventureScenes();
  }

  function createEmptyNestedAdventure(id) {
    return {
      id: id || `adventure-${Date.now()}`,
      name: 'New Adventure',
      description: '',
      version: 1,
      scenes: []
    };
  }

  async function saveAdventure() {
    if (!currentAdventure) return;

    const titleEl = document.getElementById('tree-adventure-title');
    currentAdventure.name = titleEl?.value || 'Untitled Adventure';
    currentAdventure.title = currentAdventure.name; // Keep both for compatibility

    if (typeof AdventureManager !== 'undefined') {
      AdventureManager.registerAdventure(currentAdventure);
      await AdventureManager.saveAdventureToDisk(currentAdventure.id);
      alert('Adventure saved!');
    }
  }

  function testAdventure() {
    if (!currentAdventure) return;

    // Save first, then play
    saveAdventure().then(() => {
      if (typeof SceneStudio !== 'undefined') {
        SceneStudio.playAdventure(currentAdventure.id);
      }
    });
  }

  async function publishAdventure() {
    if (!currentAdventure) return;

    // Save first to ensure latest changes are captured
    await saveAdventure();

    // Publish using AdventurePublisher - download to browser AND save to server
    if (typeof AdventurePublisher !== 'undefined') {
      const success = await AdventurePublisher.publish(currentAdventure.id, {
        download: true,
        saveToServer: true
      });
      if (success) {
        alert(`Published "${currentAdventure.name}"!\n\nThe HTML file has been downloaded to your computer.`);
      } else {
        alert('Failed to publish adventure. Check the console for details.');
      }
    } else {
      alert('AdventurePublisher module not loaded.');
    }
  }

  async function downloadMP4() {
    if (!currentAdventure) return;

    const btn = document.getElementById('btn-download-mp4');
    const originalText = btn?.textContent;

    try {
      if (btn) {
        btn.textContent = '⏳ Publishing...';
        btn.disabled = true;
      }

      // Save adventure first
      await saveAdventure();

      // Publish to server only (no browser download) - required for video recording
      if (typeof AdventurePublisher !== 'undefined') {
        const success = await AdventurePublisher.publish(currentAdventure.id, {
          download: false,      // Don't download HTML to browser
          saveToServer: true    // Save to server for recording
        });
        if (!success) {
          alert('Failed to publish adventure to server. Cannot record video.');
          return;
        }
      }

      if (btn) {
        btn.textContent = '⏳ Recording...';
      }

      // Request video recording from server (duration auto-calculated from adventure)
      const response = await fetch(`/api/record-video/${encodeURIComponent(currentAdventure.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record video');
      }

      // Get the video blob and trigger download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${currentAdventure.id}.webm`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Video downloaded: ${filename}`);
    } catch (err) {
      console.error('Video recording failed:', err);
      alert(`Video recording failed: ${err.message}`);
    } finally {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  }

  function closeEditor() {
    if (previewPlayer) {
      previewPlayer.destroy();
      previewPlayer = null;
    }

    if (typeof SceneStudio !== 'undefined') {
      SceneStudio.showAdventures();
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    init,
    loadAdventure,
    renderTree,
    selectByPath,
    addNode,
    saveAdventure,

    get currentAdventure() { return currentAdventure; },
    get selectedPath() { return selectedPath; }
  };
})();
