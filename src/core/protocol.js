export const VERSION = 1;
export function encode(type, payload = {}) {
  return JSON.stringify({ v: VERSION, type, ...payload });
}
export function decode(raw) {
  const m = JSON.parse(String(raw), (k, v) =>
    k === "bestLap" && v === null ? Infinity : v,
  );
  if (m.v !== VERSION || typeof m.type !== "string")
    throw Error("Incompatible protocol");
  return m;
}
export function validState(s) {
  return (
    s &&
    ["x", "z", "y", "heading", "speed", "vx", "vz", "vy", "boost"].every((k) =>
      Number.isFinite(s[k]),
    ) &&
    Math.abs(s.x) < 10000 &&
    Math.abs(s.z) < 10000 &&
    Math.abs(s.speed) < 150
  );
}
