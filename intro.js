(function () {
  'use strict';
  var root = document.documentElement;
  var intro = document.getElementById('intro');
  var site = document.getElementById('site-shell');
  var enter = intro && intro.querySelector('.intro-enter');
  if (!intro || !site || !enter) { root.classList.remove('intro-active'); return; }
  root.classList.add('intro-ready');
  clearTimeout(window.introWatchdog);
  var active = root.classList.contains('intro-active');
  site.inert = active;
  intro.inert = !active;
  var entering = false;
  var animation;
  function finish(focus) {
    root.classList.remove('intro-active', 'intro-entering');
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = '#F4F1EA';
    site.style.clipPath = '';
    site.inert = false;
    intro.inert = true;
    entering = false;
    document.dispatchEvent(new Event('intro:closed'));
    if (focus) {
      history.replaceState(history.state, '', '#contenuto');
      document.getElementById('contenuto').focus({preventScroll: true});
      window.scrollTo(0, 0);
    }
  }
  function openSite(event) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button)) return;
    if (event) event.preventDefault();
    if (entering || !root.classList.contains('intro-active')) return;
    entering = true;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !site.animate || !CSS.supports('clip-path', 'circle(1px at 1px 1px)')) { finish(true); return; }
    var rect = intro.querySelector('.intro-orbit').getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));
    site.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
    root.classList.add('intro-entering');
    intro.inert = true;
    document.dispatchEvent(new Event('intro:enter'));
    intro.querySelector('.intro-copy').animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:250,fill:'forwards'});
    intro.querySelector('.intro-orbit').animate([{scale:1,opacity:1},{scale:1.16,opacity:.4}],{duration:1050,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
    animation = site.animate([
      {clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)'},
      {clipPath: 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'}
    ], {duration:1050,delay:120,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
    animation.finished.then(function () { finish(true); animation.cancel(); }).catch(function () { finish(true); });
    // Completion remains guaranteed if a browser suspends animation promises.
    setTimeout(function () { if (entering) { finish(true); animation.cancel(); } }, 1600);
  }
  enter.addEventListener('click', openSite);
  // Header contact links can enter directly without waiting for the reveal.
  intro.querySelector('.intro-contact').addEventListener('click', function () { finish(false); });
  window.addEventListener('hashchange', function () {
    if (location.hash && root.classList.contains('intro-active')) {
      if (animation) animation.cancel();
      finish(false);
    }
  });
  window.addEventListener('pagehide', function () { document.dispatchEvent(new Event('intro:closed')); });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !location.hash && root.classList.contains('intro-active')) document.dispatchEvent(new Event('intro:resume'));
  });
})();
