import { nearest } from "./tracks.js";
import { angle } from "./physics.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function aiInput(b, track, difficulty=1, leader=0, boats=[]) {
 const n=nearest(track,b.x,b.z), samples=track.samples;
 const spacing=track.length/samples.length;
 const at=(meters)=>samples[(n.index+Math.max(1,Math.round(meters/spacing)))%samples.length];
 const look=at(13+Math.abs(b.speed)*.48), far=at(65);
 const bend=angle(far.heading-n.point.heading);
 const personality=((b.type*17+Number(String(b.id).replace(/\D/g,''))||0)%11)/10;
 let offset=-Math.sign(bend)*Math.min(4,Math.abs(bend)*3)+(personality-.5)*3;
 for(const other of [...boats,...track.obstacles]) {
   if(other===b) continue;
   const dx=other.x-b.x,dz=other.z-b.z;
   const ahead=dx*Math.sin(b.heading)+dz*Math.cos(b.heading);
   const side=dx*Math.cos(b.heading)-dz*Math.sin(b.heading);
   if(ahead>0&&ahead<28&&Math.abs(side)<7) offset-=Math.sign(side||1)*5*(1-ahead/30);
 }
 const pickup=track.pickups.find(p=>p.cooldown<=0&&Math.hypot(p.x-look.x,p.z-look.z)<10);
 if(pickup&&b.boost<70) offset*=.25;
 const tx=look.x+Math.cos(look.heading)*offset,tz=look.z-Math.sin(look.heading)*offset;
 const delta=angle(Math.atan2(tx-b.x,tz-b.z)-b.heading);
 const pace=[.69,.85,1][difficulty];
 const rubber=clamp(1+(leader-b.progress)/15000,.98,1.035);
 return { throttle:clamp(pace*rubber*(1-Math.min(.38,Math.abs(bend)*.25)),.35,1),
 steer:clamp(delta*(2.7+difficulty*.25),-1,1),
 boost:difficulty>0&&Math.abs(bend)<.24&&Math.abs(delta)<.16&&b.boost>[40,30,16][difficulty],
 hop:false,drift:difficulty===2&&Math.abs(bend)>.8&&Math.abs(delta)>.4 };
}
