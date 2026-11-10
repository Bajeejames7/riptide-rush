import "./style.css";
import { Graphics } from "./render.js";
import { Input, ACTIONS } from "./input.js";
import { Audio } from "./audio.js";
import { TRACKS, makeTrack } from "./core/tracks.js";
import {
  BOATS,
  createBoat,
  stepWorld,
  stepBoat,
  collideBoats,
  angle,
} from "./core/physics.js";
import { aiInput } from "./core/ai.js";
import { encode, decode } from "./core/protocol.js";
const $ = (s) => document.querySelector(s),
  ui = $("#ui"),
  hud = $("#hud");
const settings = Object.assign(
  { quality: 2, scale: 1, master: 0.7, music: 0.35, sfx: 0.8, difficulty: 1 },
  JSON.parse(localStorage.getItem("rr.settings") || "{}"),
);
const records = JSON.parse(localStorage.getItem("rr.records") || "{}");
const config = { track: 0, laps: 3, ai: 7, difficulty: settings.difficulty };
let screen = "home",
  mode = "Single Race",
  track = makeTrack(0),
  boats = [],
  locals = [],
  time = -3,
  paused = false,
  accumulator = 0,
  last = performance.now(),
  countSound = 4,
  resultsShown = false,
  championship = null,
  online = null,
  sendClock = 0,
  joinLatch = new Set(),
  toastTimer;
let choices = [
  { name: "Skipper 1", type: 0, color: "#ff633a" },
  { name: "Skipper 2", type: 1, color: "#39e7e2" },
  { name: "Skipper 3", type: 2, color: "#b79aff" },
  { name: "Skipper 4", type: 3, color: "#ffd552" },
];
const input = new Input((id) => {
    if (screen === "race") {
      pause("Controller disconnected: " + id.slice(0, 45));
    }
  }),
  audio = new Audio(settings);
let graphics;
try {
  graphics = new Graphics($("#game"), settings);
  if (!localStorage.getItem("rr.settings") && graphics.isWeakGpu()) {
    settings.quality = 0;
    graphics.resize();
  }
  graphics.load(track);
} catch (e) {
  ui.innerHTML =
    '<div class="panel"><h2>Graphics could not start</h2><p>' +
    escapeHtml(e.message) +
    "</p><p>Riptide Rush requires a WebGL 2 capable graphics driver.</p></div>";
  throw e;
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function clock(t) {
  if (!Number.isFinite(t)) return "—";
  return (
    Math.floor(Math.max(0, t) / 60) +
    ":" +
    (Math.max(0, t) % 60).toFixed(2).padStart(5, "0")
  );
}
function save() {
  localStorage.setItem("rr.settings", JSON.stringify(settings));
}
function toast(text) {
  $(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4000);
}
function page(title, body, wide = false) {
  ui.classList.remove("hidden");
  ui.innerHTML = `<section class="panel ${wide ? "wide" : ""}"><div class="eyebrow">RIPTIDE RUSH / ORIGINAL ARCADE RACING</div><h2>${title}</h2>${body}</section>`;
  setTimeout(() => ui.querySelector("button")?.focus(), 40);
}
function button(id, text, primary = false, back = false) {
  return `<button id="${id}" class="${primary ? "primary" : ""}" ${back ? "data-back" : ""}>${text}</button>`;
}
function on(id, fn) {
  $("#" + id)?.addEventListener("click", () => {
    audio.start();
    audio.event("ui");
    input.keys.clear();
    fn();
  });
}
function home() {
  screen = "home";
  paused = false;
  hud.innerHTML = "";
  if (online) {
    online.ws?.close();
    online = null;
    window.desktop?.stopHost();
  }
  page(
    "",
    `<div class="tag">FULL THROTTLE. OPEN WATER.</div><h1>RIPTIDE<br><span>RUSH</span></h1><p class="subtitle">Chase the horizon. Carve through sunlit islands, frozen canyons and an electric city after dark.</p><div class="menu">${button("single", "Single Race", true)}${button("champ", "Championship")}${button("trial", "Time Trial")}${button("local", "Local Multiplayer")}${button("online", "Online / LAN")}${button("settings", "Settings & Controls")}${button("help", "How to Play")}</div><div class="footer">PROCEDURAL WORLDS · 1–4 LOCAL · 8 ONLINE · OFFLINE READY</div>`,
  );
  on("single", () => setup("Single Race"));
  on("champ", () => setup("Championship"));
  on("trial", () => setup("Time Trial"));
  on("local", () => setup("Local Multiplayer"));
  on("online", networkMenu);
  on("settings", () => options(home));
  on("help", help);
}
function help() {
  screen = "help";
  page(
    "Make your own wake",
    `<div class="card subtitle">Throttle into the racing line and collect glowing boost canisters. Hold boost for a burst of speed. Hop costs 12 boost and launches you over the water; orange ramps give you bigger air. Cyan gates mark shortcut entrances and exits. Pass every sector in order to complete a lap.<br><br><b>Keyboard 1:</b> W/S throttle & reverse · A/D steer · Left Shift boost · Space hop · C drift · R reset.<br><b>Keyboard 2:</b> Arrows drive · Right Ctrl boost · Right Shift hop · / drift · Backspace reset.<br><b>Controller:</b> RT/LT throttle & brake · left stick steer · A/Cross boost · B/Circle hop · LB drift · Y/Triangle reset · Start pause.<br><br>Escape pauses. Menus: arrows / D-pad or left stick, Enter / A to select, Escape / B to go back. Use left/right to change focused selectors and sliders. Generic controllers can be fully bound in Settings.</div>${button("back", "Back", false, true)}`,
  );
  on("back", home);
}
function setup(nextMode) {
  screen = "setup";
  mode = nextMode;
  championship = null;
  input.joined = [input.devices[0]];
  config.ai = mode === "Time Trial" ? 0 : 7;
  showSetup();
}
function trackPreview() {
 const t=makeTrack(config.track),xs=t.samples.map(p=>p.x),zs=t.samples.map(p=>p.z);
 const minX=Math.min(...xs)-50,minZ=Math.min(...zs)-50,w=Math.max(...xs)-minX+50,h=Math.max(...zs)-minZ+50;
 return `<div id="track-preview" class="track-preview"><svg viewBox="${minX} ${minZ} ${w} ${h}" aria-label="Track minimap"><polyline points="${t.samples.map(p=>p.x+','+p.z).join(' ')}" fill="none" stroke="#52c8d6" stroke-width="${t.width}" stroke-linejoin="round"/><circle cx="${t.samples[0].x}" cy="${t.samples[0].z}" r="18" fill="#ffd66b"/></svg><span>${(t.length/1000).toFixed(2)} KM / BEST ${clock(records[config.track])}</span></div>`;
}
function trackControls() {
  return `<div class="row"><label>Waterway<select id="track">${TRACKS.map((t, i) => `<option value="${i}" ${config.track === i ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Laps<select id="laps">${[1, 2, 3, 4, 5, 7, 9].map((n) => `<option ${config.laps === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>AI boats<select id="ai">${Array.from({ length: 8 }, (_, i) => `<option ${config.ai === i ? "selected" : ""}>${i}</option>`).join("")}</select></label><label>Difficulty<select id="difficulty">${["Cruise", "Racer", "Expert"].map((n, i) => `<option value="${i}" ${config.difficulty === i ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>`;
}
function wireTrack() {
  for (const k of ["track", "laps", "ai", "difficulty"])
    $("#" + k)?.addEventListener("change", (e) => {
      config[k] = Number(e.target.value);
      if (k === "track") {
        track = makeTrack(config.track);
        graphics.load(track);
        const preview=$("#track-preview");if(preview)preview.outerHTML=trackPreview();
      }
      if (online?.isHost) online.ws.send(encode("config", { config }));
    });
}
function boatCards(player = 0) {
  return `<div class="boat-grid">${BOATS.map((b, i) => `<button class="boat-card ${choices[player].type === i ? "selected" : ""}" data-boat="${i}"><b>${b.name}</b><div class="muted">SPEED / TURN / BOOST</div><div class="stat"><i style="width:${b.speed}%"></i></div><div class="stat"><i style="width:${b.handling * 35}%"></i></div><div class="stat"><i style="width:${b.boost * 55}%"></i></div></button>`).join("")}</div>`;
}
function showSetup() {
  page(
    mode,
    `${trackPreview()}${mode === "Championship" ? '<p class="subtitle">Three waterways. One title. Points: 15 / 12 / 10 / 8 / 6 / 4 / 2 / 1.</p>' : ""}${trackControls()}<div class="card"><div class="row"><h3>Your machine</h3><label>Skipper name<input id="name" type="text" maxlength="24" value="${escapeHtml(choices[0].name)}"></label><label>Hull colour<input id="color" type="color" value="${choices[0].color}"></label></div><canvas id="boat-preview" width="480" height="220" aria-label="Rotating boat preview"></canvas>${boatCards()}<p class="muted">Choose your hull. Each boat has its own speed, acceleration, turning and boost balance.</p></div>${mode === "Local Multiplayer" ? '<div class="card"><h3>Press any button to join</h3><div id="joined"></div><p class="muted">W / Space joins WASD · Up / Right Ctrl joins arrows · any controller button joins a pad. Up to four players. Each slot can choose a boat and colour.</p><div class="row">' + button("clear", "Clear players") + button("keyboard", "Add second keyboard") + "</div></div>" : ""}<div class="row">${button("start", "Launch Race", true)}${button("back", "Back", false, true)}</div>`,
    true,
  );
  wireTrack();
  $("#name").oninput = (e) => (choices[0].name = e.target.value);
  $("#color").oninput = (e) => (choices[0].color = e.target.value);
  ui.querySelectorAll("[data-boat]").forEach(
    (b) =>
      (b.onclick = () => {
        choices[0].type = +b.dataset.boat;
        showSetup();
      }),
  );
  if (mode === "Time Trial") {
    $("#ai").value = 0;
    $("#ai").disabled = true;
  }
  if (mode === "Championship") {
    $("#track").value = 0;
    config.track = 0;
    $("#track").disabled = true;
  }
  on("clear", () => {
    input.joined = [];
    updateJoined();
  });
  on("keyboard", () => {
    joinDevice(input.devices[1]);
    updateJoined();
  });
  on("start", () => {
    if (!input.joined.length) input.joined = [input.devices[0]];
    if (mode === "Championship") championship = { round: 0, points: {} };
    startRace();
  });
  on("back", home);
  updateJoined();
}
function joinDevice(d) {
  if (
    input.joined.length < 4 &&
    !input.joined.some((x) => x.id === d.id && x.index === d.index)
  ) {
    input.joined.push(d);
    audio.event("pickup");
    if (mode === "Local Multiplayer") updateJoined();
  }
}
function updateJoined() {
  const target = $("#joined");
  if (!target) return;
  target.innerHTML =
    input.joined
      .map(
        (d, i) =>
          `<div class="row"><span class="muted">P${i + 1} · ${escapeHtml(d.name.slice(0, 30))}</span><input type="text" data-name="${i}" maxlength="24" value="${escapeHtml(choices[i].name)}"><select data-player="${i}">${BOATS.map((b, j) => `<option value="${j}" ${choices[i].type === j ? "selected" : ""}>${b.name}</option>`).join("")}</select><input type="color" data-color="${i}" value="${choices[i].color}"></div>`,
      )
      .join("") || '<p class="muted">Waiting for skippers…</p>';
  target.querySelectorAll("[data-player]").forEach(
    (e) =>
      (e.onchange = () => {
        choices[+e.dataset.player].type = +e.value;
        syncCrew();
      }),
  );
  target.querySelectorAll("[data-color]").forEach(
    (e) =>
      (e.onchange = () => {
        choices[+e.dataset.color].color = e.value;
        syncCrew();
      }),
  );
  target.querySelectorAll("[data-name]").forEach(
    (e) =>
      (e.onchange = () => {
        choices[+e.dataset.name].name = e.value || "Skipper";
        syncCrew();
      }),
  );
}
function syncCrew() {
  if (screen === "netlobby" && online?.ws.readyState === 1) {
    online.ready = false;
    online.ws.send(
      encode("join", { players: input.joined.map((_, i) => choices[i]) }),
    );
  }
}
function startRace(networkBoats) {
  screen = "race";
  paused = false;
  resultsShown = false;
  time = -3;
  countSound = 4;
  accumulator = 0;
  track = makeTrack(config.track);
  graphics.load(track);
  if (networkBoats) {
    boats = networkBoats;
    locals = boats.filter((b) => b.client === online.id);
    locals.forEach((b) => {
      b.local = true;
    });
  } else {
    boats = input.joined.map((d, i) =>
      Object.assign(createBoat(track, i, choices[i].type), choices[i], {
        local: true,
      }),
    );
    locals = [...boats];
    for (let i = locals.length; i < Math.min(8, locals.length + config.ai); i++)
      boats.push(createBoat(track, i, i % 6));
  }
  ui.classList.add("hidden");
  input.menuCooldown = 0.6;
  makeHud();
  audio.start();
}
function makeHud() {
  hud.innerHTML = locals
    .map((b, i) => {
      const n = locals.length,
        w = n > 2 ? 50 : 100,
        h = n > 1 ? 50 : 100,
        x = n > 2 ? (i % 2) * 50 : 0,
        y = n > 2 ? Math.floor(i / 2) * 50 : n === 2 ? i * 50 : 0;
      return `<div class="viewport-hud" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" data-hud="${b.id}"><div class="hud-top"><div><div class="tag">${escapeHtml(b.name)}</div><div class="position">1<small> / ${boats.length}</small></div></div><div><div class="lap">LAP 1 / ${config.laps}</div><div class="time"></div></div></div><div class="wrong"></div><div class="countdown"></div><div class="hud-bottom"><div><div class="speed">0 <small>KM/H</small></div><div class="boost-meter"><i></i></div><div class="muted">BOOST / HOP <span class="best"></span></div></div><canvas class="mini" width="180" height="180"></canvas></div></div>`;
    })
    .join("");
}
function updateHud() {
  locals.forEach((b) => {
    const el = document.querySelector(`[data-hud="${b.id}"]`);
    if (!el) return;
    el.querySelector(".position").innerHTML =
      `${b.position || 1}<small> / ${boats.length}</small>`;
    el.querySelector(".lap").textContent =
      `LAP ${Math.min(config.laps, b.lap + 1)} / ${config.laps}`;
    el.querySelector(".time").innerHTML =
      `TOTAL ${clock(time)}<br>LAP ${clock(Math.max(0, time) - b.lapStart)}`;
    el.querySelector(".speed").innerHTML =
      `${Math.round(Math.abs(b.speed) * 3.6)} <small>KM/H</small>`;
    el.querySelector(".boost-meter i").style.width = b.boost + "%";
    el.querySelector(".wrong").textContent = b.wrongWay
      ? "WRONG WAY"
      : b.finished
        ? "FINISHED · " + clock(b.finishTime)
        : "";
    el.classList.toggle("boost-active",!!b.boosting);
    if(b.previousPosition && b.position<b.previousPosition) {b.callout="UP TO P"+b.position;b.calloutUntil=time+2;}
    b.previousPosition=b.position;
    el.querySelector(".countdown").innerHTML = time<0 ? `<div class="lights">${[3,2,1].map(n=>`<i class="${-time<=n?'lit':''}"></i>`).join('')}</div>${Math.ceil(-time)}` : time<.8 ? "GO!" : b.calloutUntil>time?b.callout : b.lap===config.laps-1 && time-b.lapStart<3 ? "FINAL LAP" : "";
    el.querySelector(".best").textContent = records[config.track]
      ? " · BEST " + clock(records[config.track])
      : "";
    const ctx = el.querySelector(".mini").getContext("2d");
    ctx.clearRect(0, 0, 180, 180);
    const xy = (p) => [90 + p.x * 0.15, 90 + p.z * 0.15];
    ctx.strokeStyle = "#7bbfcd88";
    ctx.lineWidth = track.width * 0.15;
    ctx.beginPath();
    track.samples.forEach((p, i) => {
      const [x, y] = xy(p);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#7fffd6";
    ctx.stroke();
    for (const o of boats) {
      const [x, y] = xy(o);
      ctx.fillStyle = o === b ? "white" : o.color;
      ctx.beginPath();
      ctx.arc(x, y, o === b ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function pause(reason = "Race paused") {
  if (screen !== "race") return;
  paused = true;
  screen = "pause";
  page(
    reason,
    `${online ? '<p class="subtitle">The online race continues while this menu is open.</p>' : ""}<div class="menu">${button("resume", "Resume", true)}${button("settings", "Settings & Controls")}${button("quit", "Leave Race", false, true)}</div>`,
  );
  on("resume", resume);
  on("settings", () =>
    options(() => {
      screen = "race";
      pause();
    }),
  );
  on("quit", home);
}
function resume() {
  if (
    input.joined.some(
      (d) => d.kind === "pad" && !navigator.getGamepads()[d.index],
    )
  ) {
    toast("Reconnect the active controller, or leave this race.");
    return;
  }
  paused = false;
  screen = "race";
  ui.classList.add("hidden");
  input.keys.clear();
  input.menuCooldown = 0.5;
}
function finish() {
  if (resultsShown) return;
  resultsShown = true;
  screen = "results";
  paused = true;
  for (const b of locals)
    if (
      Number.isFinite(b.bestLap) &&
      (!records[config.track] || b.bestLap < records[config.track])
    )
      records[config.track] = b.bestLap;
  localStorage.setItem("rr.records", JSON.stringify(records));
  const ordered = [...boats].sort(
    (a, b) => (a.position || 8) - (b.position || 8),
  );
  if (championship)
    for (const b of ordered)
      championship.points[b.id] =
        (championship.points[b.id] || 0) +
        [15, 12, 10, 8, 6, 4, 2, 1][(b.position || 8) - 1];
  page(
    championship
      ? `Championship / Round ${championship.round + 1}`
      : "Across the line",
    `<div class="card"><table><thead><tr><th>POS</th><th>SKIPPER / HULL</th><th>FINISH</th><th>BEST LAP</th>${championship ? "<th>POINTS</th>" : ""}</tr></thead><tbody>${ordered.map((b) => `<tr><td>${b.position || "—"}</td><td style="color:${b.color}">${escapeHtml(b.name)}<br><small>${BOATS[b.type].name}</small></td><td>${b.finished ? clock(b.finishTime) : "Racing"}</td><td>${clock(b.bestLap)}<br><small>${(b.lapTimes||[]).map((t,i)=>`L${i+1} ${clock(t)}`).join(" / ")}</small></td>${championship ? `<td>${championship.points[b.id]}</td>` : ""}</tr>`).join("")}</tbody></table></div>${championship && championship.round === 2 ? `<p class="subtitle">Champion: ${escapeHtml(boats.find((b) => b.id === Object.keys(championship.points).sort((a, b) => championship.points[b] - championship.points[a])[0])?.name || "Skipper")}</p>` : ""}<div class="row">${!online ? button("again", championship && championship.round < 2 ? "Next waterway" : "Race Again", true) : ""}${button("home", "Main Menu", false, true)}</div>`,
    true,
  );
  on("again", () => {
    if (championship && championship.round < 2) {
      championship.round++;
      config.track = championship.round;
    } else if (championship) {
      championship = { round: 0, points: {} };
      config.track = 0;
    }
    startRace();
  });
  on("home", home);
}
function options(back) {
  screen = "settings";
  page(
    "Tune your ride",
    `<div class="card"><div class="row"><label>Graphics quality<select id="quality">${["Low", "Medium", "High", "Ultra"].map((q, i) => `<option value="${i}" ${settings.quality === i ? "selected" : ""}>${q}</option>`).join("")}</select></label><label>Resolution scale <span id="scaleValue">${Math.round(settings.scale * 100)}%</span><input id="scale" type="range" min="0.5" max="1.5" step="0.1" value="${settings.scale}"></label></div>${["master", "music", "sfx"].map((k) => `<label>${k === "sfx" ? "Effects & engines" : k[0].toUpperCase() + k.slice(1)}<input id="${k}" type="range" min="0" max="1" step="0.05" value="${settings[k]}"></label>`).join("")}<div class="row">${button("fullscreen", "Toggle Fullscreen")}${button("remap", "Remap Controls")}</div></div><div class="card muted">Best laps<br>${TRACKS.map((t, i) => `${t.name}: ${clock(records[i])}`).join("<br>")}</div>${button("back", "Back", false, true)}`,
  );
  $("#quality").onchange = (e) => {
    settings.quality = +e.target.value;
    graphics.resize();
    save();
  };
  $("#scale").oninput = (e) => {
    settings.scale = +e.target.value;
    $("#scaleValue").textContent = Math.round(settings.scale * 100) + "%";
    graphics.resize();
    save();
  };
  for (const k of ["master", "music", "sfx"])
    $("#" + k).oninput = (e) => {
      settings[k] = +e.target.value;
      save();
    };
  on(
    "fullscreen",
    () =>
      window.desktop?.fullscreen() ||
      document.documentElement.requestFullscreen?.(),
  );
  on("remap", () => remap(() => options(back)));
  on("back", back);
}
function remap(back, chosen = 0) {
  screen = "remap";
  input.poll();
  const d = input.devices[chosen] || input.devices[0];
  page(
    "Bind every control",
    `<label>Input device<select id="device">${input.devices.map((d, i) => `<option value="${i}" ${chosen === i ? "selected" : ""}>${escapeHtml(d.name)}</option>`).join("")}</select></label><p class="subtitle">Select an action, release existing controls, then press a key, button or move an axis in the desired direction. Axis deadzone: 18%. Bind both steering directions separately. For a resting trigger axis at −1, use its button binding when available.</p><div class="bind-grid">${ACTIONS.map(
      (a) => {
        const b = (input.maps[d.id] || input.defaults(d))[a];
        return button(
          "bind-" + a,
          a.toUpperCase() +
            " · " +
            (b.code || b.kind + " " + b.index + (b.sign ? " " + b.sign : "")),
        );
      },
    ).join(
      "",
    )}</div><div class="row">${button("reset", "Restore defaults")}${button("back", "Back", false, true)}</div>`,
  );
  $("#device").onchange = (e) => remap(back, +e.target.value);
  for (const a of ACTIONS)
    on("bind-" + a, () => {
      const el = $("#bind-" + a);
      el.textContent = "Release, then press a control…";
      setTimeout(
        () =>
          input.startBind(d, a, () => {
            remap(back, chosen);
            toast("Binding saved for " + d.name);
          }),
        350,
      );
    });
  on("reset", () => {
    delete input.maps[d.id];
    localStorage.setItem("rr.bindings", JSON.stringify(input.maps));
    remap(back, chosen);
  });
  on("back", () => {
    input.capture = null;
    back();
  });
}
function networkMenu() {
  screen = "network";
  mode = "Online Multiplayer";
  if (!input.joined.length) input.joined = [input.devices[0]];
  page(
    "Race together",
    `<p class="subtitle">Host an eight-boat race or join a friend's machine. Local players can share the same connection.</p><div class="card"><div class="row"><label>Address<input id="address" type="text" value="127.0.0.1"></label><label>Port<input id="port" type="number" min="1024" max="65535" value="27015"></label></div><div class="row">${button("host", "Host Game", true)}${button("join", "Join by IP")}${button("discover", "Find LAN Games")}</div><p id="net-status" class="muted"></p><div id="games"></div></div><div class="card"><h3>Local crew</h3><div id="joined"></div><div class="row">${button("add-key", "Add keyboard 2")}${button("clear-crew", "Clear crew")}</div><p class="muted">Press any controller button to add that controller. Choose boats above. Skipper names use your saved local choices.</p></div>${button("back", "Back", false, true)}`,
    true,
  );
  updateJoined();
  on("add-key", () => {
    joinDevice(input.devices[1]);
    updateJoined();
  });
  on("clear-crew", () => {
    input.joined = [];
    updateJoined();
  });
  on("host", async () => {
    try {
      if (!window.desktop)
        throw Error("Hosting requires the Electron desktop app.");
      $("#net-status").textContent = "Starting server…";
      const result = await window.desktop.host(+$("#port").value);
      connect("127.0.0.1", result.port, true, result.addresses);
    } catch (e) {
      $("#net-status").textContent = e.message;
    }
  });
  on("join", () => connect($("#address").value, +$("#port").value, false));
  on("discover", async () => {
    if (!window.desktop) {
      toast("LAN discovery requires Electron.");
      return;
    }
    $("#net-status").textContent = "Listening for LAN games…";
    try {
      const games = await window.desktop.discover();
      $("#net-status").textContent = games.length
        ? `${games.length} game(s) found`
        : "No games found. Try joining by IP.";
      $("#games").innerHTML = games
        .map((g, i) =>
          button(
            "found-" + i,
            `${escapeHtml(g.name)} · ${g.ip}:${g.port} · ${g.players}/8 ${g.running ? "(racing)" : ""}`,
          ),
        )
        .join("");
      games.forEach((g, i) =>
        on("found-" + i, () => connect(g.ip, g.port, false)),
      );
    } catch (e) {
      toast(e.message);
    }
  });
  on("back", home);
}
function connect(ip, port, isHost, addresses = []) {
  if (!input.joined.length) input.joined = [input.devices[0]];
  const ws = new WebSocket(`ws://${ip}:${port}`);
  online = {
    ws,
    isHost,
    addresses,
    port,
    ip,
    id: null,
    players: [],
    owner: null,
    ready: false,
    targets: new Map(),
  };
  $("#net-status").textContent = "Connecting…";
  ws.onopen = () =>
    ws.send(
      encode("join", { players: input.joined.map((d, i) => choices[i]) }),
    );
  ws.onmessage = (e) => {
    try {
      const m = decode(e.data);
      if (m.type === "welcome") {
        online.id = m.id;
        online.owner = m.owner;
      }
      if (m.type === "lobby") {
        online.players = m.players;
        const crew = m.players.filter((p) => p.client === online.id);
        online.ready = crew.length > 0 && crew.every((p) => p.ready);
        online.owner = m.owner;
        Object.assign(config, m.config);
        if (!["race", "pause", "results"].includes(screen)) netLobby();
      }
      if (m.type === "start") {
        Object.assign(config, m.config);
        startRace(m.boats);
      }
      if (m.type === "snapshot") {
        if (!["race", "pause", "settings", "remap", "results"].includes(screen))
          return;
        online.serverTime = m.time;
        for (const s of m.boats) {
          const b = boats.find((b) => b.id === s.id);
          if (!b) continue;
          if (b.local) {
            for (const k of [
              "lap",
              "checkpoint",
              "progress",
              "position",
              "finished",
              "finishTime",
              "bestLap",
              "lapTimes",
              "lapStart",
            ])
              b[k] = s[k];
          } else online.targets.set(s.id, s);
        }
        if (m.time < 0) time = m.time;
      }
      if (m.type === "notice") toast(m.message);
      if (m.type === "error") toast(m.message);
    } catch (e) {
      toast("Network message error: " + e.message);
    }
  };
  ws.onerror = () =>
    toast("Connection failed. Check address, port and firewall.");
  ws.onclose = () => {
    if (online?.ws !== ws) return;
    online = null;
    if (["race", "pause"].includes(screen)) {
      toast("Disconnected. Return to the menu to reconnect.");
      pause("Connection lost");
    } else if (screen === "netlobby") {
      networkMenu();
      toast("Connection closed.");
    }
  };
}
function netLobby() {
  screen = "netlobby";
  const own = online.id === online.owner;
  online.isHost = own;
  page(
    "Crew on deck",
    `<div class="tag">${online.ip}:${online.port}</div>${own ? `<p class="muted">Your LAN IP: ${online.addresses.join(", ") || "127.0.0.1"}<br>Internet play: forward TCP ${online.port} on your router to this computer. LAN discovery uses UDP 27016.</p>${trackControls()}` : `<p class="subtitle">${TRACKS[config.track].name} · ${config.laps} laps · ${config.ai} AI boats</p>`}<div class="card"><table><tr><th>SKIPPER</th><th>BOAT</th><th>STATUS</th></tr>${online.players.map((p) => `<tr><td style="color:${p.color}">${escapeHtml(p.name)}</td><td>${BOATS[p.type].name}</td><td>${p.ready ? "READY" : "Choosing"}</td></tr>`).join("")}</table></div><div class="row">${button("ready", online.ready ? "Unready" : "Ready", true)}${own ? button("launch", "Start Race") : ""}${button("back", "Leave lobby", false, true)}</div><p class="muted">All connected crews must be ready before the host starts. Up to eight boats total, including AI.</p>`,
    true,
  );
  if (own) wireTrack();
  const crewEditor = document.createElement("div");
  crewEditor.className = "card";
  crewEditor.innerHTML =
    '<h3>Your crew / hull selection</h3><div id="joined"></div>';
  ui.querySelector(".card").before(crewEditor);
  updateJoined();
  on("ready", () => {
    online.ready = !online.ready;
    online.ws.send(encode("ready", { ready: online.ready }));
  });
  on("launch", () => {
    if (online.players.some((p) => !p.ready)) {
      toast("Every crew must be ready.");
      return;
    }
    online.ws.send(encode("start"));
  });
  on("back", home);
}
function simulate(dt) {
  if (online) {
    time += dt;
    if (online.serverTime !== undefined)
      time += (online.serverTime - time) * 0.05;
    if (time < 0) return;
    for (let i = 0; i < locals.length; i++) {
      const b = locals[i],
        lap = b.lap,
        cp = b.checkpoint;
      stepBoat(b, input.read(input.joined[i]), track, dt, time, config.laps);
      b.lap = lap;
      b.checkpoint = cp;
    }
    for (const b of boats) {
      if (b.local) continue;
      const s = online.targets.get(b.id);
      if (!s) continue;
      const f = 1 - Math.exp(-dt * 12);
      for (const k of ["x", "z", "y", "speed", "pitch", "roll"])
        b[k] += (s[k] - b[k]) * f;
      b.heading += angle(s.heading - b.heading) * f;
      for (const k of [
        "lap",
        "checkpoint",
        "progress",
        "position",
        "finished",
        "finishTime",
        "bestLap",
        "lapTimes",
        "lapStart",
        "boosting",
        "boost",
      ])
        b[k] = s[k];
    }
    for (const p of track.pickups) p.cooldown = Math.max(0, p.cooldown - dt);
    collideBoats(boats);
    sendClock += dt;
    if (sendClock >= 0.04) {
      sendClock -= 0.04;
      if (online.ws.readyState === 1)
        online.ws.send(encode("state", { boats: locals }));
    }
  } else {
    time += dt;
    if (time < 0) return;
    const leader = Math.max(...boats.map((b) => b.progress));
    const inputs = boats.map((b, i) =>
      b.local
        ? input.read(input.joined[locals.indexOf(b)])
        : aiInput(b, track, config.difficulty, leader, boats),
    );
    stepWorld(boats, track, dt, time, config.laps, inputs);
  }
  for (let i = 0; i < locals.length; i++)
    for (const ev of locals[i].events || []) {
      audio.event(ev);
      if (["land", "pickup", "bump"].includes(ev))
        input.rumble(input.joined[i], ev === "land" ? 0.7 : 0.25);
      if (ev === "lap" && Number.isFinite(locals[i].bestLap)) {
        records[config.track] = Math.min(
          records[config.track] || Infinity,
          locals[i].bestLap,
        );
        localStorage.setItem("rr.records", JSON.stringify(records));
      }
    }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.08, (now - last) / 1000);
  last = now;
  input.poll();
  if (screen === "race") graphics.autoTune((now - (frame.prev ?? now)) / 1000);
  frame.prev = now;
  if (screen !== "race") input.menu(dt);
  if (
    (screen === "setup" && mode === "Local Multiplayer") ||
    screen === "network"
  ) {
    for (const d of input.pressedDevices()) {
      const key = d.id + ":" + d.index;
      if (!joinLatch.has(key)) {
        joinDevice(d);
        updateJoined();
        joinLatch.add(key);
      }
    }
    if (!input.pressedDevices().length) joinLatch.clear();
  }
  if (
    screen === "race" ||
    (online && ["pause", "settings", "remap"].includes(screen))
  ) {
    if (
      screen === "race" &&
      input.menuCooldown <= 0 &&
      (input.keys.has("Escape") ||
        input.joined.some((d) => input.read(d).pause))
    ) {
      pause();
      input.menuCooldown = 0.5;
    }
    input.menuCooldown -= dt;
    if (!paused || online) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps++ < 5) {
        simulate(1 / 60);
        accumulator -= 1 / 60;
      }
      const c = Math.ceil(-time);
      if (time < 0 && c !== countSound) {
        audio.event("beep");
        countSound = c;
      } else if (time >= 0 && countSound !== 0) {
        audio.event("go");
        countSound = 0;
      }
      graphics.update(boats, Math.max(0, time), dt);
      updateHud();
      if (locals.length && locals.every((b) => b.finished) && time-Math.max(...locals.map(b=>b.finishTime))>4) finish();
    }
    graphics.render(locals, dt, false, time);
    audio.update(locals, track.theme, !paused);
  } else {
    if(screen==="setup" && $("#boat-preview")) graphics.preview($("#boat-preview"),choices[0].type,choices[0].color,now/1000);
    graphics.update(boats.length ? boats : [], now / 1000, dt);
    graphics.render([], dt, true, now / 1000);
    audio.update([], track.theme, false);
  }
}

// Reproducible browser verification uses the same race and physics paths.
const params=new URLSearchParams(location.search);
if(params.has("verify")){config.track=Number(params.get("track")||0);config.ai=7;input.joined=[input.devices[0]];startRace();boats.forEach(b=>b.local=false);window.rrVerify={boats,track,graphics};}
else home();
requestAnimationFrame(frame);
