// Minimal hand-rolled service worker — no Workbox/next-pwa, the same "no new
// lib when it's this small" call the rest of this front makes.
//
// Scope on purpose: only page navigations go through this. API calls, RSC
// payloads and everything under /uploads are left untouched, so nothing
// auth-gated — someone's audio, transcript or summary — ever sits in a
// client-side cache. All this buys is "the app still opens to something
// readable when the network is down", which is also the fetch handler Chrome's
// installability check looks for.
const CACHE_NAME = 'audio-mind-shell-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})
