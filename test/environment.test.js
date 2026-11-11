import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {addEnvironment} from '../src/environment.js';
import {makeTrack,nearest,onShortcut} from '../src/core/tracks.js';
test('rebuilt shores leave the race and shortcuts clear, with five landmarks per track',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 try{for(let trackId=0;trackId<3;trackId++){
  const track=makeTrack(trackId),scene=new T.Scene();addEnvironment(scene,track,0);
  assert.equal(scene.children.filter(o=>o.userData.landmark).length,5);
  const banks=scene.children.filter(o=>o.isMesh&&!o.isInstancedMesh&&o.material.customProgramCacheKey().startsWith('terrain-'));
  assert.equal(banks.length,2);
  for(const bank of banks){const p=bank.geometry.attributes.position,index=bank.geometry.index;assert.ok([...p.array].every(Number.isFinite));
   for(let i=0;i<index.count;i+=3){let x=0,z=0;for(let j=0;j<3;j++){const v=index.getX(i+j);x+=p.getX(v)/3;z+=p.getZ(v)/3;}const n=nearest(track,x,z);assert.ok(n.distance>=n.point.width/2-.51,'bank enters racing channel');assert.equal(onShortcut(track,x,z),false,'bank obstructs shortcut');}
  }
  const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }}finally{globalThis.document=original;}
});
