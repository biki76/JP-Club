(function() {
  const txt = (en, bn) => `<span data-en="${en}" data-bn="${bn}">${localStorage.getItem('nihongo_lang') === 'bn' ? bn : en}</span>`;
  
  async function load() {
    try {
      const res = await fetch('content/mimikara/index.json');
      const themes = await res.json();
      const container = document.getElementById('mimikara-themes');
      if (!themes || themes.length === 0) {
        container.innerHTML = `<p>${txt('Content coming soon', 'শীঘ্রই আসছে')}</p>`;
        return;
      }
      
      let html = '<div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">';
      themes.forEach(theme => {
        const title = localStorage.getItem('nihongo_lang') === 'bn' ? theme.title.bn : theme.title.en;
        const count = theme.words ? theme.words.length : 0;
        html += `
          <div class="book book--link" style="text-decoration:none; cursor:default;">
            <div class="book__body">
              <h3 class="book__title">${title}</h3>
              <p class="book__desc">${count} words</p>
              <div class="book__levels"><span class="badge badge--primary">${theme.level}</span></div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (e) {
      console.error('Failed to load mimikara', e);
      document.getElementById('mimikara-themes').innerHTML = `<p>${txt('Failed to load', 'লোড করতে ব্যর্থ')}</p>`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', load);
})();