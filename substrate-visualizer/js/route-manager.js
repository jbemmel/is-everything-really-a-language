/* ============================================================================
   ROUTE MANAGER
   URL hash-based routing with history management
   ============================================================================ */

const RouteManager = (() => {
  // Route definitions
  const routes = new Map([
    ['/', { view: 'scenes' }],
    ['/scenes', { view: 'scenes' }],
    ['/scene', { view: 'player' }],
    ['/builder', { view: 'builder' }],
    ['/adventures', { view: 'adventures' }],
    ['/adventure', { view: 'adventure-player' }],
    ['/adventure-builder', { view: 'adventure-builder' }],
    ['/legacy', { view: 'legacy' }],
    ['/legacy/planning', { view: 'legacy', stage: 'planning' }],
    ['/legacy/implementation', { view: 'legacy', stage: 'implementation' }],
    ['/legacy/testing', { view: 'legacy', stage: 'testing' }],
  ]);

  let initialized = false;
  let ignoreNextHashChange = false;

  // Parse current URL hash into route info
  function parseHash() {
    const hash = window.location.hash.slice(1) || '/';
    const [pathPart, queryPart] = hash.split('?');
    const path = pathPart || '/';

    // Parse query params
    const params = {};
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [key, value] of searchParams) {
        params[key] = value;
      }
    }

    // Find matching route
    const baseRoute = routes.get(path);
    if (baseRoute) {
      return { ...baseRoute, path, params };
    }

    // Check for scene routes: /scene/:sceneId
    if (path.startsWith('/scene/')) {
      const sceneId = path.slice('/scene/'.length);
      return { view: 'player', sceneId, path, params };
    }

    // Check for adventure routes: /adventure/:adventureId
    if (path.startsWith('/adventure/')) {
      const adventureId = path.slice('/adventure/'.length);
      return { view: 'adventure-player', adventureId, path, params };
    }

    // Check for adventure builder routes: /adventure-builder/:adventureId
    if (path.startsWith('/adventure-builder/')) {
      const adventureId = path.slice('/adventure-builder/'.length);
      return { view: 'adventure-builder', adventureId, path, params };
    }

    // Check for legacy routes
    if (path.startsWith('/legacy')) {
      const parts = path.split('/');
      const stage = parts[2] || 'planning';
      return { view: 'legacy', stage, path, params };
    }

    // Default to scenes
    return { view: 'scenes', path: '/', params };
  }

  // Build a hash string from route info
  function buildHash(view, params = {}) {
    let path = '/';

    if (view === 'scenes') {
      path = '/scenes';
    } else if (view === 'scene' && params.id) {
      path = `/scene/${params.id}`;
      delete params.id;
    } else if (view === 'player' && params.id) {
      path = `/scene/${params.id}`;
      delete params.id;
    } else if (view === 'builder') {
      path = '/builder';
    } else if (view === 'adventures') {
      path = '/adventures';
    } else if (view === 'adventure-player' && params.id) {
      path = `/adventure/${params.id}`;
      delete params.id;
    } else if (view === 'adventure-builder') {
      if (params.id) {
        path = `/adventure-builder/${params.id}`;
        delete params.id;
      } else {
        path = '/adventure-builder';
      }
    } else if (view === 'legacy') {
      path = '/legacy';
      if (params.stage) {
        path = `/legacy/${params.stage}`;
        delete params.stage;
      }
    }

    // Build query string for remaining params
    const queryParts = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    return queryParts.length > 0 ? `${path}?${queryParts.join('&')}` : path;
  }

  // Navigate to a new route
  function navigate(view, params = {}, replace = false) {
    const hash = buildHash(view, params);

    ignoreNextHashChange = true;
    if (replace) {
      window.location.replace('#' + hash);
    } else {
      window.location.hash = hash;
    }
    setTimeout(() => { ignoreNextHashChange = false; }, 0);

    EventBus.emit('route:changed', parseHash());
  }

  // Update URL params without triggering navigation
  function updateParams(params, merge = true) {
    const current = parseHash();
    const newParams = merge ? { ...current.params, ...params } : params;
    const hash = buildHash(current.view, newParams);

    ignoreNextHashChange = true;
    window.history.replaceState(null, '', '#' + hash);
    setTimeout(() => { ignoreNextHashChange = false; }, 0);
  }

  // Handle browser back/forward navigation
  function handleHashChange() {
    if (ignoreNextHashChange) {
      ignoreNextHashChange = false;
      return;
    }

    const route = parseHash();
    console.log('RouteManager: Hash changed to', route);
    EventBus.emit('route:changed', route);
  }

  // Initialize routing system
  function init() {
    if (initialized) return;
    initialized = true;

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Return initial route
    const initialRoute = parseHash();
    console.log('RouteManager: Initial route', initialRoute);

    return initialRoute;
  }

  // Get current route info
  function current() {
    return parseHash();
  }

  return {
    init,
    navigate,
    updateParams,
    current,
    parseHash,
    buildHash,
    get routes() { return routes; }
  };
})();
