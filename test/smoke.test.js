import test from "node:test";
import assert from "node:assert/strict";
import { makeTrack } from "../src/core/tracks.js";
import { createBoat, stepWorld, wave } from "../src/core/physics.js";
import { aiInput } from "../src/core/ai.js";
import { encode, decode, validState } from "../src/core/protocol.js";
import { WebSocket } from "ws";
import server from "../electron/server.cjs";
test("all tracks: eight boat simulation, ordered checkpoints, complete laps, finite waves", () => {
  for (let t = 0; t < 3; t++) {
    const track = makeTrack(t),
      boats = Array.from({ length: 8 }, (_, i) => createBoat(track, i));
    for (let frame = 0; frame < 60 * 200; frame++) {
      const time = frame / 60;
      stepWorld(
        boats,
        track,
        1 / 60,
        time,
        3,
        boats.map((b) => aiInput(b, track, 2, boats[0].progress)),
      );
      for (const b of boats) {
        assert.ok(validState(b));
        assert.ok(Number.isFinite(b.y));
      }
    }
    assert.ok(
      boats.every((b) => b.finished && b.lap >= 3),
      `AI must finish ${track.name}`,
    );
    assert.ok(boats.every((b) => b.checkpoint >= 0 && b.checkpoint < track.checkpointCount));
    assert.ok(Number.isFinite(wave(12, 25, 30).height));
  }
});
test("protocol rejects malformed and incompatible packets", () => {
  assert.deepEqual(decode(encode("hello", { n: 4 })), {
    v: 1,
    type: "hello",
    n: 4,
  });
  assert.throws(() => decode("{"));
  assert.throws(() => decode('{"v":2,"type":"state"}'));
  assert.equal(validState({}), false);
});
test("WebSocket loopback: join, ready, host start, authoritative snapshots", async () => {
  const host = await server.hostGame(0);
  const a = new WebSocket("ws://127.0.0.1:" + host.port),
    b = new WebSocket("ws://127.0.0.1:" + host.port);
  const queues = new Map([
    [a, []],
    [b, []],
  ]);
  for (const ws of [a, b])
    ws.on("message", (raw) => queues.get(ws).push(decode(raw)));
  async function wait(ws, type) {
    const end = Date.now() + 5000;
    while (Date.now() < end) {
      const q = queues.get(ws),
        i = q.findIndex((m) => m.type === type);
      if (i >= 0) return q.splice(i, 1)[0];
      await new Promise((r) => setTimeout(r, 10));
    }
    throw Error("Timeout: " + type);
  }
  try {
    await Promise.all([
      new Promise((r) => a.once("open", r)),
      new Promise((r) => b.once("open", r)),
    ]);
    const welcome = await wait(a, "welcome");
    assert.ok(welcome.id);
    a.send(
      encode("join", {
        players: [{ name: "Loop A", type: 0, color: "#ff0000" }],
      }),
    );
    b.send(
      encode("join", {
        players: [{ name: "Loop B", type: 1, color: "#00ffff" }],
      }),
    );
    a.send(
      encode("config", { config: { track: 1, laps: 1, ai: 2, difficulty: 1 } }),
    );
    a.send(encode("ready", { ready: true }));
    b.send(encode("ready", { ready: true }));
    await new Promise((r) => setTimeout(r, 100));
    a.send(encode("start"));
    const start = await wait(b, "start");
    assert.equal(start.boats.length, 4);
    assert.equal(start.config.track, 1);
    const snap = await wait(b, "snapshot");
    assert.ok(snap.time < 0);
    assert.equal(snap.boats.length, 4);
    assert.equal(snap.boats[0].bestLap, Infinity);
    a.send(encode("state", { boats: [{ id: welcome.id + ":0", x: 1e9 }] }));
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(
      (await wait(b, "snapshot")).boats.every((b) => Math.abs(b.x) < 1000),
    );
    let live = await wait(b, "snapshot");
    while (live.time < 0) live = await wait(b, "snapshot");
    const local = live.boats.find((boat) => boat.id === welcome.id + ":0");
    a.send(
      encode("state", {
        boats: [{ ...local, lap: 999, finished: true, finishTime: 0.01 }],
      }),
    );
    await new Promise((r) => setTimeout(r, 80));
    const authoritative = (await wait(b, "snapshot")).boats.find(
      (boat) => boat.id === local.id,
    );
    assert.equal(
      authoritative.lap,
      0,
      "host must ignore client lap and finish claims",
    );
    assert.equal(authoritative.finished, false);
    b.close();
    await new Promise((r) => setTimeout(r, 100));
    queues.get(a).length = 0;
    const disconnected = await wait(a, "snapshot");
    assert.ok(
      disconnected.boats.find((boat) => boat.name.startsWith("Loop B")).ai,
      "disconnected player must become AI",
    );
  } finally {
    a.close();
    b.close();
    await host.close();
  }
});
