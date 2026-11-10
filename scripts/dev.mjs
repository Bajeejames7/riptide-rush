import { spawn } from "node:child_process";
import { createServer } from "vite";
const server = await createServer({
  configLoader: "native",
  server: { host: "127.0.0.1", port: 5173 },
});
await server.listen();
const { default: electron } = await import("electron");
const child = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: "http://127.0.0.1:5173" },
});
child.on("exit", () => {
  server.close();
  process.exit();
});
