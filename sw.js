
const CACHE_NAME = 'supaco-shell-v1';
const DYNAMIC_CACHE = 'supaco-dynamic-v1';

// Assets that define the "App Shell"
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/SecureStorage.ts',
  '/components/DashboardLayout.tsx',
  '/components/ContentViews.tsx',
  '/components/AIChatWidget.tsx',
  '/components/LandingPage.tsx',
  '/components/InvertedCorner.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First for API, Cache First for Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Requests (SUAP, Google, etc.): Network Only (let App handle offline logic via localStorage)
  if (url.hostname.includes('suap.ifrn.edu.br') || url.hostname.includes('googleapis.com')) {
    return; // Standard network fetch
  }

  // 2. External CDN Assets (React, Framer, Icons): Stale-While-Revalidate
  if (url.hostname.includes('aistudiocdn.com') || url.hostname.includes('esm.sh') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. App Shell (Local Files): Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache partial responses or errors
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cache new local files on the fly
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
