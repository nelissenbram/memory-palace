// Service Worker — CacheFirst for static assets, NetworkFirst for HTML pages,
// with auth-sensitive routes (/atrium,/palace,/library,/me,/login,/auth) never
// cached (prevents serving a stale, pre-login shell after OAuth sign-in).

const CACHE_VERSION = 'v2026-07-14a';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const PAGE_CACHE = `pages-${CACHE_VERSION}`;

// Activate immediately, take control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete caches from OLD versions only (keep current version)
          if (cacheName !== STATIC_CACHE && cacheName !== ASSET_CACHE && cacheName !== PAGE_CACHE && cacheName !== 'share-target-v1') {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Pattern matchers
const isStaticAsset = (url) => /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname);
const is3DAsset = (url) => /\.(?:glb|gltf|hdr|exr|ktx2|bin|obj|mtl)$/i.test(url.pathname);
const isImage = (url) => /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico)$/i.test(url.pathname);
const isVideo = (url) => /\.(?:mp4|webm)$/i.test(url.pathname);
const isFont = (url) => /\.(?:woff2?|ttf|eot)$/i.test(url.pathname);
const isNextStatic = (url) => url.pathname.startsWith('/_next/static/');
const isNextImage = (url) => url.pathname.startsWith('/_next/image');
const isAPI = (url) => url.pathname.startsWith('/api/');

self.addEventListener('fetch', (event) => {
  // Handle PWA Share Target POST — intercept shared media
  if (event.request.method === 'POST' && new URL(event.request.url).pathname === '/share-receive') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData.getAll('media');
        const cache = await caches.open('share-target-v1');
        const fileData = [];
        for (const file of files) {
          if (file instanceof File) {
            const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await cache.put(`/share-file/${id}`, new Response(file, {
              headers: { 'Content-Type': file.type, 'X-File-Name': file.name }
            }));
            fileData.push(id);
          }
        }
        const url = new URL('/share-receive', self.location.origin);
        url.searchParams.set('files', fileData.join(','));
        return Response.redirect(url.toString(), 303);
      })()
    );
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls — always go to network
  if (isAPI(url)) return;

  // Skip external origins
  if (url.origin !== self.location.origin) return;

  // ── CacheFirst: Next.js hashed static assets (JS/CSS chunks) ──
  // These have content hashes in filenames — they're immutable
  if (isNextStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // ── CacheFirst: 3D assets, images, videos, fonts ──
  if (is3DAsset(url) || isImage(url) || isVideo(url) || isFont(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // ── NetworkFirst: HTML pages (auth-sensitive; never serve a stale shell) ──
  // Auth routes are NEVER cached: after OAuth sign-in the landing must be the
  // live authenticated response, not a previously-cached logged-out shell.
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    const NO_CACHE = ['/atrium', '/palace', '/library', '/me', '/login', '/auth'];
    const url = new URL(event.request.url);
    const bypass = NO_CACHE.some(
      (r) => url.pathname === r || url.pathname.startsWith(r + '/')
    );
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Never cache redirects (stops a /atrium→/login body being stored
          // under the /atrium key) or auth-sensitive app routes.
          if (!bypass && response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.open(PAGE_CACHE).then((c) =>
            c.match(event.request).then((cached) => cached || caches.match('/offline'))
          )
        )
    );
    return;
  }

  // Everything else: network only (no caching)
});
