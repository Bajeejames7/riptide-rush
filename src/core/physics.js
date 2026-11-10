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
  [0.09, 0.27, -0.92, -0.38, 2.6],
  [0.045, 0.43, 0.31, 0.95, 3.1],
  [0.025, 0.67, -0.72, 0.69, 3.8],
];
export const WAVE_STEEPNESS = 0.25;
// Invert the horizontal Gerstner displacement so buoyancy samples world space,
// exactly where the GPU places the surface, rather than undisplaced grid space.
export function wave(x,z,t) {
 let u=x,v=z;
 for(let iteration=0;iteration<5;iteration++) {
  let dx=0,dz=0;
  for(const [a,k,sx,sz,speed] of WAVES){const q=k*(sx*u+sz*v)-speed*t;dx+=WAVE_STEEPNESS*a*sx*Math.cos(q);dz+=WAVE_STEEPNESS*a*sz*Math.cos(q);}
  u=x-dx;v=z-dz;
 }
 let h=0,hx=0,hz=0,jxx=1,jxz=0,jzz=1;
 for(const [a,k,dx,dz,s] of WAVES){
  const q=k*(dx*u+dz*v)-s*t,cos=Math.cos(q),sin=Math.sin(q);
  h+=a*sin;hx+=a*k*dx*cos;hz+=a*k*dz*cos;
  const d=-WAVE_STEEPNESS*a*k*sin;jxx+=d*dx*dx;jxz+=d*dx*dz;jzz+=d*dz*dz;
 }
 const determinant=jxx*jzz-jxz*jxz;
 return {height:h,nx:(hx*jzz-hz*jxz)/determinant,nz:(hz*jxx-hx*jxz)/determinant};
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
    track.samples[Math.min(track.samples.length - 1, b.checkpoint * track.samplesPerSector)];
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
  if(input.camera && !b.cameraLatch)b.cameraView=!b.cameraView;
  b.cameraLatch=!!input.camera;
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
    Math.min(1, dt * (throttle || brake ? spec.accel / spec.speed * (1-[.03,.01,.08,0,.1,.02][b.type]) : [1.1,.85,1.25,.95,1.4,.8][b.type]));
  b.heading +=
    steer *
    spec.handling *
    dt *
    Math.min(1, Math.abs(b.speed) / 15) *
    (b.speed < 0 ? -1 : 1) *
    (b.air ? 0.45 : 1);
  b.drifting=!!input.drift;
  const grip = 1 - Math.exp(-dt * (input.drift ? 2.1 : 5.5));
  b.vx += (Math.sin(b.heading) * b.speed - b.vx) * grip;
  b.vz += (Math.cos(b.heading) * b.speed - b.vz) * grip;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.vy -= 24 * dt;
  b.y += b.vy * dt;
  let floor = wave(b.x,b.z,time).height + 0.75;
  let rampLaunch=0;
  for (const r of track.ramps) {
    const dx=b.x-r.x,dz=b.z-r.z;
    const along=dx*Math.sin(r.heading)+dz*Math.cos(r.heading);
    const side=dx*Math.cos(r.heading)-dz*Math.sin(r.heading);
    if(Math.abs(side)<r.width/2 && along>=-r.length/2 && along<=r.length/2) {
      floor=Math.max(floor,0.75+(along/r.length+0.5)*r.height);
      if(!b.air && b.speed>25 && along>r.length/2-2) {
        rampLaunch=b.speed*r.height/r.length+5;
      }
    }
  }
  if (b.y < floor) {
    if (b.air) {
      if(b.vy < -8)b.speed*=.94;
      b.landSerial=(b.landSerial||0)+1;
      b.events.push("land");
      b.air = false;
    }
    b.y = floor;
    b.vy = 0;
  }
  if(rampLaunch){b.vy=rampLaunch;b.air=true;b.events.push("ramp");}
  b.pitch = b.air
    ? -Math.atan2(b.vy, Math.max(15, b.speed))
    : -w.nz * Math.cos(b.heading) - w.nx * Math.sin(b.heading) - Math.min(.13,b.speed*.0015) + Math.sin(time*6+b.type)*b.speed*.00035;
  b.roll = -steer * b.speed * 0.003 + w.nx * 0.7;
  if (n.distance > n.point.width * 0.5 && !onShortcut(track, b.x, b.z)) {
    const dx = b.x - n.point.x,
      dz = b.z - n.point.z,
      len = Math.hypot(dx, dz);
    b.x = n.point.x + (dx / len) * n.point.width * 0.5;
    b.z = n.point.z + (dz / len) * n.point.width * 0.5;
    const outward = Math.max(0,(b.vx*dx+b.vz*dz)/len);
    b.vx -= (dx / len) * outward*1.25;
    b.vz -= (dz / len) * outward*1.25;
    b.heading += angle(n.point.heading-b.heading)*0.12;
    b.events.push("scrape");
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
  const cp = Math.floor(n.index / track.samplesPerSector);
  if (cp === (b.checkpoint + 1) % track.checkpointCount) {
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
