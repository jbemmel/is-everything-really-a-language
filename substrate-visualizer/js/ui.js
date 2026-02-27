/* ============================================================================
   UI: Initialize substrate grid (if present)
   ============================================================================ */

function initSubstratesGrid() {
  const grid = document.getElementById('substrates-grid');
  if (!grid) return;

  const selected = Store.get('tech.substrates');

  grid.innerHTML = SUBSTRATES.map(s => `
    <label class="substrate-checkbox">
      <input type="checkbox" data-substrate="${s.id}" ${selected.has(s.id) ? 'checked' : ''}>
      ${s.name}
    </label>
  `).join('');

  grid.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
      const substrates = Store.get('tech.substrates');
      if (e.target.checked) {
        substrates.add(e.target.dataset.substrate);
      } else {
        substrates.delete(e.target.dataset.substrate);
      }
      Store.set('tech.substrates', substrates);
    });
  });
}


/* ============================================================================
   UI: Wire up controls (legacy mode)
   ============================================================================ */

function initControls() {
  // Mode selector
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      Store.set('mode', mode);
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateImplementationEngine();
    });
  });

  // Speed selector
  const speedSelect = document.getElementById('speed-select');
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      Store.set('speed', parseFloat(e.target.value));
    });
  }

  // Playback controls
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      const playing = Store.get('playing');
      const playIcon = document.getElementById('play-icon');
      if (playing) {
        StageController.pause();
        if (playIcon) playIcon.innerHTML = '&#9654;';
      } else {
        StageController.play();
        if (playIcon) playIcon.innerHTML = '&#10074;&#10074;';
      }
    });
  }

  const btnStep = document.getElementById('btn-step');
  if (btnStep) {
    btnStep.addEventListener('click', () => {
      StageController.step();
    });
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      StageController.reset();
      Store.resetCounters();
      updateCounters();
    });
  }

  // Tab navigation (legacy tabs)
  document.querySelectorAll('#tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = btn.dataset.stage;
      RouteManager.navigate('legacy', { stage });
      StageController.enter(stage);
    });
  });
}


/* ============================================================================
   UI: Update functions (all null-safe for scene mode)
   ============================================================================ */

function updateCounters() {
  const counters = Store.get('counters');
  const el1 = document.getElementById('counter-renegotiations');
  const el2 = document.getElementById('counter-reimplementations');
  const el3 = document.getElementById('counter-drift');
  const el4 = document.getElementById('counter-runtime');

  if (el1) el1.textContent = counters.renegotiations;
  if (el2) el2.textContent = counters.manualReimplementations;
  if (el3) el3.textContent = counters.driftEvents;
  if (el4) el4.textContent = (counters.runtimeMs / 1000).toFixed(1) + 's';
}

function updateRuleCard() {
  const format = Store.get('rule.nameFormat');
  const codeEl = document.getElementById('rule-code');
  const exampleEl = document.getElementById('rule-example');

  if (!codeEl || !exampleEl) return;

  if (format === 'firstLast') {
    codeEl.textContent = 'full_name = "First Last"';
    exampleEl.textContent = 'John Doe -> John Doe';
  } else {
    codeEl.textContent = 'full_name = "Last, First"';
    exampleEl.textContent = 'John Doe -> Doe, John';
  }
}

function updateSsotDisplay() {
  const ssot = Store.get('ssot');
  const iconEl = document.getElementById('ssot-icon');
  const nameEl = document.getElementById('ssot-name');

  if (!iconEl || !nameEl) return;

  const icons = {
    airtable: '&#128202;',
    excel: '&#128200;',
    notion: '&#128196;'
  };

  const names = {
    airtable: 'Airtable',
    excel: 'Excel',
    notion: 'Notion'
  };

  iconEl.innerHTML = icons[ssot] || icons.airtable;
  nameEl.textContent = names[ssot] || 'Airtable';
}

function updateImplementationEngine() {
  const mode = Store.get('mode');
  const hasCLI = Store.get('tech.hasEffortlessCLI');

  const labelEl = document.getElementById('engine-label');
  const sublabelEl = document.getElementById('engine-sublabel');

  if (!labelEl || !sublabelEl) return;

  if (mode === 'ssotme' && hasCLI) {
    labelEl.textContent = 'Effortless CLI';
    sublabelEl.textContent = 'Deterministic generator';
  } else if (mode === 'ssotme' && !hasCLI) {
    labelEl.textContent = 'Human + LLM (fallback)';
    sublabelEl.textContent = 'No CLI available - falling back';
  } else {
    labelEl.textContent = 'Human + LLM';
    sublabelEl.textContent = 'Chat-gated implementation';
  }
}

function initTestSubstrates() {
  const substrates = Store.get('tech.substrates');
  const traditionalEl = document.getElementById('traditional-substrates');
  const ssotmeEl = document.getElementById('ssotme-substrates');

  if (!traditionalEl || !ssotmeEl) return;

  const html = [...substrates].map(id => {
    const s = SUBSTRATES.find(x => x.id === id);
    return `
      <div class="test-substrate-row" data-substrate="${id}">
        <span class="test-substrate-name">${s?.name || id}</span>
        <span class="test-substrate-score">--</span>
        <div class="test-substrate-bar">
          <div class="test-substrate-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    `;
  }).join('');

  traditionalEl.innerHTML = html;
  ssotmeEl.innerHTML = html;
}
