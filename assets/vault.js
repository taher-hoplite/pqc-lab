/* Espace privé : déchiffrement local du coffre (PBKDF2-SHA256 -> AES-256-GCM).
   Rien n'est envoyé nulle part : le texte chiffré est lu dans assets/vault.json et déchiffré dans le navigateur.
   Une mauvaise combinaison identifiant + PIN fait échouer le déchiffrement, ce qui sert de vérification.
   Protection légère, pensée pour masquer le contenu aux visiteurs de passage : un PIN à 4 chiffres reste
   devinable par force brute hors ligne. */
(function () {
  'use strict';
  var gate = document.getElementById('gate'), vault = document.getElementById('vault'), content = document.getElementById('vault-content');
  var form = document.getElementById('login-form'), err = document.getElementById('err'), lockBtn = document.getElementById('lock');
  var enc = new TextEncoder(), dec = new TextDecoder(), blob = null, SK = 'pqc-vk';

  function fromB64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function toB64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function getBlob() { return blob ? Promise.resolve(blob) : fetch('assets/vault.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { blob = j; return j; }); }

  function deriveBits(id, pin, b) {
    return crypto.subtle.importKey('raw', enc.encode(id + ':' + pin), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(b.salt), iterations: b.iter }, k, 256); });
  }
  function decryptWith(bits, b) {
    return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt'])
      .then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(b.iv) }, k, fromB64(b.data)); });
  }

  /* Cases à cocher de la check-list, enregistrées dans ce navigateur */
  function wireChecks() {
    var state = {};
    try { state = JSON.parse(localStorage.getItem('pqc-ck') || '{}'); } catch (e) { state = {}; }
    content.querySelectorAll('input[data-ck]').forEach(function (c) {
      c.checked = !!state[c.getAttribute('data-ck')];
      c.addEventListener('change', function () {
        state[c.getAttribute('data-ck')] = c.checked;
        try { localStorage.setItem('pqc-ck', JSON.stringify(state)); } catch (e) {}
      });
    });
  }

  /* Carnet de contacts : stocké dans ce navigateur, exportable en CSV ou en texte */
  function wireContacts() {
    var form = content.querySelector('#ct-form'); if (!form) return;
    var KEY = 'pqc-contacts', list = content.querySelector('#ct-list'), count = content.querySelector('#ct-count');
    var F = { name: '#ct-name', org: '#ct-org', where: '#ct-where', status: '#ct-status', said: '#ct-said', next: '#ct-next' };
    var data = [], editing = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { data = []; }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function field(k) { return form.querySelector(F[k]); }
    function mail(c) {
      var first = (c.name || '').split(/\s+/)[0] || '[Prénom]';
      var topic = c.said && c.said.length <= 90 ? c.said : '[sujet]';
      return 'Objet : Suite à notre échange à l’European Cyber Week\n\nBonjour ' + first + ',\n\nMerci pour notre échange' + (c.where ? ' (' + c.where + ')' : '') + ' sur ' + topic +
        '. Comme évoqué, je travaille sur l’inventaire cryptographique et la migration vers la PQC, et je prépare une thèse CIFRE ; je cherche un laboratoire et un encadrant. ' +
        'Pourrions-nous nous parler quinze minutes la semaine prochaine, en visio ou par téléphone ? Je peux vous envoyer au préalable une page de présentation du sujet.\n\nBien cordialement,\n[Nom]';
    }
    function copy(text, btn) {
      var done = function () { var t = btn.textContent; btn.textContent = 'Copié'; setTimeout(function () { btn.textContent = t; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
    }
    function render() {
      count.textContent = data.length + ' contact' + (data.length > 1 ? 's' : '');
      list.innerHTML = data.map(function (c, i) {
        return '<div class="card" data-i="' + i + '"><div class="rowgap" style="justify-content:space-between"><h4 style="margin:0">' + esc(c.name) + (c.org ? ' <span style="color:var(--fg-3);font-weight:400">· ' + esc(c.org) + '</span>' : '') + '</h4><span class="chip k4">' + esc(c.status) + '</span></div>' +
          (c.where ? '<p class="sub" style="color:var(--fg-3);margin:6px 0 0">' + esc(c.where) + '</p>' : '') +
          (c.said ? '<p style="margin:8px 0 0">' + esc(c.said).replace(/\n/g, '<br>') + '</p>' : '') +
          (c.next ? '<p style="margin:8px 0 0"><strong>Prochain pas :</strong> ' + esc(c.next) + '</p>' : '') +
          '<div class="rowgap" style="margin-top:12px"><button type="button" class="btn sec" data-a="mail" style="min-height:36px;padding:0 12px">Copier le mail</button>' +
          '<button type="button" class="btn sec" data-a="edit" style="min-height:36px;padding:0 12px">Modifier</button>' +
          '<button type="button" class="btn sec" data-a="del" style="min-height:36px;padding:0 12px">Supprimer</button></div></div>';
      }).join('') || '<p class="sub" style="color:var(--fg-3)">Aucun contact pour l’instant.</p>';
    }
    function reset() { form.reset(); editing = null; content.querySelector('#ct-save').textContent = 'Ajouter'; content.querySelector('#ct-cancel').hidden = true; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = {}; Object.keys(F).forEach(function (k) { c[k] = field(k).value.trim(); });
      if (!c.name) return;
      if (editing != null) data[editing] = c; else data.unshift(c);
      persist(); render(); reset();
    });
    content.querySelector('#ct-cancel').addEventListener('click', reset);
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var i = +b.closest('.card').getAttribute('data-i'), c = data[i];
      if (b.getAttribute('data-a') === 'mail') copy(mail(c), b);
      if (b.getAttribute('data-a') === 'del') { if (confirm('Supprimer ce contact ?')) { data.splice(i, 1); persist(); render(); } }
      if (b.getAttribute('data-a') === 'edit') {
        Object.keys(F).forEach(function (k) { field(k).value = c[k] || ''; });
        editing = i; content.querySelector('#ct-save').textContent = 'Enregistrer'; content.querySelector('#ct-cancel').hidden = false; form.scrollIntoView({ block: 'center' });
      }
    });
    content.querySelector('#ct-copy').addEventListener('click', function (e) {
      copy(data.map(function (c) { return [c.name + (c.org ? ' (' + c.org + ')' : ''), c.where, c.said, 'Prochain pas : ' + c.next, 'Statut : ' + c.status].filter(Boolean).join('\n'); }).join('\n\n'), e.currentTarget);
    });
    content.querySelector('#ct-csv').addEventListener('click', function () {
      var q = function (s) { return '"' + String(s || '').replace(/"/g, '""') + '"'; };
      var rows = [['Nom', 'Organisation', 'Où, quand', 'Statut', 'Ce qui a été dit', 'Prochain pas'].map(q).join(',')]
        .concat(data.map(function (c) { return [c.name, c.org, c.where, c.status, c.said, c.next].map(q).join(','); }));
      var url = URL.createObjectURL(new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      var a = document.createElement('a'); a.href = url; a.download = 'contacts-forum.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    });
    render();
  }

  function open(plain) {
    content.innerHTML = dec.decode(plain);
    gate.hidden = true; vault.hidden = false;
    if (window.PQC) window.PQC.refresh(content);
    if (window.PQC_TOOLS) window.PQC_TOOLS.init();
    wireChecks();
    wireContacts();
    window.scrollTo(0, 0);
  }

  function tryLogin(id, pin) {
    return getBlob().then(function (b) {
      return deriveBits(id.trim().toLowerCase(), pin.trim(), b).then(function (bits) {
        return decryptWith(bits, b).then(function (plain) {
          try { sessionStorage.setItem(SK, toB64(bits)); } catch (e) {}
          open(plain);
        });
      });
    });
  }

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    tryLogin(form.uid.value, form.pin.value).catch(function () {
      setTimeout(function () { err.textContent = 'Identifiant ou code incorrect.'; btn.disabled = false; form.pin.value = ''; form.pin.focus(); }, 600);
    });
  });

  if (lockBtn) lockBtn.addEventListener('click', function () { try { sessionStorage.removeItem(SK); } catch (e) {} location.reload(); });

  /* Session ouverte dans cet onglet : on rouvre sans redemander le PIN */
  try {
    var kept = sessionStorage.getItem(SK);
    if (kept) getBlob().then(function (b) { return decryptWith(fromB64(kept), b); }).then(open).catch(function () { try { sessionStorage.removeItem(SK); } catch (e) {} });
  } catch (e) {}
})();
