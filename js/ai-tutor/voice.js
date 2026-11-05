(function() {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  window.AITutorVoice = {
    isSTTSupported: !!SpeechRecognition,
    isTTSSupported: 'speechSynthesis' in window,
    autoSpeakEnabled: false,
    recognition: null,
    isListening: false,
    micButton: null,

    init: function() {
      this.micButton = document.getElementById('ai-tutor-mic');
      if (!this.isSTTSupported && this.micButton) {
        this.micButton.style.display = 'none';
        this.micButton.title = 'Speech recognition not supported in this browser';
      }

      if (this.isSTTSupported) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ja-JP';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListening = true;
          if (this.micButton) this.micButton.classList.add('is-listening');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.micButton) this.micButton.classList.remove('is-listening');
        };

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          const input = document.getElementById('ai-tutor-input');
          if (input) {
            input.value = transcript;
            input.focus();
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          this.isListening = false;
          if (this.micButton) this.micButton.classList.remove('is-listening');
          if (event.error === 'not-allowed') {
            window.AITutorChat.showError('Microphone access denied. Please enable permissions.');
          }
        };
      }
    },

    toggleListening: function() {
      if (!this.isSTTSupported) return;
      if (this.isListening) {
        this.recognition.stop();
      } else {
        try {
          this.recognition.start();
        } catch (e) {
          console.warn('Recognition already started or blocked:', e);
        }
      }
    },

    speakText: function(text) {
      if (!this.isTTSSupported || !text) return;
      
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find(v => v.lang.includes('ja'));
      if (jpVoice) utterance.voice = jpVoice;

      window.speechSynthesis.speak(utterance);
    },

    stopSpeaking: function() {
      if (this.isTTSSupported) {
        window.speechSynthesis.cancel();
      }
    }
  };

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
})();
