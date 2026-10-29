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
    navigator.serviceWorker.register("/sw.js");
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

  // Interactive 3D Aerial Gimbal Gyro on Hover (Mouse Steering)
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var targets = document.querySelectorAll(".showcase-media, .anteprima-visual");
    targets.forEach(function (box) {
      var img = box.querySelector("img");
      if (!img) return;

      var raf = null;
      var tx = 0, ty = 0;
      var cx = 0, cy = 0;
      var active = false;

      function render() {
        if (!active && Math.abs(cx) < 0.001 && Math.abs(cy) < 0.001) {
          cx = 0;
          cy = 0;
          img.style.transform = "";
          img.style.animation = "";
          raf = null;
          return;
        }

        cx += (tx - cx) * 0.09;
        cy += (ty - cy) * 0.09;

        var pitch = 23 + cy * -10;
        var yaw = cx * 9;
        var roll = cx * 3.5;
        var tz = 35 + (1 - Math.abs(cx)) * 25;
        var scale = 1.33;

        img.style.transform = "perspective(550px) rotateX(" + pitch.toFixed(2) + "deg) rotateY(" + yaw.toFixed(2) + "deg) rotateZ(" + roll.toFixed(2) + "deg) scale(" + scale + ") translate3d(" + (cx * -3).toFixed(1) + "%, " + (cy * -4).toFixed(1) + "%, " + tz.toFixed(1) + "px)";

        raf = requestAnimationFrame(render);
      }

      box.addEventListener("mouseenter", function () {
        active = true;
        img.style.animation = "none";
        if (!raf) raf = requestAnimationFrame(render);
      });

      box.addEventListener("mousemove", function (e) {
        var r = box.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(render);
      });

      box.addEventListener("mouseleave", function () {
        active = false;
        tx = 0;
        ty = 0;
      });
    });
  }
})();
