// js/tutor-voice.js
// Moon (ムーン) voice tutor client.
// Pure helpers are exposed on globalThis.TutorVoicePure for tests.
// Browser code is gated so node --check and node:vm loading never
// touch the DOM.

(function () {
  'use strict';

  var FIXED_OPENER =
    'こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。';

  function applyOpenerPostCheck(text, hasPrior) {
    if (!hasPrior) return FIXED_OPENER;
    if (typeof text !== 'string') return '';
    if (text.indexOf('きょうは') === 0) {
      return 'こんにちは、' + text.slice('きょうは'.length);
    }
    return text;
  }

  function correctSelfIntro(text) {
    if (typeof text !== 'string') return '';
    var re =
      /(わたしは|私は|ぼくは|僕は)([^。、\n]+?)(です|といいます|と言います|っていいます)。?/g;
    return text.replace(re, function (m, _p1, p2) {
      var name = String(p2).trim();
      if (name === 'ムーン') return m;
      return 'わたしはムーンです。';
    });
  }

  function nameAcknowledgement(name) {
    var n = String(name || '').trim();
    if (!n) return 'お名前を教えていただけますか。';
    return 'はじめまして、' + n + 'さん。よろしくお願いします。';
  }

  function interruptionReply() {
    return 'あ、すみません。どうぞ。';
  }

  function prepareForSpeech(text) {
    if (typeof text !== 'string') return '';
    var out = text;
    out = out.replace(/Moon/g, 'ムーン').replace(/moon/g, 'ムーン');
    out = out.replace(/ムン(?!ー)/g, 'ムーン');
    out = out.replace(/\*\*(.+?)\*\*/g, '$1');
    out = out.replace(/\*(.+?)\*/g, '$1');
    out = out.replace(/`([^`]+)`/g, '$1');
    out = out.replace(/。{2,}/g, '。');
    return out.trim();
  }

  function parseCandidates(raw) {
    var fallback = [{
      jp: 'すみません、うまく聞き取れませんでした。もう一度お願いします。',
      furigana: 'すみません、うまくききとれませんでした。もういちどおねがいします。',
      en: 'Sorry, I could not catch that. Please try again.',
      bn: 'দুঃখিত, আমি বুঝতে পারিনি। আবার বলুন।',
    }];
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    var s = raw.trim();
    s = s.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    var start = s.indexOf('[');
    var end = s.lastIndexOf(']');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    var parsed;
    try { parsed = JSON.parse(s); } catch (e) { return fallback; }
    if (!Array.isArray(parsed)) return fallback;
    var out = [];
    for (var i = 0; i < parsed.length && out.length < 3; i++) {
      var c = parsed[i];
      if (!c || typeof c !== 'object') continue;
      var jp = typeof c.jp === 'string' ? c.jp : '';
      if (!jp) continue;
      out.push({
        jp: jp,
        furigana: typeof c.furigana === 'string' ? c.furigana : jp,
        en: typeof c.en === 'string' ? c.en : '',
        bn: typeof c.bn === 'string' ? c.bn : '',
      });
    }
    return out.length ? out : fallback;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.TutorVoicePure = {
      FIXED_OPENER: FIXED_OPENER,
      applyOpenerPostCheck: applyOpenerPostCheck,
      correctSelfIntro: correctSelfIntro,
      nameAcknowledgement: nameAcknowledgement,
      interruptionReply: interruptionReply,
      prepareForSpeech: prepareForSpeech,
      parseCandidates: parseCandidates,
    };
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ---------- Browser state ----------

  var state = 'idle';
  var micEnabled = false;
  var speakingSince = 0;
  var partialUtterance = '';
  var silenceTimer = null;
  var currentAudio = null;
  var recognition = null;
  var sessionId = genId();
  var history = [];
  var voiceList = [];
  var selectedVoice = null;
  var speechRate = 1;
  var furiganaOn = true;

  var appEl, statusPill, statusText, avatarWrap, conversationEl;
  var candidateArea, micBtn, settingsBtn, settingsPanel;
  var voiceSelect, speedRange, furiganaToggle, voiceNotice;

  function genId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function labelFor(s) {
    if (s === 'listening') return 'Listening';
    if (s === 'thinking') return 'Thinking';
    if (s === 'speaking') return 'Speaking';
    return 'Idle';
  }

  function resolveEndpoint() {
    if (window.TUTOR_ENDPOINT) return window.TUTOR_ENDPOINT;
    if (window.SUPABASE_URL) {
      return window.SUPABASE_URL.replace(/\/$/, '') +
        '/functions/v1/voice-tutor';
    }
    if (window.SUPABASE_FUNCTIONS_URL) {
      return window.SUPABASE_FUNCTIONS_URL.replace(/\/$/, '') +
        '/voice-tutor';
    }
    return '';
  }

  function resolveAnonKey() {
    return window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || '';
  }

  function meloEndpoint() {
    if (window.MELO_TTS_ENDPOINT) return window.MELO_TTS_ENDPOINT;
    if (window.SUPABASE_URL) {
      return window.SUPABASE_URL.replace(/\/$/, '') +
        '/functions/v1/melo-tts';
    }
    return '';
  }

  function setState(next) {
    state = next;
    if (appEl) appEl.dataset.state = next;
    if (statusPill) statusPill.dataset.state = next;
    if (statusText) statusText.textContent = labelFor(next);
    if (avatarWrap) avatarWrap.dataset.state = next;
    if (micBtn) micBtn.classList.toggle('is-listening', next === 'listening');

    if (next === 'listening') {
      if (micEnabled) startRecognition();
    } else if (next === 'thinking') {
      stopRecognition();
    } else if (next === 'speaking') {
      if (micEnabled) startRecognition();
    } else {
      stopRecognition();
    }
  }

  function appendMessage(role, jp, furigana) {
    if (!conversationEl) return;
    var bubble = document.createElement('div');
    bubble.className = 'msg msg-' + (role === 'user' ? 'user' : 'moon');
    var textEl = document.createElement('div');
    textEl.className = 'msg-text';
    textEl.textContent = jp;
    bubble.appendChild(textEl);
    if (furigana && furigana !== jp) {
      var fEl = document.createElement('div');
      fEl.className = 'msg-furigana';
      fEl.textContent = furigana;
      bubble.appendChild(fEl);
    }
    conversationEl.appendChild(bubble);
    conversationEl.scrollTop = conversationEl.scrollHeight;
  }

  function renderCandidates(cands) {
    if (!candidateArea) return;
    candidateArea.innerHTML = '';
    if (!cands || !cands.length) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (!c || !c.jp) continue;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'candidate-card';
      card.dataset.jp = c.jp;
      var parts = [];
      parts.push('<span class="candidate-jp">' + escapeHtml(c.jp) + '</span>');
      parts.push('<span class="candidate-en">' + escapeHtml(c.en || '') + '</span>');
      parts.push('<span class="candidate-bn">' + escapeHtml(c.bn || '') + '</span>');
      card.innerHTML = parts.join('');
      card.addEventListener('click', (function (jp) {
        return function () { onCandidateTap(jp); };
      })(c.jp));
      frag.appendChild(card);
    }
    candidateArea.appendChild(frag);
  }

  function onCandidateTap(jp) {
    if (!jp) return;
    candidateArea.innerHTML = '';
    sendTurn(jp);
  }

  function populateVoiceSelect(voices) {
    voiceList = voices.slice();
    var parts = [];
    parts.push('<option value="server">Server voice (MeloTTS)</option>');
    for (var i = 0; i < voiceList.length; i++) {
      var v = voiceList[i];
      var uri = v.voiceURI || '';
      var name = v.name || v.voiceURI || ('Voice ' + i);
      parts.push('<option value="' + escapeAttr(uri) + '">' +
        escapeHtml(name) + '</option>');
    }
    parts.push('<option value="device">Device default</option>');
    voiceSelect.innerHTML = parts.join('');
    voiceSelect.value = 'server';
  }

  function showVoiceNotice() {
    if (voiceNotice) {
      voiceNotice.textContent =
        'Voice list not ready. Using device default.';
      voiceNotice.hidden = false;
    }
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) {
      showVoiceNotice();
      populateVoiceSelect([]);
      return;
    }
    var initial = window.speechSynthesis.getVoices() || [];
    var jp = initial.filter(function (v) { return /ja/i.test(v.lang || ''); });
    populateVoiceSelect(jp.length ? jp : initial);
    if (!initial.length) {
      var done = false;
      function retry() {
        if (done) return;
        var v2 = window.speechSynthesis.getVoices() || [];
        if (v2.length) {
          done = true;
          var jp2 = v2.filter(function (x) { return /ja/i.test(x.lang || ''); });
          populateVoiceSelect(jp2.length ? jp2 : v2);
        }
      }
      window.speechSynthesis.addEventListener('voiceschanged', retry);
      setTimeout(function () {
        if (!done) {
          done = true;
          showVoiceNotice();
          populateVoiceSelect([]);
        }
      }, 3000);
    }
  }

  function startRecognition() {
    if (!recognition) return;
    if (recognition.__running) return;
    try {
      recognition.start();
      recognition.__running = true;
    } catch (e) {
      recognition.__running = false;
    }
  }

  function stopRecognition() {
    if (!recognition) return;
    if (!recognition.__running) return;
    try { recognition.stop(); } catch (e) { /* noop */ }
    recognition.__running = false;
  }

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(function () {
      silenceTimer = null;
      finalizeUtterance();
    }, 1200);
  }

  function finalizeUtterance() {
    var text = (partialUtterance || '').trim();
    partialUtterance = '';
    if (!text) {
      setState(micEnabled ? 'listening' : 'idle');
      return;
    }
    sendTurn(text);
  }

  function onRecognitionResult(e) {
    var interim = '';
    var final = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var r = e.results[i];
      var t = (r[0] && r[0].transcript) ? r[0].transcript : '';
      if (r.isFinal) final += t;
      else interim += t;
    }
    var text = (final + interim).trim();
    if (!text) return;

    if (state === 'speaking') {
      if (Date.now() - speakingSince < 500) return;
      if (text.length < 2) return;
      stopAudio();
      setState('listening');
      partialUtterance = text;
      resetSilenceTimer();
      sendInterrupted(text);
      return;
    }

    if (state === 'listening') {
      partialUtterance = text;
      resetSilenceTimer();
    }
  }

  function setupRecognition() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = onRecognitionResult;
    recognition.onerror = function () {
      recognition.__running = false;
    };
    recognition.onend = function () {
      recognition.__running = false;
      if (state === 'listening') {
        setTimeout(function () {
          if (state === 'listening') startRecognition();
        }, 250);
      }
    };
  }

  function fetchReply(payload) {
    var endpoint = resolveEndpoint();
    var key = resolveAnonKey();
    if (!endpoint) return Promise.reject(new Error('missing endpoint'));
    var body = {
      sessionId: sessionId,
      history: Array.isArray(payload.history)
        ? payload.history.slice(-8)
        : history.slice(-8),
      message: payload.message || '',
      interrupted: payload.interrupted === true,
    };
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + key,
      },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  function sendTurn(text) {
    setState('thinking');
    appendMessage('user', text);
    fetchReply({ message: text, history: history.slice(-8) })
      .then(function (data) {
        history.push({ role: 'user', text: text });
        handleServerReply(data);
      })
      .catch(function () {
        appendMessage('moon', 'すみません、通信に失敗しました。');
        setState(micEnabled ? 'listening' : 'idle');
      });
  }

  function sendInterrupted(text) {
    partialUtterance = '';
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    setState('thinking');
    appendMessage('user', text);
    fetchReply({ interrupted: true, message: text, history: history.slice(-8) })
      .then(function (data) {
        history.push({ role: 'user', text: text });
        handleServerReply(data);
      })
      .catch(function () {
        setState(micEnabled ? 'listening' : 'idle');
      });
  }

  function handleServerReply(data) {
    var candidates = (data && Array.isArray(data.candidates))
      ? data.candidates : [];
    var speech = (data && typeof data.speech === 'string') ? data.speech : '';
    var top = candidates[0] || null;
    if (top && top.jp) {
      appendMessage('moon', top.jp, top.furigana || '');
      history.push({ role: 'moon', text: top.jp });
    }
    renderCandidates(candidates);
    if (!speech && top) speech = top.jp;
    if (!speech) {
      setState(micEnabled ? 'listening' : 'idle');
      return;
    }
    setState('speaking');
    speakingSince = Date.now();
    speak(speech).then(function () {
      setState(micEnabled ? 'listening' : 'idle');
    });
  }

  function requestOpener() {
    if (!resolveEndpoint()) {
      var t0 = {
        jp: FIXED_OPENER,
        furigana: FIXED_OPENER,
        en: '',
        bn: '',
      };
      handleServerReply({
        candidates: [t0, t0, t0],
        speech: FIXED_OPENER,
        turnId: genId(),
      });
      return;
    }
    setState('thinking');
    fetchReply({ message: '', history: [] })
      .then(function (data) { handleServerReply(data); })
      .catch(function () {
        var t0 = {
          jp: FIXED_OPENER,
          furigana: FIXED_OPENER,
          en: '',
          bn: '',
        };
        handleServerReply({
          candidates: [t0, t0, t0],
          speech: FIXED_OPENER,
          turnId: genId(),
        });
      });
  }

  function stopAudio() {
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.src = ''; } catch (e) { /* noop */ }
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
    }
  }

  function playAudioUrl(url) {
    return new Promise(function (resolve) {
      stopAudio();
      var audio = new Audio(url);
      currentAudio = audio;
      audio.playbackRate = speechRate;
      audio.onended = function () { currentAudio = null; resolve(); };
      audio.onerror = function () { currentAudio = null; resolve(); };
      audio.play().catch(function () { currentAudio = null; resolve(); });
    });
  }

  function playDeviceVoice(text) {
    return new Promise(function (resolve) {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = speechRate;
      if (selectedVoice && selectedVoice.voiceURI) {
        for (var i = 0; i < voiceList.length; i++) {
          if (voiceList[i].voiceURI === selectedVoice.voiceURI) {
            u.voice = voiceList[i];
            break;
          }
        }
      }
      u.onend = function () { resolve(); };
      u.onerror = function () { resolve(); };
      try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
      window.speechSynthesis.speak(u);
    });
  }

  function playPiperOrDevice(text) {
    if (window.piperTTS && typeof window.piperTTS.speak === 'function') {
      try {
        var r = window.piperTTS.speak(text, { rate: speechRate });
        if (r && typeof r.then === 'function') {
          return r.then(function () { /* done */ });
        }
        return Promise.resolve();
      } catch (e) {
        return playDeviceVoice(text);
      }
    }
    return playDeviceVoice(text);
  }

  function playMeloTTS(text) {
    var endpoint = meloEndpoint();
    if (!endpoint) return Promise.resolve(false);
    var key = resolveAnonKey();
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        text: text,
        speed: speechRate,
        voice: selectedVoice ? selectedVoice.voiceURI : 'moon',
      }),
    }).then(function (r) {
      if (!r.ok) return false;
      return r.blob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        return playAudioUrl(url).then(function () {
          URL.revokeObjectURL(url);
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  function speak(text) {
    var cleaned = prepareForSpeech(text);
    if (!cleaned) return Promise.resolve();
    return playMeloTTS(cleaned).then(function (ok) {
      if (ok) return;
      return playPiperOrDevice(cleaned);
    }).catch(function () {
      return playPiperOrDevice(cleaned);
    });
  }

  function onMicClick() {
    if (state === 'thinking') return;
    if (state === 'listening') {
      micEnabled = false;
      stopRecognition();
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
      if (partialUtterance) finalizeUtterance();
      else setState('idle');
      return;
    }
    if (state === 'speaking') {
      stopAudio();
      micEnabled = true;
      setState('listening');
      return;
    }
    micEnabled = true;
    setState('listening');
  }

  function init() {
    appEl = document.getElementById('tutorApp');
    statusPill = document.getElementById('statusPill');
    statusText = document.getElementById('statusText');
    avatarWrap = document.getElementById('avatarWrap');
    conversationEl = document.getElementById('conversation');
    candidateArea = document.getElementById('candidateArea');
    micBtn = document.getElementById('micBtn');
    settingsBtn = document.getElementById('settingsBtn');
    settingsPanel = document.getElementById('settingsPanel');
    voiceSelect = document.getElementById('voiceSelect');
    speedRange = document.getElementById('speedRange');
    furiganaToggle = document.getElementById('furiganaToggle');
    voiceNotice = document.getElementById('voiceNotice');

    setState('idle');
    setupRecognition();
    loadVoices();

    if (micBtn) micBtn.addEventListener('click', onMicClick);

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', function () {
        settingsPanel.hidden = !settingsPanel.hidden;
      });
    }

    if (voiceSelect) {
      voiceSelect.addEventListener('change', function () {
        var v = voiceSelect.value;
        if (v === 'server' || v === 'device') {
          selectedVoice = null;
        } else {
          selectedVoice = null;
          for (var i = 0; i < voiceList.length; i++) {
            if (voiceList[i].voiceURI === v) {
              selectedVoice = voiceList[i];
              break;
            }
          }
        }
      });
    }

    if (speedRange) {
      speedRange.addEventListener('input', function () {
        var v = parseFloat(speedRange.value);
        speechRate = isFinite(v) ? v : 1;
      });
    }

    if (furiganaToggle) {
      furiganaToggle.addEventListener('click', function () {
        furiganaOn = !furiganaOn;
        furiganaToggle.setAttribute('aria-pressed', String(furiganaOn));
        document.body.classList.toggle('furigana-off', !furiganaOn);
      });
    }

    requestOpener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
