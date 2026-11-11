# Round 7 report

Implemented the requested rendering and scenery changes. **The hard target of 60 fps at dyn=1 on Intel HD 520 has not been demonstrated.** Native GPU performance and rendered visual acceptance remain outstanding; static tests and geometry budgets cannot establish either.

## Rendering costs

- Low terrain uses Lambert lighting, one world-XZ diffuse lookup and one world-XZ normal lookup. It has no automatic PBR environment lookups, roughness/AO/displacement maps, triplanar sampling, parallax, or per-pixel splat layers. Slope rock colour on Low is a tint of the sampled ground; Medium+ samples a second rock/asphalt diffuse texture. Macro variation and slope transitions are analytic and continuous.
- Low water has a separate compile-time path: two moving normal lookups, one HDR environment cube lookup, analytic Fresnel and sun highlight. Depth, refraction, planar reflection, shore/foam texture lookups and obstacle-foam loops are excluded. Eight live wake slots use distance rejection and polynomial crests instead of exponential crests; higher tiers retain their previous water appearance and wake history.
- Low trees always use the cached two-card impostors when rendering, with LOD1 fallback if an impostor is unavailable. Unused near-tree instances are no longer constructed on Low. Low alpha foliage uses unlit single-pass materials, depth writes and per-viewport instance sorting front to back. Low palms have four fronds instead of nine; small fern/grass clusters are omitted on Low in favour of larger trees, shrubs and boulders.
- Low retains direct-to-screen rendering: zero full-screen post passes. Tone mapping/output conversion happen in the scene shaders. Low has no vignette or boost blur, shadows, SSAO, depth prepass, planar reflection or SSR. Dynamic-resolution tuning/default scale are unchanged.
- Low background radiance is capped at 1024 pixels wide; PMREM input is 256x128, giving 64-pixel cube faces. The direct water reflection cube remains 128 pixels per face. Resampling preserves HDR values, source orientation and linear filtering. Compact maps are cached by theme/tier. All supplied HDRIs were already at most 1k; this makes the Low cap explicit.

### Estimated fragment texture budget

Counts below are source-level texture queries for terrain/water, before hardware filtering, shadows and extra render passes. A query can fetch multiple texels. A pixel beyond the water fog cutoff performs no water texture queries.

| Tier | Terrain surface queries | Water queries |
| --- | --- | --- |
| Low | 2: diffuse + normal; no IBL | 3: two normals + one environment cube |
| Medium | 3: ground diffuse + rock/asphalt diffuse + normal; plus built-in PBR IBL | 5: two normals + shore + foam + environment cube |
| High | 3, as Medium, at 2k; plus built-in PBR IBL | 8: Medium plus depth + refracted scene colour + planar reflection |
| Ultra | Same as High | Same as High |

Medium+ terrain also pays Three's filtered environment-lighting sampling and shadow filtering; these are additional to the three surface queries. High/Ultra water additionally requires scene-colour/depth and reflected-scene rendering. No tier now uses terrain triplanar or parallax. Other scenery materials have their own PBR budgets; this table concerns the terrain banks and water.

`?perf=1` displays current-frame FPS, dynamic scale, summed draw calls/triangles across viewports, terrain/water sample budgets and active feature toggles. Use `?verify=1&track=0&perf=1` (tracks 0, 1, 2). Counts include the final composite blit on Medium+; Low counts its direct scene draw. FPS is instantaneous, not a GPU benchmark.

## Course appearance and boats

- Aurora: removed the altitude-based snow/ice layer change, vertical-axis cliff sampling and mismatched normal tangent frames. Snow colour and normals share planar XZ coordinates, with quieter normal strength and a soft, noise-broken slope rock transition. Added continuous pine, dead-trunk and boulder placements along both banks. Existing ice arches, cliff landmarks, landing and props survive the relaxed placement filtering and larger visibility ranges. The sky alone receives capped, green/teal-tinted upper-sky radiance to reduce white aurora highlights; environment lighting is retained.
- Sunspill: added grouped, deterministic tree/shrub/boulder sites along both shores in all five course sectors, including the start. Sites span near-water rocks, larger trees and dune shrubs. Five composed landmarks remain, with longer culling ranges. Removed the large cliff scans with flat closure faces from Sunspill, replacing them with textured boulders. Low tree count no longer depends on the landmark slope filter. Scanned models are actually instantiated, verified using the shipped GLBs.
- Boats: new deep red, royal blue, racing green, orange, black, yellow, purple and white choices replace the pastel defaults/AI palette. Paint uses roughness .30, metalness .40, clearcoat and environment reflections without white blending. Cyberpunk paint gains height/normal-dependent dark contrast; named Windows/Seats/BoatFloor parts are darkened independently. Existing custom/saved hex colours are not forcibly remapped.
- Voltage: kept the Medium+ HDR water reflection path. Warehouses now have concrete foundations, solid roofs, annexes and facade pilasters instead of open tilted roof planes. Terrain uses concrete with an asphalt slope layer on Medium+ (concrete tint on Low); a continuous instanced concrete curb gives both waterlines a visible edge.

## Verification

- `npm test`: **25/25 pass**. Added shader-budget/planar-normal regression coverage and sequential loading of actual bundled LOD1 GLBs to verify trees and boulders on both banks in every natural-course sector. Existing simulation, boat isolation, wave agreement, clearance, asset lifecycle and networking tests pass.
- `npm run build`: **passes**.
- `npm run assets:audit`: **passes**. Shipped assets remain 118.45 MiB; no asset downloads. Conservative whole-course Low scenery totals before runtime tree impostors and culling:

| Course | Triangles | Draws |
| --- | ---: | ---: |
| Sunspill | 142,981 | 75 |
| Aurora | 147,869 | 53 |
| Voltage | 59,899 | 71 |

These are geometry limits, not performance measurements. Continuous scenery increases Aurora's total geometry; Low runtime impostors substantially reduce the tree portion.

- `node scripts/check-environment.mjs`: **could not run the races**; Chrome did not expose its debugging connection (`Chrome debugging unavailable`). No screenshots, shader compilation results or trustworthy frame timings were obtained. The existing script attempts only Chrome and was stopped/cleaned up by its finally block.
- No Electron/electron-builder runs, commits or downloads. Asset checks/model regression loading ran sequentially; no concurrent browser farms or large image preprocessing.

## Outstanding acceptance checks

Actual shader compilation, visual quality (including absence of snow stripes, shore visibility, aurora colours, paint contrast and building grounding), split-screen appearance and sustained 60 fps on the owner's Intel HD 520 remain **unverified**. Measure all three courses at 1426x827, Low, eight AI boats, 15-20 seconds into the race with dyn held at 1. The existing browser verification script holds dyn=1 during its measurement; it is not evidence of performance until it runs successfully on the target hardware. The requested 60 fps acceptance requirement remains open.
