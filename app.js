(function () {
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (!standalone && location.protocol === "https:" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
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
