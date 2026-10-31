(function () {
  function syncViewport() {
    var vv = window.visualViewport;
    var top = vv ? vv.offsetTop : 0;
    var height = vv ? vv.height : window.innerHeight;
    var bottom = Math.max(0, window.innerHeight - top - height);
    var root = document.documentElement.style;
    root.setProperty("--vv-top", top + "px");
    root.setProperty("--vv-height", height + "px");
    root.setProperty("--vv-bottom", bottom + "px");
  }
  syncViewport();
  window.addEventListener("resize", syncViewport);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewport);
    window.visualViewport.addEventListener("scroll", syncViewport);
  }

  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (!standalone && location.protocol === "https:" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {
      // The website remains usable when service workers are unavailable.
    });
  }

  var button = document.getElementById("installa");
  if (!button || standalone) return;

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferred = event;
    button.hidden = false;
  });
  button.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () {
      button.hidden = true;
      deferred = null;
    });
  });
  window.addEventListener("appinstalled", function () {
    button.hidden = true;
    deferred = null;
  });

})();
