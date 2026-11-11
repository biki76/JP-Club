/**
 * Lightweight IndexedDB Wrapper for JP-Club Offline PWA Data
 */
(function (global) {
  'use strict';

  const DB_NAME = 'jp_club_offline_db';
  const DB_VERSION = 1;
  const STORE_SYNC_QUEUE = 'sync_queue';
  const STORE_USER_DATA = 'user_data';

  function openDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
          db.createObjectStore(STORE_USER_DATA, { keyPath: 'key' });
        }
      };
    });
  }

  async function enqueueSyncAction(actionType, payload) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const request = store.add({
        type: actionType,
        payload,
        createdAt: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getPendingSyncActions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function removeSyncAction(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  global.JPOfflineDB = {
    enqueue: enqueueSyncAction,
    getPending: getPendingSyncActions,
    remove: removeSyncAction
  };
})(typeof window !== 'undefined' ? window : globalThis);
