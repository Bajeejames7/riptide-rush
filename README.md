# Riptide Rush

An original Electron / Three.js arcade powerboat racer with bundled CC BY / CC BY-NC racing boats and CC0 scenery models, photographic PBR terrain, HDR skies, and sprite effects. Gameplay runs fully offline after installation. See ASSETS.md for sources, licensing, file sizes, and the asset preparation steps.

## Run and package

Requires Node.js 22+ and Windows x64 for Windows packaging.

```powershell
npm install
npm run dev
npm test
npm run build
npm start
npm run dist
```

`npm start` opens the built game; build first. `npm run dist` generates its own icon and builds unsigned NSIS one-click and portable x64 executables into `release/`. The installer adds desktop and Start Menu shortcuts and an uninstaller. Dependencies are locked in `package-lock.json`. Initial dependency installation and Electron / builder tool downloads need internet; installed gameplay is offline.

## Play

Choose Single Race, a three-round Championship, Time Trial, Local Multiplayer or Online / LAN. Select one of six hulls, three waterways, AI difficulty and laps (default three). Race through eight ordered checkpoint sectors per lap. Cyan gates identify shortcuts; orange ramps launch you. Small green and large gold canisters refill boost. Hop consumes 12 boost. Banking into corners, drifting and hopping can help you retain speed. Reset returns you to your last checkpoint. Collisions bounce; standing still for eight seconds resets the boat.

| Action                     | Keyboard 1 | Keyboard 2   | Standard controller |
| -------------------------- | ---------- | ------------ | ------------------- |
| Throttle / brake & reverse | W / S      | Up / Down    | RT / LT             |
| Steer                      | A / D      | Left / Right | Left stick          |
| Boost                      | Left Shift | Right Ctrl   | A / Cross           |
| Hop                        | Space      | Right Shift  | B / Circle          |
| Drift                      | C          | /            | LB / L1             |
| Reset                      | R          | Backspace    | Y / Triangle        |
| Pause                      | Escape     | Escape       | Start / Options     |

Menus accept mouse, keyboard (arrows and Enter), or controller (stick / D-pad and A). B / Escape returns. Left/right changes focused selectors and sliders. Settings provides device-specific saved bindings for every action; generic controllers can bind buttons and signed axes. Deadzone is 18%. Connect devices before opening the binding screen, or reopen it to refresh its device list. Active controller disconnection opens the pause menu; reconnect to resume. Rumble is used where supported.

Local Multiplayer starts with keyboard 1. Clear players to use controllers only, then press any pad button to join; W / Space joins keyboard 1, Up / Right Ctrl joins keyboard 2. Up to four devices can join. Two players split horizontally; three and four use quadrants. Each player gets speed, boost, lap, position, times and minimap. Best laps and control / volume / graphics preferences are stored in Electron local storage.

Quality settings change resolution budget, water subdivisions on track load, shadows and postprocessing. Low disables shadows and renders every viewport directly; higher tiers use bloom and vignette per viewport. Integrated GPUs default to Low on first launch and dynamic resolution adapts during races. Boost increases camera field of view. Adjust resolution scale and quality for your hardware; frame rate depends on GPU and viewport count.

## Host / join

Open Online / LAN, assemble your local crew, select boats and colours, and click Host. The WebSocket server runs inside Electron on TCP 27015 by default; choose another port if needed. The lobby displays LAN IP addresses. Friends on the same network can use Find LAN Games (UDP 27016 broadcast) or join the displayed IP and port. Internet hosts must forward their chosen TCP port to the host computer and share their public address. Accept Windows' normal firewall prompt when hosting. No matchmaking service or account is required.

Each connection supports up to four local players, with eight total boats. All crews click Ready; the host selects track, laps, difficulty and AI count, then starts. Clients simulate their local boats and send state at 25 Hz. The host validates state bounds and movement distance, owns ordered checkpoint/lap completion and standings, and simulates AI; clients interpolate remote boats. This is a friendly LAN protocol rather than a competitive anti-cheat system. The first connected crew is the lobby host; on departure ownership transfers. Disconnected racers become AI. Online races continue while one participant is in a menu. Leave the race and host a new lobby for a rematch.

## Verification

`npm test` runs eight-boat AI simulations for 200 simulated seconds on each track, checks finite physics and completed laps, tests protocol rejection, and connects two actual WebSocket clients to the server to verify joins, readiness, host configuration, race start and snapshots. See `VERIFICATION.md` for results from the build environment and its permission limitations.


## Round 3 assets and checks

All static art is under `public/assets/` and Vite copies it into `dist/assets/`; the existing electron-builder `dist/**/*` entry includes it. Startup preloads models, sprites, textures and all three HDRIs with progress and a visible error on failure. Asset source archives are extracted as data only into ignored `assets-src/`; no download is required to build or play.

`npm run assets:audit` inspects bundled GLBs and calculates conservative whole-course Low geometry estimates. The `npm test` suite also validates all six shipped boats, credits, dimensions and shared rendering resources. For runtime checks, use `?verify=1&track=0` (or 1 / 2); `window.rrVerify.graphics.frameStats` exposes actual Low per-viewport calls and triangles. Hardware frame rate and visual acceptance must be checked on the target PC. Preparation scripts and all sources are documented in ASSETS.md.

## Third-party boat licences

The six Sketchfab boats are credited in the main menu and Settings Credits, and in [ASSETS.md](ASSETS.md). Speedboat n°1 and n°2 by Jonathan Geoffroy are CC BY-NC 4.0: the game may be shared for free but must not be sold while these models are included. The software licence does not override these asset licences.
