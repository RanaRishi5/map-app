(() => {
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ---------- categories ----------
const CATS = {
  peak:   { label: "Mountains", icon: "▲", color: "#7a4b2a" },
  water:  { label: "Streams & falls", icon: "≈", color: "#1e78c8" },
  hike:   { label: "Hikes", icon: "⛰", color: "#c0392b" },
  sight:  { label: "Tourist spots", icon: "★", color: "#d68a00" },
  stay:   { label: "Huts & camps", icon: "⌂", color: "#2f6b3a" }
};

// ---------- map ----------
const map = L.map("map", { zoomControl: true }).fitBounds(COROMANDEL_BOUNDS);
const base = {
  "Topo (OpenTopoMap)": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17, attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors" }),
  "Street (OSM)": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap contributors" })
};
let linzLayer = null;
function setLinz(key) {
  if (linzLayer) { layersCtl.removeLayer(linzLayer); map.removeLayer(linzLayer); linzLayer = null; }
  if (!key) return;
  linzLayer = L.tileLayer(`https://basemaps.linz.govt.nz/v1/tiles/topographic/WebMercatorQuad/{z}/{x}/{y}.webp?api=${encodeURIComponent(key)}`, {
    maxZoom: 18, attribution: "© LINZ CC BY 4.0" });
  layersCtl.addBaseLayer(linzLayer, "NZ Topo50 (LINZ)");
  linzLayer.addTo(map);
  base["Topo (OpenTopoMap)"].remove();
}
base["Topo (OpenTopoMap)"].addTo(map);
const layersCtl = L.control.layers(base, {}, { position: "topright" }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);
setLinz(store.get("linzKey", ""));

const regionLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const lineLayer = L.layerGroup().addTo(map);
const tripLine = L.polyline([], { color: "#e91e63", weight: 4, dashArray: "8 6" }).addTo(map);

// ---------- tabs ----------
function showTab(name) {
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
  $("#panel").classList.remove("min");
}
$("#tabs").onclick = e => { const t = e.target.closest("button")?.dataset.tab; if (t) showTab(t); };
$("#collapse").onclick = () => { $("#panel").classList.toggle("min"); setTimeout(() => map.invalidateSize(), 50); };

// ---------- regions ----------
let region = null;
function drawRegions() {
  regionLayer.clearLayers();
  REGIONS.forEach(r => {
    const rect = L.rectangle([[r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]],
      { color: r.color, weight: region === r ? 3 : 1.5, fillOpacity: region === r ? 0 : .08, dashArray: region === r ? null : "4" })
      .bindTooltip(r.name, { sticky: true }).on("click", () => openRegion(r));
    regionLayer.addLayer(rect);
  });
}
$("#regionList").innerHTML = REGIONS.map(r => `
  <li data-id="${r.id}" style="--c:${r.color}"><b>${r.name}</b>
  <small>${r.blurb}</small>
  <div class="chips">${r.activities.map(a => `<span class="chip">${a}</span>`).join("")}</div></li>`).join("");
$("#regionList").onclick = e => {
  const li = e.target.closest("li"); if (li) openRegion(REGIONS.find(r => r.id === li.dataset.id));
};
$("#viewAll").onclick = () => { region = null; poiLayer.clearLayers(); lineLayer.clearLayers(); drawRegions(); map.fitBounds(COROMANDEL_BOUNDS); };
drawRegions();

// ---------- OSM data ----------
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const cache = {};
async function overpass(q) {
  let err;
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(20000) });
      if (r.ok) return r.json();
      err = new Error("HTTP " + r.status);
    } catch (e) { err = e; }
  }
  throw err;
}
function query(b) {
  const bb = b.join(",");
  return `[out:json][timeout:40];
(node["natural"="peak"]["name"](${bb});
 node["waterway"="waterfall"](${bb});
 node["tourism"~"^(attraction|viewpoint|picnic_site)$"](${bb});
 node["natural"~"^(hot_spring|beach|cave_entrance)$"]["name"](${bb});
 node["tourism"~"^(camp_site|alpine_hut|wilderness_hut)$"](${bb});
 node["amenity"="shelter"]["name"](${bb}););
out body 1500;
(way["waterway"~"^(river|stream)$"]["name"](${bb}););
out geom 400;
(way["highway"~"^(path|footway|track)$"]["name"](${bb}););
out geom 800;`;
}
function classify(t) {
  if (t.natural === "peak") return "peak";
  if (t.waterway) return "water";
  if (t.tourism === "camp_site" || /hut/.test(t.tourism || "") || t.amenity === "shelter") return "stay";
  return "sight";
}
function lenKm(g) {
  let d = 0;
  for (let i = 1; i < g.length; i++) d += L.latLng(g[i - 1]).distanceTo(L.latLng(g[i]));
  return d / 1000;
}
function parse(json) {
  const items = [], lines = {};
  for (const el of json.elements) {
    const t = el.tags || {};
    if (el.type === "node") {
      const cat = classify(t);
      const name = t.name || (t.waterway === "waterfall" ? "Waterfall (unnamed)" : t.tourism === "viewpoint" ? "Viewpoint (unnamed)" : null);
      if (!name) continue;
      const extra = t.ele ? Math.round(parseFloat(t.ele)) + " m" : "";
      items.push({ cat, name, lat: el.lat, lon: el.lon, sub: extra || (t.tourism || t.natural || t.waterway || "").replace("_", " "), ele: parseFloat(t.ele) || 0 });
    } else if (el.type === "way" && el.geometry) {
      const isWater = !!t.waterway;
      const key = (isWater ? "w:" : "h:") + t.name;
      const g = el.geometry.map(p => [p.lat, p.lon]);
      (lines[key] ??= { cat: isWater ? "water" : "hike", name: t.name, geoms: [], sub: t.waterway || "track" }).geoms.push(g);
    }
  }
  for (const l of Object.values(lines)) {
    const km = l.geoms.reduce((s, g) => s + lenKm(g), 0);
    l.km = km;
    const mid = l.geoms[0][Math.floor(l.geoms[0].length / 2)];
    l.lat = mid[0]; l.lon = mid[1];
    l.sub = l.cat === "hike" ? `${km.toFixed(1)} km · ~${Math.max(10, Math.round(km / 4 * 60))} min one-way`
                              : `${l.sub} · ${km.toFixed(1)} km mapped`;
    if (l.cat === "hike" && km < 0.3) continue;
    items.push(l);
  }
  return items;
}


// ---------- official LINZ Topo50 / NZGB data (bundled in data/linz) ----------
let linzData = null;
async function loadLinz() {
  if (linzData) return linzData;
  try {
    const names = ["places", "tracks", "falls", "heights"];
    const res = await Promise.all(names.map(n => fetch(`data/linz/${n}.json`).then(r => { if (!r.ok) throw 0; return r.json(); })));
    linzData = Object.fromEntries(names.map((n, i) => [n, res[i].features]));
  } catch { linzData = false; }
  return linzData;
}
const inBox = (lat, lon, b) => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3];
const SIGHT_TYPES = { "Beach": 1, "Historic Site": 1, "Scenic Reserve": 1, "Recreation Reserve": 1, "Historic Reserve": 1, "Cave": 1, "Cliff": 1, "Hot Spring": 1, "Lookout": 1, "Island": 1 };
function fromLinz(d, b) {
  const out = [];
  const heights = d.heights.map(f => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], e: +f.properties.elevation }))
    .filter(h => inBox(h.lat, h.lon, b));
  for (const f of d.places) {
    const [lon, lat] = f.geometry.coordinates, p = f.properties;
    if (!inBox(lat, lon, b) || !p.name) continue;
    const t = p.feat_type;
    if (t === "Hill" || t === "Range" || t === "Trig Station") {
      let ele = +p.height || 0;
      if (!ele) { let best = 1e9; for (const h of heights) { const dd = Math.hypot((h.lat - lat) * 111, (h.lon - lon) * 89); if (dd < 0.35 && dd < best) { best = dd; ele = h.e; } } }
      out.push({ cat: "peak", name: p.name, lat, lon, ele, sub: (ele ? Math.round(ele) + " m · " : "") + t.toLowerCase() + " · LINZ" });
    } else if (t === "Stream" || t === "River" || t === "Waterfall" || t === "Rapid") {
      out.push({ cat: "water", name: p.name, lat, lon, sub: t.toLowerCase() + " · LINZ" });
    } else if (SIGHT_TYPES[t]) {
      out.push({ cat: "sight", name: p.name, lat, lon, sub: t.toLowerCase() + " · LINZ" });
    }
  }
  // drop trig stations that duplicate a hill of the same name
  for (let i = out.length - 1; i >= 0; i--) if (out[i].sub.includes("trig station") && out.some(o => o !== out[i] && o.cat === "peak" && o.name === out[i].name)) out.splice(i, 1);
  for (const f of d.falls) {
    const [lon, lat] = f.geometry.coordinates;
    if (inBox(lat, lon, b) && !out.some(o => o.cat === "water" && Math.abs(o.lat - lat) < 0.002 && Math.abs(o.lon - lon) < 0.002))
      out.push({ cat: "water", name: f.properties.name || "Waterfall (unnamed)", lat, lon, sub: "waterfall · LINZ" });
  }
  const tr = {};
  for (const f of d.tracks) {
    const p = f.properties; if (!p.name || p.track_use === "vehicle") continue;
    const g = f.geometry.coordinates.map(c => [c[1], c[0]]);
    if (!g.some(c => inBox(c[0], c[1], b))) continue;
    (tr[p.name] ??= { cat: "hike", name: p.name, geoms: [], sub: "" }).geoms.push(g);
  }
  for (const t of Object.values(tr)) {
    const km = t.geoms.reduce((s, g) => s + lenKm(g), 0);
    if (km < 0.3) continue;
    const mid = t.geoms[0][Math.floor(t.geoms[0].length / 2)];
    Object.assign(t, { km, lat: mid[0], lon: mid[1], sub: `${km.toFixed(1)} km · ~${Math.max(10, Math.round(km / 4 * 60))} min one-way · LINZ` });
    out.push(t);
  }
  return out;
}

let items = [], active = new Set(Object.keys(CATS)), markers = new Map();
async function openRegion(r) {
  region = r; drawRegions(); showTab("explore");
  map.fitBounds([[r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]]);
  $("#regionHead").innerHTML = `<h3 style="margin:4px 0">${r.name}</h3><p class="hint">${r.blurb}</p>
    <div class="chips">${r.activities.map(a => `<span class="chip">${a}</span>`).join("")}</div>`;
  poiLayer.clearLayers(); lineLayer.clearLayers(); $("#results").innerHTML = "";
  const hl = r.highlights.map(h => ({ cat: "sight", name: h.name, lat: h.lat, lon: h.lon, sub: h.note, curated: true }));
  $("#status").textContent = "Loading peaks, streams, tracks and attractions from OpenStreetMap...";
  const d = await loadLinz();
  const official = d ? fromLinz(d, r.bbox) : [];
  const hlAndOfficial = [...hl, ...official];
  const mine = r;
  const show = (osm, note) => {
    if (region !== mine) return;
    const seen = new Set(official.map(i => i.cat + ":" + i.name.toLowerCase()));
    const extra = osm.filter(i => i.cat === "stay" || !seen.has(i.cat + ":" + i.name.toLowerCase()));
    items = [...hlAndOfficial, ...extra];
    $("#status").textContent = `${items.length} places (${official.length} official LINZ Topo50/NZGB, ${extra.length} OpenStreetMap). ${note}`;
    renderFilters(); renderResults();
  };
  show([], "Loading huts, campsites and extras from OpenStreetMap...");
  try {
    cache[r.id] ??= store.get("osm:" + r.id, null) ?? parse(await overpass(query(r.bbox)));
    store.set("osm:" + r.id, cache[r.id]);
    show(cache[r.id], "");
  } catch (e) {
    show([], "OpenStreetMap extras unavailable (offline or busy).");
  }
}

function renderFilters() {
  $("#filters").innerHTML = Object.entries(CATS).map(([k, c]) =>
    `<button data-k="${k}" class="${active.has(k) ? "on" : ""}">${c.icon} ${c.label} (${items.filter(i => i.cat === k).length})</button>`).join("");
}
$("#filters").onclick = e => {
  const k = e.target.closest("button")?.dataset.k; if (!k) return;
  active.has(k) ? active.delete(k) : active.add(k);
  renderFilters(); renderResults();
};
$("#search").oninput = () => renderResults();

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function renderResults() {
  const q = $("#search").value.trim().toLowerCase();
  const list = items.filter(i => active.has(i.cat) && (!q || i.name.toLowerCase().includes(q)))
    .sort((a, b) => (b.curated ? 1 : 0) - (a.curated ? 1 : 0) || (b.ele || b.km || 0) - (a.ele || a.km || 0)).slice(0, 300);
  poiLayer.clearLayers(); lineLayer.clearLayers(); markers.clear();
  list.forEach((it, idx) => {
    const c = CATS[it.cat];
    it.idx = idx;
    const m = L.marker([it.lat, it.lon], { icon: L.divIcon({ className: "", html: `<div class="pin" style="background:${c.color}">${c.icon}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
      .bindPopup(() => popupHtml(it));
    poiLayer.addLayer(m); markers.set(it, m);
    if (it.geoms) it.geoms.forEach(g => lineLayer.addLayer(L.polyline(g, it.cat === "hike"
      ? { color: "#c0392b", weight: 3, dashArray: "6 4" } : { color: "#1e78c8", weight: 2.5 })));
  });
  $("#results").innerHTML = list.map((it, i) => `
    <li data-i="${i}"><span class="pin" style="background:${CATS[it.cat].color}">${CATS[it.cat].icon}</span>
    <div class="t"><b>${esc(it.name)}</b><small>${esc(it.sub || "")}</small></div>
    <button data-add="${i}">+ Trip</button></li>`).join("");
  $("#results").onclick = e => {
    const li = e.target.closest("li"); if (!li) return;
    const it = list[+li.dataset.i];
    if (e.target.dataset.add != null) return addStop(it);
    if (it.geoms) map.fitBounds(L.latLngBounds(it.geoms.flat()), { maxZoom: 15 });
    else map.setView([it.lat, it.lon], Math.max(map.getZoom(), 14));
    markers.get(it)?.openPopup();
    if (innerWidth <= 760) $("#panel").classList.add("min");
  };
}
function popupHtml(it) {
  const div = document.createElement("div");
  div.innerHTML = `<b>${esc(it.name)}</b><br>${CATS[it.cat].label}${it.sub ? "<br>" + esc(it.sub) : ""}<br><button>+ Trip</button>`;
  div.querySelector("button").onclick = () => addStop(it);
  return div;
}

// ---------- trip planner ----------
let trip = store.get("trip", []);
function addStop(it) {
  trip.push({ name: it.name, lat: it.lat, lon: it.lon });
  saveTrip();
}
function saveTrip() { store.set("trip", trip); renderTrip(); }
function renderTrip() {
  $("#tripCount").textContent = trip.length;
  $("#tripList").innerHTML = trip.map((s, i) => `<li><div class="t">${esc(s.name)}</div>
    <button data-up="${i}">↑</button><button data-dn="${i}">↓</button><button class="ghost" data-rm="${i}">✕</button></li>`).join("")
    || `<li class="muted" style="display:block">No stops yet.</li>`;
  let d = 0;
  for (let i = 1; i < trip.length; i++) d += L.latLng(trip[i - 1]).distanceTo(L.latLng(trip[i]));
  $("#tripSummary").innerHTML = trip.length > 1 ? `<p><b>${(d / 1000).toFixed(1)} km</b> straight-line across ${trip.length} stops</p>` : "";
  tripLine.setLatLngs(trip.map(s => [s.lat, s.lon]));
}
$("#tripList").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset, i = +(d.up ?? d.dn ?? d.rm);
  if (d.rm != null) trip.splice(i, 1);
  else { const j = d.up != null ? i - 1 : i + 1; if (j < 0 || j >= trip.length) return; [trip[i], trip[j]] = [trip[j], trip[i]]; }
  saveTrip();
};
$("#clearTrip").onclick = () => { trip = []; saveTrip(); };
$("#gpx").onclick = () => {
  if (!trip.length) return;
  const x = `<?xml version="1.0"?><gpx version="1.1" creator="Coromandel Topo Explorer" xmlns="http://www.topografix.com/GPX/1/1">` +
    trip.map(s => `<wpt lat="${s.lat}" lon="${s.lon}"><name>${esc(s.name)}</name></wpt>`).join("") +
    `<rte><name>Coromandel trip</name>${trip.map(s => `<rtept lat="${s.lat}" lon="${s.lon}"><name>${esc(s.name)}</name></rtept>`).join("")}</rte></gpx>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([x], { type: "application/gpx+xml" }));
  a.download = "coromandel-trip.gpx"; a.click();
};
renderTrip();

// ---------- legend ----------
const sw = (bg, extra = "") => `<i style="background:${bg};${extra}"></i>`;
$("#legendBox").innerHTML = `
  <div class="lg"><h4>App markers</h4></div>
  ${Object.values(CATS).map(c => `<div class="lg"><span class="pin" style="background:${c.color}">${c.icon}</span>${c.label}</div>`).join("")}
  <div class="lg"><h4>App lines</h4></div>
  <div class="lg">${sw("repeating-linear-gradient(90deg,#c0392b 0 6px,transparent 6px 10px)", "height:3px")}Named walking track</div>
  <div class="lg">${sw("#1e78c8", "height:3px")}River / stream</div>
  <div class="lg">${sw("repeating-linear-gradient(90deg,#e91e63 0 8px,transparent 8px 14px)", "height:4px")}Your trip route</div>
  <div class="lg">${sw("transparent", "border:2px dashed #888")}Sub-region boundary (tap to open)</div>
  <div class="lg"><h4>Topo base map (OpenTopoMap)</h4></div>
  <div class="lg">${sw("#b9d6a5")}Native forest / bush</div>
  <div class="lg">${sw("#e8f1c7")}Scrub / grass / farmland</div>
  <div class="lg">${sw("#a8c8e8")}Sea, lakes, rivers</div>
  <div class="lg">${sw("#c9a679", "height:2px")}Brown contour lines (index lines are bolder, labelled in metres)</div>
  <div class="lg">${sw("#d99", "height:3px")}Roads (thicker = main road)</div>
  <div class="lg">${sw("repeating-linear-gradient(90deg,#8b3a3a 0 4px,transparent 4px 7px)", "height:2px")}Footpaths and tracks</div>
  <div class="lg">${sw("#ccc")}Built-up areas</div>
  <div class="lg">▲ Triangle with number = peak and height (m)</div>
  <p class="hint">Contours show elevation: lines close together = steep ground. Switch base layers with the layer button top-right of the map.</p>`;
$("#linzKey").value = store.get("linzKey", "");
$("#saveKey").onclick = () => { const k = $("#linzKey").value.trim(); store.set("linzKey", k); setLinz(k); };

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
