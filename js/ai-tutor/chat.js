/* js/ai-tutor/chat.js — chat rendering. All model/user text goes through textContent
 * (never innerHTML). Adds a streaming bubble, a status banner and a translation line. */
(function () {
  'use strict';

  function bn() { return document.documentElement.lang === 'bn'; }
  function S(en, b) { return bn() ? b : en; }

  window.AITutorChat = {
    chatContainer: null,
    statusEl: null,

    init: function () {
      this.chatContainer = document.getElementById('ai-tutor-chat');
    },

    clear: function () {
      if (!this.chatContainer) return;
      this.chatContainer.textContent = '';
      this.statusEl = null;
      this.renderEmptyState();
    },

    renderEmptyState: function () {
      if (!this.chatContainer) return;
      this.chatContainer.textContent = '';
      var wrap = document.createElement('div'); wrap.className = 'ai-tutor-empty';
      var icon = document.createElement('div'); icon.className = 'ai-tutor-empty-icon'; icon.textContent = '🎓';
      var t = document.createElement('div'); t.className = 'ai-tutor-empty-text';
      t.appendChild(document.createTextNode('こんにちは！'));
      t.appendChild(document.createElement('br'));
      t.appendChild(document.createTextNode(S("Let's practice Japanese together.", 'চলুন একসাথে জাপানি অনুশীলন করি।')));
      t.appendChild(document.createElement('br'));
      t.appendChild(document.createTextNode(S('Pick your level and start typing or speaking.', 'লেভেল বেছে লেখা বা বলা শুরু করুন।')));
      wrap.appendChild(icon); wrap.appendChild(t);
      this.chatContainer.appendChild(wrap);
    },

    _dropEmpty: function () {
      var e = this.chatContainer && this.chatContainer.querySelector('.ai-tutor-empty');
      if (e) e.remove();
    },

    showLoading: function () {
      if (!this.chatContainer) return;
      this._dropEmpty();
      if (document.getElementById('ai-tutor-loading-indicator')) return;
      var loader = document.createElement('div');
      loader.className = 'ai-tutor-loading'; loader.id = 'ai-tutor-loading-indicator';
      for (var i = 0; i < 3; i++) { var d = document.createElement('div'); d.className = 'ai-tutor-loading-dot'; loader.appendChild(d); }
      this.chatContainer.appendChild(loader);
      this.scrollToBottom(true);
    },

    hideLoading: function () {
      var l = document.getElementById('ai-tutor-loading-indicator');
      if (l) l.remove();
    },

    /* kind: 'error' | 'offline' | 'info'. actions: [{ label, onClick }] */
    showStatus: function (kind, text, actions) {
      if (!this.chatContainer) return;
      this.clearStatus();
      this.hideLoading();
      var box = document.createElement('div');
      box.className = 'ai-tutor-status ai-tutor-status--' + kind;
      box.setAttribute('role', kind === 'info' ? 'status' : 'alert');
      var p = document.createElement('span'); p.className = 'ai-tutor-status-text'; p.textContent = text;
      box.appendChild(p);
      (actions || []).forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ai-tutor-status-btn'; b.textContent = a.label;
        b.addEventListener('click', a.onClick);
        box.appendChild(b);
      });
      this.statusEl = box;
      this.chatContainer.appendChild(box);
      this.scrollToBottom(true);
    },

    clearStatus: function () {
      if (this.statusEl) { this.statusEl.remove(); this.statusEl = null; }
    },

    showError: function (message) { this.showStatus('error', message); },

    appendUserMessage: function (text) {
      if (!this.chatContainer) return;
      this._dropEmpty();
      var row = document.createElement('div'); row.className = 'ai-tutor-message ai-tutor-message--user';
      var bubble = document.createElement('div'); bubble.className = 'ai-tutor-message-bubble';
      bubble.textContent = text; bubble.lang = 'ja';
      row.appendChild(bubble);
      this.chatContainer.appendChild(row);
      this.scrollToBottom(true);
    },

    _replayButton: function (getText) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ai-tutor-replay-btn';
      var label = S('Listen again', 'আবার শুনুন');
      btn.title = label; btn.setAttribute('aria-label', label);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14'); svg.setAttribute('height', '14'); svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '5 3 19 12 5 21 5 3'); svg.appendChild(poly); btn.appendChild(svg);
      btn.addEventListener('click', function () { if (window.AITutorVoice) window.AITutorVoice.speakText(getText()); });
      return btn;
    },

    /* Streaming: returns { append(text), finish(data), fail(), el } */
    beginStream: function () {
      var self = this;
      this._dropEmpty(); this.hideLoading(); this.clearStatus();
      var row = document.createElement('div'); row.className = 'ai-tutor-message ai-tutor-message--assistant';
      var wrap = document.createElement('div'); wrap.style.position = 'relative'; wrap.style.display = 'inline-block';
      var bubble = document.createElement('div'); bubble.className = 'ai-tutor-message-bubble is-streaming'; bubble.lang = 'ja';
      var text = document.createTextNode(''); bubble.appendChild(text);
      wrap.appendChild(bubble); row.appendChild(wrap);
      this.chatContainer.appendChild(row);
      var acc = '';

      return {
        el: row,
        append: function (t) { acc += t; text.nodeValue = acc; self.scrollToBottom(false); },
        text: function () { return acc; },
        finish: function (data) {
          bubble.classList.remove('is-streaming');
          text.nodeValue = data.reply || acc;              // server's cleaned final text wins
          wrap.appendChild(self._replayButton(function () { return data.reply || acc; }));
          if (data.translation) {
            var tr = document.createElement('div'); tr.className = 'ai-tutor-translation'; tr.textContent = data.translation;
            row.appendChild(tr);
          }
          if (data.correction && data.correction.original) self.appendFeedbackCard(row, S('Correction', 'সংশোধন'), data.correction, 'ai-tutor-correction');
          if (data.suggestion && data.suggestion.text) self.appendFeedbackCard(row, S('Try this', 'এটি বলে দেখুন'), data.suggestion, 'ai-tutor-suggestion');
          self.scrollToBottom(false);
        },
        /* keep whatever was received, mark it as incomplete */
        fail: function () {
          bubble.classList.remove('is-streaming'); bubble.classList.add('is-incomplete');
          if (!acc) row.remove();
        }
      };
    },

    /* Non-streaming + history rendering */
    appendAssistantMessage: function (data, isHistory) {
      if (!this.chatContainer) return;
      if (!isHistory) this.hideLoading();
      var h = this.beginStream();
      h.append(data.reply || '');
      h.finish(data);
      if (!isHistory && window.AITutorVoice && window.AITutorVoice.autoSpeakEnabled) window.AITutorVoice.speakText(data.reply);
    },

    appendFeedbackCard: function (parent, label, fb, className) {
      var card = document.createElement('div'); card.className = 'ai-tutor-feedback ' + className;
      function line(cls, t) { var d = document.createElement('div'); d.className = cls; d.textContent = t; card.appendChild(d); }
      var l = document.createElement('span'); l.className = 'ai-tutor-feedback-label'; l.textContent = label + ':'; card.appendChild(l);
      if (fb.original) line('ai-tutor-feedback-original', fb.original);
      if (fb.corrected || fb.text) line('ai-tutor-feedback-corrected', fb.corrected || fb.text);
      if (fb.explanation) line('ai-tutor-feedback-explanation', fb.explanation);
      parent.appendChild(card);
    },

    renderHistoryList: function (sessions) {
      if (!this.chatContainer) return;
      this.chatContainer.textContent = '';
      if (!sessions || !sessions.length) {
        var e = document.createElement('div'); e.className = 'ai-tutor-empty';
        var t = document.createElement('div'); t.className = 'ai-tutor-empty-text'; t.textContent = S('No past conversations found.', 'আগের কোনো কথোপকথন নেই।');
        e.appendChild(t); this.chatContainer.appendChild(e); return;
      }
      var list = document.createElement('div'); list.className = 'ai-tutor-history-list';
      var self = this;
      sessions.forEach(function (s) {
        var item = document.createElement('button'); item.type = 'button'; item.className = 'ai-tutor-history-item';
        var lv = document.createElement('span'); lv.className = 'ai-tutor-history-level'; lv.textContent = String(s.jlpt_level || '');
        var dt = document.createElement('span'); dt.className = 'ai-tutor-history-date';
        dt.textContent = new Date(s.created_at).toLocaleDateString();
        item.appendChild(lv); item.appendChild(dt);
        item.addEventListener('click', function () { self.loadSessionHistory(s.id, s.jlpt_level); });
        list.appendChild(item);
      });
      this.chatContainer.appendChild(list);
    },

    loadSessionHistory: async function (sessionId, level) {
      if (!this.chatContainer) return;
      this.chatContainer.textContent = '';
      this.showLoading();
      var sel = document.getElementById('ai-tutor-level');
      if (sel && window.AITutorState && window.AITutorState.LEVELS.indexOf(level) > -1) { sel.value = level; window.AITutorState.set({ level: level }); }
      try {
        var history = await window.AITutorAPI.getHistory(sessionId);
        this.chatContainer.textContent = '';
        var self = this;
        history.forEach(function (m) {
          if (m.role === 'user') self.appendUserMessage(m.content);
          else self.appendAssistantMessage({ reply: m.content, correction: m.correction, suggestion: m.suggestion }, true);
        });
        if (window.AITutorState) window.AITutorState.set({ sessionId: sessionId });
        if (window.AITutorStorage) window.AITutorStorage.setLastSessionId(sessionId);
        this.scrollToBottom(true);
      } catch (e) {
        this.showError(S('Failed to load the conversation.', 'কথোপকথন লোড করা যায়নি।'));
      }
    },

    /* Only follow new content if the user has not scrolled up to read. */
    scrollToBottom: function (force) {
      var c = this.chatContainer; if (!c) return;
      var near = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
      if (force || near) c.scrollTop = c.scrollHeight;
    }
  };
})();
