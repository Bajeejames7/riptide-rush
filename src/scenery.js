import * as T from 'three';
import {surface,instanceModel,assets} from './assets.js';
import {nearest,onShortcut} from './core/tracks.js';
const mat=(color,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
function part(parent,geo,m,x,y,z){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;if(!geo.attributes.uv){const a=geo.attributes.position,uv=[];for(let i=0;i<a.count;i++)uv.push(a.getX(i)/12,a.getZ(i)/12+a.getY(i)/12);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}parent.add(o);return o;}
const box=(p,m,x,y,z,w,h,d)=>part(p,new T.BoxGeometry(w,h,d),m,x,y,z);
function label(text,color='#55f5db'){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#071322';x.fillRect(0,0,512,128);x.fillStyle=color;x.font='bold 52px sans-serif';x.textAlign='center';x.fillText(text,256,83);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:t,side:T.DoubleSide});}
function terrainGeometry(pos,indices,columns){
 const uv=[];let distance=0;
 for(let row=0;row<pos.length/(columns*3);row++){
  const start=row*columns*3;if(row){const previous=start-columns*3;distance+=Math.hypot(pos[start]-pos[previous],pos[start+2]-pos[previous+2]);}
  let cross=0;for(let col=0;col<columns;col++){const j=start+col*3;if(col)cross+=Math.hypot(pos[j]-pos[j-3],pos[j+1]-pos[j-2],pos[j+2]-pos[j-1]);uv.push(distance/12,cross/12);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function addEnvironment(scene,track){
 const theme=track.theme,ice=theme==='ice',city=theme==='city';
 const bank=surface(ice?'snow':city?'concrete':'sand'),rock=surface(ice?'snow':'rock'),dark=surface('metal');
 const glow=new T.MeshStandardMaterial({color:0x48b7c9,emissive:0x167d94,emissiveIntensity:1.8});
 // Closed spline strips share vertices at every sample: no gaps between bank pieces.
 for(const side of [-1,1]){
  const pos=[],indices=[],cliffIndices=[];
  for(let i=0;i<=track.samples.length;i++){
   const p=track.samples[i%track.samples.length],nx=Math.cos(p.heading)*side,nz=-Math.sin(p.heading)*side;
   const height=ice?17+10*Math.sin(i*.026)**2:city?5:4+12*Math.sin(i*.03)**8;
   for(const [offset,y] of [[0,-2],[2,ice?height*.7:1],[12,height],[35,height+3]]){
    const d=p.width/2+offset;pos.push(p.x+nx*d,y,p.z+nz*d);
   }
  }
  for(let i=0;i<track.samples.length;i++)for(let j=0;j<3;j++){const a=i*4+j;
   const vx=pos[a*3],vz=pos[a*3+2];
   if(!onShortcut(track,vx,vz)){const target=!ice&&!city&&j>0?cliffIndices:indices;target.push(a,a+4,a+1,a+1,a+4,a+5);}}
  const g=terrainGeometry(pos,[...indices,...cliffIndices],4);g.setIndex(indices);const m=bank.clone();m.side=T.DoubleSide;part(scene,g,m,0,0,0);if(cliffIndices.length){const cliffs=g.clone();cliffs.setIndex(cliffIndices);rock.side=T.DoubleSide;part(scene,cliffs,rock,0,0,0);}
 }
 // Alternative channels cut through the banks; their retaining walls stop at the main channel.
 for(const {a,b,width} of track.shortcuts){
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  for(const side of [-1,1]){
   const pos=[],indices=[];const steps=60;
   for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+dx*t+nx*side*width/2,z=a.z+dz*t+nz*side*width/2;pos.push(x,-2,z,x,4,z);}
   for(let i=0;i<steps;i++){const x=(pos[i*6]+pos[(i+1)*6])/2,z=(pos[i*6+2]+pos[(i+1)*6+2])/2,n=nearest(track,x,z);if(n.distance>n.point.width/2+1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
   const g=terrainGeometry(pos,indices,2);const m=bank.clone();m.side=T.DoubleSide;part(scene,g,m,0,0,0);
  }
  const sign=part(scene,new T.PlaneGeometry(16,3),label('SHORTCUT / RISK','#ffca68'),a.x,10,a.z);sign.rotation.y=Math.atan2(dx,dz)+Math.PI;
 }
 // Instancing bounds draw calls for the dense channel markers, palms and skyline.
 function instances(geo,m,items){const o=new T.InstancedMesh(geo,m,items.length),d=new T.Object3D();items.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.rx||0,p.ry||0,p.rz||0);d.scale.set(p.sx||1,p.sy||1,p.sz||1);d.updateMatrix();o.setMatrixAt(i,d.matrix);});o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
 const markers=[],bergs=[];
 for(let i=0;i<track.samples.length;i+=8){const p=track.samples[i];for(const side of [-1,1]){
  const at=(d)=>({x:p.x+Math.cos(p.heading)*side*d,z:p.z-Math.sin(p.heading)*side*d});
  markers.push({...at(p.width/2-1.7),y:1});
  if(i%24!==0)continue;
  if(ice)bergs.push({...at(p.width/2+21),y:9,sx:7,sy:20+(i%23),sz:9,ry:i});
 }}
 instances(new T.CylinderGeometry(.35,.8,2,8),glow,markers);
 const placements=(stride,offset,scale,y=0)=>track.samples.filter((_,i)=>i%stride===0).flatMap((p,i)=>[-1,1].map(side=>({x:p.x+Math.cos(p.heading)*side*(p.width/2+offset),z:p.z-Math.sin(p.heading)*side*(p.width/2+offset),y,ry:p.heading+i*.5,scale})));
 if(!ice&&!city){instanceModel(scene,'palm',placements(24,20,4));instanceModel(scene,'rock',placements(48,14,4));instanceModel(scene,'hut',placements(144,24,4,3));instanceModel(scene,'pier',placements(144,9,4));instanceModel(scene,'ship',placements(240,24,3));instanceModel(scene,'wreck',placements(360,22,2.5));instanceModel(scene,'lighthouse',placements(360,35,4));}
 if(ice){instances(new T.IcosahedronGeometry(1,0),bank,bergs);instanceModel(scene,'ship',placements(240,28,3));instanceModel(scene,'station',placements(240,35,15,6));}
 if(city){const foundations=[];for(let i=0;i<4;i++){const scale=13+i*3,sites=placements(96,26+i*16,scale,5);instanceModel(scene,'building'+i,sites);foundations.push(...sites.map(p=>({...p,y:1,sx:scale*1.7,sy:8,sz:scale*1.7})));}instances(new T.BoxGeometry(1,1,1),bank,foundations);instanceModel(scene,'street',placements(32,8,4,5));}
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
  for(const p of placements(360,35,4)){const light=new T.Sprite(new T.SpriteMaterial({map:assets.textures.get('flame')??null,color:0xffe3a0,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));light.position.set(p.x,39,p.z);light.scale.set(7,7,1);scene.add(light);}
  // Raised huts and timber piers, waterfall, distant volcanic island and clouds.
  const p=track.samples[220],x=p.x+Math.cos(p.heading)*(p.width/2+23),z=p.z-Math.sin(p.heading)*(p.width/2+23);part(scene,new T.CylinderGeometry(10,19,45,10),rock,x,16,z);const fall=box(scene,new T.MeshStandardMaterial({map:assets.textures.get('spray')??null,color:0xa1dbea,transparent:true,opacity:.7,roughness:.2}),x-Math.cos(p.heading)*12,12,z+Math.sin(p.heading)*12,5,30,3);fall.userData.waterfall=true;
  part(scene,new T.ConeGeometry(110,150,24),rock,-750,50,-750);part(scene,new T.ConeGeometry(27,26,16),mat(0x43453c),-750,130,-750);

 }
 if(ice){for(let i=0;i<14;i++)part(scene,new T.ConeGeometry(60,150,6),mat(0xb2cfdf),Math.sin(i*2)*1000,55,Math.cos(i*2)*1000);const p=track.samples[360];box(scene,dark,p.x+80,13,p.z,40,16,16);box(scene,bank,p.x+80,23,p.z,45,4,20);part(scene,new T.PlaneGeometry(22,5),label('POLAR / 07'),p.x+80,15,p.z+8.1);}
}
