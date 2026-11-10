import { nearest, onShortcut } from "./tracks.js";
export const BOATS = [
  { name: "Kestrel", speed: 65, accel: 27, handling: 2.0, boost: 1.42 },
  { name: "Manta Ray", speed: 61, accel: 31, handling: 2.3, boost: 1.45 },
  { name: "Ironwake", speed: 72, accel: 21, handling: 1.7, boost: 1.38 },
  { name: "Needlefin", speed: 68, accel: 25, handling: 2.4, boost: 1.36 },
  { name: "Twin Comet", speed: 70, accel: 24, handling: 1.9, boost: 1.5 },
  { name: "Stormglass", speed: 63, accel: 30, handling: 2.1, boost: 1.55 },
];
export const WAVES = [
  [0.55, 0.045, 1, 0.4, 1.25],
  [0.28, 0.085, -0.6, 1, 1.7],
  [0.15, 0.16, 0.8, -0.5, 2.1],
];
export function wave(x, z, t) {
  let h = 0,
    nx = 0,
    nz = 0;
  for (const [a, k, dx, dz, s] of WAVES) {
    const q = k * (dx * x + dz * z) - s * t;
    h += a * Math.sin(q);
    nx += a * k * dx * Math.cos(q);
    nz += a * k * dz * Math.cos(q);
  }
  return { height: h, nx, nz };
}
export const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function createBoat(track, i = 0, type = i % 6) {
  const p = track.samples[0],
    side = ((i % 2) - 0.5) * 8,
    back = Math.floor(i / 2) * 9;
  return {
    id: String(i),
    name: i ? "Rival " + i : "You",
    type,
    color: [
      "#ff633a",
      "#39e7e2",
      "#b79aff",
      "#ffd552",
      "#66e882",
      "#ef69cd",
      "#65abff",
      "#ffffff",
    ][i % 8],
    x: p.x + Math.cos(p.heading) * side - Math.sin(p.heading) * back,
    z: p.z - Math.sin(p.heading) * side - Math.cos(p.heading) * back,
    y: 1,
    heading: p.heading,
    pitch: 0,
    roll: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    speed: 0,
    boost: 65,
    lap: 0,
    checkpoint: 0,
    progress: 0,
    lapStart: 0,
    bestLap: Infinity,
    lapTimes: [],
    finished: false,
    finishTime: 0,
    air: false,
    hopLatch: false,
    stuck: 0,
    resetCooldown: 0,
    resetSerial: 0,
    events: [],
  };
}
export function resetBoat(b, track) {
  const p =
    track.samples[Math.min(track.samples.length - 1, b.checkpoint * 80)];
  Object.assign(b, {
    x: p.x,
    z: p.z,
    y: 2,
    heading: p.heading,
    vx: 0,
    vz: 0,
    vy: 0,
    speed: 0,
    stuck: 0,
  });
  b.resetSerial = (b.resetSerial || 0) + 1;
}
export function stepBoat(b, input, track, dt, time, laps = 3) {
  b.events = [];
  if (b.finished) input = { throttle: 0.2 };
  const spec = BOATS[b.type],
    n = nearest(track, b.x, b.z),
    w = wave(b.x, b.z, time);
  b.wrongWay =
    Math.cos(angle(b.heading - n.point.heading)) < -0.45 &&
    Math.abs(b.speed) > 8;
  b.resetCooldown = Math.max(0, b.resetCooldown - dt);
  if (input.reset && b.resetCooldown === 0) {
    resetBoat(b, track);
    b.resetCooldown = 1;
  }
  b.boosting = !!input.boost && b.boost > 0 && input.throttle > 0;
  if (b.boosting) b.boost = Math.max(0, b.boost - 21 * dt);
  if (input.hop && !b.hopLatch && b.boost >= 12 && !b.air) {
    b.vy = 10;
    b.boost -= 12;
    b.air = true;
  }
  b.hopLatch = !!input.hop;
  const throttle = input.throttle || 0,
    brake = input.brake || 0,
    steer = input.steer || 0;
  const target =
    (throttle - brake * 0.36) * spec.speed * (b.boosting ? spec.boost : 1);
  b.speed +=
    (target - b.speed) *
    Math.min(1, dt * (throttle || brake ? spec.accel / spec.speed : 1.0));
  b.heading +=
    steer *
    spec.handling *
    dt *
    Math.min(1, Math.abs(b.speed) / 15) *
    (b.speed < 0 ? -1 : 1) *
    (b.air ? 0.45 : 1);
  const grip = 1 - Math.exp(-dt * (input.drift ? 2.1 : 5.5));
  b.vx += (Math.sin(b.heading) * b.speed - b.vx) * grip;
  b.vz += (Math.cos(b.heading) * b.speed - b.vz) * grip;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.vy -= 24 * dt;
  b.y += b.vy * dt;
  const floor = w.height + 0.75;
  if (b.y < floor) {
    if (b.air) {
      b.events.push("land");
      b.air = false;
    }
    b.y = floor;
    b.vy = 0;
  }
  b.pitch = b.air
    ? -Math.atan2(b.vy, Math.max(15, b.speed))
    : -w.nz * Math.cos(b.heading) - w.nx * Math.sin(b.heading);
  b.roll = -steer * b.speed * 0.003 + w.nx * 0.7;
  for (const r of track.ramps)
    if (Math.hypot(b.x - r.x, b.z - r.z) < 6 && !b.air && b.speed > 25) {
      b.vy = 13 + b.speed * 0.045;
      b.air = true;
      b.events.push("ramp");
    }
  if (n.distance > track.width * 0.5 && !onShortcut(track, b.x, b.z)) {
    const dx = b.x - n.point.x,
      dz = b.z - n.point.z,
      len = Math.hypot(dx, dz);
    b.x = n.point.x + (dx / len) * track.width * 0.5;
    b.z = n.point.z + (dz / len) * track.width * 0.5;
    b.vx -= (dx / len) * 18;
    b.vz -= (dz / len) * 18;
    b.speed *= 0.96;
    if (n.distance > 90) resetBoat(b, track);
  }
  for (const o of track.obstacles) {
    const dx = b.x - o.x,
      dz = b.z - o.z,
      d = Math.hypot(dx, dz);
    if (d < o.radius + 2) {
      b.x += (dx / (d || 1)) * 2;
      b.z += (dz / (d || 1)) * 2;
      b.speed *= 0.95;
      b.events.push("bump");
    }
  }
  for (const p of track.pickups)
    if (p.cooldown <= 0 && Math.hypot(b.x - p.x, b.z - p.z) < 5) {
      b.boost = Math.min(100, b.boost + (p.large ? 42 : 22));
      p.cooldown = 7;
      b.events.push("pickup");
    }
  const cp = Math.floor(n.index / 80);
  if (cp === (b.checkpoint + 1) % 8) {
    if (cp === 0) {
      const lt = time - b.lapStart;
      b.lapTimes.push(lt);
      b.bestLap = Math.min(b.bestLap, lt);
      b.lapStart = time;
      b.lap++;
      b.events.push("lap");
      if (b.lap >= laps && !b.finished) {
        b.finished = true;
        b.finishTime = time;
      }
    }
    b.checkpoint = cp;
  }
  b.progress = b.lap * track.length + n.point.s;
  b.stuck = Math.abs(b.speed) < 2 ? b.stuck + dt : 0;
  if (b.stuck > 8) resetBoat(b, track);
}
export function stepWorld(boats, track, dt, time, laps, inputs) {
  for (const p of track.pickups) p.cooldown = Math.max(0, p.cooldown - dt);
  boats.forEach((b, i) => stepBoat(b, inputs[i] || {}, track, dt, time, laps));
  collideBoats(boats);
  const order = [...boats].sort((a, b) =>
    a.finished && b.finished
      ? a.finishTime - b.finishTime
      : a.finished
        ? -1
        : b.finished
          ? 1
          : b.progress - a.progress,
  );
  order.forEach((b, i) => (b.position = i + 1));
}
export function collideBoats(boats) {
  for (let i = 0; i < boats.length; i++)
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i],
        b = boats[j],
        dx = a.x - b.x,
        dz = a.z - b.z,
        d = Math.hypot(dx, dz);
      if (d < 4 && d > 0.01 && Math.abs(a.y - b.y) < 3) {
        const push = (4 - d) * 0.5;
        a.x += (dx / d) * push;
        a.z += (dz / d) * push;
        b.x -= (dx / d) * push;
        b.z -= (dz / d) * push;
        a.vx += (dx / d) * 1.5;
        a.vz += (dz / d) * 1.5;
        b.vx -= (dx / d) * 1.5;
        b.vz -= (dz / d) * 1.5;
      }
    }
}
