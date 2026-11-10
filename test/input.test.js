import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../src/input.js";

test("keyboard layouts, analog triggers, signed axes, device-specific persistence and hot unplug", () => {
  const oldWindow = globalThis.window,
    oldStorage = globalThis.localStorage;
  const listeners = {},
    storage = new Map();
  let pads = [],
    dropped = "";
  globalThis.window = {
    addEventListener: (event, fn) => (listeners[event] = fn),
  };
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, v),
  };
  const oldPads = navigator.getGamepads;
  navigator.getGamepads = () => pads;
  try {
    const input = new Input((id) => (dropped = id)),
      [one, two] = input.devices;
    input.keys.add("KeyW");
    input.keys.add("ControlRight");
    assert.equal(input.read(one).throttle, 1);
    assert.equal(input.read(one).boost, false);
    assert.equal(input.read(two).throttle, 0);
    assert.equal(input.read(two).boost, true);
    pads = [
      {
        id: "Generic USB test",
        index: 0,
        axes: [0, 0, -1],
        buttons: Array.from({ length: 12 }, () => ({
          value: 0,
          pressed: false,
        })),
      },
    ];
    const pad = input.poll()[2];
    pads[0].buttons[7].value = 0.65;
    pads[0].axes[0] = 0.1;
    assert.equal(input.read(pad).throttle, 0.65);
    assert.equal(input.read(pad).steer, 0);
    pads[0].buttons[7].value = 0;
    input.startBind(pad, "throttle", () => {});
    input.poll();
    assert.ok(input.capture, "resting axis must not bind");
    pads[0].axes[2] = 1;
    input.poll();
    assert.equal(input.capture, null);
    assert.equal(input.read(pad).throttle, 1);
    pads[0].axes[2] = -1;
    assert.equal(input.read(pad).throttle, 0);
    input.startBind(pad, "left", () => {});
    pads[0].axes[0] = -0.9;
    input.poll();
    assert.ok(input.read(pad).steer < -0.8);
    assert.ok(storage.get("rr.bindings").includes("Generic USB test"));
    input.joined = [pad];
    listeners.gamepaddisconnected({ gamepad: pads[0] });
    assert.equal(dropped, pad.id);
  } finally {
    globalThis.window = oldWindow;
    globalThis.localStorage = oldStorage;
    if (oldPads) navigator.getGamepads = oldPads;
    else delete navigator.getGamepads;
  }
});
