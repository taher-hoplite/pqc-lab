/* PQC·LAB : fonctionnement hors ligne.
   Stratégie : réseau d'abord (pour recevoir les mises à jour), puis cache si le réseau échoue.
   Au premier chargement, toutes les pages et ressources sont préchargées. */
const VERSION = 'pqc-lab-v2';
const PRECACHE = [
  './', 'index.html', 'iot.html', 'ot-it.html', 'iec62443.html', 'reviser.html', 'espace.html', 'comprendre.html', 'inventaire.html', 'firmware.html',
  'assets/site.css', 'assets/site.js', 'assets/tools.js', 'assets/glossary.js', 'assets/vault.js', 'assets/vault.json',
  'assets/favicon.svg', 'assets/icon-32.png', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
