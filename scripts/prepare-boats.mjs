// Shrinks and normalises the downloaded Sketchfab boat models for the game.
// For each model: drop non-boat props, merge, simplify to a triangle budget, downsize textures,
// then re-orient so the bow points +Z, the hull is LENGTH units long, centred, with its keel
// slightly below y=0. Writes public/assets/models/sf_<name>.glb and sf_boats.json.
// Source files are treated as data only. Usage: node scripts/prepare-boats.mjs
import fs from "node:fs";
import path from "node:path";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, join, weld, simplify, prune, textureCompress, palette, normals } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const SRC = "assets-src/sketchfab";
const OUT = "public/assets/models";
const LENGTH = 8;
// yaw: degrees about Y applied so the bow ends up pointing +Z (set by looking at the preview sheet).
const MODELS = {
  speedboat1: { title: "Speedboat nÂ°1", author: "Jonathan Geoffroy", license: "CC BY-NC 4.0", url: "https://sketchfab.com/3d-models/9c8400c0580b4deda9bd6ad2aa84e421", yaw: 0, tris: 11000 },
  speedboat2: { title: "Speedboat nÂ°2", author: "Jonathan Geoffroy", license: "CC BY-NC 4.0", url: "https://sketchfab.com/3d-models/66da3d79c45c41719c19fb80d0009bef", yaw: 0, tris: 11000 },
  myspeedboat: { title: "My Speed Boat...", author: "MeRockNRollin", license: "CC BY 4.0", url: "https://sketchfab.com/3d-models/d10195be58b74ba98a047a97c31c446e", yaw: 0, tris: 11000, error: 0.05, minPart: 0.05 },
  futuristic: { title: "Futuristic Speedboat", author: "dylanheyes", license: "CC BY 4.0", url: "https://sketchfab.com/3d-models/5a8f4d21472e4b2b8ec4d23f70cf8cbc", yaw: 90, tris: 12000 },
  cyberpunk: { title: "Cyberpunk Speedboat", author: "jungle_jim", license: "CC BY 4.0", url: "https://sketchfab.com/3d-models/1455b50eb92442d18c462a56428fdbec", yaw: 0, tris: 12000, error: 0.06, stripUV: true },
  speedboat_vrpspu: { title: "Speedboat", author: "vrpspu", license: "CC BY 4.0", url: "https://sketchfab.com/3d-models/9916bd4433024202ab84e43426fc2139", yaw: 270, tris: 11000, texture: 512, drop: [/^Plane001/, /^Sphere001/, /^1$/] },
};
for (const a of process.argv.slice(2)) {
  const [k, v] = a.split("=");
  const [name, key] = k.split(".");
  if (MODELS[name]) MODELS[name][key] = Number(v);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

const countTris = (doc) => {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) n += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  return Math.round(n);
};
// Surface area per material, used to guess which material is the hull paint.
const areaByMaterial = (doc) => {
  const out = new Map();
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION"), idx = p.getIndices(), mat = p.getMaterial();
      const n = idx ? idx.getCount() : pos.getCount();
      const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
      let area = 0;
      for (let i = 0; i < n; i += 3) {
        pos.getElement(idx ? idx.getScalar(i) : i, a);
        pos.getElement(idx ? idx.getScalar(i + 1) : i + 1, b);
        pos.getElement(idx ? idx.getScalar(i + 2) : i + 2, c);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      }
      if (mat) out.set(mat, (out.get(mat) || 0) + area);
    }
  return out;
};

const manifest = [];
for (const [name, cfg] of Object.entries(MODELS)) {
  const file = path.join(SRC, name + ".glb");
  if (!fs.existsSync(file)) continue;
  const doc = await io.read(file);
  const root = doc.getRoot();
  const before = countTris(doc);
  for (const a of root.listAnimations()) a.dispose();
  for (const c of root.listCameras()) c.dispose();
  for (const s of root.listSkins()) s.dispose();
  if (cfg.drop) for (const node of root.listNodes()) if (node.getMesh() && cfg.drop.some((r) => r.test(node.getName()))) node.dispose();
  if (cfg.minPart) {
    // Drop parts too small to see from the chase camera (gauges, switches, bolts).
    const all = getBounds(root.getDefaultScene() || root.listScenes()[0]);
    const limit = cfg.minPart * Math.max(...all.max.map((v, i) => v - all.min[i]));
    for (const node of root.listNodes()) {
      if (!node.getMesh()) continue;
      const nb = getBounds(node);
      if (Math.max(...nb.max.map((v, i) => v - nb.min[i])) < limit) node.dispose();
    }
  }
  if (cfg.stripUV) {
    // Untextured model: UV seams and baked normals only block welding and simplification.
    for (const mesh of root.listMeshes())
      for (const p of mesh.listPrimitives()) for (const sem of p.listSemantics()) if (sem !== "POSITION") p.setAttribute(sem, null);
  }
  await doc.transform(prune(), dedup(), flatten(), join(), weld());
  const ratio = Math.min(1, cfg.tris / Math.max(1, countTris(doc)));
  if (ratio < 1) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: cfg.error ?? 0.03 }));
  if (cfg.stripUV) await doc.transform(normals({ overwrite: true }));
  // The largest untextured material is the hull paint: name it "paint" so the game can tint it per
  // player, and keep it out of the palette merge (single-sided makes it a distinct material class).
  for (const m of root.listMaterials()) m.setDoubleSided(true);
  const paint = [...areaByMaterial(doc).entries()].sort((x, y) => y[1] - x[1]).find(([m]) => !m.getBaseColorTexture())?.[0];
  if (paint && cfg.paint !== false) paint.setName("paint").setAlphaMode("MASK").setAlphaCutoff(0.01);
  // Fold the remaining flat-colour materials into one palette texture to cut draw calls.
  await doc.transform(palette({ min: 3 }), join(), prune());
  const tex = cfg.texture ?? 1024;
  await doc.transform(prune(), textureCompress({ encoder: sharp, resize: [tex, tex] }));

  // Normalise: wrap everything in one node, rotate bow to +Z, scale to LENGTH, centre, set waterline.
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const pivot = doc.createNode("boat");
  for (const child of scene.listChildren()) pivot.addChild(child);
  scene.addChild(pivot);
  const h = ((cfg.yaw || 0) * Math.PI) / 360;
  pivot.setRotation([0, Math.sin(h), 0, Math.cos(h)]);
  let b = getBounds(scene);
  const s = LENGTH / Math.max(b.max[2] - b.min[2], 1e-6);
  pivot.setScale([s, s, s]);
  b = getBounds(scene);
  const height = b.max[1] - b.min[1];
  pivot.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1] - height * 0.18, -(b.min[2] + b.max[2]) / 2]);
  b = getBounds(scene);

  const areas = [...areaByMaterial(doc).entries()].sort((x, y) => y[1] - x[1]);
  const total = areas.reduce((t, [, v]) => t + v, 0) || 1;
  const out = path.join(OUT, `sf_${name}.glb`);
  await io.write(out, doc);
  manifest.push({
    id: name,
    file: `models/sf_${name}.glb`,
    title: cfg.title,
    author: cfg.author,
    license: cfg.license,
    url: cfg.url,
    triangles: countTris(doc),
    trianglesOriginal: before,
    bytes: fs.statSync(out).size,
    size: b.max.map((v, i) => +(v - b.min[i]).toFixed(2)),
    drawCalls: root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
    materials: areas.slice(0, 8).map(([m, v]) => ({
      name: m.getName(),
      share: +(v / total).toFixed(3),
      textured: !!m.getBaseColorTexture(),
      color: m.getBaseColorFactor().slice(0, 3).map((x) => +x.toFixed(2)),
    })),
  });
}
fs.writeFileSync(path.join(OUT, "sf_boats.json"), JSON.stringify(manifest, null, 1));
for (const m of manifest)
  console.log(m.id, "tris", m.trianglesOriginal, "->", m.triangles, "draws", m.drawCalls, "MB", (m.bytes / 1048576).toFixed(2), "size", m.size.join("x"), "| top mats:", m.materials.slice(0, 4).map((x) => `${x.name}:${x.share}${x.textured ? "T" : ""}[${x.color}]`).join(" "));


