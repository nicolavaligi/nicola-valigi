/* Direct links go straight to the content; the entry screen needs no storage. */
(function () {
  if (!location.hash) {
    document.documentElement.classList.add('intro-active');
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = '#234BFF';
  }
  // If the controller cannot load, keep the actual site accessible.
  window.introWatchdog = setTimeout(function () {
    if (!document.documentElement.classList.contains('intro-ready')) {
      document.documentElement.classList.remove('intro-active');
      var theme = document.querySelector('meta[name="theme-color"]');
      if (theme) theme.content = '#F4F1EA';
      var site = document.getElementById('site-shell');
      if (site) site.inert = false;
    }
  }, 4500);
})();
