// Cache app shell and map tiles/OSM data as they are viewed so previously visited areas work offline.
const SHELL = "shell-v1", TILES = "tiles-v1";
const FILES = ["./", "index.html", "style.css", "app.js", "data/regions.js", "icon.svg",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isTile = /tile\.opentopomap|basemaps\.linz|tile\.openstreetmap/.test(req.url);
  const cacheName = isTile ? TILES : SHELL;
  e.respondWith(caches.open(cacheName).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
    return isTile ? (hit || net) : net.then(r => r || hit); // app files: network first so updates show up; tiles: cache first
  }));
});
