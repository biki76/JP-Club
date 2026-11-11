/**
 * Crash-Safe Speaking Progress Tracker with Cloud Sync Merge Support
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'jp_club_speaking_progress_v1';

  function defaultState() {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      totalTurns: 0,
      lastPracticedAt: null,
      history: []
    };
  }

  function loadSpeakingProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        history: Array.isArray(parsed?.history) ? parsed.history.slice(-60) : []
      };
    } catch (_) {
      return defaultState();
    }
  }

  function saveSpeakingProgress(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (_) {}
    return nextState;
  }

  function recordSpeakingTurn({ durationSec = 15, score = null, lessonId = null } = {}) {
    const state = loadSpeakingProgress();
    state.totalTurns = (Number(state.totalTurns) || 0) + 1;
    state.totalMinutes = +(Number(state.totalMinutes || 0) + durationSec / 60).toFixed(2);
    state.lastPracticedAt = new Date().toISOString();
    state.history.push({
      ts: state.lastPracticedAt,
      durationSec,
      score,
      lessonId
    });
    if (state.history.length > 60) state.history = state.history.slice(-60);
    saveSpeakingProgress(state);
    global.dispatchEvent(new CustomEvent('jp:speaking-progress-updated', { detail: state }));
    return state;
  }

  function mergeSpeakingProgress(remoteState) {
    const local = loadSpeakingProgress();
    if (!remoteState || typeof remoteState !== 'object') return local;
    const merged = {
      totalSessions: Math.max(Number(local.totalSessions) || 0, Number(remoteState.totalSessions) || 0),
      totalMinutes: Math.max(Number(local.totalMinutes) || 0, Number(remoteState.totalMinutes) || 0),
      totalTurns: Math.max(Number(local.totalTurns) || 0, Number(remoteState.totalTurns) || 0),
      lastPracticedAt: [local.lastPracticedAt, remoteState.lastPracticedAt].filter(Boolean).sort().pop() || null,
      history: Array.isArray(local.history) && local.history.length >= (remoteState.history?.length || 0)
        ? local.history
        : (remoteState.history || [])
    };
    return saveSpeakingProgress(merged);
  }

  global.JPSpeakingProgress = {
    load: loadSpeakingProgress,
    save: saveSpeakingProgress,
    recordTurn: recordSpeakingTurn,
    merge: mergeSpeakingProgress
  };
})(typeof window !== 'undefined' ? window : globalThis);
