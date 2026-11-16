/* Original soft lounge accompaniment, synthesised locally after an explicit click. */
(function () {
  'use strict';
  var button = document.querySelector('.intro-music');
  var Audio = window.AudioContext || window.webkitAudioContext;
  if (!button || !Audio || !document.documentElement.classList.contains('intro-active')) return;
  var english = document.documentElement.lang === 'en';
  var status = button.querySelector('[data-music-status]');
  var engine = null;
  var stepLength = 60 / 72 / 4;
  var chords = [
    { bass: 38, keys: [53, 57, 60, 64] },
    { bass: 31, keys: [53, 59, 64, 69] },
    { bass: 36, keys: [52, 55, 59, 62] },
    { bass: 33, keys: [55, 59, 60, 64] }
  ];
  function frequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function show(on, failed) {
    button.setAttribute('aria-pressed', String(on));
    button.removeAttribute('aria-busy');
    status.textContent = failed ? (english ? 'Retry' : 'Riprova') : (on ? 'ON' : 'OFF');
  }
  function close(context) { if (context.state !== 'closed') context.close().catch(function () {}); }
  function stop(immediate) {
    var current = engine;
    engine = null;
    show(false);
    if (!current) return;
    clearInterval(current.timer);
    if (immediate || current.context.state !== 'running') { close(current.context); return; }
    var now = current.context.currentTime;
    current.volume.gain.cancelScheduledValues(now);
    current.volume.gain.setValueAtTime(current.volume.gain.value, now);
    current.volume.gain.linearRampToValueAtTime(0, now + 0.2);
    setTimeout(function () { close(current.context); }, 240);
  }
  function createEngine() {
    var context = new Audio();
    var volume = context.createGain(); volume.gain.value = 0; volume.connect(context.destination);
    var compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16; compressor.knee.value = 18; compressor.ratio.value = 2.5;
    compressor.attack.value = 0.01; compressor.release.value = 0.25; compressor.connect(volume);
    var keys = context.createGain(); keys.connect(compressor);
    var reverb = context.createConvolver();
    var impulse = context.createBuffer(2, Math.floor(context.sampleRate * 1.2), context.sampleRate);
    var noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    var seed = 131;
    function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; }
    for (var channel = 0; channel < 2; channel++) {
      var samples = impulse.getChannelData(channel);
      for (var i = 0; i < samples.length; i++) samples[i] = random() * Math.pow(1 - i / samples.length, 3);
    }
    var noiseSamples = noise.getChannelData(0);
    for (var n = 0; n < noiseSamples.length; n++) noiseSamples[n] = random();
    reverb.buffer = impulse;
    var wet = context.createGain(); wet.gain.value = 0.16;
    keys.connect(reverb); reverb.connect(wet); wet.connect(compressor);
    var wave = context.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.24, 0.09, 0.015, 0.008]));
    function tone(midi, when, length, level, bass) {
      var oscillator = context.createOscillator();
      var filter = context.createBiquadFilter();
      var envelope = context.createGain();
      if (bass) oscillator.type = 'sine'; else oscillator.setPeriodicWave(wave);
      oscillator.frequency.value = frequency(midi);
      filter.type = 'lowpass'; filter.Q.value = 0.45;
      filter.frequency.setValueAtTime(bass ? 600 : 3400, when);
      filter.frequency.exponentialRampToValueAtTime(bass ? 260 : 1100, when + length * 0.8);
      envelope.gain.setValueAtTime(0.0001, when);
      envelope.gain.exponentialRampToValueAtTime(level, when + (bass ? 0.025 : 0.018));
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
      oscillator.connect(filter); filter.connect(envelope); envelope.connect(bass ? compressor : keys);
      oscillator.start(when); oscillator.stop(when + length + 0.03);
      oscillator.onended = function () { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
    }
    function brush(when, snare, level) {
      var source = context.createBufferSource(); source.buffer = noise;
      var filter = context.createBiquadFilter(); filter.type = snare ? 'bandpass' : 'highpass';
      filter.frequency.value = snare ? 1900 : 6500; filter.Q.value = 0.55;
      var gain = context.createGain(); var length = snare ? 0.15 : 0.065;
      gain.gain.setValueAtTime(level, when); gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
      source.connect(filter); filter.connect(gain); gain.connect(compressor);
      source.start(when); source.stop(when + length);
      source.onended = function () { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    function kick(when) {
      var oscillator = context.createOscillator(); var gain = context.createGain();
      oscillator.frequency.setValueAtTime(110, when); oscillator.frequency.exponentialRampToValueAtTime(47, when + 0.13);
      gain.gain.setValueAtTime(0.13, when); gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.23);
      oscillator.connect(gain); gain.connect(compressor); oscillator.start(when); oscillator.stop(when + 0.25);
      oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); };
    }
    var current = { context: context, volume: volume, timer: null, index: 0, next: 0 };
    current.schedule = function () {
      if (engine !== current || context.state !== 'running') return;
      // Resume on the current beat after a long scheduling delay; never queue a burst.
      if (current.next < context.currentTime) current.next = context.currentTime + 0.035;
      while (current.next < context.currentTime + 0.16) {
        var step = current.index % 128; var barStep = step % 16; var chordStep = step % 32;
        var chord = chords[Math.floor(step / 32)]; var when = current.next;
        if (chordStep === 0 || chordStep === 10 || chordStep === 16 || chordStep === 26) {
          var soft = chordStep === 10 || chordStep === 26;
          chord.keys.forEach(function (note, index) { tone(note, when + index * 0.022, soft ? 1.35 : 2.5, soft ? 0.045 : 0.075, false); });
        }
        if (chordStep === 0 || chordStep === 16) tone(chord.bass, when, 1.1, 0.15, true);
        if (chordStep === 14 || chordStep === 28) tone(chord.bass + 7, when, 0.5, 0.09, true);
        if (barStep === 0 || barStep === 8) kick(when);
        if (barStep === 4 || barStep === 12) brush(when, true, 0.027);
        if (barStep % 2 === 0) brush(when + (barStep % 4 === 2 ? 0.023 : 0), false, barStep % 4 === 0 ? 0.014 : 0.009);
        current.index++; current.next += stepLength;
      }
    };
    return current;
  }
  button.hidden = false;
  button.addEventListener('click', function () {
    if (engine) { stop(false); return; }
    var current;
    try { current = createEngine(); engine = current; } catch (error) { show(false, true); return; }
    button.setAttribute('aria-busy', 'true');
    // This call stays inside the click/keyboard gesture, including on mobile Safari.
    current.context.resume().then(function () {
      if (engine !== current) { close(current.context); return; }
      if (document.hidden || !document.documentElement.classList.contains('intro-active')) { stop(true); return; }
      current.next = current.context.currentTime + 0.06;
      current.volume.gain.setValueAtTime(0, current.context.currentTime);
      current.volume.gain.linearRampToValueAtTime(0.22, current.context.currentTime + 0.5);
      current.schedule(); current.timer = setInterval(current.schedule, 40); show(true);
      current.context.onstatechange = function () {
        if (engine === current && current.context.state !== 'running') stop(true);
      };
    }).catch(function () { if (engine === current) { stop(true); show(false, true); } });
  });
  document.addEventListener('intro:enter', function () { stop(false); });
  document.addEventListener('intro:closed', function () { stop(false); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(true); });
  window.addEventListener('pagehide', function () { stop(true); });
})();
