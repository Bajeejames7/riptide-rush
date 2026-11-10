# Round 2 implementation and verification

Implemented in the existing game, 10 November 2026. No commits, Electron downloads or packaging commands were performed during this round. Existing unrelated edits to package.json, package-lock.json and scripts/package.mjs were preserved.

## Rendering and graphics

- Replaced the unbounded atmospheric sky with a bounded gradient sky, explicit sun/moon disc and glare. Reduced exposure, tightened bloom to HDR highlights, and replaced exponential fog with a distant linear horizon.
- Every quality setting and every split-screen viewport now uses the composer, bloom, speed/heat distortion, vignette and OutputPass. An unmodified screen blit avoids applying output conversion twice.
- Start signage has independent front-facing surfaces for each direction. Checkpoints and resets derive their sector count and resolution from track metadata.
- Six lofted cross-section hull configurations: deep V, twin hull, sponson hydroplane, jet boat, heavy wide hull, trimaran. Clearcoat paint, canopy, engines, exhausts, wing/fins, intakes, trim tabs, curved stripes and canvas number plates. Tests check 2,000–4,200 triangles per complete model and outward deck normals.
- Cubemap capture and PMREM cover sky and built scenery; boats use filtered environment reflections and water samples the captured environment. Captures are static per track load, not dynamic planar reflections.
- Six Gerstner octaves with horizontal displacement, scrolling detail normals, Fresnel reflection, specular glitter, channel depth tint, shoreline foam, prop wash and fading V wake history. CPU buoyancy inverts horizontal displacement and transforms surface derivatives into world space.
- Continuous spline banks with varied widths, shortcut openings and retaining walls. Layouts are substantially longer; tropical and arctic have additional technical bends. Instanced channel markers, palms/fronds, ice formations and textured skyline buildings bound repeated-scenery draw calls.
- Tropical rock arches, raised huts, piers, waterfall, volcanic island and clouds; arctic canyon walls, cave sections, peaks, aurora and research station; city window textures, signs, hologram panels, overpasses, tunnel and moving bridge traffic lights.
- Soft alpha spray, speed-scaled rooster tail, bow/drift spray, expanding landing rings, HDR exhaust flames, boost radial blur/screen-space heat distortion, shake and glare. Heat shimmer is a screen-space approximation.
- Spring chase camera, turn look-ahead, slight roll, speed/boost FOV and distance changes, bow camera, finish orbit and player-following shadow frustum. V / Numpad 0 / controller X (Square) switch cameras, with remappable controller action.

## Racing and menus

- Boat-specific coasting drag, planing lift, wave porpoising, banks, landing speed loss and deflecting wall scrapes.
- Distance-based AI look-ahead, corner pace, boat/obstacle avoidance, pickup alignment, straight-line boost, personality offsets, three difficulty paces and bounded rubber-banding. Center-line ramps are raced naturally; AI does not explicitly plan shortcuts.
- Countdown lights, position-gain callouts, final-lap and wrong-way banners, four-second finish camera and per-lap results.
- Rotating selected-boat preview, track map preview and saved best-lap display.

## Executed verification

`npm test`: 10 passed, 0 failed. Includes six boats at each of three difficulties, completing three laps on all three tracks within 420 simulated seconds. Average finish seconds:

| Track | Cruise | Racer | Expert |
| --- | ---: | ---: | ---: |
| Sunspill Atoll | 234.0 | 172.9 | 145.9 |
| Aurora Narrows | 211.0 | 157.3 | 134.2 |
| Voltage Basin | 202.8 | 154.5 | 130.3 |

The original eight-boat three-track 200-second simulation also passes. Geometry tests check each main bank boundary for self-intersections and pickups/ramps for channel containment. Other tests compare CPU heights to forward-displaced Gerstner vertices, compare analytic slopes with finite differences, verify ramp launch height above six metres, camera press latching, wall scrape forward velocity, hull geometry budgets, input mappings, protocol validation and authoritative WebSocket races.

`npm run build`: passes, 26 modules, approximately 642 kB JS before gzip.

## Browser limitation and remaining verification

Attempted installed Chrome headless at 1036×662 with a local Vite server, then installed Edge with single-process/crash-reporting fallback flags. Both terminate before loading the game: Windows Mojo platform channel initialization reports Access is denied (0x5); Crashpad also cannot initialize. No screenshots were produced, and no rendered view could be inspected. GPU shader compilation, final appearance on all themes/qualities, split-screen presentation, audio, physical controllers and 60 fps remain unverified. Geometry tests do not certify every scenic intersection or shortcut-wall junction.

For visual verification outside this restriction, run Vite and open `/?verify=1&track=0` (also 1 and 2). This launches an automatically driven race using normal gameplay paths and exposes `window.rrVerify` for inspection. Check normal races, split-screen and Low/Medium as well. Do not infer visual approval from passing Node tests or the production build.
