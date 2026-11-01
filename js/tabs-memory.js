/* qwen: tabs-memory-js */
(function() {
  const KEY = 'jp_last_tab';
  document.querySelectorAll('[role="tablist"] [role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.id || tab.dataset.tabId || tab.textContent.trim();
      localStorage.setItem(KEY, id);
    });
  });
  const last = localStorage.getItem(KEY);
  if (last) {
    const el = document.getElementById(last) || document.querySelector('[data-tab-id="' + last + '"]');
    if (el && el.getAttribute('role') === 'tab') {
      el.click();
    }
  }
})();
