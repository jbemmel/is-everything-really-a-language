/* ============================================================================
   COMPONENT: ChatWindow
   Animated chat dialog with typing effects and participant avatars
   ============================================================================ */

Components.register('ChatWindow', ({ id, container, participants, script, onComplete }) => {
  /*
   * container: DOM element to mount into
   * participants: [{ id, name, avatar, color }]
   * script: [{ speaker, text, delay?, typing?, pause? }]
   * onComplete: callback when script finishes
   */

  // DOM structure
  const el = document.createElement('div');
  el.className = 'chat-window';
  el.innerHTML = `
    <div class="chat-header">
      <div class="chat-title">Planning Discussion</div>
      <div class="chat-participants"></div>
    </div>
    <div class="chat-messages"></div>
    <div class="chat-typing" hidden>
      <span class="typing-indicator">●●●</span>
      <span class="typing-name"></span> is typing...
    </div>
    <div class="chat-footer">
      <div class="agreement-badge">
        <span class="checkmark">✓</span>
        Agreement reached
      </div>
    </div>
  `;

  const participantsEl = el.querySelector('.chat-participants');
  const messagesEl = el.querySelector('.chat-messages');
  const typingEl = el.querySelector('.chat-typing');
  const typingNameEl = el.querySelector('.typing-name');
  const agreementBadge = el.querySelector('.agreement-badge');

  // Render participants
  participants.forEach(p => {
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.style.background = p.color;
    avatar.textContent = p.avatar;
    avatar.title = p.name;
    participantsEl.appendChild(avatar);
  });

  // Script playback state
  let scriptIndex = 0;
  let isPlaying = false;
  let isPaused = false;

  // Helper functions
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function typewriter(textEl, text, charDelay) {
    for (let i = 0; i < text.length; i++) {
      if (!isPlaying) return;
      textEl.textContent += text[i];
      await sleep(charDelay);
    }
  }

  const instance = {
    id,
    el,

    mount() {
      container.innerHTML = '';
      container.appendChild(el);
      // Small delay before showing for transition
      requestAnimationFrame(() => {
        el.classList.add('visible');
      });
      EventBus.emit('chat:opened', { id, participants });
    },

    async play() {
      isPlaying = true;
      isPaused = false;

      while (scriptIndex < script.length && isPlaying) {
        if (isPaused) {
          await sleep(100);
          continue;
        }

        const line = script[scriptIndex];
        const speaker = participants.find(p => p.id === line.speaker);
        const speed = Store.get('speed');

        // Show typing indicator
        if (line.typing !== false) {
          typingNameEl.textContent = speaker?.name || line.speaker;
          typingEl.hidden = false;
          await sleep((line.delay || 800) / speed);
          if (!isPlaying) return;
          typingEl.hidden = true;
        }

        // Add message
        const msg = document.createElement('div');
        msg.className = 'chat-message';
        msg.innerHTML = `
          <div class="chat-avatar" style="background:${speaker?.color || '#666'}">
            ${speaker?.avatar || '?'}
          </div>
          <div class="chat-bubble">
            <div class="chat-speaker">${speaker?.name || line.speaker}</div>
            <div class="chat-text"></div>
          </div>
        `;
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Typewriter effect
        const textEl = msg.querySelector('.chat-text');
        if (line.typing !== false) {
          await typewriter(textEl, line.text, 30 / speed);
        } else {
          textEl.textContent = line.text;
        }

        if (!isPlaying) return;
        EventBus.emit('chat:message', { id, speaker: line.speaker, text: line.text });

        scriptIndex++;
        await sleep((line.pause || 400) / speed);
      }

      if (isPlaying && scriptIndex >= script.length) {
        // Show agreement badge
        agreementBadge.classList.add('visible');
        await sleep(500 / Store.get('speed'));

        EventBus.emit('chat:closed', { id, result: 'complete' });
        Store.updateStageState('planning', { agreementReached: true });
        onComplete?.();
      }
    },

    pause() {
      isPaused = true;
    },

    resume() {
      isPaused = false;
    },

    stop() {
      isPlaying = false;
    },

    destroy() {
      isPlaying = false;
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
    }
  };

  return instance;
});
