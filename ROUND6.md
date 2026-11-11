# Riptide Rush — round 6: realistic environments

Owner's verdict: the boats are now fine, but the environment still looks "trashy" — toy-like. The cause is
the scenery art: Kenney low-poly kit props (flat-coloured palms, huts, towers, box buildings), flat tiling
ground, evenly scattered props, and no shadows/AO on the default path. Goal of this round: environments
that read as **realistic** — photoscanned vegetation, rock and ground, believable water and lighting —
while the game stays playable on the owner's Intel HD 520 at Low.

## Assets (downloads allowed this round)
- Source: **polyhaven.com only** (api.polyhaven.com / dl.polyhaven.org), CC0. Data files only (glTF/GLB,
  textures, HDRIs); never execute anything downloaded. Extend the existing `scripts/fetch-polyhaven.py`
  flow; raw downloads go to git-ignored `assets-src/polyhaven/`, shipped files to `public/assets/`.
- Use the Poly Haven API to list `models` and `textures`, and pick by category/tags. Wanted:
  - **Trees / vegetation**: several tree models (broadleaf, pine/fir, dead tree), palms if any exist,
    shrubs, ferns, grass clumps, driftwood/stumps.
  - **Rocks**: boulders, rock sets, cliff/rock-face models, coastal rocks.
  - **Props that fit a waterway**: wooden pier/jetty, barrels, crates, buoys, lamp posts, fences, boats,
    concrete barriers, anything harbour/industrial for the city track.
  - **PBR texture sets** at 1k and 2k (diffuse, normal, roughness, AO, displacement/height): beach sand,
    wet sand, coastal rock/cliff, mossy rock, grass/forest floor, snow, ice, glacier rock, asphalt,
    concrete wall, brick, corrugated metal.
- If Poly Haven has no palm tree, build palms from a photoscanned bark texture on a curved trunk mesh plus
  alpha-cut frond cards using a leaf texture — not flat-shaded cones.
- Prepare every model with a script like `scripts/prepare-boats.mjs` (gltf-transform: dedup, weld,
  simplify, texture resize): LOD0 for High/Ultra, a much lighter LOD1 for Low/Medium and distance, and for
  trees a crossed-quad/billboard impostor for far distance. Record everything in ASSETS.md.
- Budget: shipped assets may grow to ~250 MB total. Keep 1k textures for Low/Medium, 2k for High/Ultra.

## Rendering
- **Terrain**: replace the simple bank strips with real terrain meshes along the course: beach/shore slope
  into the water, rising to dunes/cliffs/hills with height variation from noise, textured by slope and
  height blending (e.g. wet sand → dry sand → grass → rock; snow → ice → rock) using triplanar or
  world-space UVs with macro variation so tiling is not visible. Normal maps on all tiers; parallax or
  displacement on High/Ultra.
- **Vegetation and rocks**: place by rules, not evenly: clusters, density by slope/height/distance to
  water, random scale/rotation/tint, bigger landmark groups at corners. InstancedMesh + LODs + frustum/
  distance culling. Alpha-tested foliage with proper mipmapped alpha (alphaToCoverage on MSAA tiers).
- **Lighting**: sun direction and colour matched to each HDRI; cascaded or follow-camera shadow maps for
  terrain/vegetation/boats on Medium+; baked or cheap contact shadows (blob/planar) on Low; SSAO or GTAO on
  High/Ultra; subtle height/distance fog matched to the HDRI horizon; correct tone mapping and exposure per
  track so nothing looks washed out or flat.
- **Water**: keep physics-synced waves. Add screen-space or planar reflections of scenery on High/Ultra,
  HDRI reflections on all tiers, depth-based colour/absorption and soft shoreline foam using a depth
  texture, refraction of the bottom in shallows, better sun glitter, foam trails. On Low keep it cheap but
  remove any obvious repeating pattern.
- **Set-pieces**: each track gets 4–6 composed landmark areas built from the realistic assets (e.g.
  rocky headland with a lighthouse, forested cove with a jetty, cliff gorge, ice cave, harbour with piers
  and moored boats, industrial canal with bridges). Remove the Kenney castle towers, box huts and toy
  buildings from view; city buildings should use photo-style facade textures with lit windows at night.
- Keep the arcade readability: channel edges, ramps, pickups and shortcut signs must stay clearly visible.

## Performance (hard requirement)
- Intel HD 520, Low, 1426x827 window, 8 boats: must hold ~60 fps at full Low resolution. Budget for
  scenery on Low: ≤ 120 draw calls, ≤ 200k triangles in view, 1k textures, no dynamic shadows, no SSAO/SSR.
- Each higher tier may add cost; Ultra targets a mid-range dedicated GPU. Add a line in Settings showing
  the detected GPU and a hint which preset suits it.
- `Graphics.autoTune` and `isWeakGpu` stay as they are.

## Keep working
- All modes, career, split-screen, online, input, audio, credits still work. Add the new assets to the
  Credits screen and ASSETS.md.
- `npm test` and `npm run build` pass; `?verify=1&track=N` still starts an all-AI race; asset audit updated
  with the new per-tier budgets.
- No Electron/electron-builder runs, no commits.
- Finish with an honest summary: what was downloaded (and what was not available), what was rebuilt, what
  you verified, what you could not verify.

## Also fix (seen on screen after round 5)
- Spray is overdone: a wall of large white blobs hides the boats ahead. Make it finer and more
  transparent (smaller soft particles, less additive brightness, faster fade), a narrow rooster tail and
  a low wake instead of a cloud, and never obscure the player's own boat.
- Painted boats look like flat pastel plastic (e.g. the pale green Twin Comet). Use saturated player
  colours with glossy clearcoat and HDRI reflections; keep dark trim/engines/windows unpainted so the
  shape reads.
- The Kenney pirate ships, palms, castle towers and grey stone blocks on Sunspill Atoll are the main
  reason the scene looks like a toy set: they must be gone from all three tracks after this round.
