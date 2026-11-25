(function () {
  "use strict";
  var english = document.documentElement.lang === "en";
  var locale = english ? "en-GB" : "it-IT";

  // ---- Mappa dimostrativa: selezione di una particella ----
  var mappa = document.querySelector(".mappa");
  if (mappa) {
    var particelle = Array.prototype.slice.call(mappa.querySelectorAll(".m-live"));
    var contorno = mappa.querySelector("#m-evid");
    var candidabili = particelle
      .filter(function (p) { return p.dataset.v === "0"; })
      .sort(function (a, b) { return Number(a.dataset.r) - Number(b.dataset.r); });
    var campo = function (nome) { return mappa.querySelector('[data-campo="' + nome + '"]'); };
    var decimale = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    var intero = new Intl.NumberFormat(locale);
    var posizione = 0;

    var seleziona = function (p) {
      var vincolata = p.dataset.v === "1";
      particelle.forEach(function (q) { q.classList.toggle("is-sel", q === p); });
      contorno.setAttribute("d", p.getAttribute("d"));
      contorno.classList.toggle("vincolata", vincolata);
      campo("numero").textContent = p.dataset.n;
      campo("superficie").textContent = decimale.format(Number(p.dataset.ha)) + " ha";
      campo("distanza").textContent = intero.format(Number(p.dataset.d)) + " m";
      campo("punteggio").textContent = vincolata ? "—" : p.dataset.s + " / 100";
      campo("stato").textContent = vincolata
        ? (english ? "Excluded: within the river buffer zone." : "Esclusa: ricade nella fascia di rispetto del fiume.")
        : (english ? p.dataset.r + " of " + candidabili.length + " eligible parcels." : p.dataset.r + "ª su " + candidabili.length + " particelle candidabili.");
      if (!vincolata) posizione = candidabili.indexOf(p);
    };

    particelle.forEach(function (p) {
      p.addEventListener("click", function () { seleziona(p); });
    });

    var successiva = mappa.querySelector("[data-successiva]");
    if (successiva) {
      successiva.hidden = false;
      successiva.addEventListener("click", function () {
        posizione = (posizione + 1) % Math.min(6, candidabili.length);
        seleziona(candidabili[posizione]);
      });
    }
  }

  // Share the canonical URL for the current language.
  var condividi = document.querySelector("[data-condividi]");
  if (condividi) {
    var url = document.querySelector('link[rel="canonical"]').href;
    var esito = document.querySelector("[data-esito-condivisione]");
    condividi.hidden = false;
    condividi.addEventListener("click", async function () {
      esito.textContent = "";
      try {
        if (navigator.share) {
          await navigator.share({ title: "Nicola Valigi", url: url });
          return;
        }
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
      try {
        await navigator.clipboard.writeText(url);
        esito.textContent = english ? "Link copied." : "Link copiato.";
      } catch {
        esito.textContent = (english ? "Share this link: " : "Condividi questo link: ") + url;
      }
    });
  }
})();
