import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {assets,preloadAssets,skyLighting,mergeStatic} from '../src/assets.js';

test('asset loading reports failure, retries, tracks progress and caches concurrent requests without binary fixtures',async()=>{
 const originalFetch=globalThis.fetch,originals=[GLTFLoader.prototype.loadAsync,HDRLoader.prototype.loadAsync,T.TextureLoader.prototype.loadAsync];
 try{
  globalThis.fetch=async()=>({ok:false});await assert.rejects(preloadAssets(),/Missing asset manifest/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({models:['fixture'],textures:['rock_diff'],fields:['shore_tropic']})});
  let loads=0;
  GLTFLoader.prototype.loadAsync=async()=>{loads++;const scene=new T.Group();scene.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));return {scene};};
  HDRLoader.prototype.loadAsync=T.TextureLoader.prototype.loadAsync=async()=>{loads++;return new T.Texture();};
  const progress=[],first=preloadAssets((fraction)=>progress.push(fraction)),second=preloadAssets();assert.equal(first,second);await first;
  assert.equal(loads,9);assert.equal(progress.at(-1),1);await preloadAssets();assert.equal(loads,9);
  assert.equal(assets.models.get('fixture').children[0].geometry.userData.shared,true);
  assert.equal(assets.textures.get('shore_tropic').flipY,false);assert.equal(assets.textures.get('shore_tropic').wrapS,T.ClampToEdgeWrapping);
  assert.equal(assets.textures.get('rock_diff').colorSpace,T.SRGBColorSpace);
 }finally{globalThis.fetch=originalFetch;[GLTFLoader.prototype.loadAsync,HDRLoader.prototype.loadAsync,T.TextureLoader.prototype.loadAsync]=originals;}
});

test('static batching preserves instance and animated objects; HDR light follows radiance',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial();for(let i=0;i<3;i++){const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.x=i*2;scene.add(mesh);}
 const animated=new T.Mesh(new T.BoxGeometry(),material);animated.userData.keep=true;scene.add(animated);mergeStatic(scene);assert.equal(scene.children.length,2);assert.ok(scene.children.includes(animated));
 const data=new Float32Array(8*4*4).fill(.2);data[(0*8+2)*4]=100;
 const lighting=skyLighting({image:{data,width:8,height:4},type:T.FloatType});assert.ok(lighting.direction.y>0);assert.ok(Number.isFinite(lighting.horizon.r));assert.ok(Math.abs(lighting.direction.length()-1)<1e-6);
});


test('desktop asset URLs stay inside the bundled directory',async()=>{
 const {createRequire}=await import('node:module'),path=await import('node:path');const {resolveAssetUrl}=createRequire(import.meta.url)('../electron/assets.cjs');const root=path.resolve('dist/assets');
 assert.equal(resolveAssetUrl('riptide-assets://bundle/models/sf_speedboat2.glb',root),path.join(root,'models/sf_speedboat2.glb'));
 for(const url of ['https://example.com/x.glb','riptide-assets://other/a.glb','riptide-assets://bundle/%2e%2e%5csecret.txt','riptide-assets://bundle/C:/secret.txt','riptide-assets://bundle/main.cjs'])assert.equal(resolveAssetUrl(url,root),null);
});
