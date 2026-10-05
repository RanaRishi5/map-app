// Downloads official LINZ Topo50 / NZGB data for the Coromandel into data/linz/*.json
// Usage: LINZ_KEY=xxxx node tools/fetch-linz.mjs   (LINZ Data Service key from data.linz.govt.nz)
import { mkdirSync, writeFileSync } from "node:fs";
const KEY = process.env.LINZ_KEY; if (!KEY) { console.error("Set LINZ_KEY"); process.exit(1); }
const BBOX = "-37.50,175.30,-36.38,176.00,urn:ogc:def:crs:EPSG::4326";
const LAYERS = {
  places:    { id: 51681, keep: ["name", "feat_type", "height", "maori_name"] },
  tracks:    { id: 50364, keep: ["name", "track_use", "track_type"] },
  rivers:    { id: 50327, keep: ["name", "name_ascii"] },
  falls:     { id: 50372, keep: ["name"] },
  buildings: { id: 50245, keep: ["name", "building_use"] },
  heights:   { id: 50284, keep: ["elevation"] }
};
mkdirSync("data/linz", { recursive: true });
const rnd = n => Math.round(n * 1e5) / 1e5;
const round = c => typeof c[0] === "number" ? [rnd(c[0]), rnd(c[1])] : c.map(round);
for (const [name, L] of Object.entries(LAYERS)) {
  const all = []; let start = 0;
  for (;;) {
    const u = `https://data.linz.govt.nz/services;key=${KEY}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-${L.id}&outputFormat=json&srsName=EPSG:4326&bbox=${BBOX}&count=5000&startIndex=${start}&sortBy=${name === "places" ? "name_id" : "t50_fid"}`;
    const r = await fetch(u); if (!r.ok) throw new Error(name + " HTTP " + r.status + " " + (await r.text()).slice(0, 200));
    const j = await r.json(); all.push(...j.features);
    if (j.features.length < 5000) break; start += 5000;
  }
  const feats = all.map(f => ({ type: "Feature", geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
    properties: Object.fromEntries(L.keep.map(k => [k, f.properties[k]]).filter(([, v]) => v != null && v !== "")) }));
  writeFileSync(`data/linz/${name}.json`, JSON.stringify({ type: "FeatureCollection", features: feats }));
  console.log(name, feats.length);
}
