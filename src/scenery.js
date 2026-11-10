import * as T from 'three';
import {nearest,onShortcut} from './core/tracks.js';
export function softTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(230,250,255,.7)');g.addColorStop(1,'rgba(200,240,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
export function loftHull(width,length,type=0){
 const pos=[],idx=[],uv=[];const stations=type===2?20:type===1?24:type===5?18:36,ring=type===2||type===5?16:type===1?18:24;
 for(let j=0;j<=stations;j++){
  const t=j/stations,z=(t-.5)*length;
  const bow=Math.pow(Math.max(.002,1-Math.pow(t,3)),.65);
  const w=width*bow*(.83+.17*Math.sin(t*Math.PI));
  for(let k=0;k<ring;k++){
   const a=k/ring*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
   // Hard chines, V keel, crowned deck, and raised raked bow.
   const y=c>=0?.16+.22*c:-.1-Math.pow(-c,.65)*(type===2?.55:1.05);
   pos.push(s*w,y+t*t*.48,z+(c<0?-t*t*.6:0));uv.push(k/ring,t);
  }
 }
 for(let j=0;j<stations;j++)for(let k=0;k<ring;k++){const a=j*ring+k,b=j*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,b,c,b,d,c);}
 for(const j of [0,stations])for(let k=1;k<ring-1;k++) j===0?idx.push(0,k+1,k):idx.push(j*ring,j*ring+k,j*ring+k+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx.flatMap((_,i)=>i%3===0?[idx[i],idx[i+2],idx[i+1]]:[]));g.computeVertexNormals();return g;
}
const mat=(color,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
function part(parent,geo,m,x,y,z){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
const box=(p,m,x,y,z,w,h,d)=>part(p,new T.BoxGeometry(w,h,d),m,x,y,z);
function label(text,color='#55f5db'){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#071322';x.fillRect(0,0,512,128);x.fillStyle=color;x.font='bold 52px sans-serif';x.textAlign='center';x.fillText(text,256,83);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:t,side:T.DoubleSide});}
export function addEnvironment(scene,track){
 const theme=track.theme,ice=theme==='ice',city=theme==='city';
 const bank=mat(ice?0x81b9d5:city?0x28374c:0xd3b77d),rock=mat(ice?0x5994ba:0x5d6353),green=mat(0x24794f),dark=mat(0x183040);
 const glow=new T.MeshStandardMaterial({color:0x48b7c9,emissive:0x167d94,emissiveIntensity:1.8});
 // Closed spline strips share vertices at every sample: no gaps between bank pieces.
 for(const side of [-1,1]){
  const pos=[],indices=[];
  for(let i=0;i<=track.samples.length;i++){
   const p=track.samples[i%track.samples.length],nx=Math.cos(p.heading)*side,nz=-Math.sin(p.heading)*side;
   const height=ice?17+10*Math.sin(i*.026)**2:city?5:3+2*Math.sin(i*.03)**2;
   for(const [offset,y] of [[0,-2],[2,ice?height*.7:1],[12,height],[35,height+3]]){
    const d=p.width/2+offset;pos.push(p.x+nx*d,y,p.z+nz*d);
   }
  }
  for(let i=0;i<track.samples.length;i++)for(let j=0;j<3;j++){const a=i*4+j;
   const vx=pos[a*3],vz=pos[a*3+2];
   if(!onShortcut(track,vx,vz))indices.push(a,a+4,a+1,a+1,a+4,a+5);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();const m=bank.clone();m.side=T.DoubleSide;part(scene,g,m,0,0,0);
 }
 // Alternative channels cut through the banks; their retaining walls stop at the main channel.
 for(const {a,b,width} of track.shortcuts){
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  for(const side of [-1,1]){
   const pos=[],indices=[];const steps=60;
   for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+dx*t+nx*side*width/2,z=a.z+dz*t+nz*side*width/2;pos.push(x,-2,z,x,4,z);}
   for(let i=0;i<steps;i++){const x=(pos[i*6]+pos[(i+1)*6])/2,z=(pos[i*6+2]+pos[(i+1)*6+2])/2,n=nearest(track,x,z);if(n.distance>n.point.width/2+1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();const m=bank.clone();m.side=T.DoubleSide;part(scene,g,m,0,0,0);
  }
  const sign=part(scene,new T.PlaneGeometry(16,3),label('SHORTCUT / RISK','#ffca68'),a.x,10,a.z);sign.rotation.y=Math.atan2(dx,dz)+Math.PI;
 }
 // Instancing bounds draw calls for the dense channel markers, palms and skyline.
 function instances(geo,m,items){const o=new T.InstancedMesh(geo,m,items.length),d=new T.Object3D();items.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.rx||0,p.ry||0,p.rz||0);d.scale.set(p.sx||1,p.sy||1,p.sz||1);d.updateMatrix();o.setMatrixAt(i,d.matrix);});o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
 const markers=[],trunks=[],leaves=[],buildings=[],bergs=[];
 for(let i=0;i<track.samples.length;i+=8){const p=track.samples[i];for(const side of [-1,1]){
  const at=(d)=>({x:p.x+Math.cos(p.heading)*side*d,z:p.z-Math.sin(p.heading)*side*d});
  markers.push({...at(p.width/2-1.7),y:1});
  if(i%24!==0)continue;
  const q=at(p.width/2+23),height=22+((i*17)%79);
  if(city)buildings.push({...q,y:height/2,sx:12+(i%9),sy:height,sz:13,ry:p.heading});
  else if(ice)bergs.push({...at(p.width/2+21),y:9,sx:7,sy:20+(i%23),sz:9,ry:i});
  else {trunks.push({...q,y:6,rz:side*.12});for(let a=0;a<7;a++)leaves.push({x:q.x+Math.sin(a*6.28/7)*3,y:12,z:q.z+Math.cos(a*6.28/7)*3,ry:a*6.28/7,rz:.15,sx:1,sy:1,sz:1});}
 }}
 instances(new T.CylinderGeometry(.35,.8,2,8),glow,markers);
 if(!ice&&!city){instances(new T.CylinderGeometry(.3,.65,12,7),mat(0x886346),trunks);
 const frond=new T.BufferGeometry();frond.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1,0,3,0,-1,7,1,0,3],3));frond.setIndex([0,1,2,0,2,3]);frond.computeVertexNormals();green.side=T.DoubleSide;instances(frond,green,leaves);}
 if(ice)instances(new T.ConeGeometry(1,1,6),bank,bergs);
 if(city){const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');x.fillStyle='#102030';x.fillRect(0,0,128,256);for(let y=3;y<256;y+=12)for(let a=3;a<128;a+=12){x.fillStyle=((a*17+y*3)%7)<3?'#173247':((a+y)%3?'#69bfd2':'#d692c0');x.fillRect(a,y,5,7);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;instances(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0x6688aa,emissiveIntensity:.65,roughness:.35}),buildings);}
 // Three substantial drive-through landmarks, with generous boat clearance.
 for(const fraction of [.18,.48,.76]){
  const p=track.samples[Math.floor(track.samples.length*fraction)],g=new T.Group();g.position.set(p.x,0,p.z);g.rotation.y=p.heading;scene.add(g);const w=p.width/2;
  for(const side of [-1,1])box(g,city?dark:rock,side*(w+3),10,0,6,20,ice?28:7);
  if(city){box(g,dark,0,15,0,w*2+12,3,fraction>.7?65:12);box(g,glow,0,13.3,-6,w*2, .3,.3);if(fraction>.7)for(const side of [-1,1])box(g,dark,side*(w+3),7,0,6,14,65);
   const holo=part(g,new T.PlaneGeometry(20,9),new T.MeshBasicMaterial({color:0x68bfff,transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false}),0,29,0);holo.userData.hologram=true;
   const sign=part(g,new T.PlaneGeometry(18,4),label(fraction<.3?'VOLT / 2099':'FULL THROTTLE'),0,20,0);sign.rotation.y=Math.PI;
   for(let k=-4;k<=4;k++){const traffic=box(g,glow,k*5,17,0,1,.6,2);traffic.userData.traffic=true;}
  }else if(ice){const roof=part(g,new T.CylinderGeometry(w+6,w+6,28,16,1,true,-Math.PI/2,Math.PI),bank,0,8,0);roof.rotation.set(-Math.PI/2,0,0);}
  else {const arch=part(g,new T.TorusGeometry(w+3,4,8,24,Math.PI),rock,0,4,0);}
 }
 if(!ice&&!city){
  // Raised huts and timber piers, waterfall, distant volcanic island and clouds.
  for(const f of [.08,.36,.66]){const p=track.samples[Math.floor(f*track.samples.length)],x=p.x+Math.cos(p.heading)*(p.width/2+18),z=p.z-Math.sin(p.heading)*(p.width/2+18);box(scene,mat(0x947348),x,3,z,13,1,16);box(scene,mat(0xc49b65),x,7,z,9,7,9);const roof=part(scene,new T.ConeGeometry(9,5,4),mat(0x735640),x,12,z);roof.rotation.y=Math.PI/4;for(const a of [-1,1])for(const b of [-1,1])box(scene,dark,x+a*5,0,z+b*6,.5,7,.5);}
  const p=track.samples[220],x=p.x+Math.cos(p.heading)*(p.width/2+23),z=p.z-Math.sin(p.heading)*(p.width/2+23);part(scene,new T.CylinderGeometry(10,19,45,10),rock,x,16,z);const fall=box(scene,new T.MeshStandardMaterial({color:0xa1dbea,transparent:true,opacity:.7,roughness:.2}),x-Math.cos(p.heading)*12,12,z+Math.sin(p.heading)*12,5,30,3);
  part(scene,new T.ConeGeometry(110,150,24),rock,-750,50,-750);part(scene,new T.ConeGeometry(27,26,16),mat(0x43453c),-750,130,-750);
  const clouds=[];for(let i=0;i<35;i++)clouds.push({x:Math.sin(i*3.7)*1300,y:230+(i%5)*17,z:Math.cos(i*2.3)*1300,sx:30,sy:9,sz:15});instances(new T.SphereGeometry(1,10,6),new T.MeshBasicMaterial({color:0xcbdde8}),clouds);
 }
 if(ice){for(let i=0;i<14;i++)part(scene,new T.ConeGeometry(60,150,6),mat(0xb2cfdf),Math.sin(i*2)*1000,55,Math.cos(i*2)*1000);const p=track.samples[360];box(scene,dark,p.x+80,13,p.z,40,16,16);box(scene,bank,p.x+80,23,p.z,45,4,20);part(scene,new T.PlaneGeometry(22,5),label('POLAR / 07'),p.x+80,15,p.z+8.1);}
}
