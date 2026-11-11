// Dev-only sheet: renders every prepared boat model as the game will place it.
// Each boat sits at its own origin with a red post marking +Z (where the bow must point)
// and a translucent plane at y=0 (the waterline).
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const names = ["speedboat1", "speedboat2", "myspeedboat", "futuristic", "cyberpunk", "speedboat_vrpspu"];
const renderer = new T.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping;
const scene = new T.Scene();
scene.background = new T.Color(0x24384d);
scene.add(new T.HemisphereLight(0xdfefff, 0x445566, 2.4));
const sun = new T.DirectionalLight(0xffffff, 3);
sun.position.set(6, 10, 8);
scene.add(sun);
const cam = new T.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 500);
const top = new URLSearchParams(location.search).has("top");
cam.position.set(top ? 0 : 10, top ? 62 : 22, top ? 0.01 : 40);
cam.lookAt(0, 0, 0);
const info = {};
const loader = new GLTFLoader();
await Promise.all(
  names.map(async (n, i) => {
    const holder = new T.Group();
    holder.position.set(((i % 3) - 1) * 13, 0, (Math.floor(i / 3) - 0.5) * 15);
    scene.add(holder);
    const post = new T.Mesh(new T.BoxGeometry(0.3, 2, 0.3), new T.MeshBasicMaterial({ color: 0xff2222 }));
    post.position.set(0, 1, 5.2);
    holder.add(post);
    const water = new T.Mesh(new T.PlaneGeometry(6, 11), new T.MeshBasicMaterial({ color: 0x2f9bd0, transparent: true, opacity: 0.45, side: T.DoubleSide }));
    water.rotation.x = -Math.PI / 2;
    holder.add(water);
    try {
      const g = (await loader.loadAsync(`/assets/models/sf_${n}.glb`)).scene;
      holder.add(g);
      const box = new T.Box3().setFromObject(g);
      info[n] = { size: box.getSize(new T.Vector3()).toArray().map((v) => +v.toFixed(1)), minY: +box.min.y.toFixed(2) };
    } catch (e) {
      info[n] = { error: String(e.message || e) };
    }
  }),
);
renderer.render(scene, cam);
window.previewInfo = info;
document.title = "ready";
