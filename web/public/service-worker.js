const CACHE_NAME = 'lapis-app-shell-v1';

const scoped = (relative) => new URL(relative, self.registration.scope).href;
const APP_SHELL = [
  scoped('./'),
  scoped('./index.html'),
  scoped('./manifest.webmanifest'),
  scoped('./icons/lapis-app.svg'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await precacheBuiltAssets(cache);
    }),
  );
});

async function precacheBuiltAssets(cache) {
  const indexUrl = scoped('./index.html');
  const response = await fetch(indexUrl, { cache: 'no-store' });
  if (!response.ok) return;
  await cache.put(indexUrl, response.clone());
  const html = await response.text();
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], indexUrl))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(assetPrefix))
    .map((url) => url.href);
  if (assetUrls.length) await cache.addAll([...new Set(assetUrls)]);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('lapis-app-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
});

const assetPrefix = new URL('./assets/', self.registration.scope).pathname;
const iconPrefix = new URL('./icons/', self.registration.scope).pathname;
const manifestPath = new URL('./manifest.webmanifest', self.registration.scope).pathname;

const isSafeShellAsset = (url) =>
  url.origin === self.location.origin && (
    url.pathname.startsWith(assetPrefix) ||
    url.pathname.startsWith(iconPrefix) ||
    url.pathname === manifestPath
  );

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  if (isSafeShellAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(scoped('./index.html'), response.clone());
    return response;
  } catch {
    return (await cache.match(scoped('./index.html'))) ||
      (await cache.match(scoped('./'))) ||
      Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) void cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || refresh;
}
