// Dev helper: lists mesh nodes of a GLB with world-space sizes. Usage: node scripts/inspect-boat.mjs <file.glb>
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const rows = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const b = getBounds(node);
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(1));
  let tris = 0;
  for (const p of mesh.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  rows.push({ name: node.getName().slice(0, 28), size, tris, mats: mesh.listPrimitives().map((p) => p.getMaterial()?.getName()).slice(0, 3) });
}
rows.sort((a, b) => Math.max(...b.size) - Math.max(...a.size));
console.log("nodes with meshes:", rows.length);
for (const r of rows.slice(0, 14)) console.log(JSON.stringify(r));
console.log("textures:", doc.getRoot().listTextures().map((t) => `${t.getName() || t.getURI()}:${t.getMimeType()}:${t.getSize()?.join("x")}`).slice(0, 24).join(" | "));
