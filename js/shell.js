// Phase 2 + Phase 12: Shell Layout Engine
(function() {
  const config = window.SHELL_CONFIG || {
    brand: { name: { en: 'JP-Club', bn: 'জেপি-ক্লাব' }, href: 'home.html' },
    navGroups: [
      { title: { en: 'Learn', bn: 'শিখুন' }, items: [
        { key: 'home', icon: 'home', href: 'home.html', label: { en: 'Home', bn: 'হোম' } },
        { key: 'lessons', icon: 'book', href: 'lessons.html', label: { en: 'Lessons', bn: 'পাঠ' } },
        { key: 'kanji', icon: 'kanji', href: 'kanji.html', label: { en: 'Kanji', bn: 'কানজি' } }
      ]},
      { title: { en: 'Practice', bn: 'অনুশীলন' }, items: [
        { key: 'flashcards', icon: 'cards', href: 'flashcards.html', label: { en: 'Flashcards', bn: 'ফ্ল্যাশকার্ড' } },
        { key: 'quiz', icon: 'quiz', href: 'quiz.html', label: { en: 'Quiz', bn: 'কুইজ' } }
      ]}
    ],
    bottomNav: [
      { href: 'home.html', icon: 'home', label: { en: 'Home', bn: 'হোম' } },
      { href: 'lessons.html', icon: 'book', label: { en: 'Lessons', bn: 'পাঠ' } },
      { href: 'flashcards.html', icon: 'cards', label: { en: 'Cards', bn: 'কার্ড' } },
      { href: 'progress.html', icon: 'chart', label: { en: 'Progress', bn: 'অগ্রগতি' } }
    ],
    searchEnabled: true
  };

  const lang = localStorage.getItem('nihongo_lang') || 'en';
  const theme = localStorage.getItem('nihongo_theme') || 'light';

  function t(obj) { return obj && obj[lang] ? obj[lang] : (obj && obj.en ? obj.en : ''); }

  function renderHeader() {
    const header = document.querySelector('[data-shell-header]');
    if (!header) return;

    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--s-3);">
        <a href="${config.brand.href}" style="display:flex;align-items:center;gap:var(--s-2);text-decoration:none;color:var(--ink);font-weight:700;font-size:var(--fs-xl);">
          <span style="font-size:1.5rem;">日</span>
          <span>${t(config.brand.name)}</span>
        </a>
      </div>
      
      <div style="display:flex;align-items:center;gap:var(--s-3);">
        <!-- Language Toggle -->
        <button id="shell-lang-toggle" class="shell-icon-btn" aria-label="Toggle language" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--border);cursor:pointer;font-weight:600;color:var(--ink);">
          ${lang === 'en' ? 'বাং' : 'EN'}
        </button>
        
        <!-- Theme Toggle -->
        <button id="shell-theme-toggle" class="shell-icon-btn" aria-label="Toggle theme" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--border);cursor:pointer;">
          ${theme === 'dark' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'}
        </button>

        <!-- Auth Chip (Phase 12) -->
        <div id="shell-auth-chip"></div>
      </div>
    `;

    // Attach event listeners
    document.getElementById('shell-lang-toggle').addEventListener('click', () => {
      const newLang = lang === 'en' ? 'bn' : 'en';
      localStorage.setItem('nihongo_lang', newLang);
      location.reload();
    });

    document.getElementById('shell-theme-toggle').addEventListener('click', () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nihongo_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      // Re-render to update icon
      renderHeader(); 
    });

    // Render Auth Chip if cloud.js is present
    if (window.renderAuthChip) {
      window.renderAuthChip(document.getElementById('shell-auth-chip'));
    } else {
      // Fallback if cloud.js hasn't loaded yet
      document.getElementById('shell-auth-chip').innerHTML = `
        <a href="auth.html" style="padding:var(--s-2) var(--s-3);background:var(--primary);color:#fff;border-radius:var(--r-md);font-size:var(--fs-sm);font-weight:600;text-decoration:none;">
          ${lang === 'en' ? 'Sign in' : 'সাইন ইন'}
        </a>
      `;
    }
  }

  function renderBottomNav() {
    const nav = document.querySelector('[data-shell-bottomnav]');
    if (!nav || !config.bottomNav) return;

    nav.innerHTML = config.bottomNav.map(item => `
      <a href="${item.href}" class="shell-bottomnav-item" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none;color:var(--ink-muted);font-size:var(--fs-xs);padding:var(--s-2);">
        <span style="font-size:1.25rem;">${getIcon(item.icon)}</span>
        <span>${t(item.label)}</span>
      </a>
    `).join('');
  }

  function getIcon(name) {
    const icons = { home: '🏠', book: '📖', cards: '🃏', chart: '📊', kanji: '字', quiz: '❓' };
    return icons[name] || '📄';
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderHeader();
      renderBottomNav();
    });
  } else {
    renderHeader();
    renderBottomNav();
  }
})();
