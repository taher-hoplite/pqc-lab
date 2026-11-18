/* PQC Lab — comportement partagé : en-tête, thème, niveaux de lecture, sommaire, glossaire, onglets. */
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  var page = body.getAttribute('data-page') || '';

  var PAGES = [
    { id: 'home',  href: 'index.html',        label: 'Accueil',          short: 'Accueil', sub: 'Vue d’ensemble' },
    { id: 'iot',   href: 'iot.html',          label: 'Objets contraints', short: 'IoT',     sub: 'Tailles, radio, énergie' },
    { id: 'ot',    href: 'ot-it.html',        label: 'OT vs IT',         short: 'OT / IT', sub: 'Durée de vie, protocoles, Purdue' },
    { id: 'iec',   href: 'iec62443.html',     label: 'IEC 62443',        short: '62443',   sub: 'La norme, partie par partie' },
    { id: 'talk',  href: 'conversation.html', label: 'Prêt à parler',    short: 'Parler',  sub: 'Pitchs, questions, mémo' },
    { id: 'ecw',   href: 'ecw.html',          label: 'ECW 2026',         short: 'ECW',     sub: 'Programme du workshop' },
    { id: 'cifre', href: 'cifre.html',        label: 'Thèse CIFRE',      short: 'CIFRE',   sub: 'Règles du dispositif' }
  ];
  var TAB = ['home', 'iot', 'ot', 'iec', 'talk'];

  var I = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    iot: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    ot: '<path d="M3 20V9l6 4V9l6 4V5h6v15z"/>',
    iec: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    talk: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.3A8 8 0 1 1 21 12z"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || '') + '</svg>';
  }
  window.PQC_ICON = svg;

  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/>' +
    '<g fill="var(--accent-ink)"><circle cx="9" cy="9" r="1.8"/><circle cx="16" cy="9" r="1.8"/><circle cx="23" cy="9" r="1.8"/>' +
    '<circle cx="9" cy="16" r="1.8"/><circle cx="16.8" cy="15.2" r="2.6"/><circle cx="23" cy="16" r="1.8"/>' +
    '<circle cx="9" cy="23" r="1.8"/><circle cx="16" cy="23" r="1.8"/><circle cx="23" cy="23" r="1.8"/></g></svg>';

  /* ---------- Persistance (tolérante aux erreurs) ---------- */
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- Thème ---------- */
  function themeNow() { var t = root.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : 'auto'; }
  function setTheme(t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    save('pqc-theme', t === 'auto' ? null : t);
    paintControls();
  }
  /* ---------- Niveau de lecture ---------- */
  function levelNow() { return body.getAttribute('data-level') || '2'; }
  function setLevel(l) {
    body.setAttribute('data-level', l);
    save('pqc-level', l);
    paintControls();
    buildToc();
  }
  var savedLevel = load('pqc-level');
  body.setAttribute('data-level', savedLevel === '1' || savedLevel === '3' ? savedLevel : '2');

  /* ---------- En-tête, panneau, menu, barre basse, pied de page ---------- */
  function buildChrome() {
    var hdr = document.getElementById('site-header');
    if (hdr) {
      var links = PAGES.map(function (p) {
        return '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : '') + '>' + p.label + '</a>';
      }).join('');
      hdr.className = 'hdr';
      hdr.innerHTML =
        '<div class="hdr-in">' +
        '<a class="brand" href="index.html" aria-label="PQC Lab, accueil">' + LOGO + '<span>PQC Lab <small>· post-quantique</small></span></a>' +
        '<nav class="nav-d" aria-label="Navigation principale">' + links + '</nav>' +
        '<div class="hdr-actions">' +
        '<button class="ibtn" id="btn-display" type="button" aria-expanded="false" aria-controls="panel-display">' + svg('sliders') + '<span class="lbl">Affichage</span></button>' +
        '<button class="ibtn menu-btn" id="btn-menu" type="button" aria-expanded="false" aria-controls="sheet" aria-label="Menu">' + svg('menu') + '</button>' +
        '</div></div>' +
        '<div class="panel" id="panel-display" role="dialog" aria-label="Réglages d’affichage">' +
        '<div class="grp"><h4>Thème</h4><div class="seg" data-seg="theme">' +
        '<button type="button" data-v="auto">Auto</button><button type="button" data-v="light">Clair</button><button type="button" data-v="dark">Sombre</button></div></div>' +
        '<div class="grp"><h4>Niveau de lecture</h4><div class="seg" data-seg="level">' +
        '<button type="button" data-v="1">Essentiel</button><button type="button" data-v="2">Approfondi</button><button type="button" data-v="3">Expert</button></div>' +
        '<p>Essentiel : l’idée et les chiffres clés. Approfondi : le mécanisme. Expert : détails d’implémentation et limites des sources.</p></div>' +
        '</div>';
    }
    var sh = document.getElementById('site-sheet');
    if (sh) {
      sh.className = 'sheet'; sh.id = 'sheet';
      sh.innerHTML = PAGES.map(function (p) {
        return '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : '') + '>' + p.label + '<span>' + p.sub + '</span></a>';
      }).join('');
    }
    var tb = document.getElementById('site-tabbar');
    if (tb) {
      tb.className = 'tabbar'; tb.setAttribute('aria-label', 'Navigation');
      tb.innerHTML = PAGES.filter(function (p) { return TAB.indexOf(p.id) > -1; }).map(function (p) {
        return '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : '') + '>' + svg(p.id) + '<span>' + p.short + '</span></a>';
      }).join('');
    }
    var ft = document.getElementById('site-footer');
    if (ft) {
      ft.className = 'ftr';
      ft.innerHTML = '<div class="ftr-in"><div><strong style="color:var(--fg)">PQC Lab</strong><p style="margin:8px 0 0;max-width:46ch">' +
        'Notes de travail sur la cryptographie post-quantique pour objets connectés et systèmes industriels. ' +
        'Indépendant, non officiel. Chaque affirmation chiffrée indique son niveau de confiance ; ce qui n’est pas confirmé par une source primaire est signalé.</p></div>' +
        '<div><h5>Pages</h5>' + PAGES.slice(1, 5).map(function (p) { return '<a href="' + p.href + '">' + p.label + '</a>'; }).join('') + '</div>' +
        '<div><h5>Aussi</h5>' + PAGES.slice(5).map(function (p) { return '<a href="' + p.href + '">' + p.label + '</a>'; }).join('') +
        '<a href="https://github.com/taher-hoplite/pqc-lab">Code source</a></div></div>';
    }
    var prog = document.createElement('div'); prog.className = 'progress'; prog.id = 'progress'; body.appendChild(prog);
    var up = document.createElement('button'); up.type = 'button'; up.className = 'totop'; up.id = 'totop'; up.setAttribute('aria-label', 'Retour en haut'); up.innerHTML = svg('up'); body.appendChild(up);
  }

  function paintControls() {
    document.querySelectorAll('[data-seg="theme"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === themeNow())); });
    document.querySelectorAll('[data-seg="level"] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === levelNow())); });
    var dark = themeNow() === 'dark' || (themeNow() === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#0c1014' : '#f7f6f2');
  }

  function wireChrome() {
    var panel = document.getElementById('panel-display');
    var bd = document.getElementById('btn-display');
    var sheet = document.getElementById('sheet');
    var bm = document.getElementById('btn-menu');
    function closeAll() {
      if (panel) panel.classList.remove('open'); if (bd) bd.setAttribute('aria-expanded', 'false');
      if (sheet) sheet.classList.remove('open'); if (bm) bm.setAttribute('aria-expanded', 'false');
    }
    if (bd) bd.addEventListener('click', function (e) { e.stopPropagation(); var o = !panel.classList.contains('open'); closeAll(); if (o) { panel.classList.add('open'); bd.setAttribute('aria-expanded', 'true'); } });
    if (bm) bm.addEventListener('click', function (e) { e.stopPropagation(); var o = !sheet.classList.contains('open'); closeAll(); if (o) { sheet.classList.add('open'); bm.setAttribute('aria-expanded', 'true'); } });
    document.addEventListener('click', function (e) { if (panel && panel.classList.contains('open') && !panel.contains(e.target)) closeAll(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    document.querySelectorAll('[data-seg="theme"] button').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-v')); }); });
    document.querySelectorAll('[data-seg="level"] button').forEach(function (b) { b.addEventListener('click', function () { setLevel(b.getAttribute('data-v')); }); });
    if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(paintControls); }
    var up = document.getElementById('totop'), prog = document.getElementById('progress');
    function onScroll() {
      var h = document.documentElement; var max = h.scrollHeight - h.clientHeight;
      if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
      if (up) up.classList.toggle('show', window.scrollY > 700);
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (up) up.addEventListener('click', function () { window.scrollTo({ top: 0 }); });
    paintControls();
  }

  /* ---------- Titres : ancres, sommaire, suivi de section ---------- */
  function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function anchors() {
    document.querySelectorAll('article h2, article h3').forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent);
      if (!h.querySelector('.anchor')) { var a = document.createElement('a'); a.className = 'anchor'; a.href = '#' + h.id; a.setAttribute('aria-label', 'Lien vers cette section'); a.textContent = '#'; h.insertBefore(a, h.firstChild); }
    });
  }
  var spy;
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function buildToc() {
    var side = document.getElementById('toc'), mob = document.getElementById('toc-m');
    if (!side && !mob) return;
    var hs = Array.prototype.filter.call(document.querySelectorAll('article h2[id]'), visible);
    var html = hs.map(function (h) { return '<a href="#' + h.id + '">' + h.textContent.replace(/^#/, '') + '</a>'; }).join('');
    if (side) side.innerHTML = '<h4>Sur cette page</h4>' + html;
    if (mob) mob.innerHTML = '<details class="toc-m"><summary>Sur cette page</summary>' + html + '</details>';
    if (spy) spy.disconnect();
    if ('IntersectionObserver' in window && side) {
      spy = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { side.querySelectorAll('a').forEach(function (a) { a.removeAttribute('aria-current'); });
            var a = side.querySelector('a[href="#' + en.target.id + '"]'); if (a) a.setAttribute('aria-current', 'true'); }
        });
      }, { rootMargin: '-15% 0px -75% 0px' });
      hs.forEach(function (h) { spy.observe(h); });
    }
  }

  /* ---------- Info-bulles du glossaire ---------- */
  function tooltips() {
    var G = window.PQC_GLOSSARY || {};
    var tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); body.appendChild(tip);
    document.querySelectorAll('abbr.g').forEach(function (a) { a.tabIndex = 0; a.setAttribute('role', 'button'); });
    function show(el) {
      var g = G[el.getAttribute('data-g')]; if (!g) return;
      tip.innerHTML = '<b>' + g[0] + '</b>' + g[1]; tip.style.display = 'block';
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, hgt = tip.offsetHeight;
      var x = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
      var y = r.top - hgt - 10; if (y < 70) y = r.bottom + 10;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }
    function hide() { tip.style.display = 'none'; }
    document.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('abbr.g'); if (a) show(a); });
    document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('abbr.g')) hide(); });
    document.addEventListener('focusin', function (e) { var a = e.target.closest && e.target.closest('abbr.g'); if (a) show(a); });
    document.addEventListener('focusout', hide);
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('abbr.g'); if (a) { e.preventDefault(); show(a); } else hide(); });
    window.addEventListener('scroll', hide, { passive: true });
  }

  /* ---------- Onglets génériques ---------- */
  function tabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (box) {
      var btns = box.querySelectorAll('[role="tab"]');
      function select(b) {
        btns.forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', String(on)); var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
        buildToc();
      }
      btns.forEach(function (b) {
        b.addEventListener('click', function () { select(b); });
        b.addEventListener('keydown', function (e) {
          var i = Array.prototype.indexOf.call(btns, b);
          if (e.key === 'ArrowRight' && btns[i + 1]) { btns[i + 1].focus(); select(btns[i + 1]); }
          if (e.key === 'ArrowLeft' && btns[i - 1]) { btns[i - 1].focus(); select(btns[i - 1]); }
        });
      });
    });
  }

  buildChrome(); wireChrome(); anchors(); buildToc(); tooltips(); tabs();
  window.PQC = { load: load, save: save, levelNow: levelNow, rebuildToc: buildToc };
})();
