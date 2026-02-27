/* ============================================================================
   DATA: Substrate Configuration
   ============================================================================ */

const SUBSTRATES = [
  { id: 'python', name: 'Python', icon: '&#128013;' },
  { id: 'golang', name: 'Go', icon: '&#129445;' },
  { id: 'xlsx', name: 'Excel', icon: '&#128202;' },
  { id: 'csv', name: 'CSV', icon: '&#128196;' },
  { id: 'yaml', name: 'YAML', icon: '&#128221;' },
  { id: 'uml', name: 'UML', icon: '&#128200;' },
  { id: 'binary', name: 'Binary', icon: '&#128190;' },
  { id: 'explaindag', name: 'ExplainDAG', icon: '&#128201;' },
  { id: 'owl', name: 'OWL', icon: '&#129417;' },
  { id: 'english', name: 'English', icon: '&#128172;' }
];


/* ============================================================================
   DATA: Planning Participants
   ============================================================================ */

const PLANNING_PARTICIPANTS = [
  { id: 'pm', name: 'Product Manager', avatar: '📋', color: '#d29922' },
  { id: 'cto', name: 'CTO', avatar: '🔧', color: '#f97583' },
  { id: 'llm', name: 'LLM', avatar: '🤖', color: '#56d364' }
];


/* ============================================================================
   DATA: Chat Scripts
   Multi-round scripted conversations for planning discussions
   ============================================================================ */

const ChatScripts = {
  // Topic 1: Name Format - Multi-round discussions
  nameFormatDiscussion(round) {
    const scripts = {
      0: [ // Initial discussion
        { speaker: 'pm', text: "We need to decide how customer names appear on invoices." },
        { speaker: 'pm', text: "I prefer 'John Doe' - it's friendly and customer-focused." },
        { speaker: 'cto', text: "But 'Doe, John' makes database sorting and lookups easier." },
        { speaker: 'llm', text: "Both are valid. First Last is common in US consumer contexts, Last First in enterprise/legal." }
      ],
      1: [ // Round 2 if "Discuss Further"
        { speaker: 'pm', text: "Our customers are mostly consumers, not enterprises." },
        { speaker: 'cto', text: "Fair point. But what about international customers?" },
        { speaker: 'llm', text: "For international users, you might consider locale-based formatting later. For now, pick a default." }
      ],
      2: [ // Round 3
        { speaker: 'cto', text: "Okay, I can work with First Last. We'll add a computed LastFirst column for sorting." },
        { speaker: 'pm', text: "Perfect. That gives us the best of both worlds." },
        { speaker: 'llm', text: "Agreed. Rule: full_name = First + ' ' + Last. Sorting key: Last + ', ' + First." }
      ]
    };
    return {
      estimatedDuration: 8000,
      messages: scripts[Math.min(round, 2)] || scripts[2]
    };
  },

  // Topic 2: Tech Stack Discussion
  techStackDiscussion(round) {
    const scripts = {
      0: [
        { speaker: 'pm', text: "Now let's nail down the tech stack. What are you thinking?" },
        { speaker: 'cto', text: "Go for the backend - it's fast, typed, and our team knows it." },
        { speaker: 'cto', text: "PostgreSQL for the database - rock solid with great JSON support." },
        { speaker: 'pm', text: "And React for the UI? Our designers use Figma-to-React tooling." },
        { speaker: 'llm', text: "Solid choices. Go + Postgres + React is a proven, performant stack." }
      ],
      1: [
        { speaker: 'pm', text: "Should we consider alternatives? Maybe Node.js for faster prototyping?" },
        { speaker: 'cto', text: "We could, but Go's compile-time checks catch bugs early." },
        { speaker: 'llm', text: "Trade-off: Node.js is faster to write but Go is more maintainable at scale." },
        { speaker: 'cto', text: "Let's stick with Go. The long-term benefits outweigh the initial learning curve." }
      ]
    };
    return {
      estimatedDuration: 10000,
      messages: scripts[Math.min(round, 1)] || scripts[1]
    };
  },

  // Legacy planning function (for backwards compatibility)
  planning(nameFormat) {
    const expected = nameFormat === 'firstLast' ? 'John Doe' : 'Doe, John';
    const formula = nameFormat === 'firstLast' ? 'First + " " + Last' : 'Last + ", " + First';

    return {
      estimatedDuration: 12000,
      messages: [
        { speaker: 'pm', text: "We need to standardize how names appear across all systems." },
        { speaker: 'pm', text: "Good idea. What format should we use?" },
        { speaker: 'pm', text: `I think "${expected}" reads naturally.` },
        { speaker: 'cto', text: "Works for me. We just need to be consistent everywhere." },
        { speaker: 'llm', text: `Confirmed. The rule is: full_name = ${formula}` },
        { speaker: 'pm', text: "Perfect. Let's lock that in as our single source of truth." }
      ]
    };
  },

  implementationTraditional(substrate) {
    return {
      estimatedDuration: 3000,
      messages: [
        { speaker: 'dev', text: `Okay, now how do we implement this in ${substrate}?` },
        { speaker: 'llm', text: `For ${substrate}, you'll want to...`, typing: true },
        { speaker: 'dev', text: "Got it. Let me code that up.", delay: 500 }
      ]
    };
  },

  englishBuild() {
    return {
      estimatedDuration: 6000,
      messages: [
        { speaker: 'llm', text: "Generating natural language description...", delay: 1500 },
        { speaker: 'llm', text: "The full name is formed by combining the first name and last name...", delay: 2000 },
        { speaker: 'llm', text: "Note: LLM interpretations may vary slightly.", delay: 1000 }
      ]
    };
  }
};


/* ============================================================================
   IMPLEMENTATION PARTICIPANTS (for implementation chats)
   ============================================================================ */

const IMPLEMENTATION_PARTICIPANTS = [
  { id: 'dev', name: 'Developer', avatar: '💻', color: '#f97583' },
  { id: 'llm', name: 'LLM', avatar: '🤖', color: '#56d364' }
];


/* ============================================================================
   DATA: Test Fixtures
   Captured scores and runtimes for testing stage
   ============================================================================ */

const TestFixtures = {
  // Scores per substrate per mode (percentage conformance)
  scores: {
    traditional: {
      python: 100, golang: 100, xlsx: 98, csv: 100, yaml: 97,
      uml: 100, binary: 79.9, explaindag: 100, owl: 100, english: 71.7
    },
    ssotme: {
      python: 100, golang: 100, xlsx: 100, csv: 100, yaml: 100,
      uml: 100, binary: 100, explaindag: 100, owl: 100, english: 85.2
    }
  },

  // Runtime in ms (real-world equivalent for animation pacing)
  runtimes: {
    python: 100, golang: 100, xlsx: 120, csv: 90, yaml: 110,
    uml: 120, binary: 180, explaindag: 130, owl: 500, english: 800
  },

  // Drift descriptions for Traditional mode
  driftNotes: {
    binary: "Edge case: null handling differs from spec",
    english: "LLM occasionally swaps name order",
    xlsx: "Formula uses CONCATENATE instead of &"
  },

  getScore(substrate, mode) {
    return this.scores[mode]?.[substrate] ?? 100;
  },

  getRuntime(substrate, mode) {
    // Traditional has overhead from chat
    const base = this.runtimes[substrate];
    return mode === 'traditional' ? base * 1.5 : base;
  },

  getDriftNote(substrate) {
    return this.driftNotes[substrate] || null;
  },

  getAverageScore(mode, substrates) {
    if (!substrates || substrates.size === 0) return 0;
    let total = 0;
    for (const sub of substrates) {
      total += this.getScore(sub, mode);
    }
    return total / substrates.size;
  }
};
