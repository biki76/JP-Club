/**
 * Unified Lesson State & Gapless Audio Playlist Controller (Minna 001-050)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'jp_club_lesson_checkpoints_v1';

  function loadAllCheckpoints() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveAllCheckpoints(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function getLessonProgress(lessonId) {
    const all = loadAllCheckpoints();
    return all[lessonId] || {
      completedSections: [],
      lastTab: 'vocabulary',
      audioTrackIndex: 0,
      updatedAt: 0
    };
  }

  function markSectionCompleted(lessonId, sectionName) {
    if (!lessonId || !sectionName) return null;
    const all = loadAllCheckpoints();
    const cur = all[lessonId] || { completedSections: [], lastTab: sectionName, audioTrackIndex: 0, updatedAt: 0 };
    if (!cur.completedSections.includes(sectionName)) {
      cur.completedSections.push(sectionName);
    }
    cur.lastTab = sectionName;
    cur.updatedAt = Date.now();
    all[lessonId] = cur;
    saveAllCheckpoints(all);

    if (global.JPOfflineDB) {
      global.JPOfflineDB.enqueue('LESSON_CHECKPOINT', {
        data: { key: `lesson_${lessonId}`, value: cur, client_updated_at: cur.updatedAt }
      }).catch(() => {});
    }

    global.dispatchEvent(new CustomEvent('jp:lesson-progress', { detail: { lessonId, progress: cur } }));
    return cur;
  }

  function createGaplessPlaylist(tracks = []) {
    let idx = 0;
    let rate = 1.0;
    let isPlaying = false;
    const audio = new Audio();
    audio.preload = 'auto';

    function loadTrack(i) {
      if (i < 0 || i >= tracks.length) return false;
      idx = i;
      const t = tracks[idx];
      const src = typeof t === 'string' ? t : (t.url || t.src || t.audio || '');
      if (!src) return false;
      audio.src = src;
      audio.playbackRate = rate;
      return true;
    }

    function play(i = idx) {
      if (global.JPAudioMutex) global.JPAudioMutex.stopAll();
      if (!loadTrack(i)) return Promise.resolve(false);
      isPlaying = true;
      if (global.JPAudioMutex) global.JPAudioMutex.register(audio);
      return audio.play().then(() => true).catch(() => {
        isPlaying = false;
        return false;
      });
    }

    function pause() {
      isPlaying = false;
      audio.pause();
    }

    function setRate(nextRate) {
      rate = Math.min(1.5, Math.max(0.5, Number(nextRate) || 1.0));
      audio.playbackRate = rate;
      return rate;
    }

    audio.addEventListener('ended', () => {
      if (idx + 1 < tracks.length) {
        play(idx + 1);
        global.dispatchEvent(new CustomEvent('jp:playlist-advance', { detail: { index: idx, track: tracks[idx] } }));
      } else {
        isPlaying = false;
        global.dispatchEvent(new CustomEvent('jp:playlist-ended'));
      }
    });

    return {
      play,
      pause,
      setRate,
      next: () => (idx + 1 < tracks.length ? play(idx + 1) : pause()),
      prev: () => (idx > 0 ? play(idx - 1) : play(0)),
      getState: () => ({ index: idx, total: tracks.length, isPlaying, rate })
    };
  }

  global.JPLessonState = {
    getProgress: getLessonProgress,
    markCompleted: markSectionCompleted,
    createPlaylist: createGaplessPlaylist
  };
})(typeof window !== 'undefined' ? window : globalThis);
