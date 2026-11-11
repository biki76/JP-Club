/**
 * Background Sync Queue Coordinator for JP-Club PWA
 */
(function (global) {
  'use strict';

  let isSyncing = false;

  async function processSyncQueue() {
    if (isSyncing || !navigator.onLine || !global.JPOfflineDB) return;
    isSyncing = true;

    try {
      const pending = await global.JPOfflineDB.getPending();
      if (!pending || pending.length === 0) {
        isSyncing = false;
        return;
      }

      for (const item of pending) {
        try {
          // Replay action against backend or Supabase endpoint
          const success = await dispatchAction(item);
          if (success) {
            await global.JPOfflineDB.removeSyncAction(item.id);
          }
        } catch (err) {
          console.warn('Sync item failed, will retry later:', item, err);
          break; // Stop queue processing on network block
        }
      }
    } catch (err) {
      console.error('Error processing sync queue:', err);
    } finally {
      isSyncing = false;
    }
  }

  async function dispatchAction(item) {
    const { type, payload } = item;
    // Example handler dispatch for cloud sync updates
    if (type === 'SRS_REVIEW' || type === 'SPEAKING_PROGRESS') {
      const endpoint = payload.endpoint || '/rest/v1/user_progress';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('jp_club_access_token') || ''}`
        },
        body: JSON.stringify(payload.data)
      });
      return res.ok;
    }
    return true; // Default acknowledge if unknown type
  }

  window.addEventListener('online', () => {
    if (typeof window.showToast === 'function') {
      window.showToast('Back online! Syncing progress…', 'info', 2500);
    }
    processSyncQueue();
  });

  // Attempt initial sync on startup if online
  if (navigator.onLine) {
    setTimeout(processSyncQueue, 3000);
  }

  global.JPSyncQueue = { process: processSyncQueue };
})(typeof window !== 'undefined' ? window : globalThis);
