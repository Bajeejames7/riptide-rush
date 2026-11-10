// Launches the desktop app in all-AI verify mode on each track, measures frame rate over the
// DevTools protocol and saves a screenshot. Usage: node scripts/check-app.mjs [exePath] [outDir]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import WebSocket from "ws";
const require = createRequire(import.meta.url);
const exe = process.argv[2] || require("electron");
const outDir = process.argv[3] || "artifacts";
const args = process.argv[2] ? [] : ["."];
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9333;
for (const track of [0, 1, 2]) {
  const child = spawn(exe, [...args, `--remote-debugging-port=${port}`], {
    env: { ...process.env, RR_QUERY: `verify=1&track=${track}` },
    stdio: "ignore",
  });
  try {
    let target;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(500);
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        target = list.find((t) => t.type === "page");
      } catch {}
    }
    if (!target) throw new Error("app window never appeared");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => (ws.once("open", r), ws.once("error", j)));
    let id = 0;
    const pending = new Map();
    ws.on("message", (m) => {
      const d = JSON.parse(m);
      if (pending.has(d.id)) pending.get(d.id)(d), pending.delete(d.id);
    });
    const send = (method, params = {}) =>
      new Promise((r) => (pending.set(++id, r), ws.send(JSON.stringify({ id, method, params }))));
    await sleep(22000);
    const res = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async()=>{const g=window.rrVerify?.graphics;const n=await new Promise(res=>{let n=0,t0=performance.now();(function f(){n++;performance.now()-t0>4000?res(n/4):requestAnimationFrame(f)})()});const gl=g?.renderer.getContext();const e=gl?.getExtension('WEBGL_debug_renderer_info');return JSON.stringify({fps:Math.round(n),dyn:g?.dyn,quality:g?.settings.quality,size:[innerWidth,innerHeight],hud:document.querySelector('#hud')?.innerText.replace(/\\s+/g,' ').slice(0,90),gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})})()`,
    });
    console.log(`track ${track}:`, res.result?.result?.value ?? JSON.stringify(res));
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
    if (shot.result?.data)
      fs.writeFileSync(path.join(outDir, `track${track}.jpg`), Buffer.from(shot.result.data, "base64"));
    ws.close();
  } catch (e) {
    console.log(`track ${track}: FAILED ${e.message}`);
  } finally {
    child.kill();
    await sleep(1500);
  }
}
