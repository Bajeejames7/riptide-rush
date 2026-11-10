export const ACTIONS = [
  "throttle",
  "brake",
  "left",
  "right",
  "boost",
  "hop",
  "drift",
  "reset",
  "pause",
  "camera",
];
export class Input {
  constructor(onDrop) {
    this.keys = new Set();
    this.maps = JSON.parse(localStorage.getItem("rr.bindings") || "{}");
    this.devices = [];
    this.onDrop = onDrop;
    this.capture = null;
    this.joined = [];
    this.lastButtons = new Map();
    this.menuCooldown = 0;
    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input,select")) return;
      e.preventDefault();
      this.keys.add(e.code);
      if (this.capture?.device.kind === "key") {
        this.bind({ kind: "key", code: e.code });
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    window.addEventListener("gamepaddisconnected", (e) => {
      if (
        this.joined.some((d) => d.kind === "pad" && d.index === e.gamepad.index)
      )
        onDrop(e.gamepad.id);
    });
    this.poll();
  }
  poll() {
    this.devices = [
      { kind: "key", id: "keyboard-1", name: "Keyboard WASD" },
      { kind: "key", id: "keyboard-2", name: "Keyboard Arrows" },
      ...Array.from(navigator.getGamepads?.() || [])
        .filter(Boolean)
        .map((g) => ({ kind: "pad", index: g.index, id: g.id, name: g.id })),
    ];
    if (this.capture?.device.kind === "pad") {
      const g = navigator.getGamepads()[this.capture.device.index],
        c = this.capture;
      if (g) {
        g.buttons.forEach((b, i) => {
          if (b.value < 0.3) c.buttons[i] = 0;
        });
        const button = g.buttons.findIndex(
          (b, i) => b.value > 0.6 && (c.buttons[i] || 0) < 0.3,
        );
        if (button >= 0) this.bind({ kind: "button", index: button });
        else {
          const axis = g.axes.findIndex(
            (a, i) => Math.abs(a - (c.axes[i] || 0)) > 0.65,
          );
          if (axis >= 0) {
            const rest = c.axes[axis] || 0;
            this.bind({
              kind: "axis",
              index: axis,
              sign: Math.sign(g.axes[axis] - rest),
              rest: Math.abs(rest) > 0.5 ? rest : 0,
            });
          }
        }
      }
    }
    return this.devices;
  }
  defaults(device) {
    if (device.kind === "key") {
      const keys =
        device.id === "keyboard-2"
          ? [
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "ControlRight",
              "ShiftRight",
              "Slash",
              "Backspace",
              "Escape",
              "Numpad0",
            ]
          : [
              "KeyW",
              "KeyS",
              "KeyA",
              "KeyD",
              "ShiftLeft",
              "Space",
              "KeyC",
              "KeyR",
              "Escape",
              "KeyV",
            ];
      return Object.fromEntries(
        ACTIONS.map((a, i) => [a, { kind: "key", code: keys[i] }]),
      );
    }
    return {
      throttle: { kind: "button", index: 7 },
      brake: { kind: "button", index: 6 },
      left: { kind: "axis", index: 0, sign: -1 },
      right: { kind: "axis", index: 0, sign: 1 },
      boost: { kind: "button", index: 0 },
      hop: { kind: "button", index: 1 },
      drift: { kind: "button", index: 4 },
      reset: { kind: "button", index: 3 },
      pause: { kind: "button", index: 9 },
      camera: { kind: "button", index: 2 },
    };
  }
  value(device, binding) {
    if (!binding) return 0;
    if (binding.kind === "key") return +this.keys.has(binding.code);
    const g = navigator.getGamepads?.()[device.index];
    if (!g) return 0;
    if (binding.kind === "button") return g.buttons[binding.index]?.value || 0;
    const rest = binding.rest || 0,
      v =
        (((g.axes[binding.index] || 0) - rest) * (binding.sign || 1)) /
        (Math.abs(rest) > 0.5 ? 2 : 1);
    return v > 0.18 ? Math.min(1, (v - 0.18) / 0.82) : 0;
  }
  read(device) {
    if (!device) return {};
    const map = this.maps[device.id] || this.defaults(device),
      raw = Object.fromEntries(
        ACTIONS.map((a) => [a, this.value(device, map[a])]),
      );
    return {
      ...raw,
      steer: raw.right - raw.left,
      boost: raw.boost > 0.4,
      hop: raw.hop > 0.4,
      reset: raw.reset > 0.4,
      pause: raw.pause > 0.4,
      drift: raw.drift > 0.4,
    };
  }
  pressedDevices() {
    this.poll();
    return this.devices.filter((d) =>
      d.kind === "key"
        ? (d.id === "keyboard-1"
            ? ["KeyW", "Space", "ShiftLeft"]
            : ["ArrowUp", "ControlRight", "ShiftRight"]
          ).some((k) => this.keys.has(k))
        : navigator.getGamepads()[d.index]?.buttons.some((b) => b.pressed),
    );
  }
  startBind(device, action, callback) {
    const g =
      device.kind === "pad" ? navigator.getGamepads()[device.index] : null;
    this.capture = {
      device,
      action,
      callback,
      axes: [...(g?.axes || [])],
      buttons: (g?.buttons || []).map((b) => b.value),
    };
    this.keys.clear();
  }
  bind(binding) {
    const c = this.capture;
    if (!c) return;
    this.maps[c.device.id] ??= this.defaults(c.device);
    this.maps[c.device.id][c.action] = binding;
    localStorage.setItem("rr.bindings", JSON.stringify(this.maps));
    this.capture = null;
    c.callback();
  }
  rumble(device, power = 0.3) {
    if (device?.kind === "pad")
      navigator
        .getGamepads()
        [device.index]?.vibrationActuator?.playEffect("dual-rumble", {
          duration: 120,
          strongMagnitude: power,
          weakMagnitude: power * 0.6,
        })
        .catch(() => {});
  }
  menu(dt) {
    if (this.capture) return;
    this.menuCooldown -= dt;
    const g = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    const device = this.devices.find(
      (d) => d.kind === "pad" && d.index === g?.index,
    );
    const mapped = device ? this.read(device) : {};
    const down =
      this.keys.has("ArrowDown") ||
      this.keys.has("KeyS") ||
      g?.buttons[13]?.pressed ||
      (mapped.brake || 0) > 0.65 ||
      (g?.axes[1] || 0) > 0.6;
    const up =
      this.keys.has("ArrowUp") ||
      this.keys.has("KeyW") ||
      g?.buttons[12]?.pressed ||
      (mapped.throttle || 0) > 0.65 ||
      (g?.axes[1] || 0) < -0.6;
    const left =
      this.keys.has("ArrowLeft") ||
      g?.buttons[14]?.pressed ||
      mapped.steer < -0.65;
    const right =
      this.keys.has("ArrowRight") ||
      g?.buttons[15]?.pressed ||
      mapped.steer > 0.65;
    const go = this.keys.has("Enter") || g?.buttons[0]?.pressed || mapped.boost;
    const back =
      this.keys.has("Escape") || g?.buttons[1]?.pressed || mapped.hop;
    if (this.menuCooldown > 0) return;
    const els = [
      ...document.querySelectorAll(
        "#ui button:not(:disabled),#ui select:not(:disabled),#ui input:not(:disabled)",
      ),
    ];
    if (!els.length) return;
    const focused = document.activeElement;
    let i = els.indexOf(focused);
    if (down || up) {
      i = (i + (up ? -1 : 1) + els.length) % els.length;
      els[i].focus();
      this.menuCooldown = 0.2;
    } else if (left || right) {
      if (focused?.tagName === "SELECT") {
        const direction=left?-1:1;
        let next=focused.selectedIndex+direction;
        while(next>=0&&next<focused.options.length&&focused.options[next].disabled)next+=direction;
        if(next>=0&&next<focused.options.length){focused.selectedIndex=next;focused.dispatchEvent(new Event("change"));}
      } else if (focused?.type === "range") {
        focused.value =
          +focused.value + (left ? -1 : 1) * Number(focused.step || 1);
        focused.dispatchEvent(new Event("input"));
      }
      this.menuCooldown = 0.2;
    } else if (go) {
      els[i < 0 ? 0 : i].click();
      this.menuCooldown = 0.3;
    } else if (back) {
      document.querySelector("#ui [data-back]")?.click();
      this.menuCooldown = 0.3;
    }
  }
}
