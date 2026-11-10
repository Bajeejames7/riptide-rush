import * as T from "three";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { addEnvironment } from "./scenery.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { nearest } from "./core/tracks.js";
import { waterVertex, waterFragment } from "./water.js";
import {assets,model,surface,mergeStatic,skyLighting} from './assets.js';
const tmp = new T.Vector3();
let palette=new Map();
function material(color, metalness = 0.2, roughness = 0.35) {
 const key=[color,metalness,roughness].join('/');if(!palette.has(key))palette.set(key,new T.MeshStandardMaterial({ color, metalness, roughness }));return palette.get(key);
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
export function buildBoat(type,color,number=type+1) {
 const g=new T.Group();g.name='boat';g.userData.keep=true;
 const hull=model('boat'+type);const bounds=new T.Box3().setFromObject(hull),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=8/Math.max(size.x,size.z);hull.position.sub(center);const shell=new T.Group();shell.add(hull);shell.scale.setScalar(scale);shell.rotation.y=0;g.add(shell);
 hull.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.material=o.material.clone();o.material.userData.shared=false;o.material.metalness=.35;o.material.roughness=.3;o.material.envMapIntensity=1.15; o.material.onBeforeCompile=shader=>{shader.uniforms.racePaint={value:new T.Color(color)};shader.fragmentShader='uniform vec3 racePaint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat chroma=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));\ndiffuseColor.rgb=mix(diffuseColor.rgb,racePaint*max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)),smoothstep(.12,.3,chroma));');};o.material.customProgramCacheKey=()=> 'race-paint-v1';});
 const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,128,64);ctx.fillStyle='white';ctx.font='bold italic 50px sans-serif';ctx.textAlign='center';ctx.fillText(String(number).padStart(2,'0'),64,50);const decal=new T.CanvasTexture(c);decal.colorSpace=T.SRGBColorSpace;
 shell.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,8,1.7),new T.Vector3(0,-1,0)),hit=ray.intersectObject(shell,true)[0];
 const plate=mesh(new T.PlaneGeometry(1.4,.7),new T.MeshBasicMaterial({map:decal,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),g,0,hit?hit.point.y+.025:.8,1.7);plate.rotation.x=-Math.PI/2;
 if(hit){const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);plate.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);}

 for(const side of [-1,1]){const flame=new T.Sprite(new T.SpriteMaterial({map:assets.textures.get('flame')??null,color:0x77ccff,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));flame.position.set(side*.85,.1,-4);flame.scale.set(1.2,3,1);flame.name='flame';flame.visible=false;g.add(flame);}
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
        map: assets.textures.get('spray'),
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
    if(this.previewKey!==type+color){if(this.previewBoat)this.previewScene.remove(this.previewBoat);this.previewBoat?.traverse(o=>{if(!o.geometry?.userData.shared)o.geometry?.dispose();if(o.material){for(const v of Object.values(o.material))if(v?.isTexture&&!v.userData.shared)v.dispose();o.material.dispose();}});this.previewBoat=buildBoat(type,color);this.previewScene.add(this.previewBoat);this.previewKey=type+color;}
    this.previewEnvironments??=new Map();if(!this.previewEnvironments.has(this.track.theme)){const generator=new T.PMREMGenerator(this.previewRenderer);this.previewEnvironments.set(this.track.theme,generator.fromEquirectangular(assets.skies.get(this.track.theme)));generator.dispose();}this.previewScene.environment=this.previewEnvironments.get(this.track.theme).texture;this.previewBoat.rotation.y=time*.4;
    this.previewRenderer.render(this.previewScene,this.previewCamera);
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,480,220);ctx.drawImage(this.previewRenderer.domElement,0,0);
  }
  // True when the GPU is integrated/software, so first launch should default to Low.
  isWeakGpu() {
    const gl = this.renderer.getContext(),
      ext = gl.getExtension("WEBGL_debug_renderer_info"),
      name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    return /Intel|Microsoft Basic|SwiftShader|llvmpipe/i.test(name) && !/Arc/i.test(name);
  }
  // Dynamic resolution: drop render scale when frames run slow, creep back up when there is headroom.
  autoTune(dt) {
    this.dyn ??= 1;
    // Hitches (asset loading, shader compiles, tab switches) say nothing about steady-state speed.
    if (dt > 0.1) {
      this.tuneTime = this.tuneFrames = this.tuneBad = 0;
      return;
    }
    this.tuneTime = (this.tuneTime || 0) + dt;
    this.tuneFrames = (this.tuneFrames || 0) + 1;
    if (this.tuneTime < 1) return;
    const fps = this.tuneFrames / this.tuneTime;
    this.tuneTime = this.tuneFrames = 0;
    this.tuneCapAge = (this.tuneCapAge || 0) + 1;
    if (this.tuneCapAge > 30) this.tuneCap = 1; // retry full resolution every so often
    let next = this.dyn;
    if (fps < 50) {
      this.tuneGood = 0;
      this.tuneBad = (this.tuneBad || 0) + 1;
      if (this.tuneBad >= 2) {
        // A scale we just stepped up to that fails becomes the ceiling for a while.
        if (this.tuneRaised) {
          this.tuneCap = this.dyn / 1.12;
          this.tuneCapAge = 0;
        }
        next = Math.max(0.5, this.dyn * Math.max(0.8, Math.sqrt(fps / 58)));
        this.tuneBad = 0;
        this.tuneRaised = false;
      }
    } else if (fps > 57 && this.dyn < (this.tuneCap ?? 1)) {
      this.tuneBad = 0;
      this.tuneGood = (this.tuneGood || 0) + 1;
      if (this.tuneGood >= 2) {
        next = Math.min(this.tuneCap ?? 1, this.dyn * 1.12);
        this.tuneGood = 0;
        this.tuneRaised = true;
      }
    } else {
      this.tuneGood = this.tuneBad = 0;
      this.tuneRaised = false;
    }
    if (Math.abs(next - this.dyn) > 0.01) {
      this.dyn = next;
      this.resize();
    }
  }
  resize() {
    const q = [0.65, 0.85, 1, 1.25][this.settings.quality ?? 2];
    this.renderer.setPixelRatio(
      Math.min(2, devicePixelRatio) * this.settings.scale * q * (this.dyn ?? 1),
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.settings.quality===0?1:innerWidth,this.settings.quality===0?1:innerHeight);
    this.renderer.shadowMap.enabled = this.settings.quality > 0;
    this.bloom.enabled=this.settings.quality>0;
  }
  load(track) {
    palette=new Map();
    this.track = track;
    for (const child of [...this.scene.children]) {
      if (child !== this.particleMesh)
        child.traverse((o) => {
          if(!o.geometry?.userData.shared)o.geometry?.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (!m || m.userData.shared) continue;
            for (const value of Object.values(m))
              if (value?.isTexture && !value.userData.shared) value.dispose();
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
      theme === "tropic" ? 1.3 : theme === "ice" ? .65 : .35,
    );
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(
      theme === "tropic" ? 0xfff2d4 : 0xc99bff,
      theme === "tropic" ? 2.1 : theme === "ice" ? .7 : .25,
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
    const hdri=assets.skies.get(theme);this.scene.background=hdri;
    this.scene.backgroundIntensity=theme==='city'?.55:.85;
    const lighting=skyLighting(hdri);this.scene.fog=new T.Fog(lighting.horizon.multiplyScalar(this.scene.backgroundIntensity),330,1450);
    this.sunOffset=lighting.direction.multiplyScalar(260);sun.position.copy(this.sunOffset);
    this.reflectionTarget?.dispose();this.reflectionTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
    const skyScene=new T.Scene();skyScene.background=hdri;new T.CubeCamera(.5,2100,this.reflectionTarget).update(this.renderer,skyScene);
    this.environments??=new Map();if(!this.environments.has(theme)){const pmrem=new T.PMREMGenerator(this.renderer);this.environments.set(theme,pmrem.fromEquirectangular(hdri));pmrem.dispose();}this.environment=this.environments.get(theme);this.scene.environment=this.environment.texture;
    this.particleMesh.material.map=assets.textures.get('spray');this.particleMesh.material.needsUpdate=true;
    this.waterUniforms = {
      time: { value: 0 },
      shoreMap:{value:assets.textures.get('shore_'+theme)},
      detailMap:{value:assets.textures.get('water_normal')},foamMap:{value:assets.textures.get('foam')},
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
      width: { value: track.width },
      blockers: {
        value: track.obstacles.map((o) => new T.Vector4(o.x, o.z, o.radius, 0)),
      },
    };
    this.waterUniforms.shortcuts={value:track.shortcuts.map(({a,b})=>new T.Vector4(a.x,a.z,b.x,b.z))};
    const waterMat = new T.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: waterVertex,
      fragmentShader: '#define WAKE_COUNT '+(this.settings.quality===0?24:64)+'\n'+waterFragment,
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
    const rock = surface(theme==='ice'?'snow':'rock'),
      neon = new T.MeshStandardMaterial({
        color: 0x37e5ed,
        emissive: 0x1b9ec0,
        emissiveIntensity: 3,
      });
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
      g.userData.keep=true;
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
    this.pickupBatches=[];
    for(const large of [false,true]){
      const indices=track.pickups.map((p,i)=>p.large===large?i:-1).filter(i=>i>=0);if(!indices.length)continue;
      for(let part=0;part<2;part++){
        const source=this.pickupModels[indices[0]].children[part],batch=new T.InstancedMesh(source.geometry,source.material,indices.length);batch.userData.keep=true;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(batch);this.pickupBatches.push({batch,indices,part});
      }
    }
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
    mergeStatic(this.scene);
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
    if(!this.waterUniforms)return;
    this.waterUniforms.time.value = time;
    this.wakeClock+=dt;
    if(this.wakeClock>.15){this.wakeClock=0;for(const b of boats)if(Math.abs(b.speed)>8)this.wakeHistory.unshift({x:b.x,z:b.z,heading:b.heading,life:1});}
    this.wakeHistory=this.wakeHistory.filter(p=>(p.life-=dt*.18)>0).slice(0,56);
    for(let i=8;i<64;i++){const p=this.wakeHistory[i-8];this.waterUniforms.wakes.value[i].set(p?.x??10000,p?.z??10000,p?.heading||0,p?.life||0);}
    this.scene.traverse(o=>{if(o.userData.traffic)o.position.x=((time*9+o.id*7)%40)-20;if(o.userData.hologram){o.material.opacity=.22+Math.sin(time*5)*.06;o.position.y=29+Math.sin(time)*.4;}});
    boats.forEach((b, i) => {
      let model = this.boatModels.get(b.id);
      if (!model) {
        model = buildBoat(b.type, b.color, i+1);
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
        const ring=mesh(new T.PlaneGeometry(4,4),new T.MeshBasicMaterial({map:assets.textures.get("foam"),color:0xc5f1ff,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}),this.scene,b.x,.9,b.z);
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
    for(const {batch,indices,part} of this.pickupBatches){indices.forEach((index,j)=>{const group=this.pickupModels[index];group.scale.setScalar(group.visible?1:0);group.updateMatrixWorld(true);batch.setMatrixAt(j,group.children[part].matrixWorld);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}
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
    this.frameStats={views:[],maxCalls:0,maxTriangles:0};
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
        this.sun.target.position.set(b.x,0,b.z);this.sun.position.copy(this.sunOffset).add(new T.Vector3(b.x,0,b.z));
        Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65});this.sun.shadow.camera.updateProjectionMatrix();
      }
      if(this.settings.quality===0){r.setRenderTarget(null);r.setViewport(x,y,w,h);r.setScissor(x,y,w,h);r.setScissorTest(true);r.render(this.scene,c);const stats={calls:r.info.render.calls,triangles:r.info.render.triangles};this.frameStats.views.push(stats);this.frameStats.maxCalls=Math.max(this.frameStats.maxCalls,stats.calls);this.frameStats.maxTriangles=Math.max(this.frameStats.maxTriangles,stats.triangles);continue;}
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

