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

  function open(plain) {
    content.innerHTML = dec.decode(plain);
    gate.hidden = true; vault.hidden = false;
    if (window.PQC) window.PQC.refresh(content);
    if (window.PQC_TOOLS) window.PQC_TOOLS.init();
    wireChecks();
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
