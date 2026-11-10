import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrack} from '../src/core/tracks.js';
import {createBoat,stepWorld,stepBoat} from '../src/core/physics.js';
import {aiInput} from '../src/core/ai.js';
import {EVENTS,TYPES,RIVALS,freshSave,unlocked,canEnter,createEvent,stepEvent,eventStars,completeEvent,loadSlots,saveSlots,upgrade} from '../src/core/career.js';
test('career ladder, gates, rival rewards, upgrades and three versioned save slots',()=>{
 assert.equal(EVENTS.length,35);for(let tier=0;tier<5;tier++){assert.equal(EVENTS.filter(e=>e.tier===tier).length,7);assert.ok(EVENTS.find(e=>e.tier===tier&&e.rival));}
 const s=freshSave();assert.deepEqual(unlocked(s).boats,[0,1]);assert.deepEqual(unlocked(s).tracks,[0]);assert.ok(canEnter(s,EVENTS[0]));assert.ok(!canEnter(s,EVENTS[7]));
 for(const e of EVENTS.slice(0,7))s.stars[e.id]=3;s.reputation=900;s.defeated=[0];assert.ok(canEnter(s,EVENTS[7]));assert.ok(unlocked(s).boats.includes(RIVALS[0].boat));assert.ok(upgrade(s,'engine'));assert.ok(!upgrade(s,'engine'));
 const storage={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};const slots=loadSlots(storage);slots[1]=s;saveSlots(storage,slots);assert.deepEqual(loadSlots(storage),slots);storage.value='{';assert.equal(loadSlots(storage).length,3);
});
test('elimination removes the last active boat at each interval and freezes it',()=>{
 const track=makeTrack(0),boats=Array.from({length:4},(_,i)=>createBoat(track,i));boats.forEach((b,i)=>{b.progress=100-i*10;b.position=i+1;});const e={...EVENTS.find(e=>e.type==='Elimination'),interval:2};const state=createEvent(e,boats);
 stepEvent(state,boats,2);assert.ok(boats[3].eliminated);const x=boats[3].x;stepBoat(boats[3],{throttle:1},track,.1,2.1,99);assert.equal(boats[3].x,x);stepEvent(state,boats,2);assert.equal(boats.filter(b=>b.eliminated).length,2);stepEvent(state,boats,2);assert.ok(state.done);assert.equal(boats[0].position,1);
});
test('all six career event types complete using real AI steering and physics',()=>{
 for(const type of TYPES){const e={...EVENTS.find(e=>e.type===type),laps:1,limit:180,par:120,interval:22,target:3};const track=makeTrack(e.track,e.reverse);const boats=Array.from({length:type==='Elimination'?4:type==='Race'||type==='Duel'?2:1},(_,i)=>createBoat(track,i));const state=createEvent(e,boats);
 for(let f=0;f<60*300&&!state.done;f++){const t=f/60;stepWorld(boats,track,1/60,t,['Boost Hunt','Checkpoint Rush'].includes(type)?999:1,boats.map((b,i)=>aiInput(b,track,i===0?2:0,0,boats)));stepEvent(state,boats,1/60);}
 assert.ok(state.done,type+' must end');assert.ok(eventStars(state,boats[0])>0,type+' AI must earn a star');const save=freshSave();assert.ok(completeEvent(save,state,boats[0])>0);assert.ok(save.reputation>0);
 }
});
test('reverse AI completes ordered laps on every track, with reversed grid and ramps',()=>{
 for(let i=0;i<3;i++){const track=makeTrack(i,true),forward=makeTrack(i),boats=[createBoat(track)];assert.ok(Math.cos(track.samples[0].heading-forward.samples[0].heading)<-.9);assert.equal(track.ramps.length,3);
 for(let f=0;f<60*200&&!boats[0].finished;f++)stepWorld(boats,track,1/60,f/60,2,boats.map(b=>aiInput(b,track,2,0,boats)));
 assert.equal(boats[0].lap,2,track.name);assert.ok(!boats[0].wrongWay);assert.equal(boats[0].lapTimes.length,2);
 }
});
test('all style categories award reputation and replayed stars retain the best result',()=>{
 const e=EVENTS[0],track=makeTrack(0),b=createBoat(track),other=createBoat(track,1);Object.assign(b,{x:0,z:0,y:1,speed:35,air:true,drifting:true,boosting:true,position:2});Object.assign(other,{x:7,z:0,y:1});const state=createEvent(e,[b,other]);stepEvent(state,[b,other],1.5);assert.equal(state.stats[b.id].rep,29);b.position=1;b.events=['lap'];stepEvent(state,[b,other],.1);assert.equal(state.stats[b.id].rep,81);
 Object.assign(b,{finished:true,finishTime:60});const save=freshSave();assert.equal(completeEvent(save,state,b),3);b.position=3;assert.equal(completeEvent(save,state,b),1);assert.equal(save.stars[e.id],3);save.defeated=[0,1,2,3,4];assert.equal(unlocked(save).boats.length,6);assert.ok(unlocked(save).paints.includes('#ffffff'));assert.equal(unlocked(save).upgradeLevel,3);
});
