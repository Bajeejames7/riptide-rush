import fs from "node:fs";
const n = 256,
  pixels = Buffer.alloc(n * n * 4);
for (let v = 0; v < n; v++)
  for (let u = 0; u < n; u++) {
    const x = u / 4,
      y = v / 4;
    let i = ((n - 1 - v) * n + u) * 4;
    let boat = Math.abs(x - 32) < (y - 9) * 0.42 && y > 9 && y < 49;
    let wave = Math.sin(x * 0.19) * 3 + y > 50;
    pixels[i] = boat ? 70 : wave ? 210 : 55;
    pixels[i + 1] = boat ? 225 : wave ? 170 : 28;
    pixels[i + 2] = boat ? 255 : wave ? 30 : 8;
    pixels[i + 3] = 255;
  }
const dib = Buffer.alloc(40);
dib.writeUInt32LE(40);
dib.writeInt32LE(n, 4);
dib.writeInt32LE(n * 2, 8);
dib.writeUInt16LE(1, 12);
dib.writeUInt16LE(32, 14);
const data = Buffer.concat([dib, pixels, Buffer.alloc((n * n) / 8)]);
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(1, 4);
head[6] = 0;
head[7] = 0;
head.writeUInt16LE(1, 10);
head.writeUInt16LE(32, 12);
head.writeUInt32LE(data.length, 14);
head.writeUInt32LE(22, 18);
fs.mkdirSync("build", { recursive: true });
fs.writeFileSync("build/icon.ico", Buffer.concat([head, data]));
