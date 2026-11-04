(function() {
  'use strict';

  let currentSessionId = null;
  let currentLevel = 'N5';

  function createMessageElement(role, content, correction, suggestion, id) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-tutor-message ai-tutor-message--${role}`;
    messageDiv.dataset.msgId = id;

    const bubbleRow = document.createElement('div');
    bubbleRow.style.display = 'flex';
    bubbleRow.style.alignItems = 'flex-end';
    bubbleRow.style.gap = '8px';

    const bubble = document.createElement('div');
    bubble.className = 'ai-tutor-message-bubble';
    bubble.textContent = content;
    bubbleRow.appendChild(bubble);

    // Add play button for assistant messages
    if (role === 'assistant' && window.AITutorVoice.isSupported.synthesis) {
      const playBtn = document.createElement('button');
      playBtn.className = 'ai-tutor-btn ai-tutor-btn-mic';
      playBtn.style.width = '32px';
      playBtn.style.height = '32px';
      playBtn.style.flexShrink = '0';
      playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      playBtn.title = 'Play audio';
      playBtn.setAttribute('aria-label', 'Play audio');
      
      playBtn.addEventListener('click', () => {
        if (window.AITutorVoice.isSpeaking()) {
          window.AITutorVoice.stopSpeaking();
          playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        } else {
          window.AITutorVoice.speak(content, () => {
            playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
          });
          playBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        }
      });
      bubbleRow.appendChild(playBtn);
    }

    messageDiv.appendChild(bubbleRow);

    if (correction) {
      const card = document.createElement('div');
      card.className = 'ai-tutor-feedback ai-tutor-correction';
      card.innerHTML = `
        <span class="ai-tutor-feedback-label">Correction:</span>
        <div class="ai-tutor-feedback-original">${window.AITutorUtils.safeText(correction.original)}</div>
        <div class="ai-tutor-feedback-corrected">${window.AITutorUtils.safeText(correction.corrected)}</div>
        <div class="ai-tutor-feedback-explanation">${window.AITutorUtils.safeText(correction.explanation)}</div>
      `;
      messageDiv.appendChild(card);
    }

    if (suggestion) {
      const card = document.createElement('div');
      card.className = 'ai-tutor-feedback ai-tutor-suggestion';
      card.innerHTML = `
        <span class="ai-tutor-feedback-label">Suggestion:</span>
        <div class="ai-tutor-feedback-corrected">${window.AITutorUtils.safeText(suggestion.text)}</div>
        <div class="ai-tutor-feedback-explanation">${window.AITutorUtils.safeText(suggestion.explanation)}</div>
      `;
      messageDiv.appendChild(card);
    }

    return messageDiv;
  }

  function createLoadingElement() {
    const loading = document.createElement('div');
    loading.className = 'ai-tutor-loading';
    loading.id = 'ai-tutor-loading';
    loading.innerHTML = `<div class="ai-tutor-loading-dot"></div><div class="ai-tutor-loading-dot"></div><div class="ai-tutor-loading-dot"></div>`;
    return loading;
  }

  function createEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'ai-tutor-empty';
    empty.id = 'ai-tutor-empty';
    empty.innerHTML = `<div class="ai-tutor-empty-icon">🎓</div><div class="ai-tutor-empty-text">Start practicing Japanese!<br>Type a message or use the microphone.</div>`;
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
    setLevel: (level) => { currentLevel = level; },
    getLevel: () => currentLevel,
    getSessionId: () => currentSessionId,
    setSessionId: (sessionId) => { currentSessionId = sessionId; },
    
    addUserMessage: function(content) {
      const chat = document.getElementById('ai-tutor-chat');
      const empty = document.getElementById('ai-tutor-empty');
      if (empty) empty.remove();
      chat.appendChild(createMessageElement('user', content));
      chat.scrollTop = chat.scrollHeight;
    },
    
    addAssistantMessage: function(content, correction, suggestion, id) {
      const chat = document.getElementById('ai-tutor-chat');
      const loading = document.getElementById('ai-tutor-loading');
      if (loading) loading.remove();
      chat.appendChild(createMessageElement('assistant', content, correction, suggestion, id));
      chat.scrollTop = chat.scrollHeight;
    },

    renderHistory: function(messages) {
      const chat = document.getElementById('ai-tutor-chat');
      chat.innerHTML = '';
      if (!messages || messages.length === 0) {
        chat.appendChild(createEmptyState());
        return;
      }
      messages.forEach(msg => {
        chat.appendChild(createMessageElement(msg.role, msg.content, msg.correction, msg.suggestion, msg.id));
      });
      chat.scrollTop = chat.scrollHeight;
    },

    showLoading: function() {
      const chat = document.getElementById('ai-tutor-chat');
      chat.appendChild(createLoadingElement());
      chat.scrollTop = chat.scrollHeight;
    },
    showError: showError,
    clear: function() {
      currentSessionId = null;
      const chat = document.getElementById('ai-tutor-chat');
      if (chat) {
        chat.innerHTML = '';
        chat.appendChild(createEmptyState());
      }
    }
  };
})();
