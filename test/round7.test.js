import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as T from 'three';
import {assets} from '../src/assets.js';
import {addEnvironment,terrainMaterial} from '../src/environment.js';
import {makeTrack,nearest} from '../src/core/tracks.js';

test('Low shader budget and planar snow transitions exclude auxiliary terrain maps',()=>{
 for(const theme of ['tropic','ice','city'])for(const quality of [0,1,2,3]){
  const m=terrainMaterial(theme,quality),shader={uniforms:{},vertexShader:T.ShaderLib[quality===0?'lambert':'standard'].vertexShader,fragmentShader:T.ShaderLib[quality===0?'lambert':'standard'].fragmentShader};m.onBeforeCompile(shader);
  assert.equal(m.aoMap,null);assert.equal(m.roughnessMap,null);assert.equal(m.displacementMap,null);
  assert.equal((shader.fragmentShader.match(/texture2D\(/g)??[]).length,quality===0?2:3);
  assert.ok(shader.fragmentShader.includes('getTangentFrame(-vViewPosition,normal,landUV)'));
  assert.ok(!shader.fragmentShader.includes('cliffUV'));assert.ok(!shader.fragmentShader.includes('landPosition.yz'));
  assert.ok(!shader.fragmentShader.includes('smoothstep(2.,8.,landPosition.y)'));m.dispose();
 }
});

test('bundled Low scenery is instanced on both shores across all five course sectors',async()=>{
 const manifest=JSON.parse(readFileSync('public/assets/manifest.json')),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),saved=new Map(assets.models),original=globalThis.document;
 const sources=[];globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 try{
  for(const entry of manifest.environment.filter(e=>e.lod===1)){
   const doc=await io.read('public/assets/models/'+entry.id+'.glb'),source=new T.Group();
   const mats=new Map(doc.getRoot().listMaterials().map(m=>[m,new T.MeshStandardMaterial({map:m.getBaseColorTexture()?new T.Texture():null})]));
   const node=n=>{const g=new T.Group();g.applyMatrix4(new T.Matrix4().fromArray(n.getMatrix()));for(const p of n.getMesh()?.listPrimitives()??[]){const geo=new T.BufferGeometry();for(const [semantic,key] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=p.getAttribute(semantic);if(a)geo.setAttribute(key,new T.BufferAttribute(a.getArray(),a.getElementSize()));}if(p.getIndices())geo.setIndex(new T.BufferAttribute(p.getIndices().getArray(),1));g.add(new T.Mesh(geo,mats.get(p.getMaterial())));}for(const c of n.listChildren())g.add(node(c));return g;};
   for(const n of doc.getRoot().listScenes()[0].listChildren())source.add(node(n));assets.models.set(entry.id,source);sources.push(source);
  }
  for(const trackId of [0,1]){
   const scene=new T.Scene(),track=makeTrack(trackId);addEnvironment(scene,track,0);
   const occupied=new Set(),matrix=new T.Matrix4(),point=new T.Vector3();let trees=0,rocks=0;
   scene.traverse(o=>{if(!o.isInstancedMesh||!o.name.startsWith('ph_'))return;for(let i=0;i<o.count;i++){
    o.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);const n=nearest(track,point.x,point.z),side=Math.sign((point.x-n.point.x)*Math.cos(n.point.heading)-(point.z-n.point.z)*Math.sin(n.point.heading));
    if(/tree|pine/.test(o.name)){trees++;occupied.add(Math.floor(n.index/track.samples.length*5)+'/'+side);}
    if(o.name.includes('boulder'))rocks++;
   }});
   assert.ok(trees>=20,`${track.name}: trees ${trees}`);assert.ok(rocks>=20);assert.equal(occupied.size,10,`${track.name}: both banks in every sector`);
   const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }
 }finally{globalThis.document=original;assets.models.clear();for(const [k,v] of saved)assets.models.set(k,v);for(const s of sources)s.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});}
});
