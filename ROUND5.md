# Riptide Rush — round 5: real boat models

Six detailed racing-boat models (from Sketchfab, CC BY / CC BY-NC, downloaded and prepared outside your
sandbox) replace the blocky kit boats. They are already in the repo, optimised and normalised:

- `public/assets/models/sf_<id>.glb` — six files, 7–12k triangles, 1–12 draw calls each.
- `public/assets/models/sf_boats.json` — manifest: id, file, title, author, license, url, triangles,
  drawCalls, size, materials.
- Every model is already: bow pointing **+Z**, **8 units long**, centred on X/Z, keel slightly below y=0
  (waterline at y=0), Y up. Do not re-orient them; just scale uniformly if the game's boat length differs.
- Where a hull paint material could be isolated it is named exactly **`paint`** (futuristic, cyberpunk,
  myspeedboat). speedboat1, speedboat2 and speedboat_vrpspu have no `paint` material and keep the artist's
  colours.
- `scripts/prepare-boats.mjs` regenerates them from `assets-src/sketchfab/` (git-ignored). Do not rerun it
  and do not download anything in this round.
- `preview.html` + `src/preview.js` + `scripts/shot.mjs` are dev helpers; leave them alone.

## Do
1. **Use these six models as the six playable boats**, replacing the Kenney kit-bashed boats everywhere:
   race, AI boats, split-screen, online remote boats, boat-select / garage rotating preview, rival intro.
   Mapping (keep the existing boat names and stats, pick the fitting silhouette):
   - Kestrel → `speedboat2` (white offshore speedboat)
   - Manta Ray → `speedboat1` (yellow striped catamaran)
   - Ironwake → `speedboat_vrpspu` (heavy white cabin boat)
   - Needlefin → `myspeedboat` (long narrow cigarette boat)
   - Twin Comet → `cyberpunk` (wide twin-engine boat)
   - Stormglass → `futuristic` (sleek sci-fi boat)
2. **Player colour**: for models with a `paint` material, clone that material per boat instance and set its
   colour to the player's/AI's colour, with glossy clearcoat-style settings (MeshPhysicalMaterial or tuned
   metalness/roughness) and the track's HDRI environment for reflections. For models without `paint`, do
   not tint; instead show identity with a coloured light strip / flag / underglow accent attached to the
   boat and the existing name tags, so every boat on the grid is still distinguishable.
3. Keep/re-attach the existing effects at sensible positions computed from each model's bounding box:
   rooster-tail spray and prop wash at the stern (−Z end), bow spray, boost flames at the stern, wake.
   Remove kit-bash add-on parts (wings, engines, stripes, number decals) that were built for the old boats
   if they no longer fit; race numbers may stay as small floating tags only if they look right.
4. Collision radius/length and chase-camera distance should use the new boat dimensions (see manifest
   `size`); the boat must not clip the camera or sink under the water plane. Share geometry and textures
   between instances of the same model (clone the scene graph, not the buffers).
5. Low quality budget: 8 boats on screen must stay around ≤ 100 draw calls and ≤ 100k triangles for boats.
   On Low, drop the env-map intensity/clearcoat if needed, never the models themselves.
6. **Credits**: add a "Credits" entry on the main menu (and in Settings) listing every third-party asset:
   the six boats from `sf_boats.json` with title, author, licence and URL (CC BY requires this), plus the
   Kenney and Poly Haven packs already in ASSETS.md. Note in the credits and README that two boats
   (Speedboat n°1 and n°2 by Jonathan Geoffroy) are CC BY-NC: the game may be shared for free but not sold
   while they are included.
7. Update ASSETS.md with the six models (source URL, author, licence, shipped bytes, triangles) and remove
   Kenney watercraft boat files that are no longer referenced (keep them if scenery still uses them).
8. Update tests: asset audit knows the new files; a test that the manifest lists six boats that exist on
   disk, each ≤ 13k triangles, each with licence + author + url; boat mapping covers all six boat types.
   `npm test` and `npm run build` must pass.

## Rules
- No downloads, no Electron/electron-builder runs, no commits.
- `Graphics.autoTune`, `isWeakGpu`, `electron/main.cjs` behaviour stay as they are.
- Finish with an honest summary of what was done, verified, and not verified.
