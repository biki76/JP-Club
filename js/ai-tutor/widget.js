(function() {
  'use strict';

  let isOpen = false;
  let isHistoryOpen = false;

  function createWidget() {
    const toggle = document.createElement('button');
    toggle.className = 'ai-tutor-toggle';
    toggle.id = 'ai-tutor-toggle';
    toggle.setAttribute('aria-label', 'Open AI Japanese Tutor');
    toggle.innerHTML = `<span class="ai-tutor-toggle-icon">🎓</span><span class="ai-tutor-toggle-indicator"></span>`;

    const win = document.createElement('div');
    win.className = 'ai-tutor-window';
    win.id = 'ai-tutor-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'ai-tutor-title');
    win.innerHTML = `
      <div class="ai-tutor-header">
        <h3 class="ai-tutor-title" id="ai-tutor-title">AI Tutor</h3>
        <select class="ai-tutor-level-select" id="ai-tutor-level" aria-label="Select JLPT Level">
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
        </select>
        <div class="ai-tutor-header-actions">
          <button class="ai-tutor-header-btn" id="ai-tutor-history" title="History" aria-label="View History">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button class="ai-tutor-header-btn" id="ai-tutor-new" title="New Conversation" aria-label="New Conversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button class="ai-tutor-header-btn" id="ai-tutor-close" title="Close" aria-label="Close Tutor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-tutor-chat" id="ai-tutor-chat" role="log" aria-live="polite"></div>
      <div class="ai-tutor-input-area">
        <button class="ai-tutor-btn ai-tutor-btn-mic" id="ai-tutor-mic" title="Speak Japanese" aria-label="Speak Japanese">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <input type="text" class="ai-tutor-input" id="ai-tutor-input" placeholder="Type in Japanese..." autocomplete="off" aria-label="Message input"/>
        <button class="ai-tutor-btn ai-tutor-btn-send" id="ai-tutor-send" title="Send" aria-label="Send message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(win);
    return { toggle, window: win };
  }

  async function loadHistory() {
    if (!window.AITutorAPI.isAuthenticated()) return;
    try {
      const sessions = await window.AITutorAPI.getSessions();
      if (sessions && sessions.length > 0) {
        window.AITutorStorage.setHistorySessions(sessions);
        // Optionally show a prompt to restore last session
      }
    } catch (e) {
      console.warn('Could not load history', e);
    }
  }

  async function restoreSession(sessionId) {
    try {
      const messages = await window.AITutorAPI.getHistory(sessionId);
      window.AITutorChat.setSessionId(sessionId);
      window.AITutorStorage.setLastSessionId(sessionId);
      window.AITutorChat.renderHistory(messages);
    } catch (e) {
      window.AITutorChat.showError('Failed to load history');
    }
  }

  function bindEvents() {
    const toggle = document.getElementById('ai-tutor-toggle');
    const win = document.getElementById('ai-tutor-window');
    const closeBtn = document.getElementById('ai-tutor-close');
    const newBtn = document.getElementById('ai-tutor-new');
    const historyBtn = document.getElementById('ai-tutor-history');
    const levelSelect = document.getElementById('ai-tutor-level');
    const input = document.getElementById('ai-tutor-input');
    const sendBtn = document.getElementById('ai-tutor-send');
    const micBtn = document.getElementById('ai-tutor-mic');

    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      win.classList.toggle('is-open', isOpen);
      if (isOpen) {
        input.focus();
        if (!window.AITutorChat.getSessionId()) {
          const lastId = window.AITutorStorage.getLastSessionId();
          if (lastId && window.AITutorAPI.isAuthenticated()) restoreSession(lastId);
        }
      } else {
        window.AITutorVoice.stopSpeaking();
      }
    });

    closeBtn.addEventListener('click', () => {
      isOpen = false;
      win.classList.remove('is-open');
      window.AITutorVoice.stopSpeaking();
    });

    newBtn.addEventListener('click', () => {
      if (confirm('Start a new conversation?')) {
        window.AITutorChat.clear();
        window.AITutorStorage.setLastSessionId(null);
      }
    });

    historyBtn.addEventListener('click', async () => {
      if (!window.AITutorAPI.isAuthenticated()) {
        alert('Please sign in to view history.');
        return;
      }
      const sessions = window.AITutorStorage.getHistorySessions();
      if (sessions.length === 0) {
        alert('No past conversations found.');
        return;
      }
      const list = sessions.map((s, i) => `${i + 1}. ${new Date(s.updated_at).toLocaleDateString()}`).join('\n');
      const choice = prompt(`Select a conversation to restore:\n${list}\n\nEnter number:`);
      if (choice && sessions[parseInt(choice) - 1]) {
        restoreSession(sessions[parseInt(choice) - 1].id);
      }
    });

    levelSelect.addEventListener('change', (e) => {
      const level = e.target.value;
      window.AITutorChat.setLevel(level);
      window.AITutorStorage.setLevel(level);
      if (window.AITutorAPI.isAuthenticated()) {
        window.AITutorAPI.updateProfile(level).catch(() => {});
      }
    });

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
        const response = await window.AITutorAPI.sendMessage(message, window.AITutorChat.getLevel(), window.AITutorChat.getSessionId());
        window.AITutorChat.setSessionId(response.sessionId);
        window.AITutorStorage.setLastSessionId(response.sessionId);
        window.AITutorChat.addAssistantMessage(response.reply, response.correction, response.suggestion);
        
        // Auto-speak only if user just used voice input (optional, skipped here for better UX)
      } catch (error) {
        window.AITutorChat.showError(error.message || 'Failed to get response');
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    micBtn.addEventListener('click', () => {
      if (!window.AITutorVoice.isSupported.recognition) {
        window.AITutorChat.showError('Speech recognition not supported');
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
            window.AITutorChat.showError('Voice input failed');
            micBtn.classList.remove('is-listening');
          }
        );
      }
    });

    if (!window.AITutorVoice.isSupported.recognition) {
    levelSelect.addEventListener('change', (e) => {
    sendBtn.addEventListener('click', sendMessage);
    micBtn.addEventListener('click', () => {
      if (window.AITutorVoice.isListening()) {
        window.AITutorVoice.stopListening();
            micBtn.classList.remove('is-listening');
      const message = input.value.trim();
      if (!window.AITutorAPI.isAuthenticated()) {
      window.AITutorChat.setLevel(level);
        micBtn.classList.remove('is-listening');
        micBtn.classList.add('is-listening');
      }

      try {

      }
    });
      if (!message) return;

        
        input.disabled = false;
      input.value = '';
    async function sendMessage() {
      } finally {
    }
      input.disabled = true;
          }
      }
      sendBtn.disabled = true;
      }
            input.value = transcript;
      micBtn.title = 'Speech recognition not supported';

      window.AITutorChat.showLoading();
        return;
        input.focus();
      } catch (error) {
        return;

        sendBtn.disabled = false;
  }
    init: function() {
      } else {

          (transcript) => {
          (error) => {
      }
  window.AITutorWidget = {
      
          },
      createWidget();
        );
            micBtn.classList.remove('is-listening');
      window.AITutorStorage.setLevel(level);

        window.AITutorVoice.startListening(
      micBtn.disabled = true;
    });
      // Restore preferences
      bindEvents();
    }
      const level = e.target.value;
      const savedLevel = window.AITutorStorage.getLevel();
      if (window.AITutorAPI.isAuthenticated()) {
      document.getElementById('ai-tutor-level').value = savedLevel;
      window.AITutorChat.init(savedLevel);
      
      loadHistory();
    }
  };
})();
