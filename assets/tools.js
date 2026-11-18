/* PQC Lab — outils interactifs. Chaque outil s'active si son conteneur existe sur la page. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nf = new Intl.NumberFormat('fr-FR');
  function fmt(n) { return nf.format(Math.round(n)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opts(sel, arr, val) { sel.innerHTML = arr.map(function (a) { return '<option value="' + a.id + '">' + esc(a.name) + '</option>'; }).join(''); if (val) sel.value = val; }
  function get(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return arr[0]; }

  /* ===== Données (tailles en octets) =====
     ML-KEM / ML-DSA / SLH-DSA : tables des RFC IETF qui reprennent les FIPS 203/204/205.
     Falcon / FN-DSA : site falcon-sign.info, tailles moyennes de la forme compressée (FIPS 206 encore à l'état de projet).
     LMS : RFC 8554, LMS_SHA256_M32_H10 avec LMOTS_SHA256_N32_W8.
     X25519 / Ed25519 / ECDSA P-256 / RSA-2048 : valeurs standard connues, non re-sourcées. */
  var KEM = [
    { id: 'x25519', name: 'X25519 (classique)', pk: 32, ct: 32, pq: false },
    { id: 'mlkem512', name: 'ML-KEM-512', pk: 800, ct: 768, pq: true },
    { id: 'mlkem768', name: 'ML-KEM-768', pk: 1184, ct: 1088, pq: true },
    { id: 'mlkem1024', name: 'ML-KEM-1024', pk: 1568, ct: 1568, pq: true },
    { id: 'hyb', name: 'X25519 + ML-KEM-768 (hybride TLS)', pk: 1216, ct: 1120, pq: true }
  ];
  var SIG = [
    { id: 'ed25519', name: 'Ed25519 (classique)', pk: 32, sig: 64, pq: false },
    { id: 'p256', name: 'ECDSA P-256 (classique, r‖s brut)', pk: 64, sig: 64, pq: false },
    { id: 'rsa2048', name: 'RSA-2048 (classique)', pk: 256, sig: 256, pq: false },
    { id: 'mldsa44', name: 'ML-DSA-44', pk: 1312, sig: 2420, pq: true },
    { id: 'mldsa65', name: 'ML-DSA-65', pk: 1952, sig: 3309, pq: true },
    { id: 'mldsa87', name: 'ML-DSA-87', pk: 2592, sig: 4627, pq: true },
    { id: 'fn512', name: 'FN-DSA-512 (Falcon, projet FIPS 206)', pk: 897, sig: 666, pq: true },
    { id: 'fn1024', name: 'FN-DSA-1024 (Falcon, projet FIPS 206)', pk: 1793, sig: 1280, pq: true },
    { id: 'lms', name: 'LMS H10/W8 (à état, SP 800-208)', pk: 56, sig: 1452, pq: true },
    { id: 'slh128s', name: 'SLH-DSA-128s', pk: 32, sig: 7856, pq: true },
    { id: 'slh128f', name: 'SLH-DSA-128f', pk: 32, sig: 17088, pq: true },
    { id: 'slh192s', name: 'SLH-DSA-192s', pk: 48, sig: 16224, pq: true },
    { id: 'slh192f', name: 'SLH-DSA-192f', pk: 48, sig: 35664, pq: true },
    { id: 'slh256s', name: 'SLH-DSA-256s', pk: 64, sig: 29792, pq: true },
    { id: 'slh256f', name: 'SLH-DSA-256f', pk: 64, sig: 49856, pq: true }
  ];
  var LINKS = [
    { id: 'ieee', name: 'IEEE 802.15.4 + 6LoWPAN (≈ 70 o utiles, estimation)', pay: 70 },
    { id: 'bled', name: 'BLE, MTU ATT par défaut 23 (20 o utiles)', pay: 20 },
    { id: 'blex', name: 'BLE, longueur de données étendue (MTU 247, ≈ 244 o)', pay: 244 },
    { id: 'lr0', name: 'LoRaWAN EU868, DR0 à DR2 (51 o)', pay: 51 },
    { id: 'lr3', name: 'LoRaWAN EU868, DR3 (115 o)', pay: 115 },
    { id: 'lr4', name: 'LoRaWAN EU868, DR4 à DR7 (222 o)', pay: 222 },
    { id: 'sigfox', name: 'Sigfox, montant (12 o)', pay: 12 },
    { id: 'eth', name: 'Ethernet / IP (≈ 1 400 o utiles)', pay: 1400 }
  ];

  /* ===== Explorateur de tailles ===== */
  function sizeExplorer() {
    var box = $('#tool-sizes'); if (!box) return;
    opts($('#sz-kem', box), KEM, 'mlkem768'); opts($('#sz-sig', box), SIG, 'mldsa65'); opts($('#sz-link', box), LINKS, 'ieee');
    function calc(kem, sig, n) {
      var kemB = kem.pk + kem.ct, sigs = (n + 1) * sig.sig, pks = n * sig.pk;
      return { kem: kemB, sigs: sigs, pks: pks, total: kemB + sigs + pks };
    }
    function render() {
      var kem = get(KEM, $('#sz-kem', box).value), sig = get(SIG, $('#sz-sig', box).value), link = get(LINKS, $('#sz-link', box).value);
      var n = +$('#sz-chain', box).value;
      var a = calc(kem, sig, n), c = calc(KEM[0], SIG[0], n);
      var pay = link.pay, frames = Math.ceil(a.total / pay), framesC = Math.ceil(c.total / pay);
      $('#sz-chain-v', box).textContent = n === 0 ? 'clé publique connue (0 certificat)' : n + (n > 1 ? ' certificats' : ' certificat');
      $('#sz-total', box).textContent = fmt(a.total) + ' o';
      $('#sz-base', box).textContent = fmt(c.total) + ' o';
      $('#sz-mult', box).textContent = '× ' + (a.total / c.total).toFixed(a.total / c.total >= 10 ? 0 : 1);
      $('#sz-frames', box).textContent = fmt(frames);
      $('#sz-frames-c', box).textContent = 'contre ' + fmt(framesC) + ' en classique';
      var max = Math.max(a.total, 1);
      var rows = [['Échange de clés (clé publique + chiffré)', a.kem, c.kem], ['Signatures (' + (n + 1) + ')', a.sigs, c.sigs], ['Clés publiques des certificats (' + n + ')', a.pks, c.pks]];
      $('#sz-bars', box).innerHTML = rows.map(function (r) {
        return '<div class="bar-row"><div class="nm">' + r[0] + '</div><div class="tr"><span class="fl pq" style="width:' + Math.max(0.6, r[1] / max * 100) + '%"></span></div><div class="v">' + fmt(r[1]) + ' o</div></div>' +
          '<div class="bar-row"><div class="nm" style="font-weight:400;color:var(--fg-3)">&nbsp;&nbsp;classique</div><div class="tr"><span class="fl" style="width:' + Math.max(0.6, r[2] / max * 100) + '%"></span></div><div class="v">' + fmt(r[2]) + ' o</div></div>';
      }).join('');
      var warn = '';
      if (link.id === 'sigfox') warn = 'Sigfox limite le montant à 140 messages par jour (source secondaire) : ' + (frames > 140 ? 'ce handshake dépasse à lui seul la limite quotidienne.' : 'ce handshake en consommerait ' + frames + '.');
      else if (frames > 40) warn = 'Plus de 40 trames pour un seul handshake : fragmentation lourde, énergie radio et risque de perte élevés.';
      else if (frames > 10) warn = 'Plus de 10 trames : la fragmentation devient un sujet de conception.';
      else warn = 'Reste gérable sur ce lien, hors retransmissions et en-têtes de protocole.';
      var v = $('#sz-verdict', box); v.textContent = warn; v.className = 'verdict ' + (frames > 40 || link.id === 'sigfox' && frames > 140 ? 'bad' : frames > 10 ? 'mid' : 'ok');
    }
    $$('select,input', box).forEach(function (e) { e.addEventListener('input', render); e.addEventListener('change', render); });
    render();
  }

  /* ===== Table des tailles ===== */
  function sizeTable() {
    var t = $('#sizes-table tbody'); if (!t) return;
    var rows = [['X25519', 'KEM', 32, '—', 32, 0], ['ML-KEM-512', 'KEM', 800, 1632, 768, 1], ['ML-KEM-768', 'KEM', 1184, 2400, 1088, 1], ['ML-KEM-1024', 'KEM', 1568, 3168, 1568, 1],
      ['X25519 + ML-KEM-768', 'KEM hybride', 1216, '—', 1120, 1],
      ['Ed25519', 'Signature', 32, '—', 64, 0], ['ECDSA P-256', 'Signature', 64, '—', 64, 0], ['RSA-2048', 'Signature', 256, '—', 256, 0],
      ['ML-DSA-44', 'Signature', 1312, 2560, 2420, 1], ['ML-DSA-65', 'Signature', 1952, 4032, 3309, 1], ['ML-DSA-87', 'Signature', 2592, 4896, 4627, 1],
      ['FN-DSA-512 (projet)', 'Signature', 897, '—', 666, 1], ['FN-DSA-1024 (projet)', 'Signature', 1793, '—', 1280, 1],
      ['LMS H10/W8', 'Signature à état', 56, '—', 1452, 1],
      ['SLH-DSA-128s', 'Signature', 32, 64, 7856, 1], ['SLH-DSA-128f', 'Signature', 32, 64, 17088, 1], ['SLH-DSA-192s', 'Signature', 48, 96, 16224, 1], ['SLH-DSA-192f', 'Signature', 48, 96, 35664, 1],
      ['SLH-DSA-256s', 'Signature', 64, 128, 29792, 1], ['SLH-DSA-256f', 'Signature', 64, 128, 49856, 1]];
    t.innerHTML = rows.map(function (r) {
      return '<tr><td>' + r[0] + (r[5] ? '' : ' <span class="badge b-info">classique</span>') + '</td><td>' + r[1] + '</td><td class="n">' + (typeof r[2] === 'number' ? fmt(r[2]) : r[2]) + '</td><td class="n">' + (typeof r[3] === 'number' ? fmt(r[3]) : r[3]) + '</td><td class="n">' + fmt(r[4]) + '</td></tr>';
    }).join('');
  }

  /* ===== Benchmarks pqm4 (Cortex-M4) ===== */
  var BENCH = [
    { n: 'ML-KEM-512', impl: 'm4fspeed', c: [392423, 390881, 428167], st: null, code: null, ops: ['keygen', 'encaps', 'decaps'] },
    { n: 'ML-KEM-768', impl: 'C de référence', c: [988722, 1138225, 1387984], st: [10248, 13384, 14480], code: 5120, ops: ['keygen', 'encaps', 'decaps'] },
    { n: 'ML-KEM-768', impl: 'm4fspeed', c: [642096, 658754, 707827], st: [5396, 6468, 6452], code: 16016, ops: ['keygen', 'encaps', 'decaps'] },
    { n: 'ML-KEM-768', impl: 'm4fstack', c: [644195, 664654, 714194], st: [2820, 2860, 2860], code: 13320, ops: ['keygen', 'encaps', 'decaps'], approx: true },
    { n: 'ML-DSA-44', impl: 'm4f', c: [1426025, 3943121, 1421623], st: [38296, 44816, 8912], code: null, ops: ['keygen', 'sign', 'verify'] },
    { n: 'ML-DSA-65', impl: 'm4f', c: [2516006, 6193171, 2415944], st: [60824, 68872, 9888], code: 19328, ops: ['keygen', 'sign', 'verify'] },
    { n: 'ML-DSA-65', impl: 'm4fstack', c: [3412622, 24421526, 5732397], st: [4408, 6616, 2712], code: 24120, ops: ['keygen', 'sign', 'verify'] },
    { n: 'FN-DSA-512 (Falcon)', impl: 'm4f', c: [67693338, 22469685, 396949], st: [14348, 41952, 2976], code: 103801, ops: ['keygen', 'sign', 'verify'] },
    { n: 'SLH-DSA-SHA2-128f', impl: 'C de référence', c: [15742990, 368575228, 21923628], st: null, code: null, ops: ['keygen', 'sign', 'verify'] },
    { n: 'SLH-DSA-SHA2-128s', impl: 'C de référence', c: [1007731522, 7657558168, 7471794], st: null, code: null, ops: ['keygen', 'sign', 'verify'] }
  ];
  function dur(s) { return s < 1 ? (s * 1000 < 10 ? (s * 1000).toFixed(1) : fmt(s * 1000)) + ' ms' : s < 100 ? s.toFixed(1) + ' s' : fmt(s) + ' s'; }
  function bench() {
    var box = $('#tool-bench'); if (!box) return;
    var mhz = $('#bn-mhz', box), ram = $('#bn-ram', box), tb = $('#bn-body', box);
    function render() {
      var f = +mhz.value; $('#bn-mhz-v', box).textContent = f + ' MHz';
      var budget = ram.value === 'inf' ? Infinity : +ram.value;
      tb.innerHTML = BENCH.map(function (b) {
        var t = b.c.map(function (c) { return dur(c / (f * 1e6)); });
        var mx = b.st ? Math.max.apply(null, b.st) : null;
        var fit = mx == null ? '<span class="badge b-sec">pile non publiée</span>' : (mx <= budget ? '<span class="badge b-prim">tient</span>' : '<span class="badge b-ver">dépasse</span>');
        return '<tr><td><strong>' + b.n + '</strong><br><span style="color:var(--fg-3);font-size:.82rem">' + b.impl + '</span></td>' +
          '<td class="n">' + t[0] + '</td><td class="n">' + t[1] + '</td><td class="n">' + t[2] + '</td>' +
          '<td class="n">' + (mx == null ? '—' : (b.approx ? '≈ ' : '') + (mx / 1024).toFixed(1) + ' KiB') + '</td>' +
          '<td class="n">' + (b.code == null ? '—' : (b.code / 1024).toFixed(1) + ' KiB') + '</td><td>' + fit + '</td></tr>';
      }).join('');
    }
    mhz.addEventListener('input', render); ram.addEventListener('change', render); render();
  }

  /* ===== Horloge quantique : inégalité de Mosca ===== */
  function mosca() {
    var box = $('#tool-mosca'); if (!box) return;
    var X = $('#ms-x', box), Y = $('#ms-y', box), Z = $('#ms-z', box);
    function render() {
      var x = +X.value, y = +Y.value, z = +Z.value;
      $('#ms-x-v', box).textContent = x + ' ans'; $('#ms-y-v', box).textContent = y + ' ans'; $('#ms-z-v', box).textContent = z + ' ans';
      var sum = x + y, margin = z - sum, max = 60;
      $('#ms-sum', box).textContent = sum + ' ans'; $('#ms-margin', box).textContent = (margin >= 0 ? '+' : '') + margin + ' ans';
      $('#ms-seg-y', box).style.width = (y / max * 100) + '%'; $('#ms-seg-x', box).style.left = (y / max * 100) + '%'; $('#ms-seg-x', box).style.width = (x / max * 100) + '%';
      $('#ms-z-mark', box).style.left = Math.min(100, z / max * 100) + '%';
      var v = $('#ms-verdict', box);
      if (sum > z) { v.className = 'verdict bad'; v.textContent = 'x + y = ' + sum + ' > z = ' + z + ' : exposé. Des données collectées aujourd’hui seraient encore sensibles quand le déchiffrement deviendrait possible.'; }
      else if (margin <= 3) { v.className = 'verdict mid'; v.textContent = 'x + y = ' + sum + ' ≤ z = ' + z + ' mais la marge n’est que de ' + margin + ' an' + (margin > 1 ? 's' : '') + ' : tout retard de migration vous fait basculer.'; }
      else { v.className = 'verdict ok'; v.textContent = 'x + y = ' + sum + ' < z = ' + z + ' : marge de ' + margin + ' ans, sous réserve que votre estimation de z soit juste.'; }
    }
    $$('input[type=range]', box).forEach(function (e) { e.addEventListener('input', render); });
    $$('[data-z]', box).forEach(function (b) { b.addEventListener('click', function () { Z.value = b.getAttribute('data-z'); render(); }); });
    render();
  }

  /* ===== Cycle de vie d'un équipement ===== */
  function lifecycle() {
    var box = $('#tool-life'); if (!box) return;
    var A = $('#lc-start', box), B = $('#lc-life', box);
    function render() {
      var s = +A.value, l = +B.value, e = s + l, min = 2005, max = 2070, span = max - min;
      $('#lc-start-v', box).textContent = s; $('#lc-life-v', box).textContent = l + ' ans'; $('#lc-end', box).textContent = e;
      $('#lc-bar', box).style.left = ((s - min) / span * 100) + '%'; $('#lc-bar', box).style.width = (l / span * 100) + '%';
      [2026, 2030, 2035].forEach(function (y) { $('#lc-m' + y, box).style.left = ((y - min) / span * 100) + '%'; });
      var v = $('#lc-verdict', box);
      if (e > 2035) { v.className = 'verdict bad'; v.textContent = 'En service jusqu’en ' + e + ', donc après les trois jalons de la feuille de route européenne (2026, 2030, 2035). Il doit pouvoir changer d’algorithme et recevoir des mises à jour signées de façon sûre, ou être remplacé avant.'; }
      else if (e > 2030) { v.className = 'verdict mid'; v.textContent = 'En service jusqu’en ' + e + ' : au-delà de 2030, échéance prévue pour les systèmes à haut risque. Sa criticité détermine l’urgence.'; }
      else { v.className = 'verdict ok'; v.textContent = 'Retiré en ' + e + ', avant 2030 : la migration se traite surtout par le remplacement prévu.'; }
    }
    $$('input', box).forEach(function (x) { x.addEventListener('input', render); }); render();
  }

  /* ===== Modèle de Purdue ===== */
  var PURDUE = [
    { id: 'l5', lvl: 'Niveaux 4–5', name: 'Entreprise et IT de site', k: 'k1', ex: 'ERP, messagerie, planification, accès Internet', com: 'HTTPS, TLS, VPN, protocoles IT classiques', cry: 'PKI IT, TLS, VPN. Même socle cryptographique que le reste de l’IT.', pqc: 'Suit le calendrier de migration IT. C’est le niveau où les produits PQC arrivent en premier.' },
    { id: 'dmz', lvl: 'Niveau 3.5', name: 'DMZ industrielle', k: 'k5', ex: 'Serveurs de rebond, relais de mises à jour, réplicas d’historiens, pare-feux', com: 'TLS, VPN, accès distant, flux filtrés entre IT et OT', cry: 'Terminaison TLS et VPN, authentification des accès distants.', pqc: 'Point d’entrée naturel pour des passerelles PQC ou hybrides devant des équipements qui ne migrent pas. Inférence : à confirmer par des retours de terrain.' },
    { id: 'l3', lvl: 'Niveau 3', name: 'Gestion des opérations', k: 'k2', ex: 'MES, historiens, serveurs d’ingénierie, gestion des correctifs', com: 'TLS, protocoles de bases de données, OPC UA', cry: 'Certificats X.509, TLS. Gestion de clés et de certificats très hétérogène.', pqc: 'Inventorier : c’est là que se concentrent certificats et bibliothèques logicielles.' },
    { id: 'l2', lvl: 'Niveau 2', name: 'Supervision et contrôle', k: 'k3', ex: 'SCADA, IHM (HMI), postes d’opérateur', com: 'OPC UA, DNP3, IEC 61850, Modbus/TCP', cry: 'Selon le protocole : TLS avec X.509 (OPC UA, Modbus/TCP Security), MAC symétrique (DNP3 SAv5), ou aucune.', pqc: 'Mise à jour des piles protocolaires : ce sont des logiciels sur PC, plus faciles à faire évoluer que les automates.' },
    { id: 'l1', lvl: 'Niveau 1', name: 'Contrôle de base', k: 'k4', ex: 'Automates (PLC), RTU, contrôleurs DCS, relais de protection', com: 'Modbus, PROFINET, EtherNet/IP, DNP3, GOOSE', cry: 'Souvent aucune ou minimale ; quand elle existe, c’est surtout de l’authentification et du démarrage sécurisé.', pqc: 'Le plus contraint : RAM limitée, cycles déterministes, firmware peu mis à jour. Les signatures de firmware sont le premier sujet.' },
    { id: 'l0', lvl: 'Niveau 0', name: 'Procédé physique', k: 'k0', ex: 'Capteurs, actionneurs, entraînements, vannes', com: 'Signaux analogiques, bus de terrain', cry: 'Pratiquement aucune sur le terrain.', pqc: 'Peu directement concerné, mais dépend de la fiabilité des niveaux supérieurs et des mises à jour de leurs firmwares.' }
  ];
  function purdue() {
    var box = $('#purdue'); if (!box) return;
    var list = $('.pl', box), det = $('.pd', box);
    list.innerHTML = PURDUE.map(function (p, i) {
      return '<button type="button" class="plv ' + p.k + '" data-i="' + i + '" aria-pressed="' + (i === 1) + '"><span class="pn">' + p.lvl + '</span><span class="pt">' + p.name + '</span></button>';
    }).join('');
    function show(i) {
      var p = PURDUE[i];
      $$('.plv', list).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      det.innerHTML = '<span class="chip ' + p.k + '">' + p.lvl + '</span><h4 style="margin-top:10px">' + p.name + '</h4><dl class="kv" style="margin-top:12px">' +
        '<dt>Exemples</dt><dd>' + p.ex + '</dd><dt>Communications</dt><dd>' + p.com + '</dd><dt>Cryptographie</dt><dd>' + p.cry + '</dd><dt>Enjeu PQC</dt><dd>' + p.pqc + '</dd></dl>';
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('.plv'); if (b) show(+b.getAttribute('data-i')); });
    show(1);
  }

  /* ===== Carte de la série IEC 62443 ===== */
  var IEC = [
    { id: '1-1', g: 1, t: 'Terminology, concepts, and models', r: 'Vocabulaire, modèles et concepts de base (exigences fondamentales, niveaux de sécurité).', y: '2007', s: 'Page ISA (source primaire)' },
    { id: '1-5', g: 1, t: 'Scheme for IEC 62443 security profiles', r: 'Cadre pour définir des profils de sécurité.', y: '—', s: 'Source secondaire (Wikipedia)' },
    { id: '2-1', g: 2, t: 'Security program requirements for IACS asset owners', r: 'Programme de sécurité de l’exploitant : gouvernance, politiques, organisation.', y: '2024 (révisée)', s: 'Page ISA (source primaire)' },
    { id: '2-2', g: 2, t: 'IACS security protection scheme', r: 'Schéma de protection de la sécurité IACS (rapport technique).', y: '2025 (ISA-TR)', s: 'Page ISA (source primaire)' },
    { id: '2-3', g: 2, t: 'Patch management in the IACS environment', r: 'Gestion des correctifs en environnement industriel (rapport technique).', y: '2015', s: 'Page ISA (source primaire)' },
    { id: '2-4', g: 2, t: 'Security program requirements for IACS service providers', r: 'Exigences pour intégrateurs et prestataires de maintenance.', y: '2018', s: 'Page ISA (source primaire)' },
    { id: '3-1', g: 3, t: 'Security technologies for IACS', r: 'Panorama des technologies de sécurité (rapport technique ancien).', y: '2007 (ex ISA-TR99.00.01)', s: 'Page ISA (source primaire)' },
    { id: '3-2', g: 3, t: 'Security risk assessment for system design', r: 'Analyse de risque, partition en zones et conduits, détermination des niveaux de sécurité cibles (SL-T).', y: '2020', s: 'Page ISA (source primaire)' },
    { id: '3-3', g: 3, t: 'System security requirements and security levels', r: 'Exigences techniques système (SR) par exigence fondamentale, avec les niveaux atteignables (SL-C).', y: '2013', s: 'Page ISA (source primaire)' },
    { id: '4-1', g: 4, t: 'Secure product development lifecycle requirements', r: 'Cycle de développement sécurisé chez le fournisseur de produits.', y: '2018', s: 'Page ISA (source primaire)' },
    { id: '4-2', g: 4, t: 'Technical security requirements for IACS components', r: 'Exigences techniques par composant (CR) : automate, passerelle, logiciel embarqué, hôte.', y: '2018', s: 'Page ISA (source primaire)' },
    { id: '6-1', g: 6, t: 'Security evaluation methodology for IEC 62443-2-4', r: 'Méthode d’évaluation des prestataires selon 2-4.', y: '—', s: 'Source secondaire (Wikipedia)' }
  ];
  var IECG = { 1: 'Général', 2: 'Politiques et procédures', 3: 'Système', 4: 'Composant', 6: 'Évaluation' };
  function iecMap() {
    var box = $('#iec-map'); if (!box) return;
    var list = $('.im-list', box), det = $('.im-det', box);
    list.innerHTML = [1, 2, 3, 4, 6].map(function (g) {
      return '<div class="im-col"><h5>' + g + ' · ' + IECG[g] + '</h5>' + IEC.filter(function (p) { return p.g === g; }).map(function (p) {
        return '<button type="button" class="imb" data-id="' + p.id + '" aria-pressed="false">62443-' + p.id + '</button>';
      }).join('') + '</div>';
    }).join('');
    function show(id) {
      var p = null; IEC.forEach(function (x) { if (x.id === id) p = x; });
      $$('.imb', list).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === id)); });
      det.innerHTML = '<span class="badge b-info">IEC 62443-' + p.id + '</span> <span class="badge b-sec">' + p.y + '</span><h4 style="margin-top:10px">' + p.t + '</h4><p>' + p.r + '</p><p class="sub" style="color:var(--fg-3);font-size:.85rem">Titre et année : ' + p.s + '.</p>';
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('.imb'); if (b) show(b.getAttribute('data-id')); });
    show('3-3');
  }

  /* ===== Niveaux de sécurité ===== */
  function slPicker() {
    var box = $('#sl-picker'); if (!box) return;
    var D = {
      1: ['Protection contre la mauvaise utilisation non intentionnelle ou accidentelle.', 'Erreur d’un opérateur, mauvaise configuration.'],
      2: ['Protection contre une mauvaise utilisation intentionnelle avec des moyens simples, peu de ressources et une faible motivation.', 'Un attaquant opportuniste avec des outils courants.'],
      3: ['Protection contre des moyens sophistiqués, des ressources modérées, des connaissances spécifiques à l’automatisme et une motivation modérée.', 'Un groupe organisé qui connaît les systèmes industriels.'],
      4: ['Protection contre des moyens sophistiqués, des ressources étendues, des connaissances spécifiques à l’automatisme et une motivation élevée.', 'Un acteur étatique ou très outillé.']
    };
    var out = $('.sl-out', box);
    function show(n) {
      $$('button', box).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sl') === String(n))); });
      out.innerHTML = '<div class="stat">SL ' + n + '</div><p style="margin:10px 0 6px"><strong>' + D[n][0] + '</strong></p><p class="sub" style="color:var(--fg-3);margin:0">Image possible : ' + D[n][1] + '</p>';
    }
    box.addEventListener('click', function (e) { var b = e.target.closest('button[data-sl]'); if (b) show(+b.getAttribute('data-sl')); });
    show(2);
  }

  /* ===== Fiches mémo ===== */
  var CARDS = [
    ['iot', 'Pourquoi une clé publique ML-KEM-768 pose-t-elle problème sur un lien 802.15.4 ?', 'Elle fait 1 184 octets, pour environ 70 octets utiles par trame (estimation) : au moins 17 trames pour la seule clé, avant le chiffré (1 088 o). Fragmentation, énergie radio et pertes en cascade.'],
    ['iot', 'Taille d’une signature ML-DSA-65 contre Ed25519 ?', '3 309 octets contre 64, soit environ 52 fois plus. La clé publique passe de 32 à 1 952 octets.'],
    ['iot', 'Quelle signature PQC est la plus compacte ?', 'FN-DSA-512 (Falcon) : environ 666 octets de signature et 897 de clé publique. Mais FIPS 206 est encore un projet, et l’arithmétique flottante est délicate à implémenter.'],
    ['iot', 'Que veut dire « classe 1 » au sens de la RFC 7228 ?', 'Environ 10 KiB de RAM et 100 KiB de flash. ML-DSA-65 en version rapide signe avec environ 67 KiB de pile : ne tient pas. La version à pile minimale tient en environ 6,5 KiB, mais signe environ 4 fois plus lentement.'],
    ['iot', 'En une phrase : que montre KyberSlash ?', 'Une division dépendant du secret dans des implémentations de ML-KEM a permis, par mesure de temps, de récupérer une clé Kyber-768 en moins de 4 minutes (10 essais sur 10) sur Cortex-M4. Corrigé après divulgation.'],
    ['iot', 'Combien d’octets fait un échange EDHOC complet ?', 'Entre 101 et 242 octets selon le type de clés (RFC 9528, tableau 1). Le seul chiffré ML-KEM-512 (768 o) est déjà plus de 3 fois plus gros que l’échange le plus gros.'],
    ['iot', 'Charges utiles LoRaWAN en EU868 ?', '51 octets pour DR0 à DR2, 115 pour DR3, 222 pour DR4 à DR7 (sources secondaires, document officiel non lu). Une signature ML-DSA-65 n’y tient jamais en un message.'],
    ['iot', 'Pourquoi des signatures à base de hash pour le firmware ?', 'Sécurité fondée sur le hachage seul, vérification légère, standardisées depuis 2020 (SP 800-208). Contrepartie : l’état (une clé à usage unique ne doit jamais être réutilisée) impose une signature contrôlée, typiquement en HSM. Raisonnement de ma part, pas une source.'],
    ['ot', 'Durée de vie typique en IT et en OT ?', 'NIST SP 800-82r3 : 3 à 5 ans en IT, souvent 10 à 15 ans en OT, parfois plus de 20.'],
    ['ot', 'Ordre des priorités en OT ?', 'Sûreté, puis disponibilité, puis intégrité, puis confidentialité (NIST SP 800-82r3). En IT : confidentialité, intégrité, disponibilité.'],
    ['ot', 'Qu’est-ce que Modbus/TCP Security ?', 'Une encapsulation dans TLS sur le port 802 avec authentification mutuelle par certificats X.509. Modbus/TCP classique n’a pas d’authentification.'],
    ['ot', 'Énoncez l’inégalité de Mosca.', 'x + y > z : x = durée pendant laquelle la donnée doit rester confidentielle, y = durée de migration, z = délai avant un ordinateur quantique pertinent. Elle ne couvre que la confidentialité.'],
    ['ot', 'Pourquoi l’intégrité semble prioritaire en OT ?', 'La feuille de route UE demande des mises à jour de firmware signées en PQC, le NCSC britannique insiste sur l’intégrité et l’accès distant, la CISA cite les signatures de firmware à inventorier. C’est une synthèse défendable, pas une position officielle.'],
    ['ot', 'Où en sont les estimations d’arrivée d’un CRQC ?', 'Global Risk Institute (édition 2025, page de synthèse) : 28 à 49 % de chance sous 10 ans, 51 à 70 % sous 15 ans. Gidney (2025) : RSA-2048 avec moins d’un million de qubits bruités en moins d’une semaine, contre 20 millions en 2019.'],
    ['ot', 'Jalons de la feuille de route européenne ?', '31/12/2026 : premières étapes et plans nationaux ; 31/12/2030 : systèmes à haut risque et mises à jour de firmware sûres par défaut ; 31/12/2035 : risque moyen, et risque faible autant que possible. C’est une recommandation non contraignante.'],
    ['ot', 'Dates clés du CRA ?', 'Entrée en vigueur le 10/12/2024 ; obligations de signalement à partir du 11/09/2026 ; application complète le 11/12/2027 (sources secondaires, EUR-Lex non consulté).'],
    ['iec', 'Les quatre groupes de l’IEC 62443 ?', '1 Général, 2 Politiques et procédures (exploitant, prestataires), 3 Système, 4 Composant.'],
    ['iec', 'Les sept exigences fondamentales ?', 'FR1 identification et authentification, FR2 contrôle d’usage, FR3 intégrité du système, FR4 confidentialité des données, FR5 flux de données restreints, FR6 réponse en temps voulu aux événements, FR7 disponibilité des ressources.'],
    ['iec', 'Que sont SL-T, SL-C et SL-A ?', 'Cible (issue de l’analyse de risque 3-2), capacité (ce que le système ou le composant peut atteindre) et atteint (mesuré après intégration). Définition usuelle, non reconfirmée sur le texte payant.'],
    ['iec', 'Que dit la norme sur la cryptographie ?', 'SR 4.3 « Use of cryptography » (3-3, FR4) s’applique à tous les SL-C sans enhancement. Les résumés lus parlent de mécanismes conformes à des standards reconnus, de gestion de clés documentée et d’algorithmes établis. Pas de liste d’algorithmes ni d’exigence de crypto-agilité trouvées.'],
    ['iec', 'L’IEC 62443 impose-t-elle la PQC ?', 'Non, rien de lu ne l’indique. Des vendeurs l’affirment ; je n’ai trouvé aucune position officielle d’ISA ou de l’IEC. Elle renvoie à des standards externes, ce qui est le chemin par lequel la PQC entrera.'],
    ['iec', 'Zone et conduit ?', 'Une zone regroupe des actifs partageant des exigences de sécurité communes ; un conduit est le canal entre deux zones, avec ses propres protections. L’analyse 3-2 les définit et fixe un SL-T par zone.'],
    ['iec', 'Quelles parties concernent un fournisseur de produits ?', '4-1 (cycle de développement sécurisé) et 4-2 (exigences techniques par composant). Certifiables chez ISASecure : SDLA pour 4-1, CSA pour 4-2.'],
    ['iot', 'Quelles signatures la NSA approuve-t-elle pour signer un firmware ?', 'LMS et XMSS (à un seul arbre) ou ML-DSA-87. HSS et XMSS^MT sont interdits ; SLH-DSA n’est approuvé pour aucun usage (FAQ CNSA 2.0, v2.2, octobre 2026).'],
    ['iot', 'Que perd-on si un index LMS est réutilisé ?', 'Chaque clé à usage unique ne doit signer qu’un message. Réutiliser un index, par exemple après la restauration d’une sauvegarde, détruit les garanties (RFC 8554). La NSA demande signature et gestion de l’état dans un HSM, avec des sauvegardes qui empêchent la réutilisation.'],
    ['ot', 'Quelles sont les échéances CNSA 2.0 de la NSA ?', '1er janvier 2027 : nouvelles acquisitions conformes ; 31 décembre 2030 : équipements non conformes retirés et chiffrement quantum-safe par défaut ; 31 décembre 2031 : pleine conformité (FAQ CNSA 2.0, v2.2).'],
    ['ot', 'Le mot « agilité » figure-t-il dans le CRA ou dans NIS 2 ?', 'Non : 0 occurrence dans le texte français complet de chacun. Le CRA demande un chiffrement de pointe et des mises à jour de sécurité ; NIS 2 des politiques sur la cryptographie.'],
    ['ot', 'Que décide NIST IR 8547 dans sa version finale ?', 'Version finale du 27 octobre 2026 : dépréciation après 2030 et interdiction après 2035 des algorithmes à clé publique vulnérables au quantique (la correspondance exacte par tableau est à relire dans le PDF).'],
    ['inv', 'Quels sont les quatre types d’actifs d’un CBOM CycloneDX ?', 'algorithm, certificate, protocol et related-crypto-material. Une clé est un related-crypto-material de type private-key, public-key ou secret-key.'],
    ['inv', 'Que mesure le scanner Crypsy sur le benchmark Cryben ?', 'F1 = 0,75 (précision 0,87, rappel 0,66). Couverture limitée à Ruby, Go et nginx ; arguments calculés à l’exécution non résolus (Näther et Hirsch, arXiv 2608.04857).'],
    ['inv', 'Que reconnaît la CISA sur les outils de découverte ?', 'Ils peuvent ne pas identifier la cryptographie embarquée dans des produits, d’où la demande de listes aux fournisseurs ; la plupart des neuf éléments de données de l’inventaire ne sont pas collectables automatiquement (documents de 2023 et 2024).'],
    ['inv', 'Pourquoi les signatures de firmware sont-elles plus urgentes que les autres ?', 'L’algorithme de validation est souvent figé pour la vie du système : la NSA presse d’acheter des équipements dont les mises à jour sont déjà quantum-safe, au risque de devoir racheter des produits en 2030.'],
    ['inv', 'Quelle incompatibilité guette un fournisseur qui vise l’IETF et la NSA ?', 'SUIT et COSE retiennent HSS-LMS (deux niveaux), alors que la NSA n’approuve que LMS et XMSS à un seul arbre.']
  ];
  function flashcards() {
    var box = $('#flash'); if (!box) return;
    var key = 'pqc-cards', state = {}, filter = 'all';
    try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { state = {}; }
    var list = $('.fl-list', box), stat = $('.fl-stat', box);
    function persist() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {} }
    function render() {
      var shown = CARDS.map(function (c, i) { return [c, i]; }).filter(function (x) { return filter === 'all' || x[0][0] === filter; });
      var ok = shown.filter(function (x) { return state[x[1]] === 'ok'; }).length;
      stat.textContent = ok + ' / ' + shown.length + ' maîtrisées';
      list.innerHTML = shown.map(function (x) {
        var c = x[0], i = x[1], s = state[i];
        return '<div class="fc" data-i="' + i + '"><div class="q">' + esc(c[1]) + (s === 'ok' ? ' <span class="badge b-prim">maîtrisée</span>' : s === 'no' ? ' <span class="badge b-sec">à revoir</span>' : '') + '</div>' +
          '<div class="a">' + esc(c[2]) + '</div><div class="row"><button type="button" class="btn sec rv">Voir la réponse</button>' +
          '<button type="button" class="btn sec mk" data-r="ok">Je sais</button><button type="button" class="btn sec mk" data-r="no">À revoir</button></div></div>';
      }).join('');
    }
    box.addEventListener('click', function (e) {
      var f = e.target.closest('[data-f]'); if (f) { filter = f.getAttribute('data-f'); $$('[data-f]', box).forEach(function (b) { b.setAttribute('aria-pressed', String(b === f)); }); render(); return; }
      var card = e.target.closest('.fc'); if (!card) return;
      if (e.target.closest('.rv')) card.classList.toggle('open');
      var mk = e.target.closest('.mk'); if (mk) { state[card.getAttribute('data-i')] = mk.getAttribute('data-r'); persist(); render(); }
      if (e.target.closest('#fl-reset')) { }
    });
    var rs = $('#fl-reset'); if (rs) rs.addEventListener('click', function () { state = {}; persist(); render(); });
    render();
  }

  /* ===== Glossaire avec recherche ===== */
  function glossary() {
    var box = $('#glossary'); if (!box) return;
    var G = window.PQC_GLOSSARY || {}, keys = Object.keys(G).sort(function (a, b) { return G[a][0].localeCompare(G[b][0], 'fr'); });
    var inp = $('input', box), out = $('.gl-list', box), cnt = $('.gl-count', box);
    function render() {
      var q = inp.value.trim().toLowerCase();
      var ks = keys.filter(function (k) { return !q || (G[k][0] + ' ' + G[k][1] + ' ' + k).toLowerCase().indexOf(q) > -1; });
      cnt.textContent = ks.length + ' terme' + (ks.length > 1 ? 's' : '');
      out.innerHTML = ks.map(function (k) { return '<div class="card"><h4>' + esc(G[k][0]) + '</h4><p>' + esc(G[k][1]) + '</p></div>'; }).join('') || '<p class="sub">Aucun terme ne correspond.</p>';
    }
    inp.addEventListener('input', render); render();
  }

  /* ===== Programme de l'ECW ===== */
  function ecw() {
    var box = $('#ecw-prog'); if (!box) return;
    var tabs = $$('.tabs [role="tab"]', box), days = $$('.day', box), filter = 'all';
    function apply() {
      days.forEach(function (d) {
        var n = 0; $$('.slot', d).forEach(function (s) { var ok = filter === 'all' || s.getAttribute('data-cat') === filter; s.hidden = !ok; if (ok) n++; });
        var e = $('.empty', d); if (e) e.style.display = n ? 'none' : 'block';
      });
    }
    function showDay(id) { tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('aria-controls') === id)); }); days.forEach(function (d) { d.hidden = d.id !== id; }); apply(); }
    tabs.forEach(function (t) { t.addEventListener('click', function () { showDay(t.getAttribute('aria-controls')); }); });
    $$('[data-f]', box).forEach(function (b) { b.addEventListener('click', function () { filter = b.getAttribute('data-f'); $$('[data-f]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); apply(); }); });
    function mins(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }
    function live() {
      var now = new Date(), ymd = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2), m = now.getHours() * 60 + now.getMinutes();
      $$('.slot.now', box).forEach(function (s) { s.classList.remove('now'); });
      days.forEach(function (d) { if (d.getAttribute('data-date') !== ymd) return; $$('.slot', d).forEach(function (s) { if (m >= mins(s.getAttribute('data-start')) && m < mins(s.getAttribute('data-end'))) s.classList.add('now'); }); });
    }
    var now = new Date(), ymd = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    var today = $('.day[data-date="' + ymd + '"]', box); if (today) showDay(today.id); else apply();
    live(); setInterval(live, 60000);
  }

  /* ===== Démonstration : le problème LWE en une dimension (modèle jouet) ===== */
  function lweDemo() {
    var box = $('#tool-lwe'); if (!box) return;
    var q = 97, secret = 0, pts = [];
    var N = $('#lwe-n', box), E = $('#lwe-noise', box), G = $('#lwe-guess', box), svg = $('#lwe-svg', box);
    function circ(x, y) { var d = Math.abs(x - y) % q; return Math.min(d, q - d); }
    function draw() {
      var n = +N.value, e = +E.value;
      pts = [];
      secret = 1 + Math.floor(Math.random() * (q - 2));
      for (var i = 0; i < n; i++) { var a = Math.floor(Math.random() * q), err = Math.floor(Math.random() * (2 * e + 1)) - e; pts.push({ a: a, b: ((a * secret + err) % q + q) % q }); }
      G.value = Math.floor(Math.random() * q);
      render();
    }
    function render() {
      var n = pts.length, e = +E.value, g = +G.value, W = 400, H = 300, pad = 28;
      var sx = function (a) { return pad + a / (q - 1) * (W - 2 * pad); }, sy = function (b) { return H - pad - b / (q - 1) * (H - 2 * pad); };
      $('#lwe-n-v', box).textContent = N.value; $('#lwe-noise-v', box).textContent = '± ' + E.value; $('#lwe-guess-v', box).textContent = G.value;
      var score = 0, s = '<rect x="' + pad + '" y="' + pad + '" width="' + (W - 2 * pad) + '" height="' + (H - 2 * pad) + '" fill="none" stroke="var(--line-strong)"/>';
      for (var a = 0; a < q; a++) s += '<circle cx="' + sx(a).toFixed(1) + '" cy="' + sy((g * a) % q).toFixed(1) + '" r="1.4" fill="var(--accent-2)" opacity=".55"/>';
      pts.forEach(function (p) {
        var ok = circ(p.b, (g * p.a) % q) <= e; if (ok) score++;
        s += '<circle cx="' + sx(p.a).toFixed(1) + '" cy="' + sy(p.b).toFixed(1) + '" r="3.2" fill="' + (ok ? 'var(--accent)' : 'var(--amber)') + '"/>';
      });
      s += '<text x="' + pad + '" y="' + (H - 8) + '" fill="var(--fg-3)" font-family="var(--mono)" font-size="10">a (0 à ' + (q - 1) + ')</text><text x="6" y="14" fill="var(--fg-3)" font-family="var(--mono)" font-size="10">b = a·s + e mod ' + q + '</text>';
      svg.innerHTML = s;
      var compat = 0, best = 0, bestG = 0;
      for (var c = 1; c < q; c++) { var sc = 0; for (var i = 0; i < n; i++) if (circ(pts[i].b, (c * pts[i].a) % q) <= e) sc++; if (sc === n) compat++; if (sc > best) { best = sc; bestG = c; } }
      $('#lwe-score', box).textContent = score + ' / ' + n;
      $('#lwe-compat', box).textContent = compat;
      var v = $('#lwe-verdict', box);
      if (g === secret) { v.className = 'verdict ok'; v.textContent = 'Vous avez trouvé le secret s = ' + secret + '.'; }
      else if (compat === 1) { v.className = 'verdict bad'; v.textContent = 'Un seul secret est compatible avec toutes les observations : le bruit ne cache plus rien. Cherchez la valeur qui donne ' + n + ' / ' + n + '.'; }
      else if (compat > 1) { v.className = 'verdict ok'; v.textContent = compat + ' secrets différents expliquent aussi bien les observations : le bruit cache le vrai secret.'; }
      else { v.className = 'verdict mid'; v.textContent = 'Aucun secret ne colle parfaitement : le meilleur score possible est ' + best + ' / ' + n + ' (s = ' + bestG + ').'; }
    }
    [N, E].forEach(function (x) { x.addEventListener('input', draw); });
    G.addEventListener('input', render);
    $('#lwe-new', box).addEventListener('click', draw);
    $('#lwe-reveal', box).addEventListener('click', function () { G.value = secret; render(); });
    draw();
  }

  /* ===== Démonstration : hybridation ===== */
  function hybridDemo() {
    var box = $('#tool-hybrid'); if (!box) return;
    var Q = $('#hy-quantum', box), F = $('#hy-flaw', box);
    function mark(el, safe) { el.className = 'cell'; el.querySelector('b').textContent = safe ? 'Protégé' : 'Exposé'; el.querySelector('b').style.color = safe ? 'var(--accent)' : 'var(--red)'; }
    function render() {
      var q = Q.getAttribute('aria-pressed') === 'true', f = F.getAttribute('aria-pressed') === 'true';
      mark($('#hy-classic', box), !q); mark($('#hy-pq', box), !f); mark($('#hy-both', box), !q || !f);
      var v = $('#hy-verdict', box);
      if (q && f) { v.className = 'verdict bad'; v.textContent = 'Les deux composants sont cassés : même l’hybride tombe. L’hybridation protège contre UN échec, pas contre deux.'; }
      else if (q) { v.className = 'verdict ok'; v.textContent = 'Un ordinateur quantique casse X25519, mais ML-KEM tient : l’hybride protège la session, pas le classique seul.'; }
      else if (f) { v.className = 'verdict ok'; v.textContent = 'ML-KEM a une faille, mais X25519 tient face aux machines actuelles : l’hybride protège la session, pas le post-quantique seul.'; }
      else { v.className = 'verdict ok'; v.textContent = 'Rien n’est cassé : les trois options sont sûres, l’hybride coûte seulement plus d’octets.'; }
    }
    [Q, F].forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); render(); }); });
    render();
  }

  /* ===== Démonstration : fuite par le temps de calcul ===== */
  function timingDemo() {
    var box = $('#tool-timing'); if (!box) return;
    var secret = [], mode = 'naive', found = [], queries = 0;
    function newSecret() { secret = []; for (var i = 0; i < 4; i++) secret.push(Math.floor(Math.random() * 10)); found = []; queries = 0; render(); }
    function steps(guess) { // nombre de chiffres comparés avant de répondre
      if (mode === 'const') return 4;
      var k = 0; while (k < 4 && guess[k] === secret[k]) k++; return Math.min(4, k + 1);
    }
    function probe(d) { var g = found.concat([d]); while (g.length < 4) g.push(0); queries++; return steps(g); }
    function render() {
      var pos = found.length, rows = '';
      for (var d = 0; d < 10; d++) {
        var t = pos < 4 ? probe(d) : 0;
        rows += '<div class="bar-row"><div class="nm">chiffre ' + (pos + 1) + ' = ' + d + '</div><div class="tr"><span class="fl pq" style="width:' + (t / 4 * 100) + '%"></span></div><div class="v">' + (pos < 4 ? t + ' étape' + (t > 1 ? 's' : '') : '—') + '</div></div>';
      }
      $('#tm-bars', box).innerHTML = rows;
      $('#tm-known', box).textContent = found.concat(['_', '_', '_', '_']).slice(0, 4).join(' ');
      $('#tm-q', box).textContent = queries;
      var v = $('#tm-verdict', box);
      if (pos === 4) { v.className = 'verdict bad'; v.textContent = 'Code retrouvé : ' + found.join('') + ' en ' + queries + ' mesures de temps, au lieu de 10 000 essais à l’aveugle.'; }
      else if (mode === 'const') { v.className = 'verdict ok'; v.textContent = 'Comparaison à temps constant : toutes les barres sont égales, le temps ne révèle rien.'; }
      else { v.className = 'verdict mid'; v.textContent = 'Un chiffre juste fait durer la comparaison une étape de plus : cherchez la barre la plus longue.'; }
    }
    box.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]'); if (m) { mode = m.getAttribute('data-mode'); $$('[data-mode]', box).forEach(function (b) { b.setAttribute('aria-pressed', String(b === m)); }); found = []; queries = 0; render(); return; }
      if (e.target.closest('#tm-next')) {
        if (found.length >= 4) return;
        var pos = found.length, best = 0, bd = 0;
        for (var d = 0; d < 10; d++) { var g = found.concat([d]); while (g.length < 4) g.push(0); var t = steps(g); if (t > best) { best = t; bd = d; } }
        found.push(mode === 'const' ? Math.floor(Math.random() * 10) : bd); render(); return;
      }
      if (e.target.closest('#tm-new')) newSecret();
    });
    newSecret();
  }

  /* ===== Schéma CBOM (CycloneDX 1.6 et 1.7) ===== */
  var CBOM = {
    'algorithm': { grp: 'algorithmProperties', rows: [
      ['primitive', 'Famille de l’algorithme. Valeurs : drbg, mac, block-cipher, stream-cipher, signature, hash, pke, xof, kdf, key-agree, kem, ae, combiner, other, unknown.'],
      ['parameterSetIdentifier', 'Jeu de paramètres (exemple du schéma : « SHA2-128s » pour SLH-DSA).'],
      ['curve', 'Courbe elliptique, le cas échéant.'],
      ['executionEnvironment', 'Environnement d’exécution.'],
      ['implementationPlatform', 'Plateforme d’implémentation.'],
      ['certificationLevel', 'Niveau de certification.'],
      ['mode', 'Mode d’opération.'],
      ['padding', 'Schéma de remplissage.'],
      ['cryptoFunctions', 'Fonctions réalisées. Valeurs : generate, keygen, encrypt, decrypt, digest, tag, keyderive, sign, verify, encapsulate, decapsulate, other, unknown.'],
      ['classicalSecurityLevel', 'Niveau de sécurité face à un attaquant classique, en bits.'],
      ['nistQuantumSecurityLevel', 'Catégorie de sécurité quantique du NIST ; 0 signifie qu’aucune catégorie n’est atteinte.']
    ], add: ['algorithmFamily', 'ellipticCurve'] },
    'certificate': { grp: 'certificateProperties', rows: [
      ['subjectName', 'Nom du sujet du certificat.'], ['issuerName', 'Nom de l’émetteur.'],
      ['notValidBefore', 'Début de validité.'], ['notValidAfter', 'Fin de validité.'],
      ['signatureAlgorithmRef', 'Référence à l’actif algorithme qui a signé le certificat.'],
      ['subjectPublicKeyRef', 'Référence à la clé publique du sujet.'],
      ['certificateFormat', 'Format du certificat.'], ['certificateExtension', 'Extensions du certificat.']
    ], add: ['serialNumber', 'fingerprint', 'certificateState', 'revocationDate', 'relatedCryptographicAssets'] },
    'protocol': { grp: 'protocolProperties', rows: [
      ['type', 'Protocole. Valeurs : tls, ssh, ipsec, ike, sstp, wpa, other, unknown.'],
      ['version', 'Version du protocole.'], ['cipherSuites', 'Suites cryptographiques proposées ou négociées.'],
      ['ikev2TransformTypes', 'Transformations IKEv2.'], ['cryptoRefArray', 'Références aux actifs cryptographiques utilisés.']
    ], add: ['relatedCryptographicAssets'] },
    'related-crypto-material': { grp: 'relatedCryptoMaterialProperties', rows: [
      ['type', 'Nature du matériel : private-key, public-key, secret-key, etc. C’est ainsi qu’une clé est décrite.'],
      ['id', 'Identifiant.'], ['state', 'État du matériel.'], ['algorithmRef', 'Référence à l’algorithme associé.'],
      ['creationDate', 'Date de création.'], ['activationDate', 'Date d’activation.'], ['updateDate', 'Date de mise à jour.'], ['expirationDate', 'Date d’expiration.'],
      ['value', 'Valeur.'], ['size', 'Taille.'], ['format', 'Format.'], ['securedBy', 'Mécanisme qui protège le matériel.']
    ], add: [] }
  };
  function cbomExplorer() {
    var box = $('#tool-cbom'); if (!box) return;
    var tabs = $('#cbom-tabs', box), out = $('#cbom-out', box), keys = Object.keys(CBOM);
    tabs.innerHTML = keys.map(function (k, i) { return '<button type="button" data-t="' + k + '" aria-pressed="' + (i === 0) + '">' + k + '</button>'; }).join('');
    function show(k) {
      var c = CBOM[k];
      $$('button', tabs).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === k)); });
      out.innerHTML = '<p style="margin:0 0 8px">assetType = <code>' + k + '</code>, propriétés dans <code>' + c.grp + '</code>. Le champ <code>oid</code> existe au niveau de <code>cryptoProperties</code>.</p>' +
        '<div class="tw" style="margin:0"><table style="min-width:520px"><thead><tr><th>Champ</th><th>Rôle</th></tr></thead><tbody>' +
        c.rows.map(function (r) { return '<tr><td><code>' + r[0] + '</code></td><td>' + esc(r[1]) + '</td></tr>'; }).join('') +
        c.add.map(function (a) { return '<tr><td><code>' + a + '</code></td><td>Ajouté en CycloneDX 1.7.</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) show(b.getAttribute('data-t')); });
    show(keys[0]);
  }

  /* ===== Méthodes de découverte ===== */
  var DISC = [
    { id: 'static', n: 'Analyse statique du code', d: 'Appels d’API cryptographiques, algorithmes écrits en clair, clés et certificats présents dans le dépôt.', m: 'Arguments calculés à l’exécution, code généré, cryptographie embarquée dans des bibliothèques tierces.', t: 'sonar-cryptography, Cryptoscope, CryptoGuard, CogniCrypt' },
    { id: 'bin', n: 'Binaires et firmware', d: 'Primitives propriétaires, constantes cryptographiques.', m: 'Code obscurci ou compressé.', t: 'Travaux académiques cités dans arXiv 2608.04857 (Where’s Crypto ?, USENIX Security 2021 ; R+r, ACSAC 2024).' },
    { id: 'run', n: 'Observation à l’exécution', d: 'Les paramètres réellement utilisés.', m: 'Les chemins de code non exécutés pendant l’observation.', t: 'CRYLOGGER (Android), cité dans arXiv 2608.04857.' },
    { id: 'net', n: 'Trafic et scan réseau', d: 'Protocoles, suites négociées, certificats exposés.', m: 'La cryptographie interne ou au repos, les protocoles propriétaires.', t: 'testssl.sh, sslyze, CryptoLyzer, zgrab2.' },
    { id: 'cert', n: 'Certificats, PKI, keystores', d: 'Certificats, clés et leurs formats (PEM, PKCS#12).', m: 'Les usages applicatifs que fait le code de ces clés.', t: 'CryptoLyzer, scanners de dépôts de secrets.' },
    { id: 'conf', n: 'Fichiers de configuration', d: 'Directives telles que ssl_protocols (nginx) ou celles de sshd_config.', m: 'Les valeurs par défaut implicites.', t: 'Crypsy (nginx).' },
    { id: 'dep', n: 'Dépendances (SBOM)', d: 'Les bibliothèques cryptographiques présentes.', m: 'L’usage réel de leurs fonctions.', t: 'cryptodeps (QRAMM).' }
  ];
  function discTool() {
    var box = $('#tool-disc'); if (!box) return;
    var tabs = $('#disc-tabs', box), out = $('#disc-out', box);
    tabs.innerHTML = DISC.map(function (m, i) { return '<button type="button" data-t="' + m.id + '" aria-pressed="' + (i === 0) + '">' + m.n + '</button>'; }).join('');
    function show(id) {
      var m = get(DISC, id);
      $$('button', tabs).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === id)); });
      out.innerHTML = '<dl class="kv" style="grid-template-columns:110px 1fr;margin-top:6px"><dt>Voit</dt><dd>' + esc(m.d) + '</dd><dt>Rate</dt><dd>' + esc(m.m) + '</dd><dt>Exemples</dt><dd>' + esc(m.t) + '</dd></dl>';
    }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) show(b.getAttribute('data-t')); });
    show('static');
  }

  /* ===== Chaîne de démarrage sécurisé ===== */
  var BOOT = [
    { lvl: 'Étage 0', name: 'ROM : la racine de confiance', k: 'k3', role: 'Premier code exécuté, gravé à la fabrication. Il vérifie le bootloader suivant.', key: 'Contient ou référence la clé publique (ou son empreinte) qui valide l’étage suivant.', change: 'Non : il ne peut pas être modifié après fabrication. L’algorithme de vérification qu’il contient est donc figé pour la vie de la puce.', src: 'Synthèse, non sourcée.' },
    { lvl: 'Étage 1', name: 'Bootloader de premier niveau', k: 'k1', role: 'Vérifie la signature de l’image suivante avant de lui donner la main.', key: 'Dans MCUboot, seule la clé publique est embarquée dans l’image du bootloader, jusqu’à 8 clés. Les clés privées de production doivent rester dans un HSM.', change: 'Selon le produit. Dans TF-M, le bootloader BL2 n’est pas mettable à jour dans l’implémentation actuelle.', src: 'Documentation MCUboot (primaire) ; TF-M (extrait de recherche, secondaire).' },
    { lvl: 'Étage 2', name: 'Bootloader ou système', k: 'k4', role: 'Vérifie l’application et applique la protection contre le retour en arrière.', key: 'Le manifeste contient un compteur de sécurité, comparé à un compteur non volatile ; un étage ne doit pas pouvoir décrémenter son compteur.', change: 'Souvent mettable à jour, mais c’est lui qui impose la politique anti-rollback.', src: 'TF-M (extrait de recherche, secondaire).' },
    { lvl: 'Étage 3', name: 'Application et mises à jour', k: 'k2', role: 'Le firmware applicatif, et le canal par lequel arrive la prochaine version.', key: 'Le manifeste SUIT (COSE) peut porter plusieurs blocs d’authentification, donc plusieurs algorithmes en parallèle.', change: 'Oui : c’est le seul étage qui change à chaque mise à jour. La feuille de route européenne cible d’abord ce chemin.', src: 'draft-ietf-suit-manifest (primaire) ; feuille de route européenne (primaire).' }
  ];
  function bootChain() {
    var box = $('#boot'); if (!box) return;
    var list = $('.pl', box), det = $('.pd', box);
    list.innerHTML = BOOT.map(function (p, i) { return '<button type="button" class="plv ' + p.k + '" data-i="' + i + '" aria-pressed="' + (i === 1) + '"><span class="pn">' + p.lvl + '</span><span class="pt">' + p.name + '</span></button>'; }).join('');
    function show(i) {
      var p = BOOT[i];
      $$('.plv', list).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      det.innerHTML = '<span class="chip ' + p.k + '">' + p.lvl + '</span><h4 style="margin-top:10px">' + p.name + '</h4><dl class="kv" style="margin-top:12px">' +
        '<dt>Rôle</dt><dd>' + p.role + '</dd><dt>Clés</dt><dd>' + p.key + '</dd><dt>Modifiable ?</dt><dd>' + p.change + '</dd><dt>Source</dt><dd>' + p.src + '</dd></dl>';
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('.plv'); if (b) show(+b.getAttribute('data-i')); });
    show(1);
  }

  /* ===== Signatures à état : réutilisation d'index ===== */
  function lmsDemo() {
    var box = $('#tool-lms'); if (!box) return;
    var TOTAL = 1024, idx = 0, snap = null, used = {}, log = [], bad = false, n = 0;
    function render() {
      $('#lms-idx', box).textContent = idx; $('#lms-left', box).textContent = fmt(Math.max(0, TOTAL - idx)); $('#lms-snap-v', box).textContent = snap == null ? '—' : snap;
      $('#lms-log', box).innerHTML = log.slice(-6).map(function (l) {
        return '<div class="bar-row"><div class="nm">index ' + l.i + '</div><div class="tr"><span class="fl' + (l.dup ? '" style="background:var(--red);width:100%' : ' pq" style="width:' + Math.max(3, l.i / TOTAL * 100) + '%') + '"></span></div><div class="v">' + l.m + (l.dup ? ' : RÉUTILISÉ' : '') + '</div></div>';
      }).join('');
      var v = $('#lms-verdict', box);
      if (bad) { v.className = 'verdict bad'; v.textContent = 'Un même index a signé deux firmwares différents : la clé à usage unique est compromise. Selon la RFC 8554, plus aucune garantie cryptographique ne subsiste.'; }
      else if (idx >= TOTAL) { v.className = 'verdict mid'; v.textContent = 'Les 1 024 signatures sont épuisées : il faut une nouvelle clé publique, donc un nouveau déploiement de clé.'; }
      else { v.className = 'verdict ok'; v.textContent = 'Chaque index n’a signé qu’un seul firmware : la clé reste sûre. Essayez de sauvegarder, de signer, puis de restaurer.'; }
    }
    $('#lms-sign', box).addEventListener('click', function () {
      if (idx >= TOTAL) return; n++;
      var dup = used[idx] != null; if (dup) bad = true; used[idx] = n;
      log.push({ i: idx, m: 'firmware v' + n, dup: dup }); idx++; render();
    });
    $('#lms-snap', box).addEventListener('click', function () { snap = idx; render(); });
    $('#lms-restore', box).addEventListener('click', function () { if (snap != null) { idx = snap; render(); } });
    $('#lms-reset', box).addEventListener('click', function () { idx = 0; snap = null; used = {}; log = []; bad = false; n = 0; render(); });
    render();
  }

  /* ===== Chronologie : tri par date, filtre par acteur, repère « à venir » ===== */
  function timeline() {
    var box = $('#tl'); if (!box) return;
    var ul = $('ul.slots', box), items = $$('li.slot', ul);
    items.sort(function (a, b) { return a.getAttribute('data-date') < b.getAttribute('data-date') ? -1 : a.getAttribute('data-date') > b.getAttribute('data-date') ? 1 : 0; });
    var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    items.forEach(function (li) { ul.appendChild(li); if (li.getAttribute('data-date') > '2026-11-18' && li.getAttribute('data-date') > today) li.classList.add('future'); });
    $$('[data-tl]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-tl');
        $$('[data-tl]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        items.forEach(function (li) { li.hidden = !(f === 'all' || li.getAttribute('data-cat') === f); });
      });
    });
  }

  function init() {
    [sizeExplorer, sizeTable, bench, mosca, lifecycle, purdue, iecMap, slPicker, flashcards, glossary, ecw, lweDemo, hybridDemo, timingDemo, cbomExplorer, discTool, bootChain, lmsDemo, timeline].forEach(function (f) {
      try { f(); } catch (e) { if (window.console) console.error('PQC Lab, outil en échec :', f.name, e); }
    });
  }
  window.PQC_TOOLS = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
