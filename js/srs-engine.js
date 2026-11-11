/**
 * Optimized SM-2 Spaced Repetition System (SRS) Engine for JP-Club
 */
(function (global) {
  'use strict';

  const SRS_STORAGE_KEY = 'jp_club_srs_state_v1';

  function defaultCardState() {
    return {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: Date.now(),
      state: 'new' // 'new', 'learning', 'review'
    };
  }

  function loadSRSStore() {
    try {
      const raw = localStorage.getItem(SRS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveSRSStore(store) {
    try {
      localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(store));
    } catch (_) {}
  }

  /**
   * SM-2 Algorithm computation
   * @param {Object} card - current card SRS metadata
   * @param {number} rating - 0 (Again), 1 (Hard), 2 (Good), 3 (Easy)
   */
  function calculateSM2(card, rating) {
    let { repetitions, interval, easeFactor, dueDate } = card || defaultCardState();
    const now = Date.now();
    const DAY_MS = 86400000;

    let quality = 4; // Easy
    if (rating === 0) quality = 0; // Again
    else if (rating === 1) quality = 3; // Hard
    else if (rating === 2) quality = 4; // Good
    else if (rating === 3) quality = 5; // Perfect / Easy

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    dueDate = now + interval * DAY_MS;

    return {
      repetitions,
      interval,
      easeFactor: +easeFactor.toFixed(2),
      dueDate,
      state: repetitions > 0 ? 'review' : 'learning'
    };
  }

  function getCardState(cardId) {
    const store = loadSRSStore();
    return store[cardId] || defaultCardState();
  }

  function reviewCard(cardId, rating) {
    const store = loadSRSStore();
    const current = store[cardId] || defaultCardState();
    const updated = calculateSM2(current, rating);
    store[cardId] = updated;
    saveSRSStore(store);
    return updated;
  }

  function getDueQueue(allCardIds = []) {
    const store = loadSRSStore();
    const now = Date.now();
    const due = [];
    const newCards = [];

    for (const id of allCardIds) {
      const st = store[id];
      if (!st || st.state === 'new') {
        newCards.push(id);
      } else if (st.dueDate <= now) {
        due.push(id);
      }
    }

    // Prioritize due reviews, then new cards
    return {
      due,
      newCards,
      queue: [...due, ...newCards]
    };
  }

  global.JP_SRS = {
    getCardState,
    reviewCard,
    getDueQueue,
    loadStore: loadSRSStore
  };
})(typeof window !== 'undefined' ? window : globalThis);
