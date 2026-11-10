# Verification in the build workspace

Date: 10 November 2026. Windows x64, Node 24.18.0, npm 11.16.0.

## Passed by execution

- `npm install`: succeeded on the final run. Initial installation required a workspace-local npm cache and `npm install --ignore-scripts` because default cache access and lifecycle process spawning were blocked. Electron's runtime binary has not finished installing (see below).
- `npm test`: four passing tests. Eight boats complete three laps on every track during 200 simulated seconds per track, without nonfinite physics. Additional checks cover both keyboard layouts, analog input, deadzones, generic controller axis binding, saved device mappings, and disconnect events.
- Two actual WebSocket clients connect to a local server, join, ready, configure and start a race. Tests verify authoritative snapshots, preservation of unset best-lap values, rejection of client-supplied lap/finish claims, and AI takeover on disconnect.
- `npm run build`: production Vite build succeeds with 24 modules, approximately 648 kB of JavaScript before gzip. Native config loading avoids a sandbox-restricted Vite config-bundling subprocess.
- `node scripts/icon.mjs`: generates a 256 × 256, 32-bit Windows ICO in `build/icon.ico`.
- `npm audit --omit=dev`: zero production dependency vulnerabilities at verification time. The full dependency tree reported six moderate development dependency advisories.

## Blocked / not verified

- `npm run dist` was executed. Its Vite build passed and electron-builder reached Windows x64 packaging. Initially the dependency-rebuild subprocess failed with `spawn EPERM`; production dependencies do not require rebuilding, so `npmRebuild: false` was added. The subsequent run stalled obtaining the Electron 45.2.3 Windows runtime from GitHub and was stopped after several minutes without producing an unpacked app or executable. A separate bounded download obtained only 5,898,752 bytes before its 60-second limit. No installer or portable EXE has been produced or verified in this environment.
- `npm start` and `npm run dev` were attempted; both waited for the missing Electron runtime download and were stopped. A direct Chrome renderer-check attempt failed at Windows process/IPC initialization with `Access is denied (0x5)` / `mojo platform_channel`. Consequently, actual desktop gameplay, shader compilation on a GPU, visual appearance, audio output, split-screen layout, fullscreen, hardware controller compatibility/rumble, and the 60 fps target remain unverified. The Node controller test uses simulated device state.
- Loopback networking is verified; discovery across physical LAN machines, Internet port forwarding and multi-machine interpolation are not hardware-tested.
- Git staging and commits were attempted twice. Both failed with `Unable to create .../.git/index.lock: Permission denied`. The supplied workspace permission profile grants only read access to `.git`; no commits could be created.

## Reproduce on an unrestricted Windows machine

Run `npm install`, then `node node_modules/electron/install.js` if the runtime is missing, `npm test`, `npm run dev`, and `npm run dist`. The configured output files are `release/Riptide-Rush-Setup-1.0.0-x64.exe` and `release/Riptide-Rush-Portable-1.0.0-x64.exe`. Signing is optional and is not required by the build configuration. Install the NSIS output and test its desktop/Start Menu shortcuts, uninstaller and offline launch before sharing it.
