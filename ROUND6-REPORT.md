# Round 6 implementation and verification

The environment rebuild is implemented. Native Intel HD 520 performance and rendered visual acceptance remain unverified; the geometry audit is not evidence of 60 fps.

## Assets

- Round 6 ships 15 Poly Haven CC0 models, each with LOD0/LOD1: island broadleaf, pine sapling, dead trunk, fern, grass, shrub, stump, coastal boulder, cliff, pier section, crate, barrel, buoy, lamp and a historic moored Dutch ship.
- Thirteen PBR sets ship at both 1k and 2k, with diffuse, OpenGL normal, roughness, AO and height. The three existing CC0 HDRIs were retained. Exact sources, model triangle counts and licences are in ASSETS.md and the Credits screen.
- No palm model or texture labelled ice/glacier was found in the queried catalogues. Palms use original curved trunks with scanned palm bark and bent alpha frond cards from scanned fern foliage. Snow_04 supplies a glossy, blue-tinted compacted-ice substitute; rock_06 supplies glacier rock. The moored ship is historical rather than a modern harbour motorboat. The enormous full pine was replaced with the smaller scanned sapling.
- The resumed work reused the existing raw downloads and prepared GLBs. No assets were re-downloaded. Repairs operated on one prepared GLB per child process; image processing is sequential, with one Sharp thread and no persistent image cache. Foliage alpha masks were repaired, origins grounded, the staged pier reduced to one section, and the Low ship reduced to 1,600 triangles.
- All thirteen retired Kenney scenery GLBs were removed from the shipped directory. Raw acquisition caches remain ignored. Current shipped assets total **118.45 MiB**, below 250 MiB.

## Rebuilt game rendering

- Uneven shores, submerged riverbed, coves, dunes/hills and cliffs replace the narrow simple banks. Terrain uses world-space/triplanar texture sampling, height/slope transitions, normal maps, macro variation and High/Ultra height-map parallax. Bank geometry is checked against the main channel and shortcuts.
- Five composed areas per course are anchored near bends: rocky lighthouse headland / forest cove / cliff gorge / jetty / driftwood beach; glacier gate / pine cove / ice gorge / research landing / rock arch; container quay / timber landing / canal bridge / fuel wharf with a moored ship / outer harbour.
- Vegetation and rocks use deterministic clustered placement, shore-distance/height/slope rules, varying rotation/scale/tint, material instancing, distance culling and LODs. Tree impostors have mipmapped alpha and separate HDRI-specific lighting caches. Warehouses have photo-textured brick/metal walls, pitched roofs and dark glazing with warm lit windows. Gameplay rocks now use scanned boulders, not primitive stone blocks.
- Sun bearing/colour and horizon fog come from the HDRIs. Exposure is set per course. Medium+ has follow-camera shadows; Low has instanced contact patches for scenery and boats; High/Ultra has SSAO.
- All water tiers retain CPU-synchronised waves and HDRI reflections, with finer glitter, shoreline foam, wakes and fog. High/Ultra adds planar scenery reflection, a colour/depth prepass, depth absorption/shore foam and shallow-bottom refraction. Low has no shadow, AO, SSR, depth-prepass or planar-reflection cost.
- Spray is smaller, dimmer, less additive, narrower and shorter-lived, with particles excluded near local boats. Water wakes remain low on the surface. Paint-only materials now have saturated colour, clearcoat and stronger HDRI reflection; separate trim, engines and windows retain their materials.
- Default Low render scale is full resolution. `Graphics.autoTune` and `isWeakGpu` remain unchanged. Settings shows the detected GPU and preset guidance. Models/textures decode sequentially; lowering the preset releases High models and 2k texture resources.

## Verification performed

- **`npm test`: 23/23 pass.** This includes career events, reverse courses, ordered three-lap races at three difficulties, eight-boat simulation, wave/normal agreement, ramps, input, WebSocket loopback, asset loading, boat paint/trim isolation, new shore/shortcut clearance checks, and High-to-Low resource release.
- **`npm run build`: passes.** No Electron or electron-builder command was run; no commits were made.
- **`npm run assets:audit`: passes.** Checks include every tier's texture dimensions, embedded dependencies and foliage alpha, eight-boat bounds, scenery budgets and shipped size. Machine-readable results are in ignored `artifacts/round6/asset-audit.json`.

| Low course | Whole-course environment triangles / draws | With conservative gameplay/effect allowance |
| --- | ---: | ---: |
| Sunspill Atoll | 130,639 / 78 | 142,639 / 110 |
| Aurora Narrows | 77,691 / 43 | 89,691 / 75 |
| Voltage Basin | 54,083 / 60 | 66,083 / 92 |

These are conservative whole-course counts before frustum/distance culling; runtime tree impostors reduce distant geometry further. The allowance includes scenery obstacles and room for gameplay objects/effects. Racing boats and water have separate total-race allowances, reported by the audit. Higher-tier audit counts include both near and distance models and are not GPU timing measurements.

## Not verified here

Chrome exits before DevTools connects, with Windows `Access is denied` errors while creating its IPC channel. The browser-only test could not run. This is separate from the earlier asset-preparation process being killed for low system memory.

Consequently **60 fps at 1426×827 on Intel HD 520 with eight boats has not been demonstrated**. Rendered shader compilation, screenshots, the visual quality of reflections/SSAO/terrain/foliage, split-screen rendering, live online play and audible sound also have not been manually verified. Automated simulation, input and networking checks passed, but do not replace those acceptance checks. The `?verify=1&track=N` startup path is retained unchanged; its actual browser startup remains unverified here.

`node scripts/check-environment.mjs` provides a Chrome-only native-size Low check across all three all-AI courses. `--high` runs High separately. It records errors, screenshots, GPU, draw counts and frame rate, holding native scale during the measurement so dynamic resolution cannot hide a shortfall. It never starts Electron.
