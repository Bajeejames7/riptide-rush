# Bundled art assets

The bundled scenery, textures and particles are CC0; the six Sketchfab racing boats are CC BY 4.0 or CC BY-NC 4.0 as listed below. No downloaded code, scripts, executables or editor projects were executed. Original race names, layouts, physics, UI and audio remain project content.

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

The round 5 audit reports the current shipped asset size. Total acquisition remained below 60 MB including interrupted and diagnostic transfers, below the 300 MB budget; final shipped assets remain well below 120 MB.

## Round 5 racing boats

Six prepared Sketchfab models replace all Kenney racing hulls. They retain +Z bow orientation, 8-unit length and the authored waterline. Material primitives are batched once per model and shared between instances; only `paint` materials are cloned and recoloured. Other boats retain the artist's colours and use an identity strip. Old racing hardware and decals are removed. Kenney boat0?boat5 files are no longer shipped; the Watercraft ship remains scenery.

Speedboat n°1 and n°2 by Jonathan Geoffroy are **CC BY-NC 4.0**: the game may be shared for free but must not be sold while they are included. The software licence does not override asset licences. All six were optimised and normalised outside this round; no downloads or preparation reruns were performed.

| Shipped model | Title | Author | Licence / source | Shipped bytes | Triangles |
| --- | --- | --- | --- | ---: | ---: |
| `models/sf_speedboat1.glb` | Speedboat n°1 | Jonathan Geoffroy | [CC BY-NC 4.0](https://sketchfab.com/3d-models/9c8400c0580b4deda9bd6ad2aa84e421) | 463,728 | 11,780 |
| `models/sf_speedboat2.glb` | Speedboat n°2 | Jonathan Geoffroy | [CC BY-NC 4.0](https://sketchfab.com/3d-models/66da3d79c45c41719c19fb80d0009bef) | 557,592 | 11,829 |
| `models/sf_myspeedboat.glb` | My Speed Boat... | MeRockNRollin | [CC BY 4.0](https://sketchfab.com/3d-models/d10195be58b74ba98a047a97c31c446e) | 887,828 | 7,207 |
| `models/sf_futuristic.glb` | Futuristic Speedboat | dylanheyes | [CC BY 4.0](https://sketchfab.com/3d-models/5a8f4d21472e4b2b8ec4d23f70cf8cbc) | 1,021,496 | 11,995 |
| `models/sf_cyberpunk.glb` | Cyberpunk Speedboat | jungle_jim | [CC BY 4.0](https://sketchfab.com/3d-models/1455b50eb92442d18c462a56428fdbec) | 934,628 | 11,958 |
| `models/sf_speedboat_vrpspu.glb` | Speedboat | vrpspu | [CC BY 4.0](https://sketchfab.com/3d-models/9916bd4433024202ab84e43426fc2139) | 4,645,416 | 12,114 |

On Low, transmission and clearcoat are disabled, reflections are reduced, and the cabin boat uses a single opaque pass for its shared palette variants. All model triangles remain. The audit caps eight boats including boost/identity accents at 100 draws and 100,000 triangles; its conservative whole-course allowance is now 350,000 triangles / 220 draws to include the detailed fleet. The worst eight-copy fleet is 97,024 triangles / 96 draws.
