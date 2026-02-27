/* ============================================================================
   EVENT BUS
   Pub/sub system for decoupled component communication
   ============================================================================ */

const EventBus = (() => {
  const listeners = new Map();

  return {
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event).delete(callback); // unsubscribe
    },

    emit(event, payload) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(cb => {
          try {
            cb(payload);
          } catch (e) {
            console.error(`EventBus error in ${event}:`, e);
          }
        });
      }
    },

    once(event, callback) {
      const unsub = this.on(event, (payload) => {
        unsub();
        callback(payload);
      });
    },

    // Debug: list all registered events
    debug() {
      console.log('EventBus listeners:', [...listeners.keys()]);
    }
  };
})();
