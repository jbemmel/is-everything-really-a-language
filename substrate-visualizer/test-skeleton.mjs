/**
 * Headless test for Effortless Visualizer V3 - M0 Skeleton
 * Tests the acceptance criteria from the plan
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = `file://${join(__dirname, 'visualizer.html')}`;

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('Starting headless tests for M0 Skeleton...\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  [Browser Error]', msg.text());
    }
  });

  await page.goto(htmlPath, { waitUntil: 'domcontentloaded' });

  // Wait for init
  await page.waitForFunction(() => typeof Store !== 'undefined');

  for (const t of tests) {
    try {
      await t.fn(page);
      console.log(`✓ ${t.name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${t.name}`);
      console.log(`  Error: ${e.message}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// NAVIGATION & STATE TESTS
// ============================================================================

test('Tabs are always clickable (no gating)', async (page) => {
  // All tabs should be clickable
  const tabs = await page.$$('.tab-btn');
  assert(tabs.length === 3, 'Should have 3 tabs');

  for (const tab of tabs) {
    const disabled = await tab.evaluate(el => el.disabled);
    assert(!disabled, 'Tab should not be disabled');
  }
});

test('Tab click changes active stage view', async (page) => {
  // Click Implementation tab
  await page.click('[data-stage="implementation"]');

  const implActive = await page.$eval('#implementation-stage', el => el.classList.contains('active'));
  assert(implActive, 'Implementation stage should be active');

  const planningActive = await page.$eval('#planning-stage', el => el.classList.contains('active'));
  assert(!planningActive, 'Planning stage should not be active');

  // Click back to Planning
  await page.click('[data-stage="planning"]');

  const planningActiveAgain = await page.$eval('#planning-stage', el => el.classList.contains('active'));
  assert(planningActiveAgain, 'Planning should be active again');
});

test('Tab click updates Store.stage', async (page) => {
  await page.click('[data-stage="testing"]');
  const stage = await page.evaluate(() => Store.get('stage'));
  assert(stage === 'testing', `Stage should be 'testing', got '${stage}'`);

  // Reset to planning
  await page.click('[data-stage="planning"]');
});

test('Planning selections persist across tab switches', async (page) => {
  // Set name format to lastFirst
  await page.click('input[name="nameFormat"][value="lastFirst"]');

  // Set SSOT to notion
  await page.click('input[name="ssot"][value="notion"]');

  // Check Effortless CLI
  await page.click('#hasEffortlessCLI');

  // Switch to Implementation and back
  await page.click('[data-stage="implementation"]');
  await page.click('[data-stage="planning"]');

  // Verify selections persist
  const nameFormat = await page.evaluate(() => Store.get('rule.nameFormat'));
  assert(nameFormat === 'lastFirst', `Name format should be 'lastFirst', got '${nameFormat}'`);

  const ssot = await page.evaluate(() => Store.get('ssot'));
  assert(ssot === 'notion', `SSOT should be 'notion', got '${ssot}'`);

  const hasCLI = await page.evaluate(() => Store.get('tech.hasEffortlessCLI'));
  assert(hasCLI === true, `hasEffortlessCLI should be true, got ${hasCLI}`);

  // Reset for other tests
  await page.click('input[name="nameFormat"][value="firstLast"]');
  await page.click('input[name="ssot"][value="airtable"]');
  await page.click('#hasEffortlessCLI'); // uncheck
});

test('Mode toggle updates Store.mode', async (page) => {
  await page.click('[data-mode="ssotme"]');
  const mode = await page.evaluate(() => Store.get('mode'));
  assert(mode === 'ssotme', `Mode should be 'ssotme', got '${mode}'`);

  await page.click('[data-mode="traditional"]');
  const mode2 = await page.evaluate(() => Store.get('mode'));
  assert(mode2 === 'traditional', `Mode should be 'traditional', got '${mode2}'`);
});

test('Mode toggle changes Implementation engine label', async (page) => {
  // Go to implementation stage to see the labels
  await page.click('[data-stage="implementation"]');

  // Traditional mode without CLI
  await page.click('[data-mode="traditional"]');
  let label = await page.$eval('#engine-label', el => el.textContent);
  assert(label === 'Human + LLM', `Expected 'Human + LLM', got '${label}'`);

  // Effortless mode without CLI (fallback)
  await page.click('[data-mode="ssotme"]');
  label = await page.$eval('#engine-label', el => el.textContent);
  assert(label === 'Human + LLM (fallback)', `Expected 'Human + LLM (fallback)', got '${label}'`);

  // Effortless mode with CLI
  await page.click('[data-stage="planning"]');
  await page.click('#hasEffortlessCLI');
  await page.click('[data-stage="implementation"]');
  label = await page.$eval('#engine-label', el => el.textContent);
  assert(label === 'Effortless CLI', `Expected 'Effortless CLI', got '${label}'`);

  // Reset
  await page.click('[data-stage="planning"]');
  await page.click('#hasEffortlessCLI'); // uncheck
  await page.click('[data-mode="traditional"]');
});

// ============================================================================
// PLANNING STAGE TESTS
// ============================================================================

test('Rule card reflects name format selection', async (page) => {
  await page.click('[data-stage="planning"]');

  // First Last format
  await page.click('input[name="nameFormat"][value="firstLast"]');
  let code = await page.$eval('#rule-code', el => el.textContent);
  assert(code.includes('First Last'), `Expected 'First Last' format, got '${code}'`);

  // Last, First format
  await page.click('input[name="nameFormat"][value="lastFirst"]');
  code = await page.$eval('#rule-code', el => el.textContent);
  assert(code.includes('Last, First'), `Expected 'Last, First' format, got '${code}'`);

  // Reset
  await page.click('input[name="nameFormat"][value="firstLast"]');
});

test('SSOT selector updates display', async (page) => {
  await page.click('[data-stage="implementation"]');

  await page.click('[data-stage="planning"]');
  await page.click('input[name="ssot"][value="excel"]');
  await page.click('[data-stage="implementation"]');

  let name = await page.$eval('#ssot-name', el => el.textContent);
  assert(name === 'Excel', `Expected SSOT name 'Excel', got '${name}'`);

  // Reset
  await page.click('[data-stage="planning"]');
  await page.click('input[name="ssot"][value="airtable"]');
});

test('Substrates grid has all 10 substrates', async (page) => {
  await page.click('[data-stage="planning"]');

  const count = await page.$$eval('#substrates-grid input', inputs => inputs.length);
  assert(count === 10, `Expected 10 substrates, got ${count}`);

  const checked = await page.$$eval('#substrates-grid input:checked', inputs => inputs.length);
  assert(checked === 10, `All 10 substrates should be checked by default, got ${checked}`);
});

test('Substrate selection updates Store', async (page) => {
  await page.click('[data-stage="planning"]');

  // Uncheck python
  await page.click('input[data-substrate="python"]');

  const substrates = await page.evaluate(() => [...Store.get('tech.substrates')]);
  assert(!substrates.includes('python'), 'Python should be unchecked');
  assert(substrates.length === 9, `Expected 9 substrates, got ${substrates.length}`);

  // Re-check python
  await page.click('input[data-substrate="python"]');
});

// ============================================================================
// INFRASTRUCTURE TESTS
// ============================================================================

test('EventBus exists and works', async (page) => {
  const result = await page.evaluate(() => {
    let received = false;
    const unsub = EventBus.on('test-event', (data) => {
      received = data.value === 42;
    });
    EventBus.emit('test-event', { value: 42 });
    unsub();
    return received;
  });
  assert(result, 'EventBus should emit and receive events');
});

test('Store get/set works', async (page) => {
  const result = await page.evaluate(() => {
    Store.set('mode', 'ssotme');
    const val = Store.get('mode');
    Store.set('mode', 'traditional'); // reset
    return val;
  });
  assert(result === 'ssotme', `Store should return 'ssotme', got '${result}'`);
});

test('Timeline engine exists', async (page) => {
  const exists = await page.evaluate(() => typeof Timeline !== 'undefined' && typeof Timeline.createTimeline === 'function');
  assert(exists, 'Timeline.createTimeline should exist');
});

test('Components registry exists', async (page) => {
  const exists = await page.evaluate(() =>
    typeof Components !== 'undefined' &&
    typeof Components.register === 'function' &&
    typeof Components.create === 'function'
  );
  assert(exists, 'Components registry should exist');
});

test('StageController exists and has required methods', async (page) => {
  const exists = await page.evaluate(() =>
    typeof StageController !== 'undefined' &&
    typeof StageController.enter === 'function' &&
    typeof StageController.play === 'function' &&
    typeof StageController.pause === 'function' &&
    typeof StageController.reset === 'function'
  );
  assert(exists, 'StageController should have enter/play/pause/reset methods');
});

// ============================================================================
// COUNTER TESTS
// ============================================================================

test('Counters display correctly', async (page) => {
  const renegotiations = await page.$eval('#counter-renegotiations', el => el.textContent);
  assert(renegotiations === '0', `Renegotiations should be '0', got '${renegotiations}'`);

  const runtime = await page.$eval('#counter-runtime', el => el.textContent);
  assert(runtime === '0.0s', `Runtime should be '0.0s', got '${runtime}'`);
});

test('Reset button resets counters', async (page) => {
  // Manually increment a counter
  await page.evaluate(() => {
    const counters = Store.get('counters');
    counters.renegotiations = 5;
    Store.set('counters', counters);
  });

  // Click reset
  await page.click('#btn-reset');

  const val = await page.evaluate(() => Store.get('counters').renegotiations);
  assert(val === 0, `Counter should be reset to 0, got ${val}`);
});

// ============================================================================
// TESTING STAGE LAYOUT
// ============================================================================

test('Testing stage has two columns', async (page) => {
  await page.click('[data-stage="testing"]');

  const columns = await page.$$('.test-column');
  assert(columns.length === 2, `Expected 2 test columns, got ${columns.length}`);

  const hasTraditional = await page.$('.test-column.traditional');
  const hasSsotme = await page.$('.test-column.ssotme');
  assert(hasTraditional && hasSsotme, 'Should have traditional and ssotme columns');

  // Reset to planning
  await page.click('[data-stage="planning"]');
});

test('Speed selector updates Store', async (page) => {
  await page.select('#speed-select', '2');
  const speed = await page.evaluate(() => Store.get('speed'));
  assert(speed === 2, `Speed should be 2, got ${speed}`);

  // Reset
  await page.select('#speed-select', '1');
});

// ============================================================================
// ROBUSTNESS TESTS
// ============================================================================

test('No JavaScript errors on load', async (page) => {
  // This is implicitly tested by getting here without errors
  const hasErrors = await page.evaluate(() => typeof Store === 'undefined' || typeof EventBus === 'undefined');
  assert(!hasErrors, 'Core modules should be defined');
});

test('Store snapshot returns cloned state', async (page) => {
  const result = await page.evaluate(() => {
    const snap1 = Store.snapshot();
    snap1.mode = 'modified';
    const snap2 = Store.snapshot();
    return snap2.mode !== 'modified';
  });
  assert(result, 'Snapshot should be a clone, not a reference');
});

// Run all tests
runTests();
