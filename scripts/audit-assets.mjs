import {readFileSync,statSync,readdirSync} from 'node:fs';
import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {assets,mergeStatic} from '../src/assets.js';
import {addEnvironment} from '../src/scenery.js';
import {buildBoat} from '../src/render.js';
import {makeTrack} from '../src/core/tracks.js';
const manifest=JSON.parse(readFileSync('public/assets/manifest.json'));
function imageSize(b){if(b[0]===137&&b.toString('ascii',1,4)==='PNG')return [b.readUInt32BE(16),b.readUInt32BE(20)];for(let i=2;i<b.length;){if(b[i++]!==255)continue;const marker=b[i++];if(marker===0xd9||marker===0xda)break;const length=b.readUInt16BE(i);if([0xc0,0xc1,0xc2].includes(marker))return [b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=length;}throw Error('Invalid image');}
function checkImage(path){const dims=imageSize(readFileSync(path));if(dims.some(n=>n>1024))throw Error('Low texture budget exceeded: '+path);}
for(const name of manifest.textures)checkImage('public/assets/textures/'+name+'.jpg');
for(const name of manifest.fields||[])checkImage('public/assets/textures/'+name+'.png');
for(const name of ['spray','foam','flame'])checkImage('public/assets/sprites/'+name+'.png');
for(const name of ['tropic','ice','city']){const b=readFileSync('public/assets/skies/'+name+'.hdr'),d=new HDRLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));if(d.width>1024||d.height>1024)throw Error('HDRI budget exceeded');}

for(const name of manifest.models){
 const b=readFileSync('public/assets/models/'+name+'.glb');if(b.toString('ascii',0,4)!=='glTF')throw Error(name+' invalid GLB');const n=b.readUInt32LE(12),d=JSON.parse(b.toString('utf8',20,20+n)),bin=b.subarray(28+n);
 for(const image of d.images||[]){if(image.uri&&!image.uri.startsWith('data:'))throw Error('External dependency: '+image.uri);if(image.uri){const dims=imageSize(Buffer.from(image.uri.split(',')[1],'base64'));if(dims.some(n=>n>1024))throw Error('Embedded palette exceeds Low budget');}}
 for(const buffer of d.buffers||[])if(buffer.uri&&!buffer.uri.startsWith('data:'))throw Error('External buffer: '+buffer.uri);
 const source=new T.Group(),materials=new Map();
 const materialFor=index=>{if(!materials.has(index))materials.set(index,new T.MeshStandardMaterial({name:d.materials?.[index]?.name??""}));return materials.get(index);};
 for(const mesh of d.meshes)for(const p of mesh.primitives){const geo=new T.BufferGeometry();for(const [key,aidx] of Object.entries(p.attributes)){const keyMap={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'};if(!keyMap[key])continue;const a=d.accessors[aidx],v=d.bufferViews[a.bufferView],size={VEC2:2,VEC3:3}[a.type];if(a.componentType!==5126)throw Error('Unexpected attribute');const values=new Float32Array(a.count*size);const stride=v.byteStride||size*4;for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)values[i*size+j]=bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*stride+j*4);geo.setAttribute(keyMap[key],new T.BufferAttribute(values,size));}const a=d.accessors[p.indices],v=d.bufferViews[a.bufferView],bytes={5121:1,5123:2,5125:4}[a.componentType],indices=[];for(let i=0;i<a.count;i++)indices.push(bin.readUIntLE((v.byteOffset||0)+(a.byteOffset||0)+i*bytes,bytes));geo.setIndex(indices);source.add(new T.Mesh(geo,materialFor(p.material)));}
 assets.models.set(name,source);
}
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
let maxBoatTriangles=0,maxBoatCalls=0;
for(let type=0;type<6;type++){const boat=buildBoat(type,'#ff633a',type+1,0);let tris=0,calls=0;boat.traverse(o=>{if(o.isMesh){tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;calls++;}if(o.isSprite){tris+=2;calls++;}});maxBoatTriangles=Math.max(maxBoatTriangles,tris);maxBoatCalls=Math.max(maxBoatCalls,calls);if(tris*8>100000||calls*8>100)throw Error('Eight-boat Low budget exceeded');console.log('Boat '+type+': '+tris+' triangles / '+calls+' draws');}
for(let t=0;t<3;t++){
 const scene=new T.Scene();addEnvironment(scene,makeTrack(t));mergeStatic(scene);let triangles=0,draws=0;
 scene.traverse(o=>{if(o.isSprite){draws++;triangles+=2;}if(o.isMesh){const count=o.isInstancedMesh?o.count:1;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*count;draws++;}});
 // Conservative whole-track scenery plus Low water, eight boats, ramp/start/pickup/effect allowance.
 const total=Math.ceil(triangles+160*160*2+8*maxBoatTriangles+12000),calls=draws+8*maxBoatCalls+32;
 console.log(`${makeTrack(t).name}: whole scenery ${Math.ceil(triangles)} triangles/${draws} draws; total allowance ${total} triangles/${calls} draws`);
 if(total>350000||calls>220)throw Error('Low budget exceeded');
}
let bytes=0;function walk(p){for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else bytes+=statSync(f).size;}}walk('public/assets');console.log('Shipped assets:',(bytes/1048576).toFixed(2),'MiB');if(bytes>120*1048576)throw Error('Asset budget exceeded');
