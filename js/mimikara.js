(function() {
  'use strict';
  
  const txt = function(en, bn) {
    var lang = localStorage.getItem('nihongo_lang') || 'en';
    return lang === 'bn' ? bn : en;
  };
  
  function getTitle(theme) {
    // Handle both old format (title_en/title_bn) and new format (title: {en, bn})
    if (theme.title_en && theme.title_bn) {
      return {
        en: theme.title_en,
        bn: theme.title_bn
      };
    } else if (theme.title && theme.title.en && theme.title.bn) {
      return theme.title;
    }
    return { en: 'Untitled', bn: 'শিরোনামহীন' };
  }
  
  function load() {
    var container = document.getElementById('mimikara-themes');
    if (!container) return;
    
    fetch('content/mimikara/index.json')
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(themes) {
        if (!themes || themes.length === 0) {
          container.innerHTML = '<p>' + txt('No themes yet', 'এখনও কোনো থিম নেই') + '</p>';
          return;
        }
        
        var html = '<div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">';
        themes.forEach(function(theme) {
          var titleObj = getTitle(theme);
          var title = localStorage.getItem('nihongo_lang') === 'bn' ? titleObj.bn : titleObj.en;
          var count = theme.words ? theme.words.length : 0;
          var level = theme.level || 'N3';
          
          html += '<div class="book book--link" style="text-decoration:none; cursor:default;"><div class="book__cover" style="background:linear-gradient(135deg, #E4C1F9 0%, #BDE0FE 100%); display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:bold; color:#3b2f2a;">語</div>';';
          html += '<div class="book__body">';
          html += '<h3 class="book__title">' + title + '</h3>';
          html += '<p class="book__desc">' + count + ' words</p>';
          html += '<div class="book__levels"><span class="badge badge--primary">' + level + '</span></div>';
          html += '</div></div>';
        });
        html += '</div>';
        container.innerHTML = html;
      })
      .catch(function(e) {
        console.error('Mimikara load error:', e);
        container.innerHTML = '<p>' + txt('Failed to load', 'লোড করতে ব্যর্থ') + '</p>';
      });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
