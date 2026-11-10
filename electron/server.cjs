const { WebSocketServer } = require("ws");
const dgram = require("node:dgram");
const os = require("node:os");
const addresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a.family === "IPv4" && !a.internal)
    .map((a) => a.address);
async function hostGame(port = 27015) {
  const { decode, encode, validState } =
    await import("../src/core/protocol.js");
  const { makeTrack, nearest } = await import("../src/core/tracks.js");
  const { createBoat, stepWorld, collideBoats } =
    await import("../src/core/physics.js");
  const { aiInput } = await import("../src/core/ai.js");
  const server = new WebSocketServer({
    port,
    host: "0.0.0.0",
    maxPayload: 32768,
  });
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  let next = 1,
    config = { track: 0, laps: 3, ai: 3, difficulty: 1 },
    running = false,
    track = null,
    boats = [],
    elapsed = -3,
    owner = null;
  const clients = new Map();
  const send = (ws, type, payload) => {
    if (ws.readyState === 1) ws.send(encode(type, payload));
  };
  const broadcast = (type, payload) => {
    for (const ws of clients.keys()) send(ws, type, payload);
  };
  const lobby = () =>
    broadcast("lobby", {
      config,
      players: [...clients.values()].flatMap((c) =>
        c.players.map((p) => ({ ...p, ready: c.ready })),
      ),
      owner,
    });
  server.on("connection", (ws) => {
    const id = String(next++);
    if (running || clients.size >= 8) {
      ws.close(1008, "Race running or lobby full");
      return;
    }
    clients.set(ws, { id, players: [], ready: false });
    owner ??= id;
    send(ws, "welcome", { id, owner });
    ws.on("message", (raw) => {
      try {
        const m = decode(raw),
          c = clients.get(ws);
        if (m.type === "join" && !running) {
          c.ready = false;
          const others = [...clients.values()].reduce(
            (n, x) => n + (x === c ? 0 : x.players.length),
            0,
          );
          c.players = (m.players || [])
            .slice(0, Math.min(4, 8 - others))
            .map((p, i) => ({
              id: id + ":" + i,
              name: String(p.name || "Skipper").slice(0, 24),
              type: Math.max(0, Math.min(5, Math.floor(p.type || 0))),
              color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#39e7e2",
              client: id,
            }));
          lobby();
        }
        if (m.type === "ready") {
          c.ready = !!m.ready;
          lobby();
        }
        if (m.type === "config" && c.id === owner && !running) {
          config = {
            track: Math.max(0, Math.min(2, m.config.track | 0)),
            laps: Math.max(1, Math.min(9, m.config.laps | 0)),
            ai: Math.max(0, Math.min(7, m.config.ai | 0)),
            difficulty: Math.max(0, Math.min(2, m.config.difficulty | 0)),
          };
          lobby();
        }
        if (m.type === "start" && c.id === owner && !running) {
          const humans = [...clients.values()].flatMap((c) => c.players);
          if (!humans.length || [...clients.values()].some((c) => !c.ready))
            return;
          track = makeTrack(config.track);
          boats = humans.map((p, i) =>
            Object.assign(createBoat(track, i, p.type), p, { remote: true }),
          );
          for (let i = 0; i < Math.min(config.ai, 8 - humans.length); i++) {
            const b = createBoat(track, boats.length);
            b.ai = true;
            boats.push(b);
          }
          running = true;
          elapsed = -3;
          broadcast("start", { config, boats });
        }
        if (m.type === "state" && running && elapsed >= 0) {
          for (const s of (m.boats || []).slice(0, 4)) {
            const b = boats.find((b) => b.id === s.id && b.client === c.id);
            if (!b || b.finished || !validState(s)) continue;
            const distance = Math.hypot(s.x - b.x, s.z - b.z);
            const checkpoint = track.samples[b.checkpoint * 80];
            const reset =
              Number.isInteger(s.resetSerial) &&
              s.resetSerial > b.resetSerial &&
              Math.hypot(s.x - checkpoint.x, s.z - checkpoint.z) < 8;
            if (distance > 18 && !reset) continue;
            if (reset) b.resetSerial = s.resetSerial;
            for (const k of [
              "x",
              "z",
              "y",
              "heading",
              "speed",
              "vx",
              "vz",
              "vy",
              "boost",
              "pitch",
              "roll",
              "air",
              "boosting",
            ])
              if (s[k] !== undefined) b[k] = s[k];
            const n = nearest(track, b.x, b.z),
              cp = Math.floor(n.index / 80);
            if (cp === (b.checkpoint + 1) % 8) {
              if (cp === 0) {
                b.lap++;
                const lap = elapsed - b.lapStart;
                b.lapTimes.push(lap);
                b.bestLap = Math.min(b.bestLap, lap);
                b.lapStart = elapsed;
                if (b.lap >= config.laps) {
                  b.finished = true;
                  b.finishTime = elapsed;
                }
              }
              b.checkpoint = cp;
            }
            b.progress = b.lap * track.length + n.point.s;
          }
        }
      } catch {
        send(ws, "error", { message: "Invalid network message" });
      }
    });
    ws.on("close", () => {
      const c = clients.get(ws);
      clients.delete(ws);
      if (c) {
        for (const b of boats)
          if (b.client === c.id) {
            b.ai = true;
            b.remote = false;
            b.name += " (AI)";
          }
        if (owner === c.id) owner = [...clients.values()][0]?.id || null;
        broadcast("notice", {
          message: "A skipper disconnected; AI takes the helm.",
        });
        lobby();
      }
    });
    ws.on("error", () => {});
  });
  let last = Date.now();
  const tick = setInterval(() => {
    const now = Date.now(),
      dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!running) return;
    elapsed += dt;
    if (elapsed >= 0) {
      const ai = boats.filter((b) => b.ai);
      stepWorld(
        ai,
        track,
        dt,
        elapsed,
        config.laps,
        ai.map((b) =>
          aiInput(
            b,
            track,
            config.difficulty,
            Math.max(...boats.map((x) => x.progress)),
            boats,
          ),
        ),
      );
      collideBoats(boats);
    }
    [...boats]
      .sort((a, b) =>
        a.finished && b.finished
          ? a.finishTime - b.finishTime
          : b.progress - a.progress,
      )
      .forEach((b, i) => (b.position = i + 1));
    broadcast("snapshot", { boats, time: elapsed });
  }, 40);
  const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
  udp.on("error", () => {});
  udp.on("message", (buf, rinfo) => {
    if (buf.toString() === "RIPTIDE_DISCOVER_V1")
      udp.send(
        JSON.stringify({
          game: "Riptide Rush",
          port,
          name: os.hostname(),
          players: [...clients.values()].reduce(
            (n, c) => n + c.players.length,
            0,
          ),
          running,
        }),
        rinfo.port,
        rinfo.address,
      );
  });
  udp.bind(27016, () => udp.setBroadcast(true));
  return {
    port: server.address().port,
    addresses: addresses(),
    close: async () => {
      clearInterval(tick);
      try {
        udp.close();
      } catch {}
      for (const ws of clients.keys()) ws.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
function discover() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4"),
      found = new Map();
    socket.on("error", () => {});
    socket.on("message", (buf, r) => {
      try {
        const game = JSON.parse(buf);
        if (game.game === "Riptide Rush")
          found.set(r.address + ":" + game.port, { ...game, ip: r.address });
      } catch {}
    });
    socket.bind(0, () => {
      socket.setBroadcast(true);
      socket.send("RIPTIDE_DISCOVER_V1", 27016, "255.255.255.255");
      socket.send("RIPTIDE_DISCOVER_V1", 27016, "127.0.0.1");
    });
    setTimeout(() => {
      socket.close();
      resolve([...found.values()]);
    }, 1200);
  });
}
module.exports = { hostGame, discover, addresses };
