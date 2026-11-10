import * as T from "three";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { addEnvironment, loftHull, softTexture } from "./scenery.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { nearest } from "./core/tracks.js";
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
    paint = new T.MeshPhysicalMaterial({color,metalness:.45,roughness:.24,clearcoat:1,clearcoatRoughness:.12}),
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
  const profiles=[{w:w,l:len},{w:w*.47,l:len},{w:w*.45,l:len*.86},{w:w*.82,l:len*.8},{w:w*1.12,l:len},{w:w*.48,l:len}];
  const profile=profiles[type];
  const hulls=type===1?[-w*.7,w*.7]:type===5?[-w,0,w]:[0];
  for(const x of hulls) mesh(loftHull(profile.w,profile.l,type),paint,g,x,0,0);
  if(type===2) for(const side of [-1,1]) mesh(loftHull(.6,len*.65,2),paint,g,side*w,0,len*.15);
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
    0.66,
    len * 0.21,
  );
  plate.rotation.x = -Math.PI / 2 + .09;
  for(const side of [-1,1]) {
    box(g,dark,side*w*.45,.65,-len*.22,.5,.5,1.4);
    for(let j=0;j<4;j++) box(g,white,side*w*.45,.93,-len*.28+j*.27,.55,.08,.12);
    box(g,white,side*w*.7,-.25,-len*.5,.7,.08,.7);
    const flame=mesh(new T.ConeGeometry(.4,2.8,12),new T.MeshBasicMaterial({color:new T.Color(.15,1.6,5),transparent:true,opacity:.65}),g,side*w*.62,.1,-len*.64);
    flame.rotation.x=-Math.PI/2;flame.name="flame";flame.visible=false;
    const vertices=[],indices=[];
    for(let j=0;j<=16;j++) {const t=.52+j/16*.4,z=(t-.5)*len;for(const edge of [-1,1])vertices.push(side*w*.22+edge*.09,.395+t*t*.48,z);}
    for(let j=0;j<16;j++){const a=j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    const stripe=new T.BufferGeometry();stripe.setAttribute("position",new T.Float32BufferAttribute(vertices,3));stripe.setIndex(indices);stripe.computeVertexNormals();mesh(stripe,white,g);
  }
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
    this.renderer.toneMappingExposure = 0.85;
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
        map: softTexture(),
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: T.NormalBlending,
      }),
    );
    this.particleMesh.frustumCulled = false;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.cameras[0]);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new T.Vector2(100, 100), 0.22, 0.35, 1.6);
    this.composer.addPass(this.bloom);
    this.vignette = new ShaderPass({
      uniforms: { tDiffuse: { value: null },boost:{value:0},time:{value:0} },
      vertexShader:
        "varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        `uniform sampler2D tDiffuse;uniform float boost,time;varying vec2 uv0;
        void main(){vec2 uv=uv0;
        float heat=exp(-pow((uv.x-.5)*9.,2.)-pow((uv.y-.2)*9.,2.));
        uv.x+=sin(uv.y*140.+time*33.)*heat*boost*.003;
        vec4 c=texture2D(tDiffuse,uv);
        for(int i=1;i<5;i++)c+=texture2D(tDiffuse,mix(uv,vec2(.5),float(i)*.004*boost));
        c*=.2;float v=1.-smoothstep(.2,.8,distance(uv0,vec2(.5)));
        gl_FragColor=vec4(c.rgb*(.82+.18*v),c.a);}`,
    });
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());
    this.composer.renderToScreen=false;
    this.blitScene=new T.Scene();this.blitCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    this.blitMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tDiffuse:{value:null}},vertexShader:"varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:"uniform sampler2D tDiffuse;varying vec2 v;void main(){gl_FragColor=texture2D(tDiffuse,v);}"});
    this.blitScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.blitMaterial));
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  preview(canvas,type,color,time) {
    if(!this.previewRenderer){this.previewRenderer=new T.WebGLRenderer({alpha:true,antialias:true});this.previewRenderer.setSize(480,220);this.previewRenderer.toneMapping=T.ACESFilmicToneMapping;this.previewScene=new T.Scene();this.previewScene.add(new T.HemisphereLight(0xc9eaff,0x1c263c,2));const l=new T.DirectionalLight(0xffffff,3);l.position.set(5,8,8);this.previewScene.add(l);this.previewCamera=new T.PerspectiveCamera(36,480/220,.1,100);this.previewCamera.position.set(10,6,13);this.previewCamera.lookAt(0,0,0);}
    if(this.previewKey!==type+color){if(this.previewBoat)this.previewScene.remove(this.previewBoat);this.previewBoat?.traverse(o=>{o.geometry?.dispose();if(o.material){for(const v of Object.values(o.material))if(v?.isTexture)v.dispose();o.material.dispose();}});this.previewBoat=buildBoat(type,color);this.previewScene.add(this.previewBoat);this.previewKey=type+color;}
    this.previewScene.environment=this.scene.environment;this.previewBoat.rotation.y=time*.4;
    this.previewRenderer.render(this.previewScene,this.previewCamera);
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,480,220);ctx.drawImage(this.previewRenderer.domElement,0,0);
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
    this.splashes=[];this.shake=0;
    this.particles = [];this.wakeHistory=[];this.wakeClock=0;
    const theme = track.theme;
    this.scene.background = new T.Color(track.sky);
    this.scene.fog = new T.Fog(track.sky, 420, 1800);
    const hemi = new T.HemisphereLight(
      theme === "tropic" ? 0xccefff : 0x7f9bff,
      0x163a3b,
      theme === "tropic" ? 1.3 : 1.5,
    );
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(
      theme === "tropic" ? 0xfff2d4 : 0xc99bff,
      theme === "tropic" ? 2.1 : 1.8,
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
    this.scene.add(sun.target);this.sun=sun;
    // A bounded radiance sky keeps the horizon blue even before tone mapping.
    const sky=new T.Mesh(new T.SphereGeometry(1900,32,16),new T.ShaderMaterial({
      side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(theme==="tropic"?0x176ac0:theme==="ice"?0x172d61:0x030718)},bottom:{value:new T.Color(track.sky)}},
      vertexShader:"varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:"uniform vec3 top,bottom;varying vec3 p;void main(){float h=clamp(normalize(p).y,0.,1.);gl_FragColor=vec4(mix(bottom,top,sqrt(h)),1.);}"}));
    this.scene.add(sky);
    const disc=mesh(new T.SphereGeometry(theme==="tropic"?20:13,24,16),new T.MeshBasicMaterial({color:new T.Color(theme==="tropic"?0xffdf9b:0xabcfff).multiplyScalar(3)}),this.scene,700,theme==="tropic"?600:300,-1000);
    const glare=new T.Sprite(new T.SpriteMaterial({map:softTexture(),color:theme==="tropic"?0xffc46d:0x81aaff,transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false}));
    glare.position.copy(disc.position);glare.scale.set(140,140,1);this.scene.add(glare);
    const envScene=new T.Scene();envScene.add(sky.clone());envScene.add(disc.clone());
    this.reflectionTarget?.dispose();this.reflectionTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
    new T.CubeCamera(.5,2100,this.reflectionTarget).update(this.renderer,envScene);
    const pmrem=new T.PMREMGenerator(this.renderer);
    this.environment?.dispose();this.environment=pmrem.fromCubemap(this.reflectionTarget.texture);
    this.scene.environment=this.environment.texture;pmrem.dispose();
    this.waterUniforms = {
      time: { value: 0 },
      environmentMap:{value:this.reflectionTarget.texture},
      baseColor: { value: new T.Color(track.water) },
      skyColor: {
        value: new T.Color(
          theme === "tropic" ? 0x9edfff : theme === "ice" ? 0x8478b7 : 0x133d69,
        ),
      },
      sunDir: { value: sun.position.clone().normalize() },
      wakes: {
        value: Array.from(
          { length: 64 },
          () => new T.Vector4(10000, 10000, 0, 0),
        ),
      },
      shore: {
        value: Array.from({length:128},(_,i)=>track.samples[Math.floor(i*track.samples.length/128)]).map(p=>new T.Vector3(p.x,p.z,p.width)),
      },
      width: { value: track.width },
      blockers: {
        value: track.obstacles.map((o) => new T.Vector4(o.x, o.z, o.radius, 0)),
      },
    };
    this.waterUniforms.shortcuts={value:track.shortcuts.map(({a,b})=>new T.Vector4(a.x,a.z,b.x,b.z))};
    const waterMat = new T.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
    });
    const waterGeo = new T.PlaneGeometry(
      2600,
      2600,
      [160, 240, 420, 560][this.settings.quality],
      [160, 240, 420, 560][this.settings.quality],
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
    addEnvironment(this.scene,track);
    track.ramps.forEach((r) => {
      const group = new T.Group();
      group.position.set(r.x, r.height/2, r.z);
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
        Math.hypot(r.length,r.height),
      );
      deck.rotation.x = -Math.atan2(r.height,r.length);
      for(const side of [-1,1]) for(const z of [-6,6]) box(group,darkMaterial(),side*4,-r.height/2,z,.5,r.height,.5);
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
        side: T.FrontSide,
        toneMapped: false,
      }),
      arch,
      0,
      13,
      0,
    );
    sign.rotation.y=Math.PI;
    const reverse=sign.clone();reverse.rotation.y=0;reverse.position.z=.05;arch.add(reverse);
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
    // Capture the built environment as well as the sky, including city windows.
    this.water.visible=false;
    const reflectionCamera=new T.CubeCamera(.5,2100,this.reflectionTarget);
    reflectionCamera.position.set(start.x,5,start.z);reflectionCamera.update(this.renderer,this.scene);
    this.water.visible=true;
    const finalPmrem=new T.PMREMGenerator(this.renderer);this.environment.dispose();
    this.environment=finalPmrem.fromCubemap(this.reflectionTarget.texture);this.scene.environment=this.environment.texture;finalPmrem.dispose();
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
        vy: landing ? 6 + Math.random() * 7 : 2 + Math.random() * Math.abs(b.speed)*.22,
        life: 0.4 + Math.random() * 0.5,
        color: new T.Color(0xabeaff),
      });
    }
  }
  update(boats, time, dt) {
    this.waterUniforms.time.value = time;
    this.wakeClock+=dt;
    if(this.wakeClock>.15){this.wakeClock=0;for(const b of boats)if(Math.abs(b.speed)>8)this.wakeHistory.unshift({x:b.x,z:b.z,heading:b.heading,life:1});}
    this.wakeHistory=this.wakeHistory.filter(p=>(p.life-=dt*.18)>0).slice(0,56);
    for(let i=8;i<64;i++){const p=this.wakeHistory[i-8];this.waterUniforms.wakes.value[i].set(p?.x??10000,p?.z??10000,p?.heading||0,p?.life||0);}
    this.scene.traverse(o=>{if(o.userData.traffic)o.position.x=((time*9+o.id*7)%40)-20;if(o.userData.hologram){o.material.opacity=.22+Math.sin(time*5)*.06;o.position.y=29+Math.sin(time)*.4;}});
    boats.forEach((b, i) => {
      let model = this.boatModels.get(b.id);
      if (!model) {
        model = buildBoat(b.type, b.color);
        this.boatModels.set(b.id, model);
        this.scene.add(model);
      }
      model.traverse(o=>{if(o.name==="flame"){o.visible=b.boosting;o.scale.y=.8+Math.random()*.5;}});
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
      if ((b.landSerial||0)!==(model.userData.landSerial||0)) {
        model.userData.landSerial=b.landSerial;
        this.spray(b, 55, true);this.shake=.7;
        const ring=mesh(new T.RingGeometry(1,1.5,40),new T.MeshBasicMaterial({color:0xc5f1ff,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}),this.scene,b.x,.9,b.z);
        ring.rotation.x=-Math.PI/2;this.splashes.push({mesh:ring,life:1});
      }
      if(b.local&&b.boosting)this.shake=Math.max(this.shake,.12);
      if(Math.abs(b.speed)>20 && Math.random()<.6) {
        const side=Math.random()<.5?-1:1;
        this.particles.push({x:b.x+Math.sin(b.heading)*2+Math.cos(b.heading)*side*1.5,z:b.z+Math.cos(b.heading)*2-Math.sin(b.heading)*side*1.5,y:b.y,vx:b.vx*.3+Math.cos(b.heading)*side*(b.drifting?12:5),vz:b.vz*.3-Math.sin(b.heading)*side*5,vy:2+Math.random()*3,life:.6,color:new T.Color(0xbce4ee)});
      }
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
    this.shake=Math.max(0,this.shake-dt*1.8);
    this.splashes=this.splashes.filter(s=>{s.life-=dt;const scale=1+(1-s.life)*13;s.mesh.scale.setScalar(scale);s.mesh.material.opacity=s.life*.6;if(s.life<=0){this.scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();return false;}return true;});
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
      const fov = 64 + Math.min(15,Math.abs(b?.speed||0)*.2) + (b?.boosting?12:0);
      c.fov += (fov - c.fov) * Math.min(1, dt * 5);
      c.updateProjectionMatrix();
      if (b) {
        const distance = b.cameraView ? -2 : 14 + Math.abs(b.speed) * 0.10;
        tmp.set(
          b.x - Math.sin(b.heading) * distance,
          b.y + (b.cameraView?1.6:6 + Math.abs(b.speed) * 0.025),
          b.z - Math.cos(b.heading) * distance,
        );
        c.position.lerp(tmp, 1 - Math.exp(-dt * 4.5));
        c.position.x+=Math.sin(time*61)*this.shake*.2;c.position.y+=Math.sin(time*73)*this.shake*.3;
        c.up.set(Math.sin((b.roll||0)*.2),1,0);
        const ahead=this.track.samples[(nearest(this.track,b.x,b.z).index+10)%this.track.samples.length];
        const lookHeading=b.heading+(ahead?Math.atan2(Math.sin(ahead.heading-b.heading),Math.cos(ahead.heading-b.heading))*.3:0);
        c.lookAt(
          b.x + Math.sin(lookHeading) * 25,
          b.y + 1,
          b.z + Math.cos(lookHeading) * 25,
        );
      } else {
        c.position.set(
          Math.sin(time * 0.06) * 330,
          130,
          Math.cos(time * 0.06) * 330,
        );
        c.lookAt(0, 0, 0);
      }
      if(b?.finished) {c.position.set(b.x+Math.sin(time*.4+1)*18,b.y+6,b.z+Math.cos(time*.4+1)*18);c.lookAt(b.x,b.y,b.z);}
      if(b) {
        this.sun.target.position.set(b.x,0,b.z);this.sun.position.set(b.x+120,220,b.z-150);
        Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65});this.sun.shadow.camera.updateProjectionMatrix();
      }
      r.setScissorTest(false);
      if(this.postWidth!==w||this.postHeight!==h){this.composer.setSize(w,h);this.postWidth=w;this.postHeight=h;}
      this.vignette.uniforms.boost.value=b?.boosting?1:0;this.vignette.uniforms.time.value=time;
      this.renderPass.camera=c;
      this.composer.render();
      r.setRenderTarget(null);r.setViewport(x,y,w,h);r.setScissor(x,y,w,h);r.setScissorTest(true);
      this.blitMaterial.uniforms.tDiffuse.value=this.composer.readBuffer.texture;
      r.autoClear=false;r.render(this.blitScene,this.blitCamera);r.autoClear=true;
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
