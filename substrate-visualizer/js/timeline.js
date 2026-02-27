/* ============================================================================
   TIMELINE ENGINE
   Deterministic animation sequencer with speed scaling
   ============================================================================ */

const Timeline = (() => {
  function createTimeline(beats) {
    let currentIndex = 0;
    let currentBeatStart = 0;
    let elapsed = 0;
    let paused = true;
    let rafId = null;
    let lastTick = 0;

    const instance = {
      beats,

      play() {
        if (!paused) return;
        paused = false;
        lastTick = performance.now();
        rafId = requestAnimationFrame(tick);
        Store.set('playing', true);
      },

      pause() {
        paused = true;
        Store.set('playing', false);
        if (rafId) cancelAnimationFrame(rafId);
      },

      reset() {
        this.pause();
        currentIndex = 0;
        currentBeatStart = 0;
        elapsed = 0;
        EventBus.emit('timeline:reset', {});
      },

      step() {
        if (currentIndex < beats.length) {
          const beat = beats[currentIndex];
          beat.onComplete?.();
          currentIndex++;
          if (currentIndex < beats.length) {
            beats[currentIndex].onStart?.();
          }
        }
      },

      get progress() {
        return beats.length > 0 ? currentIndex / beats.length : 0;
      },

      get currentBeat() {
        return beats[currentIndex] || null;
      },

      get isComplete() {
        return currentIndex >= beats.length;
      },

      get isPaused() {
        return paused;
      }
    };

    function tick(now) {
      if (paused) return;

      const speed = Store.get('speed');
      const dt = (now - lastTick) * speed;
      lastTick = now;
      elapsed += dt;

      const beat = beats[currentIndex];
      if (!beat) {
        instance.pause();
        EventBus.emit('timeline:complete', {});
        return;
      }

      // First tick of this beat
      if (elapsed - currentBeatStart < dt + 1) {
        beat.onStart?.();
        EventBus.emit('timeline:beat', { beatId: beat.id, index: currentIndex });
      }

      // Run the beat's action (for continuous animations)
      const beatElapsed = elapsed - currentBeatStart;
      const beatProgress = Math.min(1, beatElapsed / beat.duration);
      beat.action?.(beatProgress, beatElapsed);

      // Beat complete?
      if (beatElapsed >= beat.duration) {
        beat.onComplete?.();
        currentIndex++;
        currentBeatStart = elapsed;
      }

      rafId = requestAnimationFrame(tick);
    }

    return instance;
  }

  return { createTimeline };
})();
