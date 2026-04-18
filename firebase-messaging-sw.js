// =====================================================
// English Coach - Service Worker
// Handles: PWA offline cache + Firebase Cloud Messaging
// Place this file at the ROOT of your GitHub repo
// =====================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyD6cPednhXxhBawUJq4N1rR8c-XGkai5VI",
  authDomain: "english-coaching-2eeee.firebaseapp.com",
  projectId: "english-coaching-2eeee",
  storageBucket: "english-coaching-2eeee.firebasestorage.app",
  messagingSenderId: "975799266905",
  appId: "1:975799266905:web:9dfb13cfb4918e24694b48"
});

const messaging = firebase.messaging();

// ── Background FCM notifications ──────────────────────
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message:', payload);
  const title = payload.notification?.title || 'English Coach';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  || '/icon-192.png';

  self.registration.showNotification(title, {
    body:  body,
    icon:  icon,
    badge: icon,
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Aç' }
    ]
  });
});

// ── Notification click handler ─────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── PWA Offline Cache ──────────────────────────────────
const CACHE_NAME = 'english-coach-v1';
const CACHE_URLS = [
  '/',
  '/index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS).catch(function() {
        // Silently fail if assets not available
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy (always try network, fallback to cache)
self.addEventListener('fetch', function(event) {
  // Only handle GET requests for same-origin or the main HTML
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseapp.com')) return;
  if (event.request.url.includes('googleapis.com')) return;
  if (event.request.url.includes('gstatic.com')) return;

  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // Return cached index.html for navigation requests (SPA fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
      });
    })
  );
});
