// qwen: rm-timeout — under reduced motion, mid-range delays (auto-advance) run instantly
(function () {
  var prefers = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var local = localStorage.getItem('NIHONGO_REDUCED_MOTION') === '1';
  if (!prefers && !local) return;
  var orig = window.setTimeout;
  window.setTimeout = function (fn, ms) {
    var args = arguments;
    if (typeof ms === 'number' && ms >= 500 && ms <= 2500) {
      var rest = [fn, 0];
      for (var i = 2; i < args.length; i++) rest.push(args[i]);
      return orig.apply(window, rest);
    }
    return orig.apply(window, args);
  };
})();
