/* Delegated to unified js/toast.js */
if (typeof window !== 'undefined' && !window.showToast) {
  const s = document.createElement('script');
  s.src = './js/toast.js';
  document.head.appendChild(s);
}
