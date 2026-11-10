# Riptide Rush — build brief

Build a complete, playable, ORIGINAL arcade powerboat racing game for Windows called **Riptide Rush**.
It is in the genre of late-90s arcade speedboat racers (huge speed, boost pickups, big jumps, shortcuts,
over-the-top tracks), but everything must be original: do not use names, boats, tracks, announcer lines,
logos, art or music from any existing game.

Work in this directory. Build everything end to end, do not stop at a scaffold. No placeholders or TODOs.

## Tech stack
- Electron (latest stable) + Three.js + Vite, plain JavaScript or TypeScript (your choice).
- `ws` for networking, electron-builder for packaging.
- NO external art/audio asset downloads. All models, textures, and sounds are procedural / generated in code
  (canvas textures, shaders, WebAudio synthesis). The game must work fully offline.

## Graphics (high priority — it must look good)
- Real water: custom shader with summed Gerstner waves, fresnel, sky reflection, depth-tinted colour,
  foam near shores/obstacles and in boat wakes. Boat physics must sample the same wave function.
- Physically based sky (Three.js Sky or custom), sun, tone mapping (ACES), sRGB output, shadows on boats.
- Post-processing: bloom, subtle vignette, speed-based radial blur or FOV kick while boosting.
- Particles: spray rooster-tails behind boats, bow splashes on landing, boost flames, pickup sparkle.
- Boats: at least 6 distinct, detailed procedurally modelled boats (hull, cockpit, engines, fins, decals,
  PBR materials, per-player colours) with different stats (top speed, acceleration, handling, boost).
- At least 3 visually distinct tracks built procedurally from spline data, each with scenery, ramps,
  boost pickups, a shortcut, and their own lighting mood:
  1. tropical lagoon / islands at midday,
  2. arctic ice canyon at dusk with aurora,
  3. flooded neon city at night.
- Graphics quality setting (Low / Medium / High / Ultra) and resolution scale, fullscreen toggle, 60fps+ target.

## Gameplay
- Arcade handling: throttle, brake/reverse, steering, drift-y turning, buoyancy, pitch/roll on waves,
  air time off ramps with a satisfying landing.
- Boost: collect boost canisters (small and large) to fill a boost meter; hold boost button to burn it.
- "Hop" ability while boost is available (short jump to reach shortcuts / hop over obstacles).
- Collisions with walls, obstacles and other boats (bouncy, not punishing). Reset-to-track button and
  automatic reset when stuck or off course.
- Checkpoints, laps (default 3), position tracking, wrong-way indicator, race countdown, finish results
  screen, best lap times saved locally.
- AI opponents with 3 difficulty levels, fill the grid up to 8 boats, rubber-banding kept mild.
- HUD: speed, position, lap, boost meter, minimap, lap/total time. Works per-viewport in split-screen.
- Modes: Single Race, Championship (all tracks, points), Time Trial, Local Multiplayer, Online Multiplayer.
- Audio via WebAudio synthesis: engine pitch tied to speed, boost roar, splashes, pickups, countdown beeps,
  UI sounds, and a simple procedural/synth music loop per track. Volume sliders.

## Input (must be robust)
- Keyboard: two built-in layouts so 2 players can share one keyboard (WASD + Shift/Space, Arrows + RCtrl/RShift).
- Controllers via the Gamepad API: Xbox (XInput), PlayStation, and generic wired/USB controllers,
  including pads with non-"standard" mapping. Analog triggers for throttle/brake, left stick steering,
  deadzones, rumble (vibrationActuator) when available.
- Hot-plug: controllers can be connected/disconnected at any time; pause if an active player's pad drops.
- Full remapping screen for keyboard and every controller (press-a-button-to-bind, detects axes and
  buttons), saved per device id. Menus fully navigable with keyboard AND controller.
- "Press any button to join" lobby that assigns devices to players.

## Multiplayer
- Local split-screen for 1–4 players (2 = horizontal split, 3–4 = quadrants), any mix of keyboard and pads.
- Online/LAN for up to 8 players: one player clicks Host (a WebSocket server starts inside the Electron
  main process, default port 27015, configurable); others Join by IP address, plus automatic LAN game
  discovery via UDP broadcast listing found games. Lobby with player names, boat/colour choice, ready
  state, host picks track/laps/AI count and starts the race.
- Host-authoritative race state (start, laps, positions, finish); each client simulates its own boat and
  sends state ~20–30 Hz; remote boats are interpolated smoothly. Handle disconnects gracefully.
- The Host screen shows the machine's LAN IP addresses and a short note on port-forwarding for internet play.
- Split-screen players on one machine can also join an online game together.

## Packaging (friends must be able to install easily)
- `npm run dev` runs the game in development; `npm start` runs the built game.
- `npm run dist` produces with electron-builder (win x64):
  - an NSIS one-click-style installer `.exe` (desktop + start-menu shortcut, uninstaller), and
  - a portable single `.exe`.
  Output to `release/`. Generate an app icon in code/at build time (no external download).
  Do not require code signing (set config so the build works unsigned).
- Windows firewall: no special handling needed beyond the normal OS prompt when hosting.

## Quality bar / verification
- Run `npm install`, build the project, and fix every build error.
- Add a headless smoke test script (`npm test`) that at least imports the core simulation modules
  (physics, track generation, AI, net protocol) under Node and runs a simulated race for some seconds
  without throwing, and a server/client loopback test for the net protocol.
- Run `npm run dist` and make sure the installer and portable exe are actually produced. If a step fails
  because of sandbox/network limits, say exactly which step and why in the final message.
- Write a README.md: how to play, default controls, how to host/join, how to build the installer.
- Commit your work with git as you go.

At the end, print a concise summary: what was built, what was verified by actually running it, and anything
not finished or not verified.
