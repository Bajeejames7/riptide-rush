export const TAU = Math.PI * 2;
export const TRACKS = [
  {
    name: "Sunspill Atoll",
    theme: "tropic",
    width: 38,
    seed: 1,
    sky: 0x80caff,
    water: 0x087d92,
    points: [
      [0, 180],
      [160, 160],
      [235, 40],
      [170, -150],
      [0, -210],
      [-180, -130],
      [-220, 40],
      [-130, 170],
    ],
  },
  {
    name: "Aurora Narrows",
    theme: "ice",
    width: 33,
    seed: 2,
    sky: 0x25244d,
    water: 0x164b70,
    points: [
      [0, 210],
      [120, 160],
      [200, 30],
      [130, -110],
      [30, -240],
      [-140, -170],
      [-210, -30],
      [-160, 140],
    ],
  },
  {
    name: "Voltage Basin",
    theme: "city",
    width: 32,
    seed: 3,
    sky: 0x050b23,
    water: 0x102c50,
    points: [
      [0, 200],
      [180, 200],
      [210, 40],
      [130, -40],
      [190, -180],
      [-40, -220],
      [-190, -100],
      [-180, 130],
    ],
  },
];
export function makeTrack(index = 0) {
  const def = TRACKS[index % 3];
  const samples = [];
  const p = def.points;
  for (let k = 0; k < p.length; k++)
    for (let j = 0; j < 80; j++) {
      const t = j / 80,
        a = p[(k + p.length - 1) % p.length],
        b = p[k],
        c = p[(k + 1) % p.length],
        d = p[(k + 2) % p.length];
      const f = (i) =>
        0.5 *
        (2 * b[i] +
          (-a[i] + c[i]) * t +
          (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t * t +
          (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t * t * t);
      samples.push({ x: f(0), z: f(1) });
    }
  let length = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i],
      b = samples[(i + 1) % samples.length];
    a.s = length;
    a.heading = Math.atan2(b.x - a.x, b.z - a.z);
    length += Math.hypot(b.x - a.x, b.z - a.z);
  }
  const pickups = samples
    .filter((_, i) => i % 32 === 16)
    .map((p, i) => ({ ...p, large: i % 4 === 0, cooldown: 0 }));
  const ramps = [90, 260, 430].map((i) => ({ ...samples[i], index: i }));
  const shortcuts = [
    { a: samples[100], b: samples[205] },
    { a: samples[380], b: samples[470] },
  ];
  return {
    ...def,
    index,
    samples,
    length,
    pickups,
    ramps,
    shortcuts,
    obstacles: [
      { ...samples[180], radius: 3 },
      { ...samples[360], radius: 3 },
    ],
  };
}
export function nearest(track, x, z) {
  let best = Infinity,
    result = 0;
  for (let i = 0; i < track.samples.length; i++) {
    const p = track.samples[i],
      d = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d < best) {
      best = d;
      result = i;
    }
  }
  return {
    index: result,
    distance: Math.sqrt(best),
    point: track.samples[result],
  };
}
export function onShortcut(track, x, z) {
  return track.shortcuts.some(({ a, b }) => {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
      );
    return Math.hypot(x - a.x - t * dx, z - a.z - t * dz) < 12;
  });
}
