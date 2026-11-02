(function() {
  'use strict';
  
  const txt = function(en, bn) {
    var lang = localStorage.getItem('nihongo_lang') || 'en';
    return lang === 'bn' ? bn : en;
  };
  
  function load() {
    var container = document.getElementById('mimikara-themes');
    
    fetch('content/mimikara/index.json')
      .then(function(res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function(themes) {
        if (!themes || themes.length === 0) {
          container.innerHTML = '<p>' + txt('No themes yet', 'এখনও কোনো থিম নেই') + '</p>';
          return;
        }
        
        var html = '<div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">';
        themes.forEach(function(theme) {
          var title = localStorage.getItem('nihongo_lang') === 'bn' ? theme.title.bn : theme.title.en;
          var count = theme.words ? theme.words.length : 0;
          html += '<div class="book book--link" style="text-decoration:none; cursor:default;">';
          html += '<div class="book__body">';
          html += '<h3 class="book__title">' + title + '</h3>';
          html += '<p class="book__desc">' + count + ' words</p>';
          html += '<div class="book__levels"><span class="badge badge--primary">' + theme.level + '</span></div>';
          html += '</div></div>';
        });
        html += '</div>';
        container.innerHTML = html;
      })
      .catch(function(e) {
        console.error('Mimikara load error:', e);
        container.innerHTML = '<p>' + txt('Failed to load: ' + e.message, 'লোড ব্যর্থ: ' + e.message) + '</p>';
        container.innerHTML += '<p><small>Check: content/mimikara/index.json exists</small></p>';
      });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
