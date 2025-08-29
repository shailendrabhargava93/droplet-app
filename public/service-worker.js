// Service Worker for Droplet PWA
const CACHE_NAME = 'droplet-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js',
  '/icon.svg',
  '/icon-192.png',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // Skip waiting so new service worker activates immediately
  self.skipWaiting();
});

// Fetch resources
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached resource
      if (response) {
        return response;
      }

      // Fetch and cache new resources
      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Update Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  const cacheWhitelist = [CACHE_NAME];

  // Delete old caches and claim clients immediately
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Take control of all clients
      self.clients.claim().then(() => {
        console.log('[Service Worker] Claimed all clients');

        // Notify all clients that the service worker is active
        return self.clients.matchAll().then((clients) => {
          return Promise.all(
            clients.map((client) => {
              return client.postMessage({
                type: 'SERVICE_WORKER_ACTIVATED',
              });
            })
          );
        });
      }),
    ])
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  const data = event.data;
  console.log('[Service Worker] Received message:', data.type);

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      console.log('[Service Worker] Skipping waiting phase');

      // Try to notify the client that sent this message
      if (event.source) {
        event.source.postMessage({
          type: 'WAITING_SKIPPED',
        });
      }
      break;

    case 'CHECK_READY':
      // Confirm to the client that the service worker is ready
      if (event.source) {
        console.log('[Service Worker] Responding to ready check');
        event.source.postMessage({
          type: 'SERVICE_WORKER_READY',
          timestamp: Date.now(),
        });
      }
      break;
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Default behavior - just focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
