import { nearest } from "./tracks.js";
import { angle } from "./physics.js";
export function aiInput(b, track, difficulty = 1, leader = 0) {
  const n = nearest(track, b.x, b.z),
    look =
      track.samples[
        (n.index + 14 + Math.floor(Math.abs(b.speed) * 0.16)) %
          track.samples.length
      ];
  const delta = angle(Math.atan2(look.x - b.x, look.z - b.z) - b.heading);
  return {
    throttle:
      Math.max(0.5, 1 - Math.abs(delta) * 0.23) *
      [0.78, 0.91, 1][difficulty] *
      (leader - b.progress > 100 ? 1.04 : 1),
    steer: Math.max(-1, Math.min(1, delta * 2.6)),
    boost: Math.abs(delta) < 0.2 && b.boost > 18,
    hop: false,
  };
}
