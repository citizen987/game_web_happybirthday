// Service worker: offline play with network-first updates.
// Bump CACHE_VERSION when the precache list changes; network-first already
// serves fresh files on every online visit.
const CACHE_VERSION = 'v4';
const CACHE_NAME = `david-dash-${CACHE_VERSION}`;

// App shell. MUST be updated when files are added, renamed or removed
// (every module under src/ has to be listed or it will not work offline).
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'assets/head.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-512-maskable.png',
  'assets/icons/apple-touch-icon.png',
  'src/audio/music.js',
  'src/audio/sfx.js',
  'src/config.js',
  'src/core/audio.js',
  'src/core/best-score.js',
  'src/core/display.js',
  'src/core/input.js',
  'src/core/site.js',
  'src/game/camera.js',
  'src/game/effects.js',
  'src/game/enemies.js',
  'src/game/game.js',
  'src/game/pickups.js',
  'src/game/player.js',
  'src/game/score.js',
  'src/game/super.js',
  'src/game/world.js',
  'src/main.js',
  'src/model/player-state.js',
  'src/render/background.js',
  'src/render/draw.js',
  'src/render/entities-view.js',
  'src/render/head-sprite.js',
  'src/render/hud.js',
  'src/render/letter-glyphs.js',
  'src/render/player-view.js',
  'src/render/renderer.js',
  'src/render/share-card.js',
  'src/render/terrain-view.js',
  'src/ui/device.js',
  'src/ui/mute-button.js',
  'src/ui/overlay-guard.js',
  'src/ui/pwa.js',
  'src/ui/screens.js',
  'src/ui/share-flow.js',
  'src/ui/share.js',
  'src/utils/format.js',
  'src/utils/math.js',
  'src/utils/storage.js',
  'src/world/level.js',
  'src/world/terrain.js',
  'src/version.js',
];

// Navigations (any query string: ?debug, ?fbclid=...) share one cache entry.
const SHELL_KEY = './';

// A redirected response (e.g. /index.html -> /) cannot be served to a navigation,
// so store a clean copy of its body and headers instead.
const storable = (response) => (response.redirected ? new Response(response.body, response) : response);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache files one by one so a single missing file never aborts the install.
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            const response = await fetch(path, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(path, storable(response));
          } catch (error) {
            console.warn(`[sw] precache skipped ${path}:`, error);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('david-dash-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/.netlify/')) return; // Netlify-injected scripts: not part of the game
  event.respondWith(networkFirst(event, request));
});

async function networkFirst(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const key = request.mode === 'navigate' ? SHELL_KEY : request;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      // waitUntil keeps the worker alive until the offline copy is written.
      event.waitUntil(
        cache.put(key, storable(response.clone())).catch((error) => {
          console.warn('[sw] cache update failed:', error);
        }),
      );
    }
    return response;
  } catch (error) {
    const cached = await cache.match(key, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = (await cache.match(SHELL_KEY)) || (await cache.match('index.html'));
      if (shell) return shell;
    }
    throw error;
  }
}
