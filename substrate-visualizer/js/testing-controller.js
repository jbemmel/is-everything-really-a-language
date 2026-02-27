/* ============================================================================
   TESTING STAGE: Render & Control
   Handles side-by-side scoring and delta overlay
   ============================================================================ */

const TestingController = (() => {
  // Track state
  let traditionalScores = {};
  let ssotmeScores = {};
  let isRunning = false;

  // Get score class based on percentage
  function getScoreClass(score) {
    if (score >= 95) return 'score-high';
    if (score >= 80) return 'score-mid';
    return 'score-low';
  }

  // Render test substrate rows for both columns
  function renderTestRows() {
    const substrates = Store.get('tech.substrates');
    const traditionalEl = document.getElementById('traditional-substrates');
    const ssotmeEl = document.getElementById('ssotme-substrates');

    const html = [...substrates].map(id => {
      const s = SUBSTRATES.find(x => x.id === id);
      return `
        <div class="test-substrate-row pending" data-substrate="${id}">
          <span class="test-substrate-name">${s?.name || id}</span>
          <span class="test-substrate-score">--</span>
          <div class="test-substrate-bar">
            <div class="test-substrate-bar-fill" style="width: 0%"></div>
          </div>
          <span class="delta-indicator"></span>
        </div>
      `;
    }).join('');

    traditionalEl.innerHTML = html;
    ssotmeEl.innerHTML = html;

    // Reset scores display
    document.getElementById('traditional-score').textContent = '--';
    document.getElementById('ssotme-score').textContent = '--';

    // Reset delta overlay
    document.getElementById('test-delta-overlay').classList.remove('visible');

    // Reset fork animation
    resetForkAnimation();

    // Reset column states
    document.querySelectorAll('.test-column').forEach(col => {
      col.classList.remove('running', 'complete');
    });
  }

  // Reset fork animation elements
  function resetForkAnimation() {
    const origin = document.getElementById('test-fork-origin');
    const leftLine = document.getElementById('test-fork-left');
    const rightLine = document.getElementById('test-fork-right');

    origin.classList.remove('visible');
    leftLine.classList.remove('active');
    rightLine.classList.remove('active');
    leftLine.style.animation = 'none';
    rightLine.style.animation = 'none';
  }

  // Show test fork animation
  function showForkAnimation() {
    const origin = document.getElementById('test-fork-origin');
    const leftLine = document.getElementById('test-fork-left');
    const rightLine = document.getElementById('test-fork-right');

    // Show origin
    origin.classList.add('visible');

    // Trigger fork lines after small delay
    setTimeout(() => {
      leftLine.style.animation = '';
      rightLine.style.animation = '';
      leftLine.classList.add('active');
      rightLine.classList.add('active');
    }, 300);
  }

  // Update a single substrate row
  function updateSubstrateRow(column, substrateId, score, showDelta = false) {
    const columnEl = document.getElementById(`${column}-substrates`);
    const row = columnEl.querySelector(`[data-substrate="${substrateId}"]`);
    if (!row) return;

    const scoreEl = row.querySelector('.test-substrate-score');
    const barFill = row.querySelector('.test-substrate-bar-fill');
    const scoreClass = getScoreClass(score);

    // Update row state
    row.classList.remove('pending', 'running');
    row.classList.add('complete');

    // Check for drift
    const hasDrift = score < 100 && column === 'traditional';
    if (hasDrift) {
      row.classList.add('drift');
    }

    // Update score display
    scoreEl.textContent = score.toFixed(1) + '%';
    scoreEl.className = 'test-substrate-score ' + scoreClass;

    // Update bar
    barFill.style.width = score + '%';
    barFill.className = 'test-substrate-bar-fill ' + scoreClass;

    // Show delta indicator if Effortless column and we have Traditional score
    if (showDelta && column === 'ssotme' && traditionalScores[substrateId] !== undefined) {
      const delta = score - traditionalScores[substrateId];
      const deltaEl = row.querySelector('.delta-indicator');

      if (delta > 0.1) {
        deltaEl.textContent = '↑ +' + delta.toFixed(1);
        deltaEl.className = 'delta-indicator visible improved';
      } else if (delta < -0.1) {
        deltaEl.textContent = '↓ ' + delta.toFixed(1);
        deltaEl.className = 'delta-indicator visible regressed';
      } else {
        deltaEl.textContent = '=';
        deltaEl.className = 'delta-indicator visible same';
      }
    }
  }

  // Set row to running state
  function setRowRunning(column, substrateId) {
    const columnEl = document.getElementById(`${column}-substrates`);
    const row = columnEl.querySelector(`[data-substrate="${substrateId}"]`);
    if (!row) return;

    row.classList.remove('pending');
    row.classList.add('running');
  }

  // Update column total score
  function updateColumnScore(column, score) {
    const scoreEl = document.getElementById(`${column}-score`);
    const scoreClass = getScoreClass(score);
    scoreEl.textContent = score.toFixed(1) + '%';
    scoreEl.style.color = `var(--${scoreClass === 'score-high' ? 'accent2' : scoreClass === 'score-mid' ? 'warning' : 'error'})`;
  }

  // Show delta overlay
  function showDeltaOverlay() {
    const substrates = Store.get('tech.substrates');

    // Calculate averages
    let tradTotal = 0, ssotmeTotal = 0;
    for (const id of substrates) {
      tradTotal += traditionalScores[id] || 0;
      ssotmeTotal += ssotmeScores[id] || 0;
    }

    const tradAvg = tradTotal / substrates.size;
    const ssotmeAvg = ssotmeTotal / substrates.size;
    const delta = ssotmeAvg - tradAvg;

    // Update overlay
    const overlay = document.getElementById('test-delta-overlay');
    const valueEl = document.getElementById('test-delta-percent');
    const arrowEl = overlay.querySelector('.test-delta-arrow');

    if (delta > 0) {
      valueEl.textContent = '+' + delta.toFixed(1) + '%';
      arrowEl.textContent = '↑';
      overlay.querySelector('.test-delta-value').classList.remove('negative');
    } else if (delta < 0) {
      valueEl.textContent = delta.toFixed(1) + '%';
      arrowEl.textContent = '↓';
      overlay.querySelector('.test-delta-value').classList.add('negative');
    } else {
      valueEl.textContent = '0%';
      arrowEl.textContent = '=';
      overlay.querySelector('.test-delta-value').classList.remove('negative');
    }

    overlay.classList.add('visible');
  }

  // Build timeline beats for Traditional column
  function buildTraditionalBeats() {
    const substrates = [...Store.get('tech.substrates')];
    const beats = [];

    // Column start
    beats.push({
      id: 'trad-column-start',
      duration: 300,
      onStart: () => {
        console.log('Testing Traditional column');
        document.querySelector('.test-column.traditional').classList.add('running');
      }
    });

    // Each substrate
    substrates.forEach((subId, index) => {
      const substrate = SUBSTRATES.find(x => x.id === subId);
      const score = TestFixtures.getScore(subId, 'traditional');
      const runtime = TestFixtures.getRuntime(subId, 'traditional');

      // Start testing
      beats.push({
        id: `trad-test-${subId}-start`,
        duration: 200,
        onStart: () => {
          setRowRunning('traditional', subId);
        }
      });

      // Complete testing
      beats.push({
        id: `trad-test-${subId}-complete`,
        duration: runtime,
        onStart: () => {
          console.log(`Traditional: Testing ${substrate?.name || subId} - ${score}%`);
        },
        onComplete: () => {
          traditionalScores[subId] = score;
          updateSubstrateRow('traditional', subId, score, false);
        }
      });
    });

    // Column complete
    beats.push({
      id: 'trad-column-complete',
      duration: 500,
      onStart: () => {
        document.querySelector('.test-column.traditional').classList.remove('running');
        document.querySelector('.test-column.traditional').classList.add('complete');

        // Calculate and show total score
        const totalScore = TestFixtures.getAverageScore('traditional', Store.get('tech.substrates'));
        updateColumnScore('traditional', totalScore);

        console.log('Traditional column complete - Average:', totalScore.toFixed(1) + '%');
      }
    });

    return beats;
  }

  // Build timeline beats for Effortless column
  function buildSsotmeBeats() {
    const substrates = [...Store.get('tech.substrates')];
    const beats = [];

    // Column start
    beats.push({
      id: 'ssotme-column-start',
      duration: 300,
      onStart: () => {
        console.log('Testing Effortless column');
        document.querySelector('.test-column.ssotme').classList.add('running');
      }
    });

    // Each substrate (faster than Traditional)
    substrates.forEach((subId, index) => {
      const substrate = SUBSTRATES.find(x => x.id === subId);
      const score = TestFixtures.getScore(subId, 'ssotme');
      const runtime = TestFixtures.getRuntime(subId, 'ssotme');

      // Start testing
      beats.push({
        id: `ssotme-test-${subId}-start`,
        duration: 150,
        onStart: () => {
          setRowRunning('ssotme', subId);
        }
      });

      // Complete testing
      beats.push({
        id: `ssotme-test-${subId}-complete`,
        duration: runtime,
        onStart: () => {
          console.log(`Effortless: Testing ${substrate?.name || subId} - ${score}%`);
        },
        onComplete: () => {
          ssotmeScores[subId] = score;
          updateSubstrateRow('ssotme', subId, score, true);
        }
      });
    });

    // Column complete
    beats.push({
      id: 'ssotme-column-complete',
      duration: 500,
      onStart: () => {
        document.querySelector('.test-column.ssotme').classList.remove('running');
        document.querySelector('.test-column.ssotme').classList.add('complete');

        // Calculate and show total score
        const totalScore = TestFixtures.getAverageScore('ssotme', Store.get('tech.substrates'));
        updateColumnScore('ssotme', totalScore);

        console.log('Effortless column complete - Average:', totalScore.toFixed(1) + '%');
      }
    });

    return beats;
  }

  // Build full Testing timeline
  function buildTimeline() {
    const beats = [];

    // Intro
    beats.push({
      id: 'testing-intro',
      duration: 500,
      onStart: () => {
        console.log('Testing stage starting');
        isRunning = true;
        // Reset scores (rows already rendered by enter())
        traditionalScores = {};
        ssotmeScores = {};
      }
    });

    // Fork animation - tests dispatch from Postgres
    beats.push({
      id: 'testing-fork',
      duration: 1000,
      onStart: () => {
        console.log('Dispatching tests from Postgres canonical compute');
        showForkAnimation();
      }
    });

    // Traditional column runs first
    beats.push(...buildTraditionalBeats());

    // Brief pause between columns
    beats.push({
      id: 'testing-pause',
      duration: 400,
      onStart: () => {
        console.log('Switching to Effortless column');
      }
    });

    // Effortless column runs second
    beats.push(...buildSsotmeBeats());

    // Show delta overlay
    beats.push({
      id: 'testing-delta',
      duration: 1500,
      onStart: () => {
        console.log('Showing delta comparison');
        showDeltaOverlay();
      }
    });

    // Completion
    beats.push({
      id: 'testing-complete',
      duration: 500,
      onStart: () => {
        console.log('Testing stage complete');
        isRunning = false;
        EventBus.emit('testing:complete', {
          traditional: TestFixtures.getAverageScore('traditional', Store.get('tech.substrates')),
          ssotme: TestFixtures.getAverageScore('ssotme', Store.get('tech.substrates'))
        });
      }
    });

    return beats;
  }

  return {
    renderTestRows,
    resetForkAnimation,
    showForkAnimation,
    showDeltaOverlay,

    buildTimeline,

    enter() {
      // Initial render - timeline's testing-intro beat will reset scores
      renderTestRows();
      isRunning = false;
      traditionalScores = {};
      ssotmeScores = {};
    },

    exit() {
      isRunning = false;
      traditionalScores = {};
      ssotmeScores = {};
      resetForkAnimation();
      document.getElementById('test-delta-overlay').classList.remove('visible');
      document.querySelectorAll('.test-column').forEach(col => {
        col.classList.remove('running', 'complete');
      });
    }
  };
})();
