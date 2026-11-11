# Riptide Rush — round 7: fix what round 6 looks like on screen

Round 6 was run in the real desktop app on the owner's Intel HD 520 (Low, 1426x827 window, 8 AI boats,
`?verify=1&track=N`, ~15–20 s into the race). Findings, in priority order. No downloads needed; use the
assets already in the repo. No Electron/electron-builder runs, no commits. `npm test` + `npm run build`
must pass.

## 1. Performance regression (hard requirement)
Before round 6 all three tracks ran at 60–61 fps at full Low resolution (dyn = 1). Now:
- Sunspill Atoll: **39–40 fps** even with dynamic resolution at ~1.0 (so autoTune had not yet rescued it).
- Aurora Narrows: 55 fps with dyn 0.80.  Voltage Basin: 53–54 fps with dyn 0.83–0.93.
On this GPU the cost is almost entirely fragment/fill-rate, not draw calls. Get Low back to 60 fps at
dyn = 1 on all three tracks:
- Low terrain material must be cheap: one diffuse + one normal sample with world-space UVs and a cheap
  macro tint, no triplanar (3x samples), no parallax, no multi-layer splat blends per pixel beyond two
  layers, no AO/displacement maps bound.
- Low water: no depth pre-pass / depth texture, no refraction, no screen-space reflection; analytic
  fresnel + one env sample + one or two normal samples only.
- Alpha-tested foliage on Low: use LOD1/impostors, small alpha-tested cards cause heavy overdraw —
  limit card count and size, sort front-to-back, no double-sided lighting cost beyond what is needed.
- No full-screen post passes on Low beyond the final output pass (fold vignette/tone mapping into it).
- Background HDRI on Low at 1k; environment PMREM at low resolution.
- Add a `?perf=1` overlay or console line printing per-frame draw calls, triangles and the active
  material/feature toggles, and document in ROUND7-REPORT.md an estimate of per-pixel texture samples
  for terrain and water on each tier, so the budget is explicit.

## 2. Aurora Narrows looks wrong
The snow slopes are covered in strong parallel dark **stripes** (contour-line banding running along the
slope), which reads as a rendering bug. Likely a stretched texture axis / UVs following the extruded
profile, or a height-band blend with hard steps. Fix so snow reads as snow: world-space or triplanar-free
planar XZ mapping with a steep-slope rock blend by normal, soft noise-broken transitions, no banding.
Also: there is almost no scenery visible — add the ice/rock landmark pieces, boulders, dead trees and
props so the canyon is not just two bare ramps; make the aurora less of a white smear.

## 3. Sunspill Atoll is barren
Only bare sand dunes are visible from the start straight: no trees, bushes, rocks or props anywhere in
view. Vegetation and rock clusters must be clearly visible along both shores throughout the lap (near the
waterline as well as on the dunes), with landmark areas readable from the water. The dark flat slabs on
the horizon (untextured black hill faces) must be textured or removed. Check that instanced vegetation is
actually being added to the scene on Low and is not culled by distance/LOD settings.

## 4. Boat paint
Painted boats are still pale pastel (mint green, bubble-gum pink) and look like untextured plastic. The
`paint` material tint should use saturated, darker racing colours (deep red, royal blue, racing green,
orange, black, yellow, purple, white) with roughness ~0.25–0.35, metalness ~0.3–0.5 and env reflections;
do not lighten/blend the player colour toward white. Keep non-paint parts (engines, glass, trim) dark.
The cyberpunk model is a single `paint` material, so add contrast for it specifically: darken by
height/normal (e.g. a second darker material for downward-facing and engine areas via vertex colour or a
simple shader mix) so it does not read as one flat colour.

## 5. Voltage Basin
This track now looks good (HDRI reflections on the water). Keep it. Fix only: the two identical floating
box "buildings" with a tilted roof plane look like placeholders — give them proper facades/bases or
replace with better-composed blocks; embankments are a blurry brown smear — use the concrete/asphalt set
with visible edging at the waterline.

Finish with ROUND7-REPORT.md and an honest summary of what was changed, verified and not verified.
