/* ============================================================================
   COMPONENT REGISTRY
   Factory for creating and managing reusable UI components
   ============================================================================ */

const Components = (() => {
  const registry = new Map();
  const instances = new Map();
  let instanceIdCounter = 0;

  return {
    register(name, factory) {
      registry.set(name, factory);
    },

    create(name, props = {}) {
      const factory = registry.get(name);
      if (!factory) throw new Error(`Unknown component: ${name}`);

      const id = `${name}-${++instanceIdCounter}`;
      const instance = factory({ id, ...props });
      instances.set(id, instance);

      return instance;
    },

    get(id) {
      return instances.get(id);
    },

    destroy(id) {
      const instance = instances.get(id);
      if (instance?.destroy) instance.destroy();
      instances.delete(id);
    },

    destroyAll(namePrefix) {
      for (const [id, instance] of instances) {
        if (id.startsWith(namePrefix)) {
          if (instance?.destroy) instance.destroy();
          instances.delete(id);
        }
      }
    },

    reset() {
      for (const [id, instance] of instances) {
        if (instance?.destroy) instance.destroy();
      }
      instances.clear();
    }
  };
})();
