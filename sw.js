const CACHE_NAME = 'rds-dst-v15';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Don't cache Firebase requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(function() {
        return caches.match('/');
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
