// Career data and deterministic event rules: no DOM or renderer dependencies.
export const SAVE_KEY='rr.career.v1';
export const TYPES=['Race','Time Trial','Elimination','Checkpoint Rush','Boost Hunt','Duel'];
export const PAINTS=['#ff633a','#39e7e2','#ffd552','#b79aff','#66e882','#ef69cd'];
export const RIVALS=[
 {name:'Marina Flint',boat:2,color:PAINTS[2],personality:'Fearless harbour veteran',taunt:'The tide waits for nobody. Keep up.'},
 {name:'Ivo Frost',boat:3,color:PAINTS[3],personality:'Precise ice navigator',taunt:'One wide turn is all I need.'},
 {name:'Sable Volt',boat:4,color:PAINTS[4],personality:'Restless night racer',taunt:'Catch my lights before they disappear.'},
 {name:'Reef Calder',boat:5,color:PAINTS[5],personality:'Unflappable offshore ace',taunt:'Smooth water never made a champion.'},
 {name:'Nova Gale',boat:5,color:'#ffffff',personality:'Relentless open-water champion',taunt:'Every horizon has a faster skipper. Prove it.'},
];
export const TIERS=['Harbour Sparks','Cold Current','Neon Passage','Wildwater Circuit','Horizon Crown'];
export const EVENTS=TIERS.flatMap((_,tier)=>Array.from({length:7},(_,n)=>{
 const type=n===6?'Duel':TYPES[(n+tier)%6],track=tier===0?0:(tier+n)%3,laps=1+Math.floor(tier/2);
 const par=[100,110,95][track]*laps*(1-tier*.035);
 return {id:`${tier}-${n}`,tier,n,type,track,laps,reverse:n%2===1,variant:n%3===1?['sunset','fog','rain'][track]:'clear',grid:type==='Duel'?2:['Time Trial','Checkpoint Rush','Boost Hunt'].includes(type)?1:Math.min(8,4+tier),difficulty:Math.min(2,Math.floor((tier+1)/2)),rival:n===6?RIVALS[tier]:null,gate:tier*12+n*2,par,limit:type==='Boost Hunt'?par*1.8:par*1.5,interval:35-tier*3,target:6+tier*2,objectives:type==='Time Trial'?[par*1.4,par*1.15,par].map((t,i)=>`${["Bronze","Silver","Gold"][i]}: finish within ${Math.round(t)}s`):type==='Checkpoint Rush'?[8,12,16].map(v=>`Pass ${v+tier*2} sectors`):type==='Boost Hunt'?[0,2,4].map(v=>`Collect ${6+tier*2+v} canisters`):['Finish in top 3','Finish in top 2','Win the event']};
}));
export const freshSave=()=>({version:1,stars:{},reputation:0,defeated:[],boat:0,paint:PAINTS[0],upgrades:{}});
export const totalStars=s=>Object.values(s.stars).reduce((a,b)=>a+b,0);
export function unlocked(s){const stars=totalStars(s);return {boats:[0,1,...[2,3,4,5].filter((b,i)=>stars>=[15,32,52,72][i]||s.defeated.includes(i))],tracks:[0,...[1,2].filter((t,i)=>stars>=[10,26][i])],paints:[...PAINTS.slice(0,Math.min(6,2+Math.floor(s.reputation/400))),...(s.defeated.includes(4)?['#ffffff']:[])],upgradeLevel:s.defeated.includes(4)?3:Math.min(3,Math.floor(stars/12),Math.floor(s.reputation/250))};}
export function canEnter(s,e){return totalStars(s)>=e.gate&&(e.tier===0||s.defeated.includes(e.tier-1));}
export function loadSlots(storage){try{const a=JSON.parse(storage.getItem(SAVE_KEY));if(!Array.isArray(a))throw Error();return Array.from({length:3},(_,i)=>a[i]?.version===1?{...freshSave(),...a[i]}:freshSave());}catch{return Array.from({length:3},freshSave);}}
export function saveSlots(storage,slots){storage.setItem(SAVE_KEY,JSON.stringify(slots));}
export function upgrade(s,kind){if(!['engine','handling','tank'].includes(kind))return false;const u=s.upgrades[s.boat]??={engine:0,handling:0,tank:0};if(u[kind]>=unlocked(s).upgradeLevel)return false;u[kind]++;return true;}
export function createEvent(e,boats){return {event:e,elapsed:0,remaining:e.type==='Checkpoint Rush'?35:e.limit,nextElimination:e.interval,done:false,stats:Object.fromEntries(boats.map(b=>[b.id,{pickups:0,sectors:0,cp:b.checkpoint,rep:0,style:{},position:b.position||1,clean:true}]))};}
export function stepEvent(state,boats,dt){
 if(state.done)return; const e=state.event;state.elapsed+=dt;state.remaining-=dt;
 for(const b of boats){const s=state.stats[b.id];if(b.eliminated)continue;
 if(b.checkpoint!==s.cp){s.sectors++;s.cp=b.checkpoint;if(e.type==='Checkpoint Rush')state.remaining+=8;}
 s.pickups+=(b.events||[]).filter(v=>v==='pickup').length;
 s.popups=[];const award=(key,points)=>{s.rep+=points;s.popups.push(`${key} +${points}`);};
 if((b.events||[]).some(v=>['scrape','bump'].includes(v)))s.clean=false;
 for(const [key,active,points] of [['Air time',b.air,8],['Drift',b.drifting&&Math.abs(b.speed)>20,5],['Boost chain',b.boosting,6]]){
 s.style[key]=active?(s.style[key]||0)+dt:0;if(s.style[key]>=1.5){award(key,points);s.style[key]=0;}}
 s.nearCooldown=Math.max(0,(s.nearCooldown||0)-dt);
 if(!s.nearCooldown&&b.speed>25&&boats.some(o=>o!==b&&!o.eliminated&&Math.abs(o.y-b.y)<3&&Math.hypot(o.x-b.x,o.z-b.z)>4&&Math.hypot(o.x-b.x,o.z-b.z)<9)){award('Near miss',10);s.nearCooldown=3;}
 if(b.position<s.position)award('Overtake',12);s.position=b.position;
 if((b.events||[]).includes('lap')){if(s.clean)award('Clean lap',40);s.clean=true;}
 }
 if(e.type==='Elimination'&&state.elapsed>=state.nextElimination){const active=boats.filter(b=>!b.eliminated&&!b.finished).sort((a,b)=>b.progress-a.progress);if(active.length>1){const last=active.at(-1);last.eliminated=true;last.speed=last.vx=last.vz=0;last.position=active.length;}state.nextElimination+=e.interval;}
 const p=boats[0],s=state.stats[p.id];
 if(e.type==='Elimination'&&(p.eliminated||boats.filter(b=>!b.eliminated).length===1)){state.done=true;if(!p.eliminated){p.finished=true;p.position=1;p.finishTime=state.elapsed;}}
 else if(e.type==='Checkpoint Rush'||e.type==='Boost Hunt'){state.done=state.remaining<=0||(e.type==='Checkpoint Rush'&&state.elapsed>=e.limit)||(e.type==='Boost Hunt'&&s.pickups>=e.target+4);}
 else state.done=p.finished||state.elapsed>e.limit*2;
}
export function eventStars(state,b){const e=state.event,s=state.stats[b.id];if(e.type==='Checkpoint Rush')return [8,12,16].filter(n=>s.sectors>=n+e.tier*2).length;if(e.type==='Boost Hunt')return [0,2,4].filter(n=>s.pickups>=e.target+n).length;if(!b.finished||b.eliminated)return 0;if(e.type==='Time Trial')return [1.4,1.15,1].filter(n=>b.finishTime<=e.par*n).length;return [3,2,1].filter(n=>b.position<=n).length;}
export function completeEvent(save,state,b){const stars=eventStars(state,b),e=state.event;save.stars[e.id]=Math.max(save.stars[e.id]||0,stars);save.reputation+=state.stats[b.id].rep;if(e.rival&&b.position===1&&stars>0&&!save.defeated.includes(e.tier))save.defeated.push(e.tier);return stars;}
