/* ============================================================================
   STAGE CONTROLLER
   Manages stage transitions and per-stage timelines
   ============================================================================ */

const StageController = (() => {
  let activeTimeline = null;

  return {
    enter(stage) {
      const prevStage = Store.get('stage');

      // Exit previous stage
      if (prevStage !== stage) {
        this.exit(prevStage);
      }

      // Update state
      Store.set('stage', stage);
      Store.resetStageState(stage);

      // Update UI
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stage === stage);
      });

      document.querySelectorAll('.stage-view').forEach(view => {
        view.classList.toggle('active', view.id === `${stage}-stage`);
      });

      // Build timeline for this stage
      activeTimeline = this.buildTimeline(stage);

      EventBus.emit('stage:enter', { stage });
    },

    exit(stage) {
      // Stop any running timeline
      if (activeTimeline) {
        activeTimeline.reset();
        activeTimeline = null;
      }

      // Stage-specific cleanup
      if (stage === 'planning') {
        PlanningController.exit();
      } else if (stage === 'implementation') {
        ImplementationController.exit();
      } else if (stage === 'testing') {
        TestingController.exit();
      } else if (stage === 'scene') {
        // Scene cleanup - stop any playing scene
        const player = SceneManager.getCurrentPlayer();
        if (player) {
          player.stop();
        }
      }

      // Clean up components
      Components.reset();

      EventBus.emit('stage:exit', { stage });
    },

    buildTimeline(stage) {
      // Each stage will have its own timeline builder
      const beats = [];

      if (stage === 'planning') {
        // Use PlanningController to build the timeline
        const planningBeats = PlanningController.buildTimeline();
        beats.push(...planningBeats);
      } else if (stage === 'implementation') {
        // Use ImplementationController to build the full timeline
        ImplementationController.enter();
        const implBeats = ImplementationController.buildTimeline();
        beats.push(...implBeats);
      } else if (stage === 'testing') {
        // Use TestingController to build the full timeline
        TestingController.enter();
        const testBeats = TestingController.buildTimeline();
        beats.push(...testBeats);
      } else if (stage === 'scene') {
        // Scene stage uses its own player, no beats needed
        // SceneManager handles scene playback
      }

      return Timeline.createTimeline(beats);
    },

    play() {
      if (activeTimeline) activeTimeline.play();
    },

    pause() {
      if (activeTimeline) activeTimeline.pause();
    },

    step() {
      if (activeTimeline) activeTimeline.step();
    },

    reset() {
      if (activeTimeline) activeTimeline.reset();
      Store.resetStageState(Store.get('stage'));
    },

    get timeline() {
      return activeTimeline;
    }
  };
})();
