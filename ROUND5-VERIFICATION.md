# Round 5 verification

Implemented the six requested Sketchfab mappings through the shared builder used by race, AI, remote/split-screen boats and garage/rival previews. Existing names and driving stats remain. Only named paint materials receive instance colours; other hulls retain their colours and receive an identity accent. Model bounds place effects, and manifest dimensions drive hull collision extents and chase-camera spacing. Rendering compensates for the physics flotation offset to keep imported origins at the waterline.

Shared cached geometry and textures are retained across instances. Low disables transmission/clearcoat, reduces reflections and combines the cabin boat's shared palette variants without dropping triangles. Source geometry with mixed tangent attributes is normalised before batching. A production loader extension handles the cyberpunk model's legacy specular/glossiness material.

Credits are accessible from the main menu and Settings and include all six boats, the four Kenney packs and eight Poly Haven assets. README and ASSETS document the CC BY-NC restriction. The six unused Kenney racing GLBs were removed; scenery remains.

Verified:

- `npm test`: 21 tests passed, including shipped binary triangle counts, metadata, exact mappings, dimensions, shared geometry/material ownership, legacy material loading, AI races, career events and WebSocket loopback.
- `npm run build`: passed.
- `npm run assets:audit`: passed. Worst eight-copy boat fleet including identity and boost accents: 97,024 triangles / 96 draw submissions on Low. This is an asset estimate, not GPU telemetry.
- Shipped assets: 21.36 MiB.
- `git diff --check`: passed.

Not verified: rendered visual acceptance, live GPU performance, interactive split-screen, online remote rendering or rival previews. Headless Chrome was attempted but its debugging endpoint was unavailable. The shared construction paths were inspected; no successful browser session or screenshot was obtained. Whole-course audit allowances were updated for the detailed boats; the fleet has its own strict 100-draw / 100k-triangle checks.

No downloads, Electron/electron-builder runs, preparation reruns or commits were performed. Graphics.autoTune, isWeakGpu and electron/main.cjs were left unchanged, as were preview.html, src/preview.js and scripts/shot.mjs. The unrelated ROUND6.md file was left untouched.
