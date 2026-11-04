/* AI Tutor Voice Features */
(function() {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isRecognitionSupported = !!SpeechRecognition;
  const isSynthesisSupported = 'speechSynthesis' in window;

  let recognition = null;
  let isListening = false;

  function initRecognition() {
    if (!isRecognitionSupported) return null;

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    return recognition;
  }

  window.AITutorVoice = {
    isSupported: {
      recognition: isRecognitionSupported,
      synthesis: isSynthesisSupported
    },

    startListening: function(onResult, onError) {
      if (!isRecognitionSupported) {
        onError(new Error('Speech recognition not supported in this browser'));
        return;
      }

      if (!recognition) {
        recognition = initRecognition();
      }

      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        isListening = false;
      };

      recognition.onerror = function(event) {
        onError(new Error(`Speech recognition error: ${event.error}`));
        isListening = false;
      };

      recognition.onend = function() {
        isListening = false;
      };

      try {
        recognition.start();
        isListening = true;
      } catch (error) {
        onError(error);
      }
    },

    stopListening: function() {
      if (recognition && isListening) {
        recognition.stop();
        isListening = false;
      }
    },

    isListening: function() {
      return isListening;
    },

    speak: function(text, onEnd) {
      if (!isSynthesisSupported) {
        console.warn('Speech synthesis not supported');
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      // Try to find a Japanese voice
      const voices = window.speechSynthesis.getVoices();
      const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
      if (japaneseVoice) {
        utterance.voice = japaneseVoice;
      }

      utterance.onend = onEnd;
      window.speechSynthesis.speak(utterance);
    },

    stopSpeaking: function() {
      if (isSynthesisSupported) {
        window.speechSynthesis.cancel();
      }
    }
  };
})();
