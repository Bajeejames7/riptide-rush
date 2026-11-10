import * as T from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BOATS } from "./core/physics.js";
import { waterVertex, waterFragment } from "./water.js";
const tmp = new T.Vector3();
function material(color, metalness = 0.2, roughness = 0.35) {
  return new T.MeshStandardMaterial({ color, metalness, roughness });
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(parent, mat, x, y, z, w, h, d) {
  return mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
}
export function buildBoat(type, color) {
  const g = new T.Group(),
    spec = BOATS[type],
    paint = material(color, 0.65, 0.23),
    dark = material(0x111c2a, 0.7, 0.25),
    white = material(0xe4eff2, 0.4, 0.25),
    glass = new T.MeshPhysicalMaterial({
      color: 0x09334a,
      metalness: 0.7,
      roughness: 0.08,
      clearcoat: 1,
    });
  const widths = [1.75, 2.25, 2, 1.4, 2.1, 1.8],
    w = widths[type],
    len = [7.5, 7, 8.5, 8, 8.2, 7.2][type];
  const hull = new T.Shape();
  hull.moveTo(0, len * 0.56);
  hull.lineTo(w * 0.65, len * 0.18);
  hull.lineTo(w, -len * 0.38);
  hull.quadraticCurveTo(0, -len * 0.55, -w, -len * 0.38);
  hull.lineTo(-w * 0.65, len * 0.18);
  hull.closePath();
  const geom = new T.ExtrudeGeometry(hull, {
    depth: 0.7,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 2,
    steps: 1,
  });
  geom.rotateX(Math.PI / 2);
  mesh(geom, paint, g, 0, 0.2, 0);
  box(g, dark, 0, -0.4, -0.3, w * 1.5, 0.3, len * 0.63);
  const cockpit = mesh(new T.SphereGeometry(1, 16, 10), glass, g, 0, 0.6, -0.2);
  cockpit.scale.set(w * 0.55, 0.65, len * 0.22);
  box(g, white, 0, 0.27, len * 0.25, 0.22, 0.06, len * 0.4);
  for (const side of [-1, 1]) {
    const pod = mesh(
      new T.CylinderGeometry(0.48, 0.62, 2.1, 12),
      dark,
      g,
      side * w * 0.62,
      0.15,
      -len * 0.37,
    );
    pod.rotation.x = Math.PI / 2;
    const rim = mesh(
      new T.TorusGeometry(0.43, 0.1, 8, 16),
      white,
      g,
      side * w * 0.62,
      0.15,
      -len * 0.5,
    );
    const fin = box(
      g,
      paint,
      side * w * 0.9,
      0.55,
      -len * 0.32,
      0.16,
      1.1,
      1.8,
    );
    fin.rotation.z = -side * 0.18;
    if (type === 1 || type === 4)
      box(g, paint, side * (w + 0.35), -0.05, -0.25, 0.75, 0.55, len * 0.8);
    if (type === 2 || type === 5)
      box(g, dark, side * w * 0.65, 0.6, -len * 0.15, 0.55, 0.6, 1.8);
  }
  if (type % 2 === 0) {
    box(g, dark, 0, 1, -len * 0.34, w * 1.8, 0.15, 0.7);
    for (const s of [-1, 1])
      box(g, white, s * w * 0.7, 0.6, -len * 0.34, 0.12, 0.8, 0.35);
  } else {
    for (const s of [-1, 1]) {
      const fin = box(g, paint, s * w, 0.1, len * 0.1, 0.8, 0.12, 2);
      fin.rotation.z = s * 0.17;
    }
  }
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 64;
  const c = cv.getContext("2d");
  c.fillStyle = color;
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = "#071320";
  c.font = "bold italic 40px sans-serif";
  c.fillText(
    String(type + 1).padStart(2, "0") +
      " / " +
      spec.name.toUpperCase().slice(0, 4),
    8,
    46,
  );
  const decal = new T.CanvasTexture(cv);
  const plate = mesh(
    new T.PlaneGeometry(1.5, 0.4),
    new T.MeshBasicMaterial({ map: decal, side: T.DoubleSide }),
    g,
    0,
    0.39,
    len * 0.21,
  );
  plate.rotation.x = -Math.PI / 2;
  return g;
}
export class Graphics {
  constructor(canvas, settings) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene();
    this.cameras = Array.from(
      { length: 4 },
      () => new T.PerspectiveCamera(65, 1, 0.5, 2200),
    );
    this.boatModels = new Map();
    this.settings = settings;
    this.particles = [];
    this.particleGeo = new T.BufferGeometry();
    this.particlePositions = new Float32Array(1600 * 3);
    this.particleColors = new Float32Array(1600 * 3);
    this.particleGeo.setAttribute(
      "position",
      new T.BufferAttribute(this.particlePositions, 3),
    );
    this.particleGeo.setAttribute(
      "color",
      new T.BufferAttribute(this.particleColors, 3),
    );
    this.particleMesh = new T.Points(
      this.particleGeo,
      new T.PointsMaterial({
        size: 0.7,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.particleMesh.frustumCulled = false;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.cameras[0]);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new T.Vector2(100, 100), 0.4, 0.6, 0.8);
    this.composer.addPass(this.bloom);
    this.vignette = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader:
        "varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform sampler2D tDiffuse;varying vec2 uv0;void main(){vec4 c=texture2D(tDiffuse,uv0);float v=smoothstep(.8,.2,distance(uv0,vec2(.5)));gl_FragColor=vec4(c.rgb*(.75+.25*v),c.a);}",
    });
    this.composer.addPass(this.vignette);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const q = [0.65, 0.85, 1, 1.25][this.settings.quality ?? 2];
    this.renderer.setPixelRatio(
      Math.min(2, devicePixelRatio) * this.settings.scale * q,
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = this.settings.quality > 0;
  }
  load(track) {
    this.track = track;
    for (const child of [...this.scene.children]) {
      if (child !== this.particleMesh)
        child.traverse((o) => {
          o.geometry?.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (!m) continue;
            for (const value of Object.values(m))
              if (value?.isTexture) value.dispose();
            m.dispose();
          }
        });
      this.scene.remove(child);
    }
    this.boatModels.clear();
    this.pickupModels = [];
    this.particles = [];
    const theme = track.theme;
    this.scene.background = new T.Color(track.sky);
    this.scene.fog = new T.FogExp2(
      track.sky,
      theme === "city" ? 0.0019 : 0.0012,
    );
    const hemi = new T.HemisphereLight(
      theme === "tropic" ? 0xccefff : 0x7f9bff,
      0x163a3b,
      theme === "tropic" ? 2 : 1.2,
    );
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(
      theme === "tropic" ? 0xfff2d4 : 0xc99bff,
      theme === "tropic" ? 3 : 1.6,
    );
    sun.position.set(120, 220, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -330;
    sun.shadow.camera.right = 330;
    sun.shadow.camera.top = 330;
    sun.shadow.camera.bottom = -330;
    sun.shadow.camera.far = 700;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);
    if (theme !== "city") {
      const sky = new Sky();
      sky.scale.setScalar(1600);
      const u = sky.material.uniforms;
      u.turbidity.value = theme === "ice" ? 7 : 2;
      u.rayleigh.value = theme === "ice" ? 3 : 1;
      u.mieCoefficient.value = 0.005;
      u.mieDirectionalG.value = 0.8;
      u.sunPosition.value.set(120, theme === "ice" ? 12 : 200, -150);
      this.scene.add(sky);
    }
    this.waterUniforms = {
      time: { value: 0 },
      baseColor: { value: new T.Color(track.water) },
      skyColor: {
        value: new T.Color(
          theme === "tropic" ? 0x9edfff : theme === "ice" ? 0x8478b7 : 0x133d69,
        ),
      },
      sunDir: { value: sun.position.clone().normalize() },
      wakes: {
        value: Array.from(
          { length: 8 },
          () => new T.Vector4(10000, 10000, 0, 0),
        ),
      },
      shore: {
        value: track.samples
          .filter((_, i) => i % 8 === 0)
          .map((p) => new T.Vector2(p.x, p.z)),
      },
      width: { value: track.width },
      blockers: {
        value: track.obstacles.map((o) => new T.Vector4(o.x, o.z, o.radius, 0)),
      },
    };
    const waterMat = new T.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
    });
    const waterGeo = new T.PlaneGeometry(
      1800,
      1800,
      [64, 100, 180, 260][this.settings.quality],
      [64, 100, 180, 260][this.settings.quality],
    );
    waterGeo.rotateX(-Math.PI / 2);
    this.water = mesh(waterGeo, waterMat, this.scene);
    this.water.castShadow = false;
    const sand = material(
        theme === "ice" ? 0xb6d9e7 : theme === "city" ? 0x17263b : 0xe6c28b,
        0.05,
        0.9,
      ),
      rock = material(theme === "ice" ? 0x76a9cc : 0x55766a, 0.15, 0.8),
      green = material(0x257959, 0.05, 0.8),
      neon = new T.MeshStandardMaterial({
        color: 0x37e5ed,
        emissive: 0x1b9ec0,
        emissiveIntensity: 3,
      });
    let seed = track.seed;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < track.samples.length; i += 8) {
      const p = track.samples[i],
        side = i % 16 === 0 ? 1 : -1,
        h = p.heading;
      for (const s of [-1, 1]) {
        const x = p.x + Math.cos(h) * s * (track.width * 0.5 + 9),
          z = p.z - Math.sin(h) * s * (track.width * 0.5 + 9);
        const r = mesh(
          new T.IcosahedronGeometry(
            theme === "city" ? 6 : 11,
            theme === "tropic" ? 1 : 0,
          ),
          sand,
          this.scene,
          x,
          -3,
          z,
        );
        r.scale.set(1, theme === "ice" ? 2.5 : 0.7, 1);
        if (theme === "city") {
          const height = 15 + rand() * 95;
          const b = box(
            this.scene,
            material(
              new T.Color().setHSL(0.6, 0.25, 0.08 + rand() * 0.08),
              0.5,
              0.45,
            ),
            x + s * 12,
            height / 2,
            z,
            10 + rand() * 14,
            height,
            10 + rand() * 12,
          );
          for (let y = 5; y < height; y += 8) {
            box(
              b,
              new T.MeshStandardMaterial({
                color: i % 3 ? 0x33f3ed : 0xff3da9,
                emissive: i % 3 ? 0x11c7cf : 0xf91e8f,
                emissiveIntensity: 2,
              }),
              0,
              y - height / 2,
              -(b.geometry.parameters.depth / 2 + 0.02),
              b.geometry.parameters.width * 0.8,
              0.7,
              0.1,
            );
          }
        } else if (theme === "tropic" && i % 24 === 0) {
          const trunk = mesh(
            new T.CylinderGeometry(0.45, 0.7, 12, 7),
            material(0x896448, 0.05, 0.9),
            this.scene,
            x,
            5,
            z,
          );
          trunk.rotation.z = s * 0.16;
          for (let a = 0; a < 6; a++) {
            const leaf = mesh(
              new T.ConeGeometry(2, 8, 4),
              green,
              this.scene,
              x + Math.sin(a) * 3,
              11,
              z + Math.cos(a) * 3,
            );
            leaf.rotation.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1);
          }
        } else if (theme === "ice" && i % 24 === 0) {
          const crystal = mesh(
            new T.ConeGeometry(4, 18 + rand() * 15, 5),
            rock,
            this.scene,
            x,
            5,
            z,
          );
          crystal.rotation.z = s * 0.2;
        }
      }
      if (i % 32 === 0) {
        for (const s of [-1, 1]) {
          const buoy = mesh(
            new T.CylinderGeometry(0.6, 1.1, 2, 8),
            i % 80 === 0 ? neon : material(0xff783e),
            this.scene,
            p.x + Math.cos(h) * s * (track.width * 0.5 - 2),
            0.7,
            p.z - Math.sin(h) * s * (track.width * 0.5 - 2),
          );
        }
      }
    }
    track.ramps.forEach((r) => {
      const group = new T.Group();
      group.position.set(r.x, 0.8, r.z);
      group.rotation.y = r.heading;
      this.scene.add(group);
      const deck = box(
        group,
        material(0xffa733, 0.45, 0.4),
        0,
        0,
        0,
        11,
        0.55,
        12,
      );
      deck.rotation.x = -0.22;
      for (const s of [-1, 1]) box(group, neon, s * 5.6, 0.8, 0, 0.15, 0.2, 12);
      for (let i = -2; i < 3; i++)
        box(group, whiteMaterial(), 0, 0.6, i * 2, 6, 0.08, 0.25);
    });
    for (const o of track.obstacles) {
      mesh(
        new T.IcosahedronGeometry(o.radius, 1),
        rock,
        this.scene,
        o.x,
        1,
        o.z,
      );
    }
    track.shortcuts.forEach(({ a, b }) => {
      for (const p of [a, b]) {
        const h = Math.atan2(b.x - a.x, b.z - a.z);
        const g = new T.Group();
        g.position.set(p.x, 0, p.z);
        g.rotation.y = h;
        this.scene.add(g);
        for (const s of [-1, 1]) box(g, neon, s * 10, 5, 0, 0.4, 10, 0.4);
        box(g, neon, 0, 10, 0, 20, 0.5, 0.5);
      }
    });
    const start = track.samples[0];
    const arch = new T.Group();
    arch.position.set(start.x, 0, start.z);
    arch.rotation.y = start.heading;
    this.scene.add(arch);
    for (const s of [-1, 1])
      box(arch, darkMaterial(), s * track.width * 0.47, 7, 0, 1, 14, 1);
    const banner = document.createElement("canvas");
    banner.width = 1024;
    banner.height = 128;
    const ctx = banner.getContext("2d");
    ctx.fillStyle = "#061421";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#57f1dc";
    ctx.font = "900 italic 70px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RIPTIDE / RUSH", 512, 89);
    const sign = mesh(
      new T.PlaneGeometry(track.width, 4.5),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(banner),
        side: T.DoubleSide,
      }),
      arch,
      0,
      13,
      0,
    );
    track.pickups.forEach((p, i) => {
      const g = new T.Group();
      g.position.set(p.x, 2, p.z);
      this.scene.add(g);
      const m = new T.MeshStandardMaterial({
        color: p.large ? 0xffcb45 : 0x43ffdc,
        emissive: p.large ? 0xff8b15 : 0x16aa8e,
        emissiveIntensity: 2,
      });
      const can = mesh(
        new T.CylinderGeometry(
          p.large ? 0.8 : 0.5,
          p.large ? 0.8 : 0.5,
          1.8,
          6,
        ),
        m,
        g,
      );
      can.rotation.z = Math.PI / 5;
      mesh(
        new T.TorusGeometry(p.large ? 1.5 : 1, 0.07, 5, 24),
        m,
        g,
      ).rotation.x = Math.PI / 2;
      this.pickupModels.push(g);
    });
    if (theme === "ice") {
      const geo = new T.PlaneGeometry(1400, 180, 100, 8);
      const mat = new T.ShaderMaterial({
        transparent: true,
        side: T.DoubleSide,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { time: this.waterUniforms.time },
        vertexShader:
          "uniform float time;varying vec2 v;void main(){v=uv;vec3 p=position;p.z+=sin(p.x*.012+time*.12)*70.;p.y+=sin(p.x*.008)*40.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}",
        fragmentShader:
          "uniform float time;varying vec2 v;void main(){float a=pow(sin(v.y*3.14159),2.)*(.4+.6*pow(sin(v.x*90.+time*.2),2.));gl_FragColor=vec4(mix(vec3(.1,1.,.6),vec3(.5,.15,1.),v.y),a*.4);}",
      });
      mesh(geo, mat, this.scene, 0, 230, -500);
    }
    if (theme === "city") {
      const stars = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) {
        stars[i * 3] = (rand() - 0.5) * 1600;
        stars[i * 3 + 1] = 200 + rand() * 600;
        stars[i * 3 + 2] = (rand() - 0.5) * 1600;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(stars, 3));
      this.scene.add(
        new T.Points(geo, new T.PointsMaterial({ color: 0xa1c7ff, size: 1.4 })),
      );
    }
    this.scene.add(this.particleMesh);
    this.cameras.forEach((c) => c.position.set(start.x, 14, start.z - 25));
  }
  spray(b, count = 2, landing = false) {
    for (let j = 0; j < count && this.particles.length < 1500; j++) {
      const s = (Math.random() - 0.5) * 2;
      this.particles.push({
        x: b.x - Math.sin(b.heading) * 3 + s,
        z: b.z - Math.cos(b.heading) * 3,
        y: b.y,
        vx: -b.vx * 0.13 + s * 4,
        vz: -b.vz * 0.13 + (Math.random() - 0.5) * 6,
        vy: landing ? 6 + Math.random() * 7 : 2 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.5,
        color: new T.Color(b.boosting ? 0xffa433 : 0xabeaff),
      });
    }
  }
  update(boats, time, dt) {
    this.waterUniforms.time.value = time;
    boats.forEach((b, i) => {
      let model = this.boatModels.get(b.id);
      if (!model) {
        model = buildBoat(b.type, b.color);
        this.boatModels.set(b.id, model);
        this.scene.add(model);
      }
      model.position.set(b.x, b.y, b.z);
      model.rotation.set(b.pitch || 0, b.heading, b.roll || 0, "YXZ");
      if (i < 8)
        this.waterUniforms.wakes.value[i].set(
          b.x,
          b.z,
          b.heading,
          Math.min(1, Math.abs(b.speed) / 25),
        );
      if (Math.abs(b.speed) > 8 && Math.random() < 0.8)
        this.spray(b, b.boosting ? 5 : 2);
      if (b.events?.includes("land")) this.spray(b, 35, true);
    });
    for (const [id, model] of this.boatModels)
      if (!boats.some((b) => b.id === id)) {
        this.scene.remove(model);
        this.boatModels.delete(id);
      }
    this.pickupModels.forEach((m, i) => {
      m.visible = this.track.pickups[i].cooldown <= 0;
      m.rotation.y = time * 1.4;
      m.position.y = 2.2 + Math.sin(time * 2 + i) * 0.45;
      if (m.visible && Math.random() < 0.015) {
        this.particles.push({
          x: m.position.x,
          y: 3,
          z: m.position.z,
          vx: 0,
          vz: 0,
          vy: 2,
          life: 0.7,
          color: new T.Color(0x70ffcb),
        });
      }
    });
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particles.forEach((p, i) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 12 * dt;
      this.particlePositions.set([p.x, p.y, p.z], i * 3);
      this.particleColors.set(
        [p.color.r * p.life, p.color.g * p.life, p.color.b * p.life],
        i * 3,
      );
    });
    this.particleGeo.setDrawRange(0, this.particles.length);
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;
  }
  render(players, dt, attract = false, time = 0) {
    const r = this.renderer,
      n = players.length || 1;
    r.setScissorTest(false);
    r.setViewport(0, 0, innerWidth, innerHeight);
    r.clear();
    for (let i = 0; i < n; i++) {
      const b = players[i],
        c = this.cameras[i];
      let x = 0,
        y = 0,
        w = innerWidth,
        h = innerHeight;
      if (n === 2) {
        h /= 2;
        y = (1 - i) * h;
      }
      if (n > 2) {
        w /= 2;
        h /= 2;
        x = (i % 2) * w;
        y = (1 - Math.floor(i / 2)) * h;
      }
      c.aspect = w / h;
      const fov = b?.boosting ? 79 : 65;
      c.fov += (fov - c.fov) * Math.min(1, dt * 5);
      c.updateProjectionMatrix();
      if (b) {
        const distance = 14 + Math.abs(b.speed) * 0.06;
        tmp.set(
          b.x - Math.sin(b.heading) * distance,
          b.y + 7 + Math.abs(b.speed) * 0.025,
          b.z - Math.cos(b.heading) * distance,
        );
        c.position.lerp(tmp, 1 - Math.exp(-dt * 6));
        c.lookAt(
          b.x + Math.sin(b.heading) * 12,
          b.y + 1,
          b.z + Math.cos(b.heading) * 12,
        );
      } else {
        c.position.set(
          Math.sin(time * 0.06) * 330,
          130,
          Math.cos(time * 0.06) * 330,
        );
        c.lookAt(0, 0, 0);
      }
      if (n === 1 && this.settings.quality >= 2) {
        this.renderPass.camera = c;
        this.composer.render();
      } else {
        r.setViewport(x, y, w, h);
        r.setScissor(x, y, w, h);
        r.setScissorTest(true);
        r.render(this.scene, c);
      }
    }
    r.setScissorTest(false);
  }
}
function whiteMaterial() {
  return material(0xf0f8ec, 0.2, 0.4);
}
function darkMaterial() {
  return material(0x152839, 0.6, 0.3);
}
