(function() {
  'use strict';

  window.AITutorChat = {
    chatContainer: null,

    init: function() {
      this.chatContainer = document.getElementById('ai-tutor-chat');
    },

    clear: function() {
      if (this.chatContainer) {
        this.chatContainer.innerHTML = '';
        this.renderEmptyState();
      }
    },

    renderEmptyState: function() {
      if (!this.chatContainer) return;
      this.chatContainer.innerHTML = `
        <div class="ai-tutor-empty">
          <div class="ai-tutor-empty-icon">🎓</div>
          <div class="ai-tutor-empty-text">こんにちは！<br>Let's practice Japanese together.<br>Select your level and start typing or speaking.</div>
        </div>
      `;
    },

    showLoading: function() {
      if (!this.chatContainer) return;
      const empty = this.chatContainer.querySelector('.ai-tutor-empty');
      if (empty) empty.remove();

      const loader = document.createElement('div');
      loader.className = 'ai-tutor-loading';
      loader.id = 'ai-tutor-loading-indicator';
      loader.innerHTML = '<div class="ai-tutor-loading-dot"></div><div class="ai-tutor-loading-dot"></div><div class="ai-tutor-loading-dot"></div>';
      this.chatContainer.appendChild(loader);
      this.scrollToBottom();
    },

    hideLoading: function() {
      const loader = document.getElementById('ai-tutor-loading-indicator');
      if (loader) loader.remove();
    },

    showError: function(message) {
      if (!this.chatContainer) return;
      this.hideLoading();
      const err = document.createElement('div');
      err.className = 'ai-tutor-error';
      err.textContent = message; 
      this.chatContainer.appendChild(err);
      this.scrollToBottom();
    },

    appendUserMessage: function(text) {
      if (!this.chatContainer) return;
      const empty = this.chatContainer.querySelector('.ai-tutor-empty');
      if (empty) empty.remove();

      const msgDiv = document.createElement('div');
      msgDiv.className = 'ai-tutor-message ai-tutor-message--user';
      const bubble = window.AITutorUtils.createTextElement('div', text, 'ai-tutor-message-bubble');
      msgDiv.appendChild(bubble);
      this.chatContainer.appendChild(msgDiv);
      this.scrollToBottom();
    },

    appendAssistantMessage: function(data, isHistory = false) {
      if (!this.chatContainer) return;
      if (!isHistory) this.hideLoading();

      const msgDiv = document.createElement('div');
      msgDiv.className = 'ai-tutor-message ai-tutor-message--assistant';

      const bubbleWrapper = document.createElement('div');
      bubbleWrapper.style.position = 'relative';
      bubbleWrapper.style.display = 'inline-block';

      const bubble = window.AITutorUtils.createTextElement('div', data.reply, 'ai-tutor-message-bubble');
      bubbleWrapper.appendChild(bubble);

      // Replay audio button
      const replayBtn = document.createElement('button');
      replayBtn.className = 'ai-tutor-replay-btn';
      replayBtn.title = 'Listen again';
      replayBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      replayBtn.addEventListener('click', () => {
        if (window.AITutorVoice) window.AITutorVoice.speakText(data.reply);
      });
      bubbleWrapper.appendChild(replayBtn);
      msgDiv.appendChild(bubbleWrapper);

      if (data.correction && data.correction.original) {
        this.appendFeedbackCard(msgDiv, 'Correction', data.correction, 'ai-tutor-correction');
      }
      if (data.suggestion && data.suggestion.text) {
        this.appendFeedbackCard(msgDiv, 'Suggestion', data.suggestion, 'ai-tutor-suggestion');
      }

      this.chatContainer.appendChild(msgDiv);
      this.scrollToBottom();

      if (!isHistory && window.AITutorVoice && window.AITutorVoice.autoSpeakEnabled) {
        window.AITutorVoice.speakText(data.reply);
      }
    },

    appendFeedbackCard: function(parent, label, feedbackData, className) {
      const card = document.createElement('div');
      card.className = 'ai-tutor-feedback ' + className;

      const labelEl = window.AITutorUtils.createTextElement('span', label + ':', 'ai-tutor-feedback-label');
      card.appendChild(labelEl);

      if (feedbackData.original) {
        const orig = window.AITutorUtils.createTextElement('div', feedbackData.original, 'ai-tutor-feedback-original');
        card.appendChild(orig);
      }
      if (feedbackData.corrected || feedbackData.text) {
        const corr = window.AITutorUtils.createTextElement('div', feedbackData.corrected || feedbackData.text, 'ai-tutor-feedback-corrected');
        card.appendChild(corr);
      }
      if (feedbackData.explanation) {
        const exp = window.AITutorUtils.createTextElement('div', feedbackData.explanation, 'ai-tutor-feedback-explanation');
        card.appendChild(exp);
      }

      parent.appendChild(card);
    },

    renderHistoryList: function(sessions) {
      if (!this.chatContainer) return;
      this.chatContainer.innerHTML = '';
      
      if (!sessions || sessions.length === 0) {
        this.chatContainer.innerHTML = '<div class="ai-tutor-empty"><div class="ai-tutor-empty-text">No past conversations found.</div></div>';
        return;
      }

      const list = document.createElement('div');
      list.className = 'ai-tutor-history-list';

      sessions.forEach(session => {
        const item = document.createElement('button');
        item.className = 'ai-tutor-history-item';
        const date = new Date(session.created_at).toLocaleDateString();
        item.innerHTML = '<span class="ai-tutor-history-level">' + session.jlpt_level + '</span><span class="ai-tutor-history-date">' + date + '</span>';
        item.addEventListener('click', () => {
          this.loadSessionHistory(session.id, session.jlpt_level);
        });
        list.appendChild(item);
      });

      this.chatContainer.appendChild(list);
    },

    loadSessionHistory: async function(sessionId, level) {
      if (!this.chatContainer) return;
      this.chatContainer.innerHTML = '';
      this.showLoading();

      const levelSelect = document.getElementById('ai-tutor-level');
      if (levelSelect) levelSelect.value = level;
      if (window.AITutorStorage) window.AITutorStorage.setLevel(level);

      try {
        const history = await window.AITutorAPI.getHistory(sessionId);
        this.chatContainer.innerHTML = ''; 
        
        history.forEach(msg => {
          if (msg.role === 'user') {
            this.appendUserMessage(msg.content);
          } else {
            this.appendAssistantMessage({
              reply: msg.content,
              correction: msg.correction,
              suggestion: msg.suggestion
            }, true); 
          }
        });

        if (window.AITutorStorage) window.AITutorStorage.setLastSessionId(sessionId);
      } catch (error) {
        console.error('Failed to load history:', error);
        this.showError('Failed to load conversation history.');
      }
    },

    scrollToBottom: function() {
      if (this.chatContainer) {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      }
    }
  };
})();
