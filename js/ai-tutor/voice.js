(function() {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isRecognitionSupported = !!SpeechRecognition;
  const isSynthesisSupported = 'speechSynthesis' in window;

  let recognition = null;
  let isListening = false;
  let currentUtterance = null;

  function initRecognition() {
    if (!isRecognitionSupported) return null;
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
  }

  window.AITutorVoice = {
    isSupported: { recognition: isRecognitionSupported, synthesis: isSynthesisSupported },
    
    startListening: function(onResult, onError) {
      if (!isRecognitionSupported) { onError(new Error('Not supported')); return; }
      if (!recognition) recognition = initRecognition();

      recognition.onresult = (event) => {
        onResult(event.results[0][0].transcript);
        isListening = false;
      };
      recognition.onerror = (event) => {
        onError(new Error(event.error));
        isListening = false;
      };
      recognition.onend = () => { isListening = false; };

      try {
        recognition.start();
        isListening = true;
      } catch (error) { onError(error); }
    },

    stopListening: function() {
      if (recognition && isListening) {
        recognition.stop();
        isListening = false;
      }
    },

    isListening: () => isListening,

    speak: function(text, onEnd) {
      if (!isSynthesisSupported) return;
      window.speechSynthesis.cancel();
      
      currentUtterance = new SpeechSynthesisUtterance(text);
      currentUtterance.lang = 'ja-JP';
      currentUtterance.rate = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find(v => v.lang.startsWith('ja'));
      if (jpVoice) currentUtterance.voice = jpVoice;

      currentUtterance.onend = onEnd;
      window.speechSynthesis.speak(currentUtterance);
    },

    stopSpeaking: function() {
      if (isSynthesisSupported) window.speechSynthesis.cancel();
    },

    isSpeaking: function() {
      return isSynthesisSupported && window.speechSynthesis.speaking;
    }
  };
})();
