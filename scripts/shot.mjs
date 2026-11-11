// Dev helper: serves the project with Vite, opens a page in Electron, waits, saves a screenshot,
// and prints the value of an optional JS expression. Usage: node scripts/shot.mjs <path> <out.jpg> [waitMs] [expr]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "vite";
import WebSocket from "ws";
const require = createRequire(import.meta.url);
const [page = "/", out = "artifacts/shot.jpg", waitMs = "8000", expr = "document.title"] = process.argv.slice(2);
fs.mkdirSync(path.dirname(out), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await createServer({ configLoader: "native", logLevel: "error", server: { host: "127.0.0.1", port: 5199 } });
await server.listen();
const child = spawn(require("electron"), [".", "--remote-debugging-port=9334"], {
  env: { ...process.env, VITE_DEV_SERVER_URL: "http://127.0.0.1:5199" + page },
  stdio: "ignore",
});
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try {
      target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((t) => t.type === "page");
    } catch {}
  }
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
  await sleep(+waitMs);
  const res = await send("Runtime.evaluate", { expression: `JSON.stringify(${expr})`, awaitPromise: true, returnByValue: true });
  console.log(res.result?.result?.value ?? JSON.stringify(res.result));
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  ws.close();
} finally {
  child.kill();
  await server.close();
  process.exit(0);
}
