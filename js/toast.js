/**
 * Unified Accessible Toast Notification System for JP-Club
 */
(function (global) {
  'use strict';

  const MAX_TOASTS = 3;
  let container = null;

  function getContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.getElementById('jp-toast-container') || document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'jp-toast-container';
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, typeOrOpts = 'info', duration = 3200) {
    if (!message || typeof document === 'undefined' || !document.body) return null;

    let type = 'info';
    let ms = duration;
    if (typeof typeOrOpts === 'object' && typeOrOpts !== null) {
      type = typeOrOpts.type || 'info';
      ms = typeOrOpts.duration || duration;
    } else if (typeof typeOrOpts === 'string') {
      type = typeOrOpts;
    }

    const host = getContainer();
    while (host.children.length >= MAX_TOASTS) {
      host.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} is-visible`;
    toast.textContent = String(message);
    host.appendChild(toast);

    const timer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 220);
    }, ms);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
    }, { once: true });

    return toast;
  }

  global.showToast = showToast;
  global.toast = showToast;
  global.JPToast = { show: showToast, info: (m) => showToast(m, 'info'), success: (m) => showToast(m, 'success'), error: (m) => showToast(m, 'error') };
})(typeof window !== 'undefined' ? window : globalThis);
