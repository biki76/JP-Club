/* AI Tutor Chat Management */
(function() {
  'use strict';

  let currentSessionId = null;
  let currentLevel = 'N5';
  let messages = [];

  function createMessageElement(role, content, correction, suggestion) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-tutor-message ai-tutor-message--${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'ai-tutor-message-bubble';
    bubble.textContent = content;
    messageDiv.appendChild(bubble);

    // Add correction card if present
    if (correction) {
      const correctionCard = document.createElement('div');
      correctionCard.className = 'ai-tutor-feedback ai-tutor-correction';
      correctionCard.innerHTML = `
        <span class="ai-tutor-feedback-label">Correction:</span>
        <div class="ai-tutor-feedback-original">${window.AITutorUtils.safeText(correction.original)}</div>
        <div class="ai-tutor-feedback-corrected">${window.AITutorUtils.safeText(correction.corrected)}</div>
        <div class="ai-tutor-feedback-explanation">${window.AITutorUtils.safeText(correction.explanation)}</div>
      `;
      messageDiv.appendChild(correctionCard);
    }

    // Add suggestion card if present
    if (suggestion) {
      const suggestionCard = document.createElement('div');
      suggestionCard.className = 'ai-tutor-feedback ai-tutor-suggestion';
      suggestionCard.innerHTML = `
        <span class="ai-tutor-feedback-label">Suggestion:</span>
        <div class="ai-tutor-feedback-corrected">${window.AITutorUtils.safeText(suggestion.text)}</div>
        <div class="ai-tutor-feedback-explanation">${window.AITutorUtils.safeText(suggestion.explanation)}</div>
      `;
      messageDiv.appendChild(suggestionCard);
    }

    return messageDiv;
  }

  function createLoadingElement() {
    const loading = document.createElement('div');
    loading.className = 'ai-tutor-loading';
    loading.id = 'ai-tutor-loading';
    loading.innerHTML = `
      <div class="ai-tutor-loading-dot"></div>
      <div class="ai-tutor-loading-dot"></div>
      <div class="ai-tutor-loading-dot"></div>
    `;
    return loading;
  }

  function createEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'ai-tutor-empty';
    empty.id = 'ai-tutor-empty';
    empty.innerHTML = `
      <div class="ai-tutor-empty-icon">🎓</div>
      <div class="ai-tutor-empty-text">
        Start practicing Japanese!<br>
        Type a message or use the microphone to speak.
      </div>
    `;
    return empty;
  }

  function showError(message) {
    const chat = document.getElementById('ai-tutor-chat');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-tutor-error';
    errorDiv.textContent = message;
    chat.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
  }

  window.AITutorChat = {
    init: function(level) {
      currentLevel = level || 'N5';
      const chat = document.getElementById('ai-tutor-chat');
      if (chat) {
        chat.innerHTML = '';
        chat.appendChild(createEmptyState());
      }
    },

    setLevel: function(level) {
      currentLevel = level;
    },

    getLevel: function() {
      return currentLevel;
    },

    getSessionId: function() {
      return currentSessionId;
    },

    setSessionId: function(sessionId) {
      currentSessionId = sessionId;
    },

    addUserMessage: function(content) {
      const chat = document.getElementById('ai-tutor-chat');
      const empty = document.getElementById('ai-tutor-empty');
      if (empty) empty.remove();

      const messageEl = createMessageElement('user', content);
      chat.appendChild(messageEl);
      chat.scrollTop = chat.scrollHeight;

      messages.push({ role: 'user', content });
    },

    addAssistantMessage: function(content, correction, suggestion) {
      const chat = document.getElementById('ai-tutor-chat');
      const loading = document.getElementById('ai-tutor-loading');
      if (loading) loading.remove();

      const messageEl = createMessageElement('assistant', content, correction, suggestion);
      chat.appendChild(messageEl);
      chat.scrollTop = chat.scrollHeight;

      messages.push({ role: 'assistant', content, correction, suggestion });
    },

    showLoading: function() {
      const chat = document.getElementById('ai-tutor-chat');
      chat.appendChild(createLoadingElement());
      chat.scrollTop = chat.scrollHeight;
    },

    showError: showError,

    clear: function() {
      currentSessionId = null;
      messages = [];
      const chat = document.getElementById('ai-tutor-chat');
      if (chat) {
        chat.innerHTML = '';
        chat.appendChild(createEmptyState());
      }
    }
  };
})();
