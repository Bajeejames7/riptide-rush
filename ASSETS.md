# Bundled art assets

Round 6 replaces all Kenney scenery with CC0 Poly Haven assets and original textured geometry. The six existing Sketchfab racing boats retain their individual licences. Kenney Particle Pack sprites remain CC0. No downloaded code, executables, scripts, Blender files or editor projects were executed.

## Acquisition and preparation

New round 6 data came only from `api.polyhaven.com` and `dl.polyhaven.org`. The model and texture catalogues were queried and selections checked against their categories/tags. Raw glTF, BIN, JPG/PNG files and provenance stay in ignored `assets-src/polyhaven/`; runtime assets are self-contained GLBs, JPEG textures and existing HDRIs in `public/assets/`. Nothing is fetched from the internet by the game.

`python scripts/fetch-polyhaven.py --environment` reuses cached downloads and records source URLs in `selection.json`, `round6-download.json`, `texture-download.json` and `alpha-download.json`. `node scripts/prepare-environment.mjs` prepares missing models one at a time in separate bounded-memory child processes (dedup, weld, simplify, prune, texture resize/WebP). Existing GLBs are retained unless `--force` is explicit. `node scripts/repair-environment.mjs` repairs cached shipped GLBs one at a time, combines separately supplied foliage alpha masks, grounds origins, reduces the Low harbour ship and refreshes metadata without reading the huge raw tree scans. `--textures-only` repacks cached terrain maps. Sharp uses one thread and no persistent cache.

Foliage masks are merged as a single alpha channel before WebP encoding, checked by the asset audit, alpha-tested with mipmaps and alpha-to-coverage on the MSAA path. High/Ultra use LOD0 and 2k maps; Low/Medium use LOD1 and 1k maps. Higher tiers also retain LOD1 for distance. Tree silhouettes are baked locally from the scanned model into 256×512 alpha render targets at load and rendered as instanced crossed cards beyond 140 m on Low / 240 m on higher tiers. This runtime bake does not download anything.

Runtime models and images are decoded sequentially. Low/Medium do not decode height maps; High/Ultra load only the height maps actually used by terrain. Returning to Low/Medium releases cached High model buffers and 2k textures after the old scene is detached. Impostor caches are separate for each HDRI so dusk trees do not reuse daylight lighting.

No palm model was present in the queried catalogue. Original curved, tapered palm trunks use the Poly Haven palm bark scan; bent alpha frond cards use the scanned fern foliage texture. No texture named ice or glacier was present: snow_04 is used as glossy blue-tinted compacted ice; rock_06 supplies glacier rock. The suitable downloaded moored ship is a historic Dutch sailing ship, not a modern motorboat. The full pine tree was rejected after its API listed a roughly 949 MB raw mesh; the smaller scanned pine sapling was selected. Its partially acquired unused texture cache is not shipped.

## Poly Haven models (all CC0)

All are from [Poly Haven](https://polyhaven.com/license), licensed [CC0](https://creativecommons.org/publicdomain/zero/1.0/). `ph_<id>_lod0.glb` and `ph_<id>_lod1.glb` contain their textures. The modular pier is a selected pier section, not the whole staged kit.

| Source / shipped basename | LOD0 triangles | LOD1 triangles | Combined shipped bytes |
| --- | ---: | ---: | ---: |
| [island_tree_01](https://polyhaven.com/a/island_tree_01) / `ph_island_tree_01` | 12,625 | 2,501 | 5,418,372 |
| [pine_sapling_small](https://polyhaven.com/a/pine_sapling_small) / `ph_pine_sapling_small` | 11,714 | 1,287 | 3,729,988 |
| [dead_tree_trunk](https://polyhaven.com/a/dead_tree_trunk) / `ph_dead_tree_trunk` | 11,998 | 1,300 | 2,250,116 |
| [fern_02](https://polyhaven.com/a/fern_02) / `ph_fern_02` | 5,996 | 647 | 873,452 |
| [grass_medium_01](https://polyhaven.com/a/grass_medium_01) / `ph_grass_medium_01` | 6,150 | 642 | 3,040,304 |
| [shrub_01](https://polyhaven.com/a/shrub_01) / `ph_shrub_01` | 5,979 | 650 | 1,398,856 |
| [tree_stump_01](https://polyhaven.com/a/tree_stump_01) / `ph_tree_stump_01` | 12,000 | 1,299 | 3,082,964 |
| [namaqualand_boulder_02](https://polyhaven.com/a/namaqualand_boulder_02) / `ph_namaqualand_boulder_02` | 6,000 | 649 | 2,889,644 |
| [namaqualand_cliff_01](https://polyhaven.com/a/namaqualand_cliff_01) / `ph_namaqualand_cliff_01` | 6,000 | 649 | 2,012,156 |
| [modular_wooden_pier](https://polyhaven.com/a/modular_wooden_pier) / `ph_modular_wooden_pier` | 1,645 | 434 | 5,311,992 |
| [wooden_crate_01](https://polyhaven.com/a/wooden_crate_01) / `ph_wooden_crate_01` | 5,996 | 688 | 1,440,948 |
| [Barrel_01](https://polyhaven.com/a/Barrel_01) / `ph_Barrel_01` | 2,682 | 649 | 1,689,024 |
| [ocean_buoy](https://polyhaven.com/a/ocean_buoy) / `ph_ocean_buoy` | 6,000 | 1,846 | 2,452,280 |
| [street_lamp_01](https://polyhaven.com/a/street_lamp_01) / `ph_street_lamp_01` | 12,117 | 1,316 | 1,083,432 |
| [dutch_ship_medium](https://polyhaven.com/a/dutch_ship_medium) / `ph_dutch_ship_medium` | 14,516 | 1,600 | 7,142,144 |

## Poly Haven PBR textures (all CC0)

Each set has 1k `<label>_<channel>.jpg` and 2k `hi_<label>_<channel>.jpg`: diffuse (`diff`, sRGB), OpenGL normal (`nor_gl`), roughness (`rough`), ambient occlusion (`ao`) and height (`disp`, all linear). Terrain uses world-space/triplanar colour, height/slope transitions, normal mapping and macro modulation; High/Ultra add height-map parallax. The ice material is an explicitly documented snow-scan substitute.

| Runtime label | Source | Available channels |
| --- | --- | --- |
| `sand` | [aerial_beach_01](https://polyhaven.com/a/aerial_beach_01) | diff, nor_gl, rough, ao, disp |
| `wet` | [damp_beach_sand](https://polyhaven.com/a/damp_beach_sand) | diff, nor_gl, rough, ao, disp |
| `rock` | [rock_boulder_dry](https://polyhaven.com/a/rock_boulder_dry) | diff, nor_gl, rough, ao, disp |
| `moss` | [mossy_rock](https://polyhaven.com/a/mossy_rock) | diff, nor_gl, rough, ao, disp |
| `grass` | [forest_floor](https://polyhaven.com/a/forest_floor) | diff, nor_gl, rough, ao, disp |
| `snow` | [snow_02](https://polyhaven.com/a/snow_02) | diff, nor_gl, rough, ao, disp |
| `ice` | [snow_04](https://polyhaven.com/a/snow_04) | diff, nor_gl, rough, ao, disp |
| `glacier` | [rock_06](https://polyhaven.com/a/rock_06) | diff, nor_gl, rough, ao, disp |
| `asphalt` | [asphalt_02](https://polyhaven.com/a/asphalt_02) | diff, nor_gl, rough, ao, disp |
| `concrete` | [concrete_floor_02](https://polyhaven.com/a/concrete_floor_02) | diff, nor_gl, rough, ao, disp |
| `brick` | [brick_wall_001](https://polyhaven.com/a/brick_wall_001) | diff, nor_gl, rough, ao, disp |
| `metal` | [corrugated_iron](https://polyhaven.com/a/corrugated_iron) | diff, nor_gl, rough, ao, disp |
| `bark` | [palm_bark](https://polyhaven.com/a/palm_bark) | diff, nor_gl, rough, ao, disp |

## Existing HDRIs and supporting art

The existing 1k HDRIs are [Kloofendal partly cloudy](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), [Qwantani dusk](https://polyhaven.com/a/qwantani_dusk_2_puresky) and [Shanghai Bund](https://polyhaven.com/a/shanghai_bund), all Poly Haven CC0. Their brightest upper-hemisphere radiance determines sun bearing/colour; horizon radiance sets fog. Per-course exposure uses ACES tone mapping. All tiers receive HDRI reflections.

Existing `water_normal.jpg`, three shoreline distance fields, soft particle masks, foam/flame sprites and signage support the water and gameplay effects. Kenney sprites are from [Particle Pack](https://kenney.nl/assets/particle-pack), CC0; see `public/assets/licenses/particle-pack.txt`. Round 6 removed the shipped Kenney palm, rock, hut, pier, ship, wreck, castle/lighthouse tower, station, parasol/street and four building GLBs. Their raw source packs remain in the ignored acquisition cache only.

## Existing racing boats

These were retained without re-downloading or rebuilding their geometry. Paint-only materials receive saturated colour, clearcoat and HDRI reflections. Separate trim, engines and glazing retain their authored materials. Speedboat n°1 and n°2 are **CC BY-NC 4.0**; the game must not be sold while these boats are included. Software licensing does not override asset licences.

| Shipped file | Title / author | Licence / source | Triangles | Bytes |
| --- | --- | --- | ---: | ---: |
| `models/sf_speedboat1.glb` | Speedboat n°1 / Jonathan Geoffroy | [CC BY-NC 4.0](https://sketchfab.com/3d-models/9c8400c0580b4deda9bd6ad2aa84e421) | 11,780 | 463,728 |
| `models/sf_speedboat2.glb` | Speedboat n°2 / Jonathan Geoffroy | [CC BY-NC 4.0](https://sketchfab.com/3d-models/66da3d79c45c41719c19fb80d0009bef) | 11,829 | 557,592 |
| `models/sf_myspeedboat.glb` | My Speed Boat... / MeRockNRollin | [CC BY 4.0](https://sketchfab.com/3d-models/d10195be58b74ba98a047a97c31c446e) | 7,207 | 887,828 |
| `models/sf_futuristic.glb` | Futuristic Speedboat / dylanheyes | [CC BY 4.0](https://sketchfab.com/3d-models/5a8f4d21472e4b2b8ec4d23f70cf8cbc) | 11,995 | 1,021,496 |
| `models/sf_cyberpunk.glb` | Cyberpunk Speedboat / jungle_jim | [CC BY 4.0](https://sketchfab.com/3d-models/1455b50eb92442d18c462a56428fdbec) | 11,958 | 934,628 |
| `models/sf_speedboat_vrpspu.glb` | Speedboat / vrpspu | [CC BY 4.0](https://sketchfab.com/3d-models/9916bd4433024202ab84e43426fc2139) | 12,114 | 4,645,416 |

## Budgets and validation

Low scenery is capped at **120 draws / 200,000 triangles**, with 1k textures, full default render resolution, no dynamic shadows, no SSAO and no planar/SSR pass. Contact shadows are inexpensive instanced patches. Medium adds follow-camera shadows; High/Ultra add SSAO, a half-resolution colour/depth prepass for refraction and depth foam, and a 512-square planar reflection. Normal maps, HDRI water reflections and physics-synchronised waves remain on every tier. Higher scene ceilings in `scripts/audit-assets.mjs` are Medium 200 draws/500k triangles, High 300 draws/3M triangles, Ultra 400 draws/5M triangles; conservative high counts include both near and distance models.

`npm run assets:audit` checks every tier texture limit, embedded dependencies, foliage alpha, eight-boat budgets, scenery limits and the 250 MiB shipped ceiling. It writes `artifacts/round6/asset-audit.json`. These are conservative whole-course geometry counts, **not frame-rate measurements**. `node scripts/check-environment.mjs` is a Chrome-only native 1426×827 Low benchmark for all three `?verify=1&track=N` all-AI races; `--high` selects the High test. It never launches Electron. See ROUND6-REPORT.md for actual verification and limitations.

| Low course | Whole-course scenery triangles | Scenery draws |
| --- | ---: | ---: |
| Sunspill Atoll | 130,639 | 78 |
| Aurora Narrows | 77,691 | 43 |
| Voltage Basin | 54,083 | 60 |

Current shipped asset directory: 118.45 MiB (ceiling 250 MiB).
