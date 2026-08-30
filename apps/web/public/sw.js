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

// Where a file shared FROM another app lands until the page picks it up.
// Cache Storage and not IndexedDB because the thing being handed over is a
// Response body already — and because the browser POSTs the share to the
// service worker, which is the only piece of this app that can read it.
const SHARE_CACHE = 'audio-mind-shared'
const SHARE_TARGET_PATH = '/share-target'
const SHARED_FILE_URL = '/shared/audio'

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
      .then((keys) =>
        Promise.all(
          keys
            // SHARE_CACHE is spared: a file may be sitting in it RIGHT NOW,
            // waiting for the page that was opened to come and read it.
            .filter((key) => key !== CACHE_NAME && key !== SHARE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // The share target. Android POSTs the shared file HERE, to the service
  // worker — there is no server round trip, and no other part of the app can
  // see this request.
  if (event.request.method === 'POST' && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(receiveSharedAudio(event.request))
    return
  }

  if (event.request.mode !== 'navigate') return

  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})

/**
 * Stashes the shared file and sends the browser to the composer.
 *
 * The redirect is a 303 on purpose: it is what turns the POST into a GET, so
 * the page that opens is an ordinary navigation and a reload does not re-post
 * anything.
 *
 * The name and the title ride along as headers (percent-encoded — a header may
 * only carry ASCII, and an audio called "reunião.m4a" is the normal case).
 */
async function receiveSharedAudio(request) {
  try {
    const form = await request.formData()
    const file = form.get('audio') || form.get('file')
    const title = form.get('title')

    if (file && file.size > 0) {
      const cache = await caches.open(SHARE_CACHE)
      await cache.put(
        SHARED_FILE_URL,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'audio/mpeg',
            'X-Shared-Name': encodeURIComponent(file.name || 'audio-compartilhado'),
            'X-Shared-Title': encodeURIComponent(typeof title === 'string' ? title : ''),
          },
        }),
      )
      return Response.redirect('/recordings?shared=1', 303)
    }
  } catch {
    // Nothing usable came in the share. Falling through opens the app anyway,
    // which is a better answer than an error page nobody asked for.
  }

  return Response.redirect('/recordings', 303)
}
