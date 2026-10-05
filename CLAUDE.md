# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Coromandel Topo Explorer: a static, no-build PWA (Leaflet map) for exploring the Coromandel Peninsula, NZ. There is no package.json, bundler, linter or test suite. Leaflet 1.9.4 is loaded from unpkg. UI text and comments are plain vanilla JS.

Run it by serving the repo root over HTTP (e.g. `python -m http.server`). `file://` won't work because `data/linz/*.json` is loaded with `fetch`, and the service worker only registers on http(s).

## Architecture

- `index.html` loads `data/regions.js` (defines `window.REGIONS` and `COROMANDEL_BOUNDS`) and then `app.js`, a single IIFE with no modules. Everything is wired to the DOM by id (`#panel`, `#results`, `#tripList`, ...).
- **Region flow** (`openRegion` in `app.js`): clicking a region merges three data sources into one `items` list, which `renderResults` filters by category and search text and caps at 300:
  1. Curated `highlights` from `regions.js` (sorted first).
  2. Bundled official LINZ/NZGB data (`data/linz/{places,tracks,falls,heights}.json`) filtered to the region bbox by `fromLinz`. Peak elevations come from the nearest `heights` point when a place has no height.
  3. Live OpenStreetMap data via Overpass (`query` / `parse`), cached in memory and in localStorage (`osm:<region id>`). OSM items are de-duplicated against LINZ items by category and name. The exception is `stay` (huts and camps), which only comes from OSM.
- The result list is rendered progressively. LINZ data shows first, then OSM extras are merged in, and the `region !== mine` guard drops stale async results.
- Items are either points or lines (`geoms`, used for tracks and streams). Every item has a `cat` key from `CATS`, and `cat` drives the icon, colour and filter.
- The trip planner keeps its stops in localStorage (`trip`). Distances are straight-line, and export is GPX.
- An optional LINZ Basemaps API key is stored in localStorage (`linzKey`). It adds the NZ Topo50 tile layer.
- `sw.js` is network-first for app files and cache-first for map tiles. When you add or rename an app file, add it to `FILES` in `sw.js`. Bump `SHELL` / `TILES` if the cached shell needs to be invalidated.

## Data and tooling

- `LINZ_KEY=<LINZ Data Service key> node tools/fetch-linz.mjs` regenerates `data/linz/*.json` from the LINZ WFS for the Coromandel bbox. It rounds coordinates and keeps only the listed properties. `rivers.json` and `buildings.json` are fetched but not used by `app.js`.

## Deploy copy

`deploy/` is a committed copy of the app (without `rivers.json` and `buildings.json`), and `coromandel-topo-explorer.zip` is a packaged build. The root source files and `deploy/` are currently byte-identical. After editing root files, copy the changes into `deploy/` too. The zip is not regenerated automatically.

## Git workflow

The user wants a saved version of the project on GitHub at all times (`origin` = `RanaRishi5/map-app`, branch `main`).

- After each meaningful change (a feature, fix or docs update), commit all the changes and push to `origin main`, without waiting to be asked. This standing instruction covers commit and push on `main` only. Don't force-push or rewrite history.
- Write clear commit messages: a short imperative subject line that says what changed, plus a body when the reason isn't obvious (e.g. "Add region search filter to Explore tab").
- Stage files deliberately. Check `git status` first, and keep `deploy/` in sync with the root files so they land in the same commit.
