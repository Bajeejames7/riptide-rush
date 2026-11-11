import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {NodeIO} from '@gltf-transform/core';
import * as T from 'three';
import {assets} from '../src/assets.js';
import {buildBoat} from '../src/render.js';
import {BOATS} from '../src/core/physics.js';
import {BOAT_MODEL_IDS,boatDimensions,contactRadius} from '../src/core/boat-models.js';
const manifest=JSON.parse(readFileSync('public/assets/models/sf_boats.json','utf8'));
test('all six mapped boats have credited, bounded, self-contained shipped models',async()=>{
 assert.equal(manifest.length,6);assert.equal(BOAT_MODEL_IDS.length,BOATS.length);assert.equal(new Set(BOAT_MODEL_IDS).size,6);
 assert.deepEqual(BOAT_MODEL_IDS,['speedboat2','speedboat1','speedboat_vrpspu','myspeedboat','cyberpunk','futuristic']);
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
 for(const entry of manifest){
  assert.ok(entry.author&&entry.license&&entry.url.startsWith('https://sketchfab.com/'));
  assert.ok(entry.triangles<=13000);assert.equal(statSync('public/assets/'+entry.file).size,entry.bytes);
  const doc=await io.read('public/assets/'+entry.file);let triangles=0;
  const materials=new Map(doc.getRoot().listMaterials().map(m=>[m,new T.MeshStandardMaterial({name:m.getName()})]));
  for(const m of materials.values())m.userData.shared=true;
  function node(n){const group=new T.Group();group.applyMatrix4(new T.Matrix4().fromArray(n.getMatrix()));for(const p of n.getMesh()?.listPrimitives()??[]){const geo=new T.BufferGeometry();for(const [semantic,key] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['TANGENT','tangent']]){const a=p.getAttribute(semantic);if(a)geo.setAttribute(key,new T.BufferAttribute(a.getArray(),a.getElementSize()));}const indices=p.getIndices();if(indices)geo.setIndex(new T.BufferAttribute(indices.getArray(),1));triangles+=(indices?.getCount()??p.getAttribute('POSITION').getCount())/3;geo.userData.shared=true;group.add(new T.Mesh(geo,materials.get(p.getMaterial())));}for(const c of n.listChildren())group.add(node(c));return group;}
  const source=new T.Group();for(const n of doc.getRoot().listScenes()[0].listChildren())source.add(node(n));
  assert.equal(triangles,entry.triangles);assets.models.set('sf_'+entry.id,source);
 }
 for(let type=0;type<6;type++){
  const a=buildBoat(type,'#ff0000',1,0),b=buildBoat(type,'#00ff00',2,0);let tris=0,calls=0;
  a.traverse(o=>{if(o.isMesh){tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;calls++;}if(o.isSprite){tris+=2;calls++;}});
  assert.ok(tris*8<=100000);assert.ok(calls*8<=100);
  const am=[],bm=[];a.children[0].traverse(o=>{if(o.isMesh)am.push(o);});b.children[0].traverse(o=>{if(o.isMesh)bm.push(o);});
  am.forEach((o,i)=>{assert.equal(o.geometry,bm[i].geometry);if(o.material.name==='paint'){assert.notEqual(o.material,bm[i].material);assert.equal(o.material.color.getHexString(),'ff0000');assert.equal(bm[i].material.color.getHexString(),'00ff00');}else assert.equal(o.material,bm[i].material);});
  for(const mesh of am)if(mesh.material.name==='paint'){assert.equal(mesh.material.isMeshPhysicalMaterial,true);assert.ok('PHYSICAL' in mesh.material.defines);assert.equal(mesh.material.clearcoat,1);assert.equal(mesh.material.map,null);}
  assert.ok(Math.abs(a.userData.dimensions.length-8)<.02);assert.ok(Math.abs(a.userData.dimensions.width-boatDimensions(type).width)<.02);
  assert.ok(a.getObjectByName('flame').position.z<a.userData.dimensions.stern);
  assert.equal(contactRadius({type,heading:0},0,1),4);assert.equal(contactRadius({type,heading:0},1,0),boatDimensions(type).radius);
 }
});

test('legacy specular/glossiness boat loads through the production GLTF material extension',async()=>{
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const {boatMaterialExtension}=await import('../src/assets.js');
 const bytes=readFileSync('public/assets/models/sf_cyberpunk.glb');
 const gltf=await new GLTFLoader().register(boatMaterialExtension).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let paint;gltf.scene.traverse(o=>{if(o.material?.name==='paint')paint=o.material;});
 assert.ok(paint?.isMeshStandardMaterial);assert.ok(paint.roughness>.2&&paint.roughness<.3);
 assert.equal(paint.metalness,0);
});
