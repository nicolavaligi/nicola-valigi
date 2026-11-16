
(function () {
  var canvas = document.getElementById("sphere");

  var heroSection = document.getElementById("intro");
  if (!canvas || !document.documentElement.classList.contains("intro-active")) return;
  var gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) { document.querySelector(".intro-pause").hidden = true; return; }

  var vsSrc = [
    "attribute vec3 aPos;",
    "attribute float aPhase;",
    "attribute float aAccent;",
    "uniform mat4 uMvp;",
    "uniform mat4 uMv;",
    "uniform float uTime;",
    "uniform float uRadius;",
    "uniform float uCamZ;",
    "uniform float uPx;",
    "uniform float uMax;",
    "varying float vFront;",
    "varying float vPulse;",
    "varying float vAccent;",
    "void main() {",
    "  vec4 view = uMv * vec4(aPos, 1.0);",
    "  gl_Position = uMvp * vec4(aPos, 1.0);",
    "  float along = (view.z + uCamZ) / max(uRadius, 0.001);",
    "  vFront = clamp(along * 0.5 + 0.5, 0.0, 1.0);",
    "  vPulse = 0.5 + 0.5 * sin(uTime * 0.7 + aPhase);",
    "  vAccent = aAccent;",
    "  float body = aAccent > 0.5 ? (2.2 + vPulse * 1.5) : (0.82 + vPulse * 0.28);",
    "  gl_PointSize = min(uMax, uPx * body * (0.5 + vFront * 0.75));",
    "}"
  ].join("\n");

  var fsLine = [
    "precision mediump float;",
    "varying float vFront;",
    "varying float vPulse;",
    "varying float vAccent;",
    "uniform float uDay;",
    "void main() {",
    "  vec3 col = vec3(0.38, 0.58, 0.85);",
    "  float alpha = (0.26 + vPulse * 0.40) * (0.46 + vFront * 0.54);",
    "  gl_FragColor = vec4(col, alpha);",
    "}"
  ].join("\n");

  var fsNode = [
    "precision mediump float;",
    "varying float vFront;",
    "varying float vPulse;",
    "varying float vAccent;",
    "uniform float uDay;",
    "void main() {",
    "  vec2 q = gl_PointCoord * 2.0 - 1.0;",
    "  float d = length(q);",
    "  if (d > 1.0) discard;",
    "  float rim = smoothstep(1.0, 0.42, d);",
    "  vec3 ivory = mix(vec3(0.82, 0.86, 0.93), vec3(0.97, 0.94, 0.86), uDay);",
    "  vec3 accent = vec3(1.0, 0.88, 0.29);",
    "  vec3 col = mix(ivory, accent, vAccent);",
    "  col = mix(col, vec3(1.0), smoothstep(0.45, 0.0, d) * 0.4);",
    "  float alpha = rim * (0.48 + vPulse * 0.52) * (0.5 + vFront * 0.5);",
    "  alpha += smoothstep(1.0, 0.15, d) * vAccent * (0.12 + vPulse * 0.2);",
    "  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  function makeProg(fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.bindAttribLocation(p, 1, "aPhase");
    gl.bindAttribLocation(p, 2, "aAccent");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
  }
  var lineProg = makeProg(fsLine);
  var nodeProg = makeProg(fsNode);

  function unit(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  var count = 228;
  var reach = 0.4;
  var reach2 = reach * reach;
  var nodes = [];
  var i, y, rad, ang, phase, accent;
  for (i = 0; i < count; i++) {
    y = 1 - (i / (count - 1)) * 2;
    rad = Math.sqrt(Math.max(0, 1 - y * y));
    ang = i * Math.PI * (3 - Math.sqrt(5));
    phase = unit(i + 3) * 6.283185307;
    accent = unit(i + 19) < 0.2 ? 1 : 0;
    nodes.push(Math.cos(ang) * rad, y, Math.sin(ang) * rad, phase, accent);
  }
  var wires = [];
  var a, b, dx, dy, dz;
  for (a = 0; a < count; a++) {
    for (b = a + 1; b < count; b++) {
      dx = nodes[a * 5] - nodes[b * 5];
      dy = nodes[a * 5 + 1] - nodes[b * 5 + 1];
      dz = nodes[a * 5 + 2] - nodes[b * 5 + 2];
      if (dx * dx + dy * dy + dz * dz < reach2) {
        wires.push(
          nodes[a * 5], nodes[a * 5 + 1], nodes[a * 5 + 2], nodes[a * 5 + 3], nodes[a * 5 + 4],
          nodes[b * 5], nodes[b * 5 + 1], nodes[b * 5 + 2], nodes[b * 5 + 3], nodes[b * 5 + 4]
        );
      }
    }
  }
  var wireCount = wires.length / 5;
  function meshBuffer(values) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    return buf;
  }
  var wireBuf = meshBuffer(wires);
  var nodeBuf = meshBuffer(nodes);
  function bindMesh(buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 12);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
  }
  var pointMax = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];

  function locs(prog) {
    return {
      mvp: gl.getUniformLocation(prog, "uMvp"),
      mv: gl.getUniformLocation(prog, "uMv"),
      time: gl.getUniformLocation(prog, "uTime"),
      day: gl.getUniformLocation(prog, "uDay"),
      radius: gl.getUniformLocation(prog, "uRadius"),
      cam: gl.getUniformLocation(prog, "uCamZ"),
      px: gl.getUniformLocation(prog, "uPx"),
      max: gl.getUniformLocation(prog, "uMax")
    };
  }
  var lineLoc = locs(lineProg);
  var nodeLoc = locs(nodeProg);
  var glowTag = "";
  var yaw = 0.55;
  var pitch = -0.22;
  var userZoom = 1;
  var hitR = 200;
  var time = 0;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = true;
  var inView = true;
  var dragging = false;
  var pausedByUser = false;
  var closed = false;
  var targetPitch = -0.22;
  var english = document.documentElement.lang === "en";
  var pauseButton = document.querySelector(".intro-pause");
  var dragMoved = false;
  var suppressClick = false;
  var lastX = 0;
  var lastY = 0;
  var idleAt = 0;
  var camZ = 3.25;
  var fovy = 0.7;

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    var nf = 1 / (near - far);
    var o = new Float32Array(16);
    o[0] = f / aspect;
    o[5] = f;
    o[10] = (far + near) * nf;
    o[11] = -1;
    o[14] = 2 * far * near * nf;
    return o;
  }

  function mul(a, b) {
    var o = new Float32Array(16);
    var c, r;
    for (c = 0; c < 4; c++) {
      for (r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function rotX(a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    var o = new Float32Array(16);
    o[0] = 1;
    o[5] = c;
    o[6] = s;
    o[9] = -s;
    o[10] = c;
    o[15] = 1;
    return o;
  }

  function rotY(a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    var o = new Float32Array(16);
    o[0] = c;
    o[2] = -s;
    o[5] = 1;
    o[8] = s;
    o[10] = c;
    o[15] = 1;
    return o;
  }

  function translateZ(z) {
    var o = new Float32Array(16);
    o[0] = o[5] = o[10] = o[15] = 1;
    o[14] = z;
    return o;
  }

  function scale(s) {
    var o = new Float32Array(16);
    o[0] = o[5] = o[10] = s;
    o[15] = 1;
    return o;
  }

  function desiredRadius() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var narrow = window.matchMedia("(max-width: 700px), (max-height: 500px)").matches;
    var d = Math.min(w, h) * 0.84;
    return d * 0.5;
  }

  function fit() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, canvas.clientWidth);
    var h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    hitR = desiredRadius();
  }

  function dayAmount() {
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    var c = Math.cos(((h - 13) / 12) * Math.PI);
    return c > 0 ? c : 0;
  }

  function paintGlow(day) {
    var tag = day.toFixed(2);
    if (tag === glowTag) return;
    glowTag = tag;
    var r = Math.round(31 + (255 - 31) * day);
    var g = Math.round(67 + (150 - 67) * day);
    var b = Math.round(216 + (40 - 216) * day);
    canvas.style.filter = "drop-shadow(0 0 34px rgba(" + r + "," + g + "," + b + ",0.32))";
  }

  function drawMesh(prog, loc, buf, mode, n) {
    gl.useProgram(prog);
    bindMesh(buf);
    gl.uniformMatrix4fv(loc.mvp, false, draw.mvp);
    gl.uniformMatrix4fv(loc.mv, false, draw.mv);
    gl.uniform1f(loc.time, time);
    gl.uniform1f(loc.day, draw.day);
    gl.uniform1f(loc.radius, draw.zoom);
    gl.uniform1f(loc.cam, camZ);
    gl.uniform1f(loc.px, draw.px);
    gl.uniform1f(loc.max, pointMax);
    gl.drawArrays(mode, 0, n);
  }

  function draw() {
    var f = 1 / Math.tan(fovy / 2);
    var breathe = reduce ? 1 : 1 + 0.012 * Math.sin(time * 0.55);
    var zoom = (hitR * camZ) / (f * (canvas.clientHeight / 2)) * userZoom * breathe;
    var model = mul(rotY(yaw), mul(rotX(pitch), scale(zoom)));
    var view = translateZ(-camZ);
    draw.mv = mul(view, model);
    var proj = perspective(fovy, canvas.width / canvas.height, 0.1, 20);
    draw.mvp = mul(proj, draw.mv);
    draw.zoom = zoom;
    draw.day = dayAmount();
    draw.px = Math.max(2.2, canvas.clientHeight * 0.0046) * (canvas.height / Math.max(1, canvas.clientHeight));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawMesh(lineProg, lineLoc, wireBuf, gl.LINES, wireCount);
    drawMesh(nodeProg, nodeLoc, nodeBuf, gl.POINTS, count);
    paintGlow(draw.day);
  }

  var frame = null;
  var lastFrame = 0;
  function tick(now) {
    frame = null;
    if (!running || !inView || closed) return;
    var delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;
    time += delta;
    if (!dragging && !pausedByUser && performance.now() > idleAt && !reduce) {
      yaw += delta * 0.09;
      pitch += (targetPitch - pitch) * Math.min(1, delta * 3);
    }
    draw();
    if (!reduce && !pausedByUser) frame = requestAnimationFrame(tick);
  }
  function resume() {
    if (frame !== null || !running || !inView || closed) return;
    lastFrame = 0;
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
  }
  if ("IntersectionObserver" in window && heroSection) {
    var obs = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) resume(); else pause();
    }, { threshold: 0.05 });
    obs.observe(heroSection);
  }
  window.addEventListener("resize", function () { fit(); resume(); });
  document.addEventListener("visibilitychange", function () {
    running = document.visibilityState !== "hidden" && !closed;
    if (running) resume(); else pause();
  });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (event) {
    reduce = event.matches;
    pause();
    resume();
  });

  heroSection.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse" || reduce || pausedByUser || closed) return;
    targetPitch = -0.22 + (event.clientY / innerHeight - 0.5) * 0.25;
  }, {passive:true});
  pauseButton.addEventListener("click", function () {
    pausedByUser = !pausedByUser;
    pauseButton.setAttribute("aria-pressed", String(pausedByUser));
    pauseButton.textContent = pausedByUser
      ? (english ? "Resume animation" : "Riprendi animazione")
      : (english ? "Pause animation" : "Ferma animazione");
    pause(); if (!pausedByUser) resume();
  });
  document.addEventListener("intro:closed", function () { closed = true; pause(); });
  document.addEventListener("intro:resume", function () { closed = false; running = true; resume(); });
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault(); closed = true; pause();
    heroSection.classList.remove("globe-ready"); pauseButton.hidden = true;
  });
  if (reduce) pauseButton.hidden = true;
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (event) {
    pauseButton.hidden = event.matches;
  });
  heroSection.classList.add("globe-ready");
  fit();
  resume();
})();
