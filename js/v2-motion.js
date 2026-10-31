(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal (staggered, capped at 6)
  var els = document.querySelectorAll('.v2-reveal');
  els.forEach(function(el,i){ el.style.setProperty('--i', Math.min(i % 12, 6)); });
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    },{ rootMargin:'0px 0px -8% 0px', threshold:.08 });
    els.forEach(function(el){ io.observe(el); });
  }

  // Cursor spotlight (pointer devices only)
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function(e){
      var c = e.target.closest && e.target.closest('.v2-card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    },{ passive:true });
  }

  // Ring helper: <svg class="v2-ring" data-progress="0.34">
  document.querySelectorAll('.v2-ring[data-progress]').forEach(function(s){
    var p = Math.max(0, Math.min(1, parseFloat(s.dataset.progress) || 0));
    requestAnimationFrame(function(){ s.style.setProperty('--p', p); });
  });
})();
