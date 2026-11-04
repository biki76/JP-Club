/* AI Tutor Widget Controller */
(function() {
  'use strict';

  let isOpen = false;

  function createWidget() {
    // Create toggle button
    const toggle = document.createElement('button');
    toggle.className = 'ai-tutor-toggle';
    toggle.id = 'ai-tutor-toggle';
    toggle.setAttribute('aria-label', 'Open AI Tutor');
    toggle.innerHTML = `
      <span class="ai-tutor-toggle-icon">🎓</span>
      <span class="ai-tutor-toggle-indicator"></span>
    `;

    // Create chat window
    const window = document.createElement('div');
    window.className = 'ai-tutor-window';
    window.id = 'ai-tutor-window';
    window.innerHTML = `
      <div class="ai-tutor-header">
        <h3 class="ai-tutor-title">AI Japanese Tutor</h3>
        <select class="ai-tutor-level-select" id="ai-tutor-level">
          <option value="N5">N5 - Beginner</option>
          <option value="N4">N4 - Elementary</option>
          <option value="N3">N3 - Intermediate</option>
        </select>
        <div class="ai-tutor-header-actions">
          <button class="ai-tutor-header-btn" id="ai-tutor-new" title="New Conversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button class="ai-tutor-header-btn" id="ai-tutor-close" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="ai-tutor-chat" id="ai-tutor-chat"></div>
      <div class="ai-tutor-input-area">
        <button class="ai-tutor-btn ai-tutor-btn-mic" id="ai-tutor-mic" title="Speak">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <input 
          type="text" 
          class="ai-tutor-input" 
          id="ai-tutor-input" 
          placeholder="Type in Japanese..." 
          autocomplete="off"
        />
        <button class="ai-tutor-btn ai-tutor-btn-send" id="ai-tutor-send" title="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(window);

    return { toggle, window };
  }

  function bindEvents() {
    const toggle = document.getElementById('ai-tutor-toggle');
    const closeBtn = document.getElementById('ai-tutor-close');
    const newBtn = document.getElementById('ai-tutor-new');
    const levelSelect = document.getElementById('ai-tutor-level');
    const input = document.getElementById('ai-tutor-input');
    const sendBtn = document.getElementById('ai-tutor-send');
    const micBtn = document.getElementById('ai-tutor-mic');

    // Toggle open/close
    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      document.getElementById('ai-tutor-window').classList.toggle('is-open', isOpen);
    });

    closeBtn.addEventListener('click', () => {
      isOpen = false;
      document.getElementById('ai-tutor-window').classList.remove('is-open');
    });

    // New conversation
    newBtn.addEventListener('click', () => {
      if (confirm('Start a new conversation? Current chat will be cleared.')) {
        window.AITutorChat.clear();
      }
    });

    // Level change
    levelSelect.addEventListener('change', (e) => {
      window.AITutorChat.setLevel(e.target.value);
    });

    // Send message
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      if (!window.AITutorAPI.isAuthenticated()) {
        window.AITutorChat.showError('Please sign in to use AI Tutor');
        return;
      }

      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;

      window.AITutorChat.addUserMessage(message);
      window.AITutorChat.showLoading();

      try {
        const response = await window.AITutorAPI.sendMessage(
          message,
          window.AITutorChat.getLevel(),
          window.AITutorChat.getSessionId()
        );

        window.AITutorChat.setSessionId(response.sessionId);
        window.AITutorChat.addAssistantMessage(
          response.reply,
          response.correction,
          response.suggestion
        );

        // Optional: Speak the reply
        if (window.AITutorVoice.isSupported.synthesis) {
          window.AITutorVoice.speak(response.reply);
        }

      } catch (error) {
        console.error('AI Tutor error:', error);
        window.AITutorChat.showError(error.message || 'Failed to get response');
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Voice input
    micBtn.addEventListener('click', () => {
      if (!window.AITutorVoice.isSupported.recognition) {
        window.AITutorChat.showError('Speech recognition not supported in this browser');
        return;
      }

      if (window.AITutorVoice.isListening()) {
        window.AITutorVoice.stopListening();
        micBtn.classList.remove('is-listening');
      } else {
        micBtn.classList.add('is-listening');
        window.AITutorVoice.startListening(
          (transcript) => {
            input.value = transcript;
            micBtn.classList.remove('is-listening');
          },
          (error) => {
            console.error('Voice error:', error);
            window.AITutorChat.showError('Voice input failed');
            micBtn.classList.remove('is-listening');
          }
        );
      }
    });

    // Disable mic if not supported
    if (!window.AITutorVoice.isSupported.recognition) {
      micBtn.disabled = true;
      micBtn.title = 'Speech recognition not supported';
    }
  }

  window.AITutorWidget = {
    init: function() {
      createWidget();
      bindEvents();
      window.AITutorChat.init('N5');
    }
  };
})();
