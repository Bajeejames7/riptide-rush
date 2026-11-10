import {writeFileSync,readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {makeTrack} from '../src/core/tracks.js';
const crcTable=Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
function chunk(type,data){const t=Buffer.from(type),buf=Buffer.concat([t,data]);let crc=0xffffffff;for(const x of buf)crc=crcTable[(crc^x)&255]^(crc>>>8);const len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([len,buf,sum]);}
for(let index=0;index<3;index++){
 const track=makeTrack(index),size=512,samples=Array.from({length:256},(_,i)=>track.samples[Math.floor(i*track.samples.length/256)]),segments=samples.map((a,i)=>{const b=samples[(i+1)%samples.length];return {x:a.x,z:a.z,dx:b.x-a.x,dz:b.z-a.z,w:a.width,bw:b.width,den:(b.x-a.x)**2+(b.z-a.z)**2};});
 const pixels=Buffer.alloc((size+1)*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const wx=(x+.5)/size*2600-1300,wz=(y+.5)/size*2600-1300;let nearest=Infinity,width=track.width;
  for(const s of segments){const t=Math.max(0,Math.min(1,((wx-s.x)*s.dx+(wz-s.z)*s.dz)/s.den)),d=(wx-s.x-t*s.dx)**2+(wz-s.z-t*s.dz)**2;if(d<nearest){nearest=d;width=s.w+(s.bw-s.w)*t;}}
  let edge=Math.sqrt(nearest)-width*.5;
  for(const {a,b,width} of track.shortcuts){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((wx-a.x)*dx+(wz-a.z)*dz)/(dx*dx+dz*dz)));edge=Math.min(edge,Math.hypot(wx-a.x-t*dx,wz-a.z-t*dz)-width*.5);}
  // PNG rows are top-down; shader uses world Z as image-down via flipY=false.
  pixels[y*(size+1)+1+x]=Math.round(Math.max(0,Math.min(1,(edge+32)/64))*255);
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=0;
 writeFileSync('public/assets/textures/shore_'+track.theme+'.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));console.log('Baked shoreline:',track.theme);
}
const p='public/assets/manifest.json',m=JSON.parse(readFileSync(p));m.fields=['shore_tropic','shore_ice','shore_city'];writeFileSync(p,JSON.stringify(m,null,2));
