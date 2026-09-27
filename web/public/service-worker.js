const CACHE_NAME = 'lapis-app-shell-v2';
const ASSET_DB_NAME = 'lapis-asset-store';
const ASSET_DB_VERSION = 1;
const ASSET_BLOB_STORE = 'blobs';
const ASSET_MANIFEST_STORE = 'manifests';
const ASSET_INSTALL_STORE = 'installed';

const scoped = (relative) => new URL(relative, self.registration.scope).href;
const APP_SHELL = [
  scoped('./'),
  scoped('./index.html'),
  scoped('./manifest.webmanifest'),
  scoped('./icons/lapis-app.svg'),
];

const assetPrefix = new URL('./assets/', self.registration.scope).pathname;
const iconPrefix = new URL('./icons/', self.registration.scope).pathname;
const manifestPath = new URL('./manifest.webmanifest', self.registration.scope).pathname;
const gameDataPrefix = new URL('./game-data/', self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await precacheBuiltAssets(cache);
  })());
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith('lapis-app-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

const isSafeShellAsset = (url) =>
  url.origin === self.location.origin && (
    url.pathname.startsWith(assetPrefix) ||
    url.pathname.startsWith(iconPrefix) ||
    url.pathname === manifestPath
  );

const isGameDataRequest = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith(gameDataPrefix);

function openAssetDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB_NAME, ASSET_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_BLOB_STORE)) db.createObjectStore(ASSET_BLOB_STORE);
      if (!db.objectStoreNames.contains(ASSET_MANIFEST_STORE)) db.createObjectStore(ASSET_MANIFEST_STORE);
      if (!db.objectStoreNames.contains(ASSET_INSTALL_STORE)) db.createObjectStore(ASSET_INSTALL_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('AssetStore open failed'));
    request.onblocked = () => reject(new Error('AssetStore open blocked'));
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('AssetStore read failed'));
  });
}

async function installedAsset(path) {
  const db = await openAssetDatabase();
  try {
    const installsTx = db.transaction(ASSET_INSTALL_STORE, 'readonly');
    const installs = await idbRequest(installsTx.objectStore(ASSET_INSTALL_STORE).getAll());
    const candidates = (Array.isArray(installs) ? installs : [])
      .filter((item) => item && item.manifest && Array.isArray(item.manifest.assets))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    for (const install of candidates) {
      const entry = install.manifest.assets.find((candidate) => candidate && candidate.path === path);
      if (!entry || typeof entry.sha256 !== 'string') continue;
      const blobTx = db.transaction(ASSET_BLOB_STORE, 'readonly');
      const record = await idbRequest(blobTx.objectStore(ASSET_BLOB_STORE).get(entry.sha256));
      if (!record || !(record.blob instanceof Blob) || record.blob.size !== entry.size) continue;
      return { entry, blob: record.blob, version: install.version };
    }
    return null;
  } finally {
    db.close();
  }
}

async function assetStoreFirst(request, url) {
  let path;
  try {
    path = decodeURIComponent(url.pathname.slice(gameDataPrefix.length));
  } catch {
    return fetch(request);
  }
  if (!path || path.startsWith('/') || path.includes('\\') ||
      path.split('/').some((part) => !part || part === '.' || part === '..')) {
    return fetch(request);
  }

  try {
    const stored = await installedAsset(path);
    if (stored) {
      return new Response(stored.blob, {
        status: 200,
        headers: {
          'Content-Type': stored.entry.mediaType || stored.blob.type || 'application/octet-stream',
          'Content-Length': String(stored.blob.size),
          'Cache-Control': 'no-store',
          'X-Lapis-Asset-Version': String(stored.version || ''),
          'X-Lapis-Asset-Sha256': stored.entry.sha256,
        },
      });
    }
  } catch {
    // IndexedDB failures fall through to the ordinary network fixture/path.
  }

  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (isGameDataRequest(url)) {
    event.respondWith(assetStoreFirst(event.request, url));
    return;
  }
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
