/* SAYDELAY – speichert die App selbst auf dem Gerät, damit sie sofort öffnet (auch ohne Internet).
   Filme, Bilder und Daten vom Pi werden hier NICHT angefasst. */
const CACHE = 'saydelay-app-v1';
const APP = ['./', './index.html', './manifest.webmanifest',
             './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // Pi-Anfragen normal laufen lassen
    if (req.mode === 'navigate') { e.respondWith(pageFirst(req)); return; }
    // Symbole & Manifest: sofort aus dem Speicher, im Hintergrund aktualisieren
    e.respondWith(caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }).catch(() => hit);
        return hit || net;
    }));
});

// Seite: neueste Version aus dem Netz (höchstens 2 s warten), sonst die gespeicherte
function pageFirst(req) {
    return new Promise(resolve => {
        let done = false;
        const finish = r => { if (!done && r) { done = true; resolve(r); } };
        const timer = setTimeout(() => caches.match('./index.html').then(finish), 2000);
        fetch(req).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
            clearTimeout(timer); finish(res);
        }).catch(() => caches.match('./index.html').then(r => { clearTimeout(timer); finish(r || Response.error()); }));
    });
}
