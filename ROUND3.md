# Riptide Rush — round 3: real art assets

The owner's verdict on the current build: the graphics are bad. Everything is generated in code (lofted
shapes, flat colours, canvas textures) and it looks like a prototype. The target is the look of a late-90s /
early-2000s arcade powerboat racer: textured, modelled boats, themed set-piece tracks, real skies, real
surface textures. Original content only — do not imitate any specific existing game's boats, tracks, names
or art.

The "no external assets" rule from BRIEF.md is lifted for this round. The game must still run fully offline
once built: every asset is downloaded now, stored in the repo, and bundled into the app.

## Asset rules (strict)
- Sources allowed: **kenney.nl**, **quaternius.com**, **polyhaven.com** (and their own download hosts, e.g.
  dl.polyhaven.org, api.polyhaven.com). CC0 licensed assets only. No other sites. If something cannot be
  fetched from these, do without it and say so — do not substitute another source.
- Total download budget ~300 MB; shipped assets (after picking what is used) should stay under ~120 MB.
- Only data files: .glb/.gltf/.bin/.fbx/.obj, .png/.jpg/.webp, .hdr/.exr, license text. Never run, import
  or execute anything from a downloaded archive. Extract archives into `assets-src/<pack>/` (git-ignored),
  copy only the files the game uses into `public/assets/` (or wherever Vite serves static files from).
- Write `ASSETS.md`: every pack/file used, its source URL, licence, and download size.
- Suggested picks (verify they exist and are CC0):
  - Kenney: Watercraft Kit (boats), Pirate Kit / Nature Kit / City Kit (Commercial, Roads) / Space or
    Sci-fi kits for neon props, Particle Pack (smoke/spray/flare sprites).
  - Quaternius: nature / stylised rocks & trees / buildings packs if directly downloadable.
  - Poly Haven: 3 HDRI skies at 1k–2k (.hdr): a clear tropical midday sky, a dusk/polar twilight sky, a
    night city sky; plus 1k PBR texture sets (diffuse + normal + roughness) for sand, rock/cliff, snow/ice,
    concrete, metal; and a water normal map if one is available (otherwise keep the procedural one).

## What to build with them
- **Boats**: replace the lofted code hulls with real models (GLTFLoader). Six distinct boats; if the kits
  have fewer suitable racing hulls, kit-bash: combine model hulls with modelled engines/spoilers/decals
  and per-player paint (tint the body material, keep details). Add proper PBR materials, environment
  reflections from the HDRI, number decals. Boat-select preview uses the same models.
- **Skies/lighting**: HDRI as background + PMREM environment per track; sun direction matched to the HDRI;
  fog colour matched to the horizon.
- **Tracks**: rebuild each environment with textured terrain (shore/cliff meshes get real tiling PBR
  textures with triplanar or proper UVs — no flat single-colour polygons) and model set-pieces placed
  along the course:
  - Sunspill Atoll: beaches, textured rock cliffs and arches, palms, huts, piers, moored ships/wrecks,
    lighthouse, waterfall.
  - Aurora Narrows: textured ice/snow canyon walls, icebergs, an ice tunnel, ships, a station, aurora.
  - Voltage Basin: real building models with emissive windows, bridges overhead, neon signs, a tunnel,
    street props along the embankments.
  - Dense trackside detail so speed reads well; InstancedMesh for anything repeated.
- **Water**: keep physics-synced Gerstner waves; add texture-based detail normals, env-map reflections,
  depth/shore tint, foam texture at shores and in wakes. It should look like water, not a cartoon pattern
  (the current white zig-zag foam bands across the channel must go).
- **Effects**: sprite-textured spray, rooster tails, boost flames, splashes (from the particle pack).
- **Loading**: a loading screen with progress while models/HDRIs load; preload everything a race needs
  before the countdown; cache loaded assets between races. Handle load failure with a visible error.

## Performance (hard requirement)
- The owner's PC has **Intel HD Graphics 520**. The game already auto-selects Low quality on integrated
  GPUs and has dynamic resolution scaling (`Graphics.isWeakGpu`, `Graphics.autoTune`) — keep both working.
- Budget on Low: ≤ ~150 draw calls and ≤ ~250k triangles in view, textures ≤ 1k, HDRI 1k, no shadows,
  cheap post. Higher quality tiers may add shadows, bloom, 2k textures. Merge static scenery geometry per
  track (BufferGeometryUtils.mergeGeometries) and instance repeated props.
- Compress: resize textures to what is needed (use an npm tool such as `sharp` at build/prep time if needed).

## Keep working
- All existing modes, split-screen, online, input, remapping, audio must still work. `npm test` and
  `npm run build` must pass; the `?verify=1&track=N` URL mode must still start an all-AI race.
- Tests under Node must not need the binary assets (keep core simulation asset-free).
- Do NOT download Electron or run electron-builder; do not commit (read-only .git). Packaging and visual
  checks are done outside your sandbox afterwards.
- Make sure the electron-builder `files` config in package.json will include the shipped assets (they end
  up in `dist/` if served from Vite's `public/`).

Finish with an honest summary: which assets were actually downloaded (and which failed), what was rebuilt,
what you verified, and what you could not verify.
