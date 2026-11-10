export const TAU = Math.PI * 2;
export const TRACKS = [
  {
    name: "Sunspill Atoll",
    theme: "tropic",
    width: 38,
    seed: 1,
    sky: 0x80caff,
    water: 0x087d92,
    points: [[0,180],[160,180],[265,90],[250,-30],[145,-60],[235,-180],[70,-245],[-100,-220],[-205,-100],[-230,40],[-160,160],[-70,115]],
  },
  {
    name: "Aurora Narrows",
    theme: "ice",
    width: 33,
    seed: 2,
    sky: 0x25244d,
    water: 0x164b70,
    points: [[0,210],[130,180],[230,60],[160,-30],[215,-155],[60,-250],[-90,-210],[-100,-100],[-205,-50],[-220,95],[-130,175]],
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
export function makeTrack(index = 0, reverse = false) {
  const def = TRACKS[index % 3];
  const samples = [];
  const p = def.points.map(([x,z]) => [x*1.9,z*1.9]);
  const samplesPerSector = 80;
  for (let k = 0; k < p.length; k++)
    for (let j = 0; j < samplesPerSector; j++) {
      const t = j / samplesPerSector,
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
  if(reverse) samples.splice(1, samples.length-1, ...samples.slice(1).reverse());
  let length = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i],
      b = samples[(i + 1) % samples.length];
    a.width = def.width * (1 + 0.2*Math.sin(i/samples.length*Math.PI*6) + 0.08*Math.cos(i/samples.length*Math.PI*10));
    a.s = length;
    a.heading = Math.atan2(b.x - a.x, b.z - a.z);
    length += Math.hypot(b.x - a.x, b.z - a.z);
  }
  const pickups = samples
    .filter((_, i) => i % 32 === 16)
    .map((p, i) => ({ ...p, width: 2, large: i % 4 === 0, cooldown: 0 }));
  const ramps = [.14,.41,.68].map(f=>Math.floor(f*samples.length)).map((i) => ({ ...samples[i], index: i, length: 18, width: 11, height: 4 }));
  const shortcuts = [
    { a: samples[100], b: samples[205], width: 22 },
    { a: samples[380], b: samples[470], width: 22 },
  ];
  return {
    ...def,
    index, reverse,
    samples,
    length,
    checkpointCount: p.length,
    samplesPerSector,
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
