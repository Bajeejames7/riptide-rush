# Round 3 verification

Implemented against the existing game, 2026-11-10. See ASSETS.md for each selected file, source, licence and download size.

## Assets and renderer

- Six Kenney Watercraft speedboat GLBs replace all lofted hulls. A single boat builder supplies races and selection previews, with selective body paint, race numbers placed on the actual deck, PBR reflections and particle flames. Each renderer owns its own cached PMREM targets.
- Kenney Pirate and City Commercial models provide instanced palms, textured rocks, huts, piers, ships, wrecks, beacon towers, stations, buildings and street props. Existing original bridges, arches, tunnels, waterfall and aurora remain as custom set pieces with textured surfaces. City buildings have emissive window treatment and instanced foundations.
- Three 1k Poly Haven HDRIs supply backgrounds, reflection environments and radiance-derived key-light directions / horizon fog. Five 1k diffuse/normal/roughness sets supply sand, rock, snow, concrete and metal.
- Water keeps the shared Gerstner displacement and analytic normals. It adds an original offline-baked detail normal, HDR reflections, baked shore distance / depth tint and particle-textured foam. The old sinusoidal foam bands are removed. Low evaluates 24 wake entries instead of 64 and uses a 512px shore field instead of 128 distance searches per pixel.
- Three CRC-checked Particle Pack PNGs supply droplet spray / rooster tails, turbulent foam / splash patches and boost flames. Full archive download failed; selected entries were recovered from a short ZIP prefix. Poly Haven API requests failed with 403; direct downloads succeeded. No water normal was available in the provider search, so the permitted original fallback is used.
- Startup preloads every race asset with progress before menu / countdown. Loaded models, images, HDRIs and PMREMs are cached. A visible failure page identifies missing or failed files. The desktop file page retains its origin and saved records / settings / bindings; a fetch-capable local protocol serves only bundled assets. Protocol implementation follows https://www.electronjs.org/docs/latest/api/protocol.
- Low retains integrated-GPU selection and dynamic resolution; disables shadows, bloom and all postprocessing; and reduces unused post targets to 1x1. Pickups and repeated scenery are instanced; static scenery is merged with BufferGeometryUtils.mergeGeometries.

## Completed checks

- `npm test`: 13 passing tests. Includes asset-free loading failure/retry/cache/progress checks, material ownership, batching and desktop asset path containment; existing controller/remapping, wave/physics, all-track/all-difficulty AI races and WebSocket host/join/start/snapshot tests pass. No binary asset is needed by these tests.
- `npm run assets:audit`: passes. Checks every shipped image and embedded palette is at most 1024px, HDRIs are 1024x512, GLBs have no external image/buffer dependencies, and whole-course Low geometry allowances fit the budgets.
- `npm run build`: passes. Every file under public/assets is copied into dist/assets. The existing electron-builder `dist/**/*` files glob includes them.
- Desktop CommonJS syntax and preparation-script syntax checked without executing Electron or downloaded code.
- Shipped assets: 14,068,123 bytes (13.42 MiB), below 120 MB. Acquisition including interrupted/diagnostic transfers remained below 60 MB, below 300 MB.

| Course | Whole scenery triangles | Scenery draws | Conservative Low total triangles | Conservative Low total draws |
| --- | ---: | ---: | ---: | ---: |
| Sunspill Atoll | 110,220 | 45 | 175,820 | 109 |
| Aurora Narrows | 46,322 | 35 | 111,922 | 99 |
| Voltage Basin | 93,916 | 50 | 159,516 | 114 |

The totals include the entire course without frustum culling plus allowances for Low water, eight boats, instanced pickups, ramps, gates and effects. They are structural estimates, not measured GPU frame statistics. Transparent sorting, shadow passes at higher tiers and multiple viewports can change actual submissions. On Low, `window.rrVerify.graphics.frameStats` records actual per-viewport calls and triangles for external checks.

## Not verified here

No game visual acceptance check, target Intel HD 520 frame-rate measurement, physical controller / audio playback check, multiplayer across separate PCs, Electron runtime asset protocol check or installer packaging was performed. Those require the external checks requested by the owner. The `?verify=1&track=0` / `1` / `2` all-AI entry path is preserved after successful preload, but was not launched in a browser here. Split-screen and online game logic were preserved; the Node network and input tests pass, but interactive end-to-end play remains to be checked.

No Electron download, electron-builder run, packaging or git commit was performed.
