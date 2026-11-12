(function() {
  const txt = (en, bn) => `<span data-en="${en}" data-bn="${bn}">${localStorage.getItem('nihongo_lang') === 'bn' ? bn : en}</span>`;
  
  async function load() {
    try {
      const res = await fetch('content/shinkanzen/index.json');
      const data = await res.json();
      const container = document.getElementById('shinkanzen-tracks');
      
      let html = '<div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">';
      
      const tracks = [
        { key: 'grammar', title: { en: 'Grammar', bn: 'ব্যাকরণ' }, count: data.grammar?.length || 0 },
        { key: 'reading', title: { en: 'Reading', bn: 'পড়া' }, count: data.reading?.length || 0 },
        { key: 'listening', title: { en: 'Listening', bn: 'শোনা' }, count: data.listening?.length || 0 }
      ];
      
      tracks.forEach(track => {
        const title = localStorage.getItem('nihongo_lang') === 'bn' ? track.title.bn : track.title.en;
        html += `<div class="book book--link" style="text-decoration:none; cursor:default;"><div class="book__cover" style="background:linear-gradient(135deg, #CDEAC0 0%, #8FE3CF 100%); display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:bold; color:#3b2f2a;">文</div>`;
            <div class="book__body">
              <h3 class="book__title">${title}</h3>
              <p class="book__desc">${track.count} items</p>
              <div class="book__levels"><span class="badge badge--primary">N3</span></div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (e) {
      console.error('Failed to load shinkanzen', e);
      document.getElementById('shinkanzen-tracks').innerHTML = `<p>${txt('Failed to load', 'লোড করতে ব্যর্থ')}</p>`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', load);
})();