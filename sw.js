const CACHE_NAME = "kbjv8321-pwa-v91-confirm8321";
const APP_SHELL = [
  "./", "./index.html", "./style.css?v=91", "./script.js?v=91-8321-confirm8321",
  "./manifest.webmanifest", "./icon.png", "./icon-192.png", "./icon-512.png"
];
const SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("kbjv8321-pwa-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(self.registration.scope)) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request);
        if (response.ok && response.headers.get("Content-Type")?.includes("text/html")
            && (!response.url || response.url.startsWith(self.registration.scope))) {
          await cache.put("./index.html", response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await cache.match(event.request)) || (await cache.match("./index.html"))
          || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Refresh only app-shell assets; the auth API is cross-origin and never cached.
  if (!SHELL_URLS.has(requestUrl.href)) return;
  const network = fetch(event.request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone()).catch(() => {});
    }
    return response;
  });
  // Register lifetime extension synchronously, before network promises settle.
  event.waitUntil(network.then(() => {}, () => {}));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    return cached || (await network.catch(() => Response.error()));
  })());
});
