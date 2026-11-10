# Riptide Rush — round 2: make it look and feel like a real arcade racer

The first pass runs and tests pass, but I ran it in a browser (`npx vite`, 1036x662 window, High quality)
and the result is far below the brief. Fix everything below. Keep `npm test` and `npm run build` green.
Do NOT try to download Electron or run electron-builder — packaging is handled outside your sandbox.
Do not commit (the .git dir is read-only for you); just leave the working tree ready.

## Observed bugs (must fix)
1. **Race view is blown out to white.** In Sunspill Atoll the top two thirds of the screen is pure white:
   Sky + exposure 1.1 + bloom (threshold 0.8 on HDR values) + FogExp2 in sky colour wash everything out, and
   the water goes white toward the horizon. Tune so there is a blue sky with a visible sun disc, a clear
   horizon, readable scenery, and bloom only on genuinely bright things (sun glints, neon, boost flames).
   Check every track theme, not just the tropical one.
2. Split-screen and Low/Medium quality skip the composer entirely, so they get no tone-mapped post at all and
   look different. Make post-processing work per viewport (or render each viewport to the composer) so
   split-screen looks the same as single player.
3. Start arch banner text is mirrored/unreadable from the grid and far too bright.
4. `resetBoat` and checkpoints hard-code 8 control points / 80 samples; derive from the track.

## Graphics upgrades (high priority — the user asked for high quality graphics)
- **Boats**: currently an extruded flat polygon plus boxes. Build proper hulls: lofted cross-sections
  (BufferGeometry from station profiles) with a deep-V or catamaran/tunnel hull, chines, a raked bow, deck,
  windshield/canopy, exposed engines with exhausts, spoiler/wing, intakes, trim tabs, racing stripes and
  number decals via canvas textures, clearcoat paint (MeshPhysicalMaterial), an environment map (PMREM from
  the sky) for reflections. Six silhouettes that are clearly different (deep-V offshore, catamaran,
  hydroplane with sponsons, jet-boat, heavy muscle boat, futuristic trimaran). ~2–4k triangles each.
- **Water**: the wave pattern reads as a repeating zig-zag texture from above. Use more Gerstner octaves with
  varied directions, detail normals from scrolling procedural noise, proper fresnel with sky/environment
  reflection, sun specular glitter, subsurface/depth tint (shallow turquoise near shores, deep blue in the
  channel), soft foam at shorelines, V-shaped persistent wake trails and prop-wash foam behind every boat.
  Physics `wave()` must stay in sync with the vertex displacement.
- **Tracks/scenery**: currently a ring of identical blobs and a few cones. Build real environments:
  - continuous shoreline/cliff/wall meshes along both sides of the channel generated from the spline (no
    gaps), with varying width, elevation changes in the scenery, and landmark set-pieces;
  - Tropical: sand beaches, rock arches you drive through, palm trees with real fronds, huts/piers,
    a waterfall, a volcano or lighthouse landmark, distant islands, clouds;
  - Arctic: tall ice-canyon walls, icebergs, an ice cave/tunnel section, snow peaks, aurora ribbons, a
    research station or icebreaker ship;
  - Neon city: skyscrapers with lit window textures (canvas), neon signs, bridges/overpasses to pass under,
    a tunnel, holographic billboards, moving traffic lights on bridges, reflections on wet water.
  - Longer, more interesting layouts (roughly 2x current length, hairpins, a wide-open stretch, a narrow
    technical section, an S-bend), per-track width variation.
  - Ramps should be proper ramp structures with real launch physics (height follows the ramp surface) and a
    worthwhile jump; shortcuts should be visible alternative channels with their own walls, signage and risk.
  - Use InstancedMesh for repeated scenery to keep 60fps.
- **Effects**: textured soft sprite particles (not square points) for spray, a tall rooster tail scaling with
  speed, bow spray, landing splash ring, boost flame cones with emissive glow and heat shimmer, speed lines
  or radial blur pass while boosting, camera shake on landing/boost, lens flare/sun glare, light shafts optional.
- **Camera**: chase camera with spring lag, look-ahead into turns, roll with the boat a little, pull back and
  widen FOV at speed and on boost; add a second camera view (bow/hood cam) toggled with a button.
- Shadows: tighten the shadow frustum to follow the player(s) so boat shadows are crisp.

## Gameplay / feel
- Speed must feel fast: more reference objects near the channel (buoys, markers, gates), stronger FOV kick.
- Boat handling: add water drag differences, bow lift at speed, banking into turns, bouncing/porpoising on
  waves, slamming on landings, drift with a visible spray arc. Wall hits should scrape and deflect, not stick.
- AI (`src/core/ai.js` is ~20 lines): implement real racing AI — follows a racing line with look-ahead,
  slows for corners, uses boost on straights, avoids other boats and obstacles, collects pickups, takes
  ramps, three clearly different difficulty levels, per-boat personality/variance, mild rubber-banding.
- Countdown with 3-2-1-GO lights, position change callouts, final-lap banner, wrong-way banner, finish
  cinematic camera, results screen with lap times.
- Boat select screen should show a rotating 3D preview of the selected boat; track select should show a
  minimap preview and best time.

## Verification you must do yourself
- Extend tests to cover the new AI (all 3 difficulties finish a 3-lap race on every track within a sane
  time, harder is faster), track generation (no self-overlapping walls, pickups/ramps inside the channel),
  and wave/physics sync.
- If you can run a headless browser here, take screenshots of each track mid-race and look at them; fix what
  looks wrong (blown out, too dark, z-fighting, objects floating/intersecting the channel).
- Finish with an honest summary of what was done, what was verified, and what was not.
