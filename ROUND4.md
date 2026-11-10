# Riptide Rush — round 4: career mode + visual fixes

Round 3 was checked on screen (Intel HD 520, Low quality, 61 fps at full Low resolution — good, keep it).
`Graphics.autoTune` was rewritten outside your sandbox; leave its logic alone.

## A. Career mode (main feature — the owner asked for "levels like in Blur")
Add a **Career** mode as the first item on the main menu. Original design, no names from other games.
- A ladder of **5 tiers**, each with 5–6 events plus a final **rival showdown** (one-on-one or small-grid
  race against a named rival skipper with their own boat, colour, personality and a short taunt/intro
  card). Beating the rival unlocks the next tier and awards the rival's boat or a paint/upgrade.
- Event types (implement all, mix them across tiers):
  - **Race** (finish position targets),
  - **Time Trial** (bronze/silver/gold times),
  - **Elimination** (last place is knocked out every N seconds / each lap),
  - **Checkpoint Rush** (timer extends at checkpoints, go as far as you can),
  - **Boost Hunt** (collect N canisters before time runs out),
  - **Duel** (head-to-head).
- Each event has 3 objectives → up to 3 **stars**; stars gate later events and tiers. Also award
  **reputation points** for style during any career race: air time, near-misses with other boats, drifting,
  boosting chains, overtakes, clean laps; show small pop-ups as they are earned and total on results.
- **Unlocks**: start with 2 boats and 1 track. Unlock the other boats, tracks, paint colours and stat
  upgrades (engine / handling / boost tank, 3 levels each, applied per boat) through stars and reputation.
  Non-career modes only offer unlocked content, with a "Unlock everything for party play" toggle in
  settings so local/online multiplayer with friends is not blocked.
- Track variety from the three environments: **reverse direction**, lap counts, time of day / weather
  variant where cheap (e.g. sunset tropical, foggy arctic, rainy city via lighting/fog/HDRI exposure
  changes), AI difficulty and grid size scaling with tier, tougher rubber-band-free rivals later.
  Reverse must work properly: checkpoints, AI line, start grid, wrong-way detection, ramps (ramps that
  cannot be taken backwards become obstacles or are flipped).
- Career map screen: tier list, event cards with type icon, track, objectives, earned stars, lock state;
  totals for stars/reputation; garage screen for boat choice, paint and upgrades.
- Progress saved in localStorage (versioned key), with 3 save slots and a reset option.
- Fully navigable with keyboard and controller like the other menus.
- Keep the simulation rules for the new event types in `src/core/` so they are testable under Node, and add
  tests: every event type can be completed by AI-driven boats, elimination removes boats correctly,
  reverse laps count correctly on every track, star/unlock logic, save/load round-trip.

## B. Visual fixes seen on screen
1. **Spray/particles render as dark grey smudges** on the water instead of bright white spray. Fix the
   sprite material/blending/texture alpha so spray, rooster tails and splashes are bright and soft.
2. **Sunspill Atoll banks look like grey snow/rock.** It is a tropical track: warm sand beaches low near the
   water rising to rock; correct texture set and colour, and less flat (dunes, rocks, vegetation clusters).
3. **Boats look like plain toy blocks.** Staying with the allowed asset sources, make them read as racing
   powerboats: scale and proportion them properly, kit-bash added parts (outboard/inboard engines with
   exhausts, rear wing, windshield, air intakes, sponsons), racing livery (two-tone paint, stripes, large
   race numbers, sponsor-style original decals drawn to canvas textures), glossy clearcoat paint with HDRI
   reflections, glowing boost exhausts. Six clearly different silhouettes.
4. The castle-style towers on the tropical track look out of place next to palm trees — use set-pieces that
   fit a tropical resort/harbour theme (huts, piers, moored ships, lighthouse) from the kits.
5. Water: reduce the visible grid/stripe pattern in the detail normals at close range; add a visible wake
   V behind each boat.
6. The verify mode leaves "Loading the waterfront 100%" text in `#ui` after loading — make sure the loading
   overlay is fully removed in every mode.

## Rules
- Allowed asset sources are unchanged (kenney.nl, quaternius.com, polyhaven.com, CC0 only, data files
  only); update ASSETS.md for anything new.
- Low quality must stay within the round-3 draw-call/triangle budget.
- `npm test` and `npm run build` must pass. Do not download Electron, run electron-builder, or commit.
- Finish with an honest summary of what was done, verified, and not verified.
