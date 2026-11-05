(function() {
  'use strict';

  let isOpen = false;
  let isSending = false;

  function createWidget() {
    const toggle = document.createElement('button');
    toggle.className = 'ai-tutor-toggle';
    toggle.id = 'ai-tutor-toggle';
    toggle.setAttribute('aria-label', 'Open AI Japanese Tutor');
    toggle.innerHTML = '<span class="ai-tutor-toggle-icon">🎓</span><span class="ai-tutor-toggle-indicator"></span>';

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
          <button class="ai-tutor-header-btn" id="ai-tutor-history" title="History" aria-label="Conversation History">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button class="ai-tutor-header-btn" id="ai-tutor-speaker" title="Toggle Auto-Speak" aria-label="Toggle Auto-Speak">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
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
  }

  function bindEvents() {
    const toggle = document.getElementById('ai-tutor-toggle');
    const win = document.getElementById('ai-tutor-window');
    const closeBtn = document.getElementById('ai-tutor-close');
    const newBtn = document.getElementById('ai-tutor-new');
    const historyBtn = document.getElementById('ai-tutor-history');
    const speakerBtn = document.getElementById('ai-tutor-speaker');
    const levelSelect = document.getElementById('ai-tutor-level');
    const input = document.getElementById('ai-tutor-input');
    const sendBtn = document.getElementById('ai-tutor-send');
    const micBtn = document.getElementById('ai-tutor-mic');

    toggle.addEventListener('click', function() {
      isOpen = !isOpen;
      win.classList.toggle('is-open', isOpen);
      if (isOpen) {
        input.focus();
      } else {
        if (window.AITutorVoice) window.AITutorVoice.stopSpeaking();
      }
    });

    closeBtn.addEventListener('click', function() {
      isOpen = false;
      win.classList.remove('is-open');
      if (window.AITutorVoice) window.AITutorVoice.stopSpeaking();
    });

    newBtn.addEventListener('click', function() {
      if (confirm('Start a new conversation?')) {
        if (window.AITutorChat) window.AITutorChat.clear();
        if (window.AITutorStorage) window.AITutorStorage.setLastSessionId(null);
      }
    });

    historyBtn.addEventListener('click', async function() {
      if (!window.AITutorAPI || !window.AITutorAPI.isAuthenticated()) {
        window.AITutorChat.showError('Please sign in to view history.');
        return;
      }
      if (window.AITutorChat) window.AITutorChat.showLoading();
      try {
        const sessions = await window.AITutorAPI.getSessions();
        if (window.AITutorChat) window.AITutorChat.renderHistoryList(sessions);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        if (window.AITutorChat) window.AITutorChat.showError('Failed to load history.');
      }
    });

    speakerBtn.addEventListener('click', function() {
      if (window.AITutorVoice) {
        window.AITutorVoice.autoSpeakEnabled = !window.AITutorVoice.autoSpeakEnabled;
        if (window.AITutorStorage) window.AITutorStorage.setAutoSpeak(window.AITutorVoice.autoSpeakEnabled);
        speakerBtn.classList.toggle('is-active', window.AITutorVoice.autoSpeakEnabled);
      }
    });

    levelSelect.addEventListener('change', function(e) {
      const level = e.target.value;
      if (window.AITutorStorage) window.AITutorStorage.setLevel(level);
      if (window.AITutorAPI && window.AITutorAPI.isAuthenticated()) {
        window.AITutorAPI.updateProfile(level).catch(function() {});
      }
    });

    async function handleSend() {
      if (isSending) return;
      const message = input.value.trim();
      if (!message) return;

      const level = levelSelect.value;
      const sessionId = window.AITutorStorage ? window.AITutorStorage.getLastSessionId() : null;
      const isAuth = window.AITutorAPI && window.AITutorAPI.isAuthenticated();

      if (!isAuth) {
        window.AITutorChat.showError('Please sign in to save your chat history.');
      }

      isSending = true;
      sendBtn.disabled = true;
      input.disabled = true;
      input.value = ''; 

      window.AITutorChat.appendUserMessage(message);
      window.AITutorChat.showLoading();

      try {
        const response = await window.AITutorAPI.sendMessage(message, level, sessionId);
        
        if (response.sessionId && window.AITutorStorage) {
          window.AITutorStorage.setLastSessionId(response.sessionId);
        }

        window.AITutorChat.appendAssistantMessage(response);

        if (!isAuth && window.AITutorStorage) {
          window.AITutorStorage.saveGuestMessage({ role: 'user', content: message });
          window.AITutorStorage.saveGuestMessage({ role: 'assistant', content: response.reply, correction: response.correction, suggestion: response.suggestion });
        }
      } catch (error) {
        console.error('AI Tutor API Error:', error);
        window.AITutorChat.showError(error.message || 'Failed to get a response. Please try again.');
        input.value = message; 
      } finally {
        isSending = false;
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSend();
    });

    if (micBtn) {
      micBtn.addEventListener('click', function() {
        if (window.AITutorVoice) window.AITutorVoice.toggleListening();
      });
    }
  }

  window.AITutorWidget = {
    init: function() {
      createWidget();
      bindEvents();
      if (window.AITutorChat) window.AITutorChat.init();
      if (window.AITutorVoice) window.AITutorVoice.init();
      
      const savedLevel = window.AITutorStorage ? window.AITutorStorage.getLevel() : 'N5';
      const levelSelect = document.getElementById('ai-tutor-level');
      if (levelSelect) levelSelect.value = savedLevel;

      if (window.AITutorVoice && window.AITutorStorage) {
        window.AITutorVoice.autoSpeakEnabled = window.AITutorStorage.getAutoSpeak();
        const speakerBtn = document.getElementById('ai-tutor-speaker');
        if (speakerBtn) speakerBtn.classList.toggle('is-active', window.AITutorVoice.autoSpeakEnabled);
      }

      if (window.AITutorChat) window.AITutorChat.renderEmptyState();
    }
  };
})();
