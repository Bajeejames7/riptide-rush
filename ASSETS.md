# Bundled art assets

All downloaded game assets are CC0. Only Kenney and Poly Haven download hosts were used. No downloaded code, scripts, executables or editor projects were executed. Original race names, layouts, physics, UI and audio remain project content.

## Downloaded packs

| Pack | Source / licence | Archive download bytes |
| --- | --- | ---: |
| watercraft-kit | [watercraft-kit](https://kenney.nl/assets/watercraft-kit) — CC0 (included licence text) | 1,870,991 |
| pirate-kit | [pirate-kit](https://kenney.nl/assets/pirate-kit) — CC0 (included licence text) | 3,154,665 |
| city-kit-commercial | [city-kit-commercial](https://kenney.nl/assets/city-kit-commercial) — CC0 (included licence text) | 4,096,974 |
| particle-pack | [particle-pack](https://kenney.nl/assets/particle-pack) — CC0 (included licence text) | 832,962 |

Kenney uses short-lived signed download URLs. The fetch script obtains them from its own `/download-link/` endpoint with a same-site session. The previous `/media/pages/...zip` URLs redirected to HTML; the signed endpoints delivered the archives. Exact resolved URLs and byte counts are kept in ignored `assets-src/<pack>/download.json`.

## Selected models

Embedded palette PNGs are included inside each GLB as data URIs, so no external texture URLs or runtime network access remain. Models retain authored details; racing body colours are selectively tinted. Repeated scenery is instanced and static geometry is merged by material.

| Shipped file | Original pack / file | Shipped bytes | Triangles per model |
| --- | --- | ---: | ---: |
| `models/boat0.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-a.glb` | 28,268 | 156 |
| `models/boat1.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-b.glb` | 27,540 | 148 |
| `models/boat2.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-c.glb` | 28,136 | 154 |
| `models/boat3.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-d.glb` | 35,284 | 250 |
| `models/boat4.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-e.glb` | 36,864 | 265 |
| `models/boat5.glb` | `assets-src\watercraft-kit\Models\GLB format\boat-speed-f.glb` | 34,036 | 234 |
| `models/palm.glb` | `assets-src\pirate-kit\Models\GLB format\palm-detailed-bend.glb` | 65,424 | 482 |
| `models/rock.glb` | `assets-src\pirate-kit\Models\GLB format\rocks-a.glb` | 41,052 | 264 |
| `models/hut.glb` | `assets-src\pirate-kit\Models\GLB format\structure.glb` | 41,400 | 276 |
| `models/pier.glb` | `assets-src\pirate-kit\Models\GLB format\structure-platform-dock.glb` | 46,752 | 324 |
| `models/ship.glb` | `assets-src\watercraft-kit\Models\GLB format\ship-large.glb` | 167,516 | 1,849 |
| `models/wreck.glb` | `assets-src\pirate-kit\Models\GLB format\ship-wreck.glb` | 236,904 | 2,282 |
| `models/lighthouse.glb` | `assets-src\pirate-kit\Models\GLB format\tower-complete-large.glb` | 68,076 | 604 |
| `models/station.glb` | `assets-src\city-kit-commercial\Models\GLB format\building-e.glb` | 142,876 | 1,509 |
| `models/street.glb` | `assets-src\city-kit-commercial\Models\GLB format\detail-parasol-a.glb` | 24,988 | 96 |
| `models/building0.glb` | `assets-src\city-kit-commercial\Models\GLB format\building-a.glb` | 123,604 | 1,252 |
| `models/building1.glb` | `assets-src\city-kit-commercial\Models\GLB format\building-b.glb` | 121,076 | 1,276 |
| `models/building2.glb` | `assets-src\city-kit-commercial\Models\GLB format\building-c.glb` | 117,456 | 1,195 |
| `models/building3.glb` | `assets-src\city-kit-commercial\Models\GLB format\building-skyscraper-c.glb` | 164,188 | 1,704 |

## Poly Haven HDRIs and PBR textures

All files are covered by [Poly Haven’s CC0 asset licence](https://polyhaven.com/license). HDRIs and texture sets were downloaded directly at 1k, avoiding larger unused resolutions. Each texture set contains diffuse, OpenGL normal and roughness maps.

| Shipped file | Asset page | Exact source file | Download bytes |
| --- | --- | --- | ---: |
| `skies/tropic.hdr` | [kloofendal_48d_partly_cloudy_puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | [download](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr) | 1,435,119 |
| `skies/ice.hdr` | [qwantani_dusk_2_puresky](https://polyhaven.com/a/qwantani_dusk_2_puresky) | [download](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/qwantani_dusk_2_puresky_1k.hdr) | 1,166,018 |
| `skies/city.hdr` | [shanghai_bund](https://polyhaven.com/a/shanghai_bund) | [download](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/shanghai_bund_1k.hdr) | 1,640,377 |
| `textures/sand_diff.jpg` | [aerial_beach_01](https://polyhaven.com/a/aerial_beach_01) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_beach_01/aerial_beach_01_diff_1k.jpg) | 115,382 |
| `textures/sand_nor_gl.jpg` | [aerial_beach_01](https://polyhaven.com/a/aerial_beach_01) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_beach_01/aerial_beach_01_nor_gl_1k.jpg) | 262,878 |
| `textures/sand_rough.jpg` | [aerial_beach_01](https://polyhaven.com/a/aerial_beach_01) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_beach_01/aerial_beach_01_rough_1k.jpg) | 155,774 |
| `textures/rock_diff.jpg` | [rock_boulder_dry](https://polyhaven.com/a/rock_boulder_dry) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_diff_1k.jpg) | 859,211 |
| `textures/rock_nor_gl.jpg` | [rock_boulder_dry](https://polyhaven.com/a/rock_boulder_dry) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_nor_gl_1k.jpg) | 802,497 |
| `textures/rock_rough.jpg` | [rock_boulder_dry](https://polyhaven.com/a/rock_boulder_dry) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_rough_1k.jpg) | 668,127 |
| `textures/snow_diff.jpg` | [snow_02](https://polyhaven.com/a/snow_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_02/snow_02_diff_1k.jpg) | 325,497 |
| `textures/snow_nor_gl.jpg` | [snow_02](https://polyhaven.com/a/snow_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_02/snow_02_nor_gl_1k.jpg) | 1,081,858 |
| `textures/snow_rough.jpg` | [snow_02](https://polyhaven.com/a/snow_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/snow_02/snow_02_rough_1k.jpg) | 146,089 |
| `textures/concrete_diff.jpg` | [concrete_floor_02](https://polyhaven.com/a/concrete_floor_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_diff_1k.jpg) | 776,097 |
| `textures/concrete_nor_gl.jpg` | [concrete_floor_02](https://polyhaven.com/a/concrete_floor_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_nor_gl_1k.jpg) | 192,757 |
| `textures/concrete_rough.jpg` | [concrete_floor_02](https://polyhaven.com/a/concrete_floor_02) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_rough_1k.jpg) | 318,550 |
| `textures/metal_diff.jpg` | [metal_plate](https://polyhaven.com/a/metal_plate) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_diff_1k.jpg) | 692,234 |
| `textures/metal_nor_gl.jpg` | [metal_plate](https://polyhaven.com/a/metal_plate) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_nor_gl_1k.jpg) | 770,307 |
| `textures/metal_rough.jpg` | [metal_plate](https://polyhaven.com/a/metal_plate) | [download](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/metal_plate/metal_plate_rough_1k.jpg) | 775,206 |

The initial `dikhololo_night` HDRI (1,745,132 bytes) was downloaded but replaced by the more suitable `qwantani_dusk_2_puresky`; it is not shipped. Poly Haven API requests returned HTTP 403; direct `dl.polyhaven.org` downloads succeeded. No water normal was found in the provider’s water texture search, so the permitted original procedural normal fallback is used. Quaternius was not needed and was not downloaded.

## Effects and original supporting textures

The Particle Pack supplies the following PNGs. The complete 15,001,764-byte archive transfer failed after 12,287,413 bytes and the host ignored HTTP Range. A fresh 832,962-byte ZIP prefix yielded 12 complete PNG entries, each decompressed as data and verified against its entry CRC. Only the following three ship; the other nine recovered PNGs stay in ignored assets-src. The archive licence entry was not reached; the bundled licence declaration records the CC0 licence displayed on the source page.

| Shipped file | Source ZIP entry | Downloaded PNG bytes |
| --- | --- | ---: |
| `sprites/spray.png` | `PNG (Transparent)/dirt_02.png` | 54,060 |
| `sprites/foam.png` | `PNG (Transparent)/fire_01.png` | 99,891 |
| `sprites/flame.png` | `PNG (Transparent)/flame_01.png` | 54,099 |

`textures/water_normal.jpg` is an original seamless 512×512 normal map generated offline by `scripts/prepare-assets.py`. `textures/shore_tropic.png`, `shore_ice.png`, `shore_city.png` are original 512×512 signed shoreline-distance fields baked from this project’s courses by `scripts/bake-shores.mjs`. They replace per-fragment shoreline searches. Number decals and original race / shortcut / station signs remain small runtime text canvases, not terrain art.

## Preparation / offline build

The checked-in `public/assets/` files are sufficient: `npm run build` requires no asset downloads. Vite copies them into `dist/assets/`; electron-builder’s existing `files: ["dist/**/*", ...]` includes every shipped file.

To reproduce acquisition and preparation (Python 3 with Pillow, Node, network required):

```text
python scripts/fetch-kenney.py
python scripts/fetch-particles.py
python scripts/fetch-polyhaven.py
python scripts/prepare-assets.py
node scripts/bake-shores.mjs
npm run assets:audit
npm run build
```

Archives are kept only in memory while extracting whitelisted data extensions into git-ignored `assets-src/<pack>/`. Only selected data files are copied into `public/assets/`. No download or execution of Electron or electron-builder was performed for this round.

Current shipped asset size: 14,068,123 bytes. Total acquisition remained below 60 MB including interrupted and diagnostic transfers, below the 300 MB budget; final shipped assets remain well below 120 MB.

## Round 4 adaptations (no new external downloads)

The six existing Kenney Watercraft hulls are rescaled individually and combined with original racing hardware: engine blocks, exhausts, intakes, windscreens, wings and twin sponsons. Each finished hull uses two merged hardware/paint meshes, one canvas livery deck and one boost sprite (four submissions). Original canvas liveries use two-tone paint, stripes, race numbers and invented sponsor marks (Tideline, Wakeworks, Deep Arc, Surge Co, Blue Shift, Sea Vector). Clearcoat paint uses the existing bundled HDR environments.

Spray now uses an original 64px radial white alpha mask generated at runtime, additive blending and untone-mapped white particles; splash patches use the same soft mask. Existing Kenney flame sprites remain on exhausts. No generated raster art or additional downloaded assets were used.

Sunspill banks now keep the existing Poly Haven sand set across the broad low beach/dune strip and reserve the rock set for the outer rise. Existing instanced palms, rocks, huts, piers, ships and wrecks supply the resort/harbour scenery. The castle-like beacon kit placements were removed, and the three stone arches were replaced with timber marina spans. The bundled beacon model remains in the manifest but is no longer placed on this course. Water normal scales/rotation and wake foam were adjusted in the shader without additional texture files.
