/* qwen: streak-prompt-js */
(function() {
  const modal = document.createElement('div');
  modal.className = 'streak-overlay';
  modal.innerHTML = `
    <div class="streak-modal" role="dialog" aria-modal="true">
      <h2 data-en="Save your streak!" data-bn="আপনার স্ট্রিক সংরক্ষণ করুন!">Save your streak!</h2>
      <p data-en="Sign in to keep your progress and bookmarks safe." data-bn="আপনার অগ্রগতি এবং বুকমার্কগুলি নিরাপদ রাখতে সাইন ইন করুন।">Sign in to keep your progress and bookmarks safe.</p>
      <button class="streak-btn" data-en="Sign In" data-bn="সাইন ইন">Sign In</button>
      <button class="streak-btn secondary" data-en="Maybe later" data-bn="পরে হয়তো">Maybe later</button>
    </div>`;
  document.body.appendChild(modal);
  const show = () => {
    if (!localStorage.getItem('jp_streak_prompted') && localStorage.getItem('jp_lesson_completed')) {
      modal.classList.add('active');
      localStorage.setItem('jp_streak_prompted', '1');
    }
  };
  modal.querySelector('.streak-btn.secondary').addEventListener('click', () => modal.classList.remove('active'));
  modal.querySelector('.streak-btn:not(.secondary)').addEventListener('click', () => {
     if (window.triggerAuth) window.triggerAuth();
     modal.classList.remove('active');
  });
  window.addEventListener('storage', (e) => { if (e.key === 'jp_lesson_completed') show(); });
  document.addEventListener('lesson-complete', show);
  setTimeout(show, 1000);
})();
