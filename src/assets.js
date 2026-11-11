import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const assets={models:new Map(),textures:new Map(),skies:new Map()};
export let environmentTier=0;
let environmentManifest;
export async function loadEnvironmentAssets(quality=0){
 const manifest=environmentManifest;if(!manifest)return;
 const lod=quality<2?1:0;
 for(const r of (manifest.environment??[]).filter(r=>r.lod===lod||quality>=2)){
  if(assets.models.has(r.id))continue;const g=await new GLTFLoader().loadAsync(base+'models/'+r.id+'.glb');
  g.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.userData.shared=true;m.forceSinglePass=true;m.alphaToCoverage=true;if(m.transparent){m.transparent=false;m.alphaTest=.45;}for(const t of Object.values(m))if(t?.isTexture)t.userData.shared=true;}});assets.models.set(r.id,g.scene);
 }
 const textureNames=quality>=2?(manifest.highTextures??[]).filter(n=>!n.endsWith('_disp')||['hi_sand_disp','hi_snow_disp'].includes(n)):(manifest.textures??[]).filter(n=>!n.endsWith('_disp'));
 for(const name of textureNames){if(assets.textures.has(name))continue;const t=await new T.TextureLoader().loadAsync(base+'textures/'+name+'.jpg');t.wrapS=t.wrapT=T.RepeatWrapping;t.userData.shared=true;if(name.endsWith('_diff'))t.colorSpace=T.SRGBColorSpace;assets.textures.set(name,t);}
 environmentTier=quality;
}
// Call only after the previous scenery has been detached. Returning to Low releases 2k resources.
export function releaseEnvironmentTier(quality){
 if(quality>=2)return;
 const textures=new Set(),materials=new Set(),geometries=new Set();
 for(const [id,source] of assets.models)if(/^ph_.*_lod0$/.test(id)){
  source.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});assets.models.delete(id);
 }
 for(const [id,t] of assets.textures)if(id.startsWith('hi_')){textures.add(t);assets.textures.delete(id);}
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.image?.close?.();});
}
const base=globalThis.location?.protocol==='file:'?'riptide-assets://bundle/':(import.meta.env?.BASE_URL ?? './')+'assets/';
// Legacy Sketchfab specular/glossiness paint is converted to current PBR parameters.
export function boatMaterialExtension(parser){return {
 name:'KHR_materials_pbrSpecularGlossiness',
 getMaterialType(index){if(parser.json.materials[index].extensions?.[this.name])return T.MeshStandardMaterial;return null;},
 extendMaterialParams(index,params){const ext=parser.json.materials[index].extensions?.[this.name];if(!ext)return Promise.resolve();const c=ext.diffuseFactor??[1,1,1,1];params.color=new T.Color().setRGB(...c.slice(0,3));params.opacity=c[3];params.metalness=0;params.roughness=1-(ext.glossinessFactor??1);return ext.diffuseTexture?parser.assignTexture(params,'map',ext.diffuseTexture,T.SRGBColorSpace):Promise.resolve();}
 };}
let pending;
export function preloadAssets(progress=()=>{},quality=0) {
 if(pending)return pending;
 pending=(async()=>{
  const manifest=await fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error('Missing asset manifest');return r.json();});
  environmentManifest=manifest;
  const jobs=[...manifest.models.map(m=>['model',m]),...manifest.textures.filter(n=>!n.endsWith('_disp')&&(quality<2||n==='water_normal')).map(m=>['texture',m]),...(manifest.fields??[]).map(m=>['field',m]),...['spray','foam','flame'].map(m=>['sprite',m]),...['tropic','ice','city'].map(m=>['sky',m])];let done=0;
  for(const [kind,name] of jobs){
   const url=base+(kind==='model'?'models/'+name+'.glb':kind==='sky'?'skies/'+name+'.hdr':kind==='sprite'?'sprites/'+name+'.png':'textures/'+name+(kind==='field'?'.png':'.jpg'));
   try {
    if(kind==='model'){const g=await new GLTFLoader().register(boatMaterialExtension).loadAsync(url);assets.models.set(name,g.scene);g.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.shared=true;for(const t of Object.values(m))if(t?.isTexture)t.userData.shared=true;}});}
    else if(kind==='sky'){const t=await new HDRLoader().loadAsync(url);t.mapping=T.EquirectangularReflectionMapping;t.userData.shared=true;assets.skies.set(name,t);}
    else {const t=await new T.TextureLoader().loadAsync(url);t.wrapS=t.wrapT=kind==='field'?T.ClampToEdgeWrapping:T.RepeatWrapping;if(kind==='field')t.flipY=false;t.userData.shared=true;if(name.endsWith('_diff'))t.colorSpace=T.SRGBColorSpace;assets.textures.set(name,t);}
    progress(++done/jobs.length,name);
   }catch(e){throw Error('Could not load '+url+': '+e.message);}
  }
  await loadEnvironmentAssets(quality);
 })().catch(e=>{pending=null;throw e;});return pending;
}
export function surface(name,color=0xffffff){const key=environmentTier>=2&&assets.textures.has('hi_'+name+'_diff')?'hi_'+name:name;return new T.MeshStandardMaterial({color:name==='ice'?0xa8cbd7:color,map:assets.textures.get(key+'_diff')??null,normalMap:assets.textures.get(key+'_nor_gl')??null,roughnessMap:assets.textures.get(key+'_rough')??null,aoMap:assets.textures.get(key+'_ao')??null,aoMapIntensity:.65,roughness:name==='ice'?.2:.85,metalness:name==='metal'?.7:0});}
export function model(name){const source=assets.models.get(name);if(!source)throw Error('Model not loaded: '+name);return source.clone(true);}
// Flatten imported model primitives into one draw per material, retaining their authored palette.
export function instanceModel(scene,name,placements){
 const source=model(name);source.updateMatrixWorld(true);const buckets=new Map();
 source.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.length!==1)return;let m=mats[0];const key=m.uuid;if(!buckets.has(key))buckets.set(key,{m,geos:[]});let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);buckets.get(key).geos.push(g);});
 for(const bucket of buckets.values()){let {m,geos}=bucket;const geo=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(!geo)continue;
 if(name==='rock'){m=surface('rock');const a=geo.attributes.position,uv=[];for(let i=0;i<a.count;i++)uv.push(a.getX(i)*.25,(a.getZ(i)+a.getY(i))*.25);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}
 if(name.startsWith('building')||name==='station'){m=m.clone();m.userData.shared=false;m.roughness=.6;m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat windows=smoothstep(.02,.12,diffuseColor.b-diffuseColor.r)*smoothstep(.08,.35,diffuseColor.b);totalEmissiveRadiance+=vec3(.18,.65,1.)*windows*1.5;');};m.customProgramCacheKey=()=> 'harbor-windows-v1';}
 if(environmentTier===0&&m.alphaTest>0){m=new T.MeshBasicMaterial({map:m.map,color:m.color,alphaTest:Math.max(.4,m.alphaTest),side:m.side,alphaToCoverage:true});m.forceSinglePass=true;}
 const instances=new T.InstancedMesh(geo,m,placements.length),d=new T.Object3D();placements.forEach((p,i)=>{d.position.set(p.x,p.y||0,p.z);d.rotation.set(p.rx||0,p.ry||0,p.rz||0);d.scale.setScalar(p.scale||1);d.updateMatrix();instances.setMatrixAt(i,d.matrix);if(name.startsWith('ph_'))instances.setColorAt(i,new T.Color().setRGB(.88+(i%5)*.025,.91+(i%3)*.025,.86+(i%4)*.03));});instances.name=name;instances.castShadow=instances.receiveShadow=true;scene.add(instances);}
}
export function mergeStatic(scene){
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{let parent=o,keep=false;while(parent){keep||=!!parent.userData.keep;parent=parent.parent;}if(!o.isMesh||o.isInstancedMesh||keep||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial||o.name==='boat'||o.userData.hologram||o.userData.traffic)return;const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
 for(const items of batches.values()){if(items.length<2)continue;const gs=items.map(o=>{let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);return g;});const g=mergeGeometries(gs);gs.forEach(x=>x.dispose());if(!g)continue;const m=new T.Mesh(g,items[0].material);m.castShadow=m.receiveShadow=true;scene.add(m);items.forEach(o=>{o.removeFromParent();if(!o.geometry.userData.shared)o.geometry.dispose();});}
}

// Derive the key-light bearing and fog from the actual HDR radiance, not a guessed sun position.
export function skyLighting(texture){
 const {data,width,height}=texture.image;let peak=0,best=[width/2,height/4];const red=[],green=[],blue=[];
 const value=i=>texture.type===T.HalfFloatType?T.DataUtils.fromHalfFloat(data[i]):data[i];
 for(let y=0;y<height*.5;y+=2)for(let x=0;x<width;x+=2){const i=(y*width+x)*4,lum=value(i)*.2126+value(i+1)*.7152+value(i+2)*.0722;if(lum>peak){peak=lum;best=[x,y];}}
 for(let x=0;x<width;x+=4){const i=(Math.floor(height*.46)*width+x)*4;red.push(value(i));green.push(value(i+1));blue.push(value(i+2));}
 const lon=(best[0]/width-.5)*Math.PI*2,lat=(.5-best[1]/height)*Math.PI;
 const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];const horizon=new T.Color(median(red),median(green),median(blue));
 const i=(best[1]*width+best[0])*4,sunColor=new T.Color(value(i),value(i+1),value(i+2));sunColor.multiplyScalar(1/Math.max(sunColor.r,sunColor.g,sunColor.b,.001));
 return {direction:new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.max(.12,Math.sin(lat)),Math.cos(lat)*Math.sin(lon)).normalize(),horizon,sunColor};
}
