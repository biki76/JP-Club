/**
 * Optimized Flashcard Controller using JP_SRS SM-2 Engine
 */
(function () {
  'use strict';

  let currentDeck = [];
  let queue = [];
  let activeCardId = null;
  let isFlipped = false;

  const dom = {
    card: document.getElementById('flashcard') || document.querySelector('.flashcard-element'),
    front: document.getElementById('card-front') || document.querySelector('.card-front-text'),
    back: document.getElementById('card-back') || document.querySelector('.card-back-text'),
    ratings: document.querySelectorAll('[data-srs-rating], .srs-rating-btn'),
    counter: document.getElementById('queue-counter') || document.querySelector('.queue-counter')
  };

  function initDeck(deckData) {
    if (!Array.isArray(deckData) || deckData.length === 0) return;
    currentDeck = deckData;
    const cardIds = currentDeck.map((_, idx) => `card_${idx}`);
    
    const srsData = window.JP_SRS ? window.JP_SRS.getDueQueue(cardIds) : { queue: cardIds };
    queue = srsData.queue;
    loadNextCard();
  }

  function loadNextCard() {
    if (queue.length === 0) {
      if (dom.front) dom.front.textContent = '🎉 Deck completed for now!';
      if (dom.back) dom.back.textContent = 'Great job reviewing your vocabulary.';
      return;
    }

    activeCardId = queue[0];
    const index = parseInt(activeCardId.replace('card_', ''), 10);
    const cardObj = currentDeck[index];

    if (!cardObj) {
      queue.shift();
      loadNextCard();
      return;
    }

    isFlipped = false;
    if (dom.card) dom.card.classList.remove('is-flipped');
    if (dom.front) dom.front.textContent = cardObj.kanji || cardObj.word || cardObj.term || '';
    if (dom.back) dom.back.textContent = `${cardObj.kana || ''} — ${cardObj.meaning || cardObj.definition || ''}`;
    if (dom.counter) dom.counter.textContent = `Remaining: ${queue.length}`;
  }

  function handleRating(rating) {
    if (!activeCardId || !window.JP_SRS) return;
    window.JP_SRS.reviewCard(activeCardId, rating);
    
    // Rotate queue
    queue.shift();
    loadNextCard();
  }

  // Event Listeners for Rating buttons (0 = Again, 1 = Hard, 2 = Good, 3 = Easy)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-srs-rating]');
    if (!btn) return;
    const rating = parseInt(btn.getAttribute('data-srs-rating'), 10);
    if (!isNaN(rating)) {
      handleRating(rating);
    }
  });

  if (dom.card) {
    dom.card.addEventListener('click', () => {
      isFlipped = !isFlipped;
      dom.card.classList.toggle('is-flipped', isFlipped);
    });
  }

  // Expose deck loader globally
  window.JPFlashcards = { initDeck };
})();
