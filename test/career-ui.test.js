import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrack} from '../src/core/tracks.js';
import {createBoat} from '../src/core/physics.js';
import {EVENTS,freshSave,createEvent,completeEvent,totalStars} from '../src/core/career.js';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
// Exercise the actual UI/race bridge with renderer and DOM boundaries replaced.
const start=main.slice(main.indexOf('function startRace('),main.indexOf('function makeHud('));
const finish=main.slice(main.indexOf('function finish('),main.indexOf('function options('));
function harness(event){
 const saved=freshSave(),ui={text:'Loading the waterfront 100%',replaceChildren(){this.text='';},classList:{add(){}}},pages=[];
 const ctx={makeTrack,createBoat,createEvent,completeEvent,totalStars,ui,config:{track:event?.track||0,laps:event?.laps||1,ai:event?event.grid-1:7},input:{joined:[{}]},choices:[{name:'Test skipper',type:0,color:'#ff633a'}],graphics:{load(){}},audio:{start(){}},careerSave:()=>saved,persistCareer:()=>{ctx.saves++;},saves:0,page:(...v)=>pages.push(v),button:()=>'',on(){},makeHud(){},eventIntro(){},careerMap(){},home(){}};
 const factory=new Function('ctx','event',`const {makeTrack,createBoat,createEvent,completeEvent,totalStars,ui,config,input,choices,graphics,audio,careerSave,persistCareer,page,button,on,makeHud,eventIntro,careerMap,home}=ctx;
 let screen,paused,resultsShown,time,countSound,accumulator,track,boats=[],locals=[],eventState=null,careerEvent=event;
 ${start}\n${finish}\nreturn {start:startRace,finish,get:()=>({screen,track,boats,locals,eventState,resultsShown})};`);
 return {race:factory(ctx,event),ctx,saved,ui,pages};
}
test('career launch wires directed course, rival and event state; results persist once',()=>{
 const e={...EVENTS[6],reverse:true,variant:'sunset'},h=harness(e);h.race.start();const r=h.race.get();
 assert.ok(r.track.reverse);assert.equal(r.track.variant,'sunset');assert.equal(r.boats[1].name,e.rival.name);assert.ok(r.boats[1].rival);assert.equal(r.eventState.event.id,e.id);assert.equal(h.ui.text,'');
 Object.assign(r.locals[0],{finished:true,position:1,finishTime:60});r.eventState.stats['0'].rep=80;h.race.finish();h.race.finish();assert.equal(h.ctx.saves,1);assert.equal(h.saved.stars[e.id],3);assert.deepEqual(h.saved.defeated,[0]);assert.equal(h.saved.reputation,80);assert.equal(h.pages[0][0],'Career results');
});
test('non-career/verify launch removes the loading overlay contents',()=>{const h=harness(null);h.race.start();assert.equal(h.ui.text,'');assert.equal(h.race.get().eventState,null);assert.equal(h.race.get().boats.length,8);});
