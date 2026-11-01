(function (root) {
  'use strict';
  // Entirely synthetic sites, with fixed bounds so changing filters never changes normalization.
  var sites = [
    { id: 'A', area: 11000, distance: 140, constrained: false },
    { id: 'B', area: 19000, distance: 480, constrained: false },
    { id: 'C', area: 23000, distance: 110, constrained: true },
    { id: 'D', area: 13500, distance: 900, constrained: false },
    { id: 'E', area: 6400, distance: 80, constrained: false },
    { id: 'F', area: 21000, distance: 1100, constrained: false }
  ];
  function rankSites(weight, exclude) {
    var w = Math.max(0, Math.min(100, Number(weight)));
    if (!Number.isFinite(w)) w = 65;
    return sites.map(function (s) {
      var network = Math.max(0, 100 * (1 - s.distance / 1200));
      var space = Math.min(100, 100 * s.area / 24000);
      return Object.assign({}, s, { network: network, space: space,
        score: (network * w + space * (100 - w)) / 100,
        excluded: Boolean(exclude && s.constrained) });
    }).sort(function (a, b) {
      return Number(a.excluded) - Number(b.excluded) || b.score - a.score || a.id.localeCompare(b.id);
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { rankSites: rankSites };
  if (!root.document) return;
  var lab = root.document.querySelector('[data-decision-lab]');
  if (!lab) return;
  var en = lab.dataset.lang === 'en';
  var t = function (it, english) { return en ? english : it; };
  var weight = lab.querySelector('#lab-weight');
  var exclude = lab.querySelector('#lab-exclude');
  var ranking = lab.querySelector('.lab-ranking');
  var reset = lab.querySelector('[data-lab-reset]');
  var selected = 'A';
  var formatter = new Intl.NumberFormat(en ? 'en-GB' : 'it-IT');
  var decimal = new Intl.NumberFormat(en ? 'en-GB' : 'it-IT', { maximumFractionDigits: 1 });
  var set = function (selector, value) { lab.querySelector(selector).textContent = value; };
  function render(followBest, announce) {
    var focused = root.document.activeElement;
    var w = Number(weight.value);
    var results = rankSites(w, exclude.checked);
    var best = results.find(function (s) { return !s.excluded; });
    if (followBest) selected = best.id;
    var current = results.find(function (s) { return s.id === selected; });
    var displayScore = Math.round(current.score);
    var weights = t('Rete ', 'Grid ') + w + '% · ' + t('Superficie ', 'Area ') + (100 - w) + '%';
    set('#lab-weight-value', weights);
    weight.setAttribute('aria-valuetext', weights);
    set('[data-lab-leading]', t('In testa: Area ', 'Leading: Site ') + best.id + ' · ' + Math.round(best.score) + ' / 100');
    results.forEach(function (s) {
      var row = ranking.querySelector('[data-site="' + s.id + '"]');
      ranking.appendChild(row.parentElement);
      set('[data-score="' + s.id + '"]', s.excluded ? t('Esclusa', 'Excluded') : Math.round(s.score));
      lab.querySelectorAll('[data-site="' + s.id + '"]').forEach(function (button) {
        button.disabled = false;
        button.setAttribute('aria-pressed', String(s.id === selected));
        button.classList.toggle('is-excluded', s.excluded);
        button.classList.toggle('is-best', s.id === best.id);
        button.setAttribute('aria-label', t('Area ', 'Site ') + s.id + ', ' +
          (s.excluded ? t('esclusa per vincolo', 'excluded by constraint') :
            t('indice ', 'score ') + Math.round(s.score) + t(' su 100', ' out of 100')) +
          (s.id === best.id ? t(', prima in graduatoria', ', ranked first') : ''));
      });
      var parcel = lab.querySelector('[data-parcel="' + s.id + '"]');
      parcel.classList.toggle('is-selected', s.id === selected);
      parcel.classList.toggle('is-excluded', s.excluded);
    });
    if (focused && lab.contains(focused) && root.document.activeElement !== focused) focused.focus({ preventScroll: true });
    set('[data-result-label]', current.excluded ? t('Area esclusa dal confronto', 'Site excluded from comparison') :
      current.id === best.id ? t('Prima area da approfondire', 'First site to investigate') : t('Area a confronto', 'Site under comparison'));
    set('[data-result-name]', t('Area ', 'Site ') + current.id);
    set('[data-result-score]', current.excluded ? '—' : displayScore);
    set('[data-result-area]', formatter.format(current.area) + ' m²');
    set('[data-result-distance]', formatter.format(current.distance) + ' m');
    set('[data-result-constraint]', current.constrained ? t('Presente', 'Present') : t('Assenti', 'None'));
    var reason;
    if (current.excluded) reason = t('Il filtro vincoli esclude quest’area, anche se altri valori sono favorevoli. Disattivalo per vedere quanto cambia la graduatoria.', 'The constraint filter excludes this site even when other values are favourable. Turn it off to see how the ranking changes.');
    else reason = t('Con questi pesi, la rete contribuisce ', 'With these weights, grid proximity contributes ') + decimal.format(current.network * w / 100) +
      t(' punti e la superficie ', ' points and area contributes ') + decimal.format(current.space * (100 - w) / 100) +
      t(' punti. ', ' points. ') + (current.id === best.id ? t('È il punteggio più alto tra le aree ammesse.', 'This is the highest score among eligible sites.') :
        t('La prima in graduatoria resta l’area ', 'The highest-ranked site is still ') + best.id + '.');
    set('[data-result-reason]', reason);
    set('[data-calculation]', decimal.format(current.network) + ' × ' + w + '% + ' + decimal.format(current.space) + ' × ' + (100 - w) + '% = ' + displayScore +
      (current.excluded ? t(' · esclusa dal filtro', ' · excluded by filter') : ''));
    var body = t('Ciao Nicola,\nho provato il laboratorio sul tuo sito. Vorrei applicare un confronto simile a un caso reale.\n\nObiettivo:\nDati disponibili:\nCriteri e vincoli:\nTempistiche:\n',
      'Hi Nicola,\nI tried the lab on your website and would like to apply a similar comparison to a real case.\n\nGoal:\nAvailable data:\nCriteria and constraints:\nTimeline:\n');
    lab.querySelector('[data-lab-contact]').href = 'mailto:n.valigi@gmail.com?subject=' + encodeURIComponent(t('Dal laboratorio a un caso reale', 'From the lab to a real case')) + '&body=' + encodeURIComponent(body);
    if (announce) set('[data-lab-status]', weights + '. ' + t('Prima area: ', 'Top site: ') + best.id + ', ' + Math.round(best.score) + t(' su 100.', ' out of 100.'));
  }
  lab.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-site]');
    if (!button) return;
    selected = button.dataset.site;
    render(false, false);
    var current = rankSites(weight.value, exclude.checked).find(function (s) { return s.id === selected; });
    set('[data-lab-status]', t('Area ', 'Site ') + current.id + '. ' + lab.querySelector('[data-result-label]').textContent + '. ' + lab.querySelector('[data-result-reason]').textContent);
  });
  weight.addEventListener('input', function () { render(true, false); });
  weight.addEventListener('change', function () { render(true, true); });
  exclude.addEventListener('change', function () { render(true, true); });
  reset.addEventListener('click', function () {
    weight.value = '65'; exclude.checked = true; render(true, true);
  });
  render(true, false);
  lab.querySelector('[data-lab-controls]').hidden = false;
  reset.hidden = false;
})(typeof window !== 'undefined' ? window : globalThis);
