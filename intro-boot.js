/* Direct links go straight to the content; the entry screen needs no storage. */
(function () {
  if (!location.hash) document.documentElement.classList.add('intro-active');
  // If the controller cannot load, keep the actual site accessible.
  window.introWatchdog = setTimeout(function () {
    if (!document.documentElement.classList.contains('intro-ready')) {
      document.documentElement.classList.remove('intro-active');
      var site = document.getElementById('site-shell');
      if (site) site.inert = false;
    }
  }, 4500);
})();
