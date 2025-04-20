// Service Worker for GroundSchool AI PWA
const APP_CACHE_NAME = 'groundschool-ai-app-cache-v1';
const STATIC_CACHE_NAME = 'groundschool-ai-static-cache-v1';
const DATA_CACHE_NAME = 'groundschool-ai-data-cache-v1';
const DOCUMENT_CACHE_NAME = 'groundschool-ai-document-cache-v1';

// Assets that should be cached immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/media/logo.png',
  '/assets/icon.png',
  '/assets/splash.png',
  '/assets/adaptive-icon.png'
];

// API endpoints to cache with network-first strategy
const API_ROUTES = [
  '/api/',
  'https://api.supabase.co'
];

// Routes that should always try network first
const NETWORK_FIRST_ROUTES = [
  '/auth/',
  '/profile/',
  '/quiz/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Install error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating');
  
  const currentCaches = [
    STATIC_CACHE_NAME,
    DATA_CACHE_NAME,
    APP_CACHE_NAME,
    DOCUMENT_CACHE_NAME
  ];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName))
            .map(cacheName => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[ServiceWorker] Activate error:', error);
      })
  );
});

// Helper function to determine caching strategy based on request URL
function getCacheStrategy(url) {
  const requestUrl = new URL(url);
  
  // Document files (PDFs, images) - Cache first, then network
  if (url.includes('/documents/') || 
      url.endsWith('.pdf') || 
      url.endsWith('.jpg') || 
      url.endsWith('.png') || 
      url.endsWith('.jpeg')) {
    return 'cache-first';
  }
  
  // API requests - Network first, then cache
  if (API_ROUTES.some(route => url.includes(route))) {
    return 'network-first';
  }
  
  // Authentication and user-specific routes - Network only
  if (NETWORK_FIRST_ROUTES.some(route => url.includes(route))) {
    return 'network-first';
  }
  
  // Static assets - Cache first
  if (STATIC_ASSETS.includes(requestUrl.pathname) || 
      url.includes('/static/') || 
      url.includes('/assets/')) {
    return 'cache-first';
  }
  
  // Default strategy - Cache first, network fallback
  return 'cache-first';
}

// Fetch event - handle different caching strategies
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('api.supabase.co')) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  const strategy = getCacheStrategy(event.request.url);
  
  if (strategy === 'network-first') {
    // Network first, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache a copy of the response in the data cache
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[ServiceWorker] Falling back to cache for:', event.request.url);
          return caches.match(event.request);
        })
    );
  } else if (strategy === 'cache-first') {
    // Cache first, fall back to network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response and update cache in background
            // This implements a stale-while-revalidate pattern
            const updateCache = fetch(event.request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                  const cacheName = event.request.url.includes('/documents/') ? 
                    DOCUMENT_CACHE_NAME : STATIC_CACHE_NAME;
                  
                  caches.open(cacheName).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                  });
                }
              })
              .catch(error => {
                console.log('[ServiceWorker] Update cache error:', error);
              });
              
            // Don't wait for cache update
            event.waitUntil(updateCache);
            return cachedResponse;
          }
          
          // Not in cache, get from network
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              
              // Cache the response
              const cacheName = event.request.url.includes('/documents/') ? 
                DOCUMENT_CACHE_NAME : STATIC_CACHE_NAME;
              
              const clonedResponse = response.clone();
              caches.open(cacheName).then(cache => {
                cache.put(event.request, clonedResponse);
              });
              
              return response;
            })
            .catch(error => {
              console.log('[ServiceWorker] Fetch error:', error);
              // For navigation requests, return the offline page
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
              return new Response('Network error', { status: 408, statusText: 'Network error' });
            });
        })
    );
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncDocuments());
  } else if (event.tag === 'sync-quizzes') {
    event.waitUntil(syncQuizzes());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  const data = event.data.json();
  const title = data.title || 'GroundSchool AI';
  const options = {
    body: data.body || 'New notification',
    icon: '/assets/icon.png',
    badge: '/assets/badge.png',
    data: data.data || {}
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.notification.tag);
  
  event.notification.close();
  
  // Open the app and navigate to a specific page
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // If a window client is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Sync documents from IndexedDB to server
async function syncDocuments() {
  // This would be implemented to sync documents from IndexedDB to the server
  console.log('[ServiceWorker] Syncing documents');
  return Promise.resolve();
}

// Sync quizzes from IndexedDB to server
async function syncQuizzes() {
  // This would be implemented to sync quizzes from IndexedDB to the server
  console.log('[ServiceWorker] Syncing quizzes');
  return Promise.resolve();
}
