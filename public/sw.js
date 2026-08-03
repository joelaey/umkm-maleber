// PWA Service Worker for UMKM Maleber
const CACHE_NAME = 'umkm-maleber-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Handle Push Notifications in Service Worker
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'UMKM Maleber', body: 'Notifikasi Baru Masuk!' };
  const options = {
    body: data.body,
    icon: '/globe.svg',
    badge: '/globe.svg',
    vibrate: [200, 100, 200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
