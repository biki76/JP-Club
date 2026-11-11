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
    win.setAttribute('aria-modal', 'false');
    win.setAttribute('aria-labelledby', 'ai-tutor-title');
    win.innerHTML = `
      <div class="ai-tutor-header">
        <h3 class="ai-tutor-title" id="ai-tutor-title">AI Tutor</h3>
        <select class="ai-tutor-level-select" id="ai-tutor-level" aria-label="Select JLPT Level">
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
        </select>
        <select class="ai-tutor-level-select" id="ai-tutor-mode" aria-label="Practice mode">
          <option value="chat">Chat</option>
          <option value="roleplay">Role-play</option>
          <option value="correct">Check my sentence</option>
          <option value="explain">Explain</option>
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
    const modeSelect = document.getElementById('ai-tutor-mode');
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
      if (confirm(document.documentElement.lang === 'bn' ? 'নতুন কথোপকথন শুরু করবেন?' : 'Start a new conversation?')) {
        if (current) current.cancel();
        if (window.AITutorChat) window.AITutorChat.clear();
        if (window.AITutorStorage) window.AITutorStorage.setLastSessionId(null);
        window.AITutorState.set({ sessionId: null, pending: null, error: null, status: 'idle' });
      }
    });

    historyBtn.addEventListener('click', async function() {
      if (!window.AITutorAPI || !window.AITutorAPI.isAuthenticated()) {
        window.AITutorChat.showError(document.documentElement.lang === 'bn' ? 'ইতিহাস দেখতে সাইন ইন করুন।' : 'Please sign in to view history.');
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
      window.AITutorState.set({ level: level });
      if (window.AITutorStorage) window.AITutorStorage.setLevel(level);
      if (window.AITutorAPI && window.AITutorAPI.isAuthenticated()) {
        window.AITutorAPI.updateProfile(level).catch(function() {});
      }
    });

    var current = null;                         // active stream handle { cancel, done }
    var bn = function () { return document.documentElement.lang === 'bn'; };
    var S = function (en, b) { return bn() ? b : en; };

    function setBusy(busy) {
      isSending = busy;
      sendBtn.disabled = busy;
      input.disabled = busy;
      sendBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
      if (!busy) input.focus();
    }

    function errorText(err) {
      switch (err && err.code) {
        case 'offline': return S('You are offline. Your message is kept — it will be sent when you reconnect.', 'আপনি অফলাইনে। সংযোগ ফিরলে বার্তাটি পাঠানো হবে।');
        case 'rate_limited': return S('You are sending messages too fast. Wait a few seconds.', 'খুব দ্রুত বার্তা পাঠাচ্ছেন। কয়েক সেকেন্ড অপেক্ষা করুন।');
        case 'unauthorized': return S('Please sign in to use the AI Tutor.', 'AI টিউটর ব্যবহার করতে সাইন ইন করুন।');
        case 'stream_interrupted': return S('The connection dropped mid-answer.', 'উত্তরের মাঝপথে সংযোগ কেটে গেছে।');
        case 'timeout': return S('The tutor took too long to answer.', 'টিউটর উত্তর দিতে অনেক সময় নিয়েছে।');
        case 'too_long': return S('Message is too long (max 500 characters).', 'বার্তা খুব বড় (সর্বোচ্চ ৫০০ অক্ষর)।');
        default: return S('The tutor is unavailable right now.', 'টিউটর এই মুহূর্তে পাওয়া যাচ্ছে না।');
      }
    }

    function practiceFallback(level) {
      var list = {
        N5: ['わたしは がくせいです。', 'これは なんですか。', 'いま なんじですか。'],
        N4: ['きのう ともだちと えいがを みました。', 'にほんへ いったことが ありますか。'],
        N3: ['毎日練習するようにしています。', '来月から引っ越すことになりました。']
      }[level] || [];
      return list[Math.floor(Math.random() * list.length)] || '';
    }

    function fail(err, message) {
      var offline = err && err.code === 'offline';
      var actions = [];
      if (err && err.code !== 'unauthorized' && err.code !== 'too_long') {
        actions.push({ label: S('Retry', 'আবার চেষ্টা'), onClick: function () { runSend(message, true); } });
      }
      if (err && err.code === 'unauthorized') {
        actions.push({ label: S('Sign in', 'সাইন ইন'), onClick: function () { location.href = window.Sanitize ? window.Sanitize.appUrl('auth.html?next=' + encodeURIComponent(window.Sanitize.safeNext(location.pathname.split('/').pop() || 'home.html'))) : 'auth.html'; } });
      }
      window.AITutorChat.showStatus(offline ? 'offline' : 'error', errorText(err), actions);
      // degraded mode: never leave the learner with nothing to do
      if (err && (err.code === 'ai_unavailable' || err.code === 'network' || err.code === 'offline' || err.code === 'timeout')) {
        var s = practiceFallback(window.AITutorState.get().level);
        if (s) window.AITutorChat.showStatus(offline ? 'offline' : 'error',
          errorText(err) + '  ' + S('Meanwhile, try saying: ', 'ততক্ষণ এটি বলে অনুশীলন করুন: ') + s, actions);
      }
      window.AITutorState.set({ status: offline ? 'offline' : 'error', error: { code: err && err.code, message: err && err.message, partial: !!(err && err.partial) }, pending: { message: message } });
    }

    async function runSend(message, isRetry) {
      if (isSending) return;
      var st = window.AITutorState.get();
      if (!window.AITutorAPI.isAuthenticated()) {
        fail({ code: 'unauthorized' }, message);
        return;
      }
      setBusy(true);
      window.AITutorChat.clearStatus();
      if (!isRetry) window.AITutorChat.appendUserMessage(message);
      window.AITutorChat.showLoading();
      window.AITutorState.set({ status: 'sending', error: null });

      var bubble = null;
      current = window.AITutorAPI.streamMessage(message, st.level, st.sessionId || (window.AITutorStorage && window.AITutorStorage.getLastSessionId()), {
        onMeta: function (m) {
          if (m.sessionId) {
            window.AITutorState.set({ sessionId: m.sessionId });
            if (window.AITutorStorage) window.AITutorStorage.setLastSessionId(m.sessionId);
          }
        },
        onAttempt: function () { window.AITutorChat.showLoading(); },
        onDelta: function (t) {
          if (!bubble) { bubble = window.AITutorChat.beginStream(); window.AITutorState.set({ status: 'streaming' }); }
          bubble.append(t);
        },
        onDone: function (data) {
          if (!bubble) bubble = window.AITutorChat.beginStream();   // short answers may arrive only in `done`
          bubble.finish(data);
          if (window.AITutorVoice && window.AITutorVoice.autoSpeakEnabled) window.AITutorVoice.speakText(data.reply);
        }
      });
      try {
        await current.done;
        window.AITutorState.set({ status: 'idle', pending: null, error: null });
      } catch (err) {
        if (err && err.code === 'cancelled') { if (bubble) bubble.fail(); window.AITutorState.set({ status: 'idle' }); }
        else { if (bubble) bubble.fail(); window.AITutorChat.hideLoading(); fail(err, message); input.value = bubble && bubble.text() ? '' : message; }
      } finally {
        current = null;
        setBusy(false);
      }
    }

    function handleSend() {
      var message = (window.Sanitize ? window.Sanitize.text(input.value, 500) : input.value.trim().slice(0, 500));
      if (!message || isSending) return;
      input.value = '';
      runSend(message, false);
    }

    sendBtn.addEventListener('click', handleSend);
    // keydown + isComposing: pressing Enter to confirm an IME conversion must NOT send the message
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); handleSend(); }
      if (e.key === 'Escape') closeBtn.click();
    });
    input.maxLength = 500;

    // auto-resume when the connection returns
    window.addEventListener('online', function () {
      var st = window.AITutorState.get();
      if (st.status === 'offline' && st.pending && !isSending) runSend(st.pending.message, true);
    });
    window.addEventListener('offline', function () {
      if (isSending && current) current.cancel();
    });

    modeSelect.value = window.AITutorState.get().mode;
    modeSelect.addEventListener('change', function (e) { window.AITutorState.set({ mode: e.target.value }); });

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
      
      const savedLevel = window.AITutorState ? window.AITutorState.get().level : (window.AITutorStorage ? window.AITutorStorage.getLevel() : 'N5');
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
