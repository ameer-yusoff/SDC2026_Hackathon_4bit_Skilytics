// Cache public offline assets only. App pages and API/user data are never stored here.
const CACHE = "skilytics-offline-v1";
const OFFLINE = "/offline.html";
const PUBLIC_ASSETS = [OFFLINE, "/pwa/icon-180.png", "/pwa/icon-192.png", "/pwa/icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("skilytics-offline-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    // Always load the latest HTML online, avoiding stale routes after a deployment.
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || new Response("You are offline. Please reconnect.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })));
  } else if (PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(request)));
  }
});
