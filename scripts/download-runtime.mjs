// Diagnostic downloader: the normal install uses Electron's own verified installer.
import https from "node:https";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  version = require("electron/package.json").version;
fs.mkdirSync(".electron-cache", { recursive: true });
const target = `.electron-cache/electron-v${version}-win32-x64.zip`;
async function get(url, redirects = 0) {
  if (redirects > 8) throw Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        res.resume();
        resolve(get(res.headers.location, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(Error("Download HTTP " + res.statusCode));
        return;
      }
      const output = fs.createWriteStream(target);
      res.pipe(output);
      let count = 0;
      res.on("data", (d) => (count += d.length));
      res.on("error", reject);
      output.on("error", reject);
      output.on("finish", () => {
        output.close();
        console.log("Downloaded", count, "bytes to", target);
        resolve();
      });
    });
    req.setTimeout(15000, () =>
      req.destroy(
        Error("Electron release asset connection timed out (15 seconds)"),
      ),
    );
    req.on("error", reject);
  });
}
const timer = setTimeout(() => {
  console.error("Electron download exceeded 60 seconds");
  process.exit(1);
}, 60000);
try {
  await get(
    `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-x64.zip`,
  );
} finally {
  clearTimeout(timer);
}
