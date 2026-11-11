import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrack,nearest} from '../src/core/tracks.js';
import {createBoat,stepBoat,stepWorld,wave,WAVES,WAVE_STEEPNESS,resetBoat} from '../src/core/physics.js';
import {aiInput} from '../src/core/ai.js';
import {waterVertex} from '../src/water.js';
test('three difficulty levels finish every three-lap course; expert is faster',()=>{
 for(let t=0;t<3;t++){
  const times=[];
  for(let d=0;d<3;d++){
   const track=makeTrack(t),boats=Array.from({length:6},(_,i)=>createBoat(track,i));
   for(let f=0;f<60*420&&!boats.every(b=>b.finished);f++)stepWorld(boats,track,1/60,f/60,3,boats.map(b=>aiInput(b,track,d,Math.max(...boats.map(b=>b.progress)),boats)));
   assert.ok(boats.every(b=>b.finished),`${track.name} difficulty ${d} must finish`);
   times.push(boats.reduce((s,b)=>s+b.finishTime,0)/boats.length);
  }
  console.log(`${makeTrack(t).name}: cruise/racer/expert ${times.map(t=>t.toFixed(1)).join('/')}s`);
  assert.ok(times[2]<times[1]&&times[1]<times[0]);
 }
});
function crosses(a,b,c,d){const orient=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);return orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;}
test('continuous bank boundaries do not self intersect; race objects stay in the channel',()=>{
 for(let t=0;t<3;t++){
  const track=makeTrack(t);
  for(const side of [-1,1]){
   const edge=track.samples.map(p=>({x:p.x+Math.cos(p.heading)*p.width/2*side,z:p.z-Math.sin(p.heading)*p.width/2*side}));
   for(let i=0;i<edge.length;i++)for(let j=i+2;j<edge.length;j++){if(i===0&&j===edge.length-1)continue;assert.ok(!crosses(edge[i],edge[(i+1)%edge.length],edge[j],edge[(j+1)%edge.length]),`wall intersection ${t}/${i}/${j}`);}
  }
  for(const p of [...track.pickups,...track.ramps]){const n=nearest(track,p.x,p.z);assert.ok(n.distance+(p.width||2)/2<n.point.width/2);}
  const b=createBoat(track);b.checkpoint=track.checkpointCount-1;resetBoat(b,track);assert.equal(b.x,track.samples[b.checkpoint*track.samplesPerSector].x);
 }
});
test('water shader coefficients match buoyancy and analytic normals match finite differences',()=>{
 for(const [a,k,x,z,s] of WAVES){assert.ok(waterVertex.includes(k.toFixed(4)));assert.ok(waterVertex.includes(s.toFixed(3)));assert.ok(waterVertex.includes(a.toFixed(3)));}
 // Reconstruct a GPU vertex using the shared coefficients, then sample its world location.
 for(let i=0;i<100;i++) {
   const u=i*2.3,v=-i*4.1,t=i*.17;let x=u,z=v,height=0;
   for(const [a,k,dx,dz,s] of WAVES){const q=k*(dx*u+dz*v)-s*t;x+=a*WAVE_STEEPNESS*dx*Math.cos(q);z+=a*WAVE_STEEPNESS*dz*Math.cos(q);height+=a*Math.sin(q);}
   assert.ok(Math.abs(wave(x,z,t).height-height)<1e-6);
 }
 for(let i=0;i<100;i++){const x=i*3.17,z=i*-2.71,t=i*.137,h=.001,w=wave(x,z,t);assert.ok(Math.abs(w.nx-(wave(x+h,z,t).height-wave(x-h,z,t).height)/(2*h))<1e-7);assert.ok(Math.abs(w.nz-(wave(x,z+h,t).height-wave(x,z-h,t).height)/(2*h))<1e-7);}
});

test('ramps support the hull before takeoff and deliver a substantial jump',()=>{
 const track=makeTrack(0),r=track.ramps[0],b=createBoat(track);
 Object.assign(b,{x:r.x-Math.sin(r.heading)*8,z:r.z-Math.cos(r.heading)*8,heading:r.heading,speed:50,vx:Math.sin(r.heading)*50,vz:Math.cos(r.heading)*50,y:1});
 let ramp=false,highest=0;
 for(let i=0;i<100;i++){stepBoat(b,{throttle:1},track,1/60,i/60);ramp ||= b.events.includes('ramp');highest=Math.max(highest,b.y);}
 assert.ok(ramp,'crossing the launch lip must launch the boat');assert.ok(highest>6,'jump must clear the ramp with useful airtime');
});
test('camera action uses a press latch and wall impacts preserve forward motion',()=>{
 const track=makeTrack(0),b=createBoat(track);
 stepBoat(b,{camera:1},track,1/60,0);assert.equal(b.cameraView,true);
 stepBoat(b,{camera:1},track,1/60,.016);assert.equal(b.cameraView,true);
 stepBoat(b,{},track,1/60,.032);stepBoat(b,{camera:1},track,1/60,.048);assert.equal(b.cameraView,false);
 const p=track.samples[30];Object.assign(b,{x:p.x+Math.cos(p.heading)*(p.width/2+1),z:p.z-Math.sin(p.heading)*(p.width/2+1),heading:p.heading,speed:45,vx:Math.sin(p.heading)*45+Math.cos(p.heading)*10,vz:Math.cos(p.heading)*45-Math.sin(p.heading)*10});
 stepBoat(b,{throttle:1},track,1/60,1);assert.ok(b.events.includes('scrape'));assert.ok(b.vx*Math.sin(p.heading)+b.vz*Math.cos(p.heading)>35);
});
