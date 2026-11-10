# Riptide Rush

An original, fully procedural Electron / Three.js arcade powerboat racer. All hulls, scenery, water, textures, effects and synthesized audio are generated locally. No external game assets or runtime internet connection are needed.

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

Quality settings change resolution budget, water subdivisions on track load, shadows and postprocessing. High / Ultra use bloom and vignette in single-screen play; split-screen uses direct rendering for performance. Boost increases camera field of view. Adjust resolution scale and quality for your hardware; frame rate depends on GPU and viewport count.

## Host / join

Open Online / LAN, assemble your local crew, select boats and colours, and click Host. The WebSocket server runs inside Electron on TCP 27015 by default; choose another port if needed. The lobby displays LAN IP addresses. Friends on the same network can use Find LAN Games (UDP 27016 broadcast) or join the displayed IP and port. Internet hosts must forward their chosen TCP port to the host computer and share their public address. Accept Windows' normal firewall prompt when hosting. No matchmaking service or account is required.

Each connection supports up to four local players, with eight total boats. All crews click Ready; the host selects track, laps, difficulty and AI count, then starts. Clients simulate their local boats and send state at 25 Hz. The host validates state bounds and movement distance, owns ordered checkpoint/lap completion and standings, and simulates AI; clients interpolate remote boats. This is a friendly LAN protocol rather than a competitive anti-cheat system. The first connected crew is the lobby host; on departure ownership transfers. Disconnected racers become AI. Online races continue while one participant is in a menu. Leave the race and host a new lobby for a rematch.

## Verification

`npm test` runs eight-boat AI simulations for 200 simulated seconds on each track, checks finite physics and completed laps, tests protocol rejection, and connects two actual WebSocket clients to the server to verify joins, readiness, host configuration, race start and snapshots. See `VERIFICATION.md` for results from the build environment and its permission limitations.
