/* qwen: toasts-js */
(function() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  window.showToast = function(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  };
  document.querySelectorAll('[data-empty-state]').forEach(el => {
    if (!el.children.length || el.innerHTML.trim() === '') {
      const bn = el.dataset.emptyStateBn || '';
      el.innerHTML = '<div class="empty-state" data-en="' + el.dataset.emptyState + '" data-bn="' + bn + '">' + el.dataset.emptyState + '</div>';
    }
  });
})();
