// Repairs already prepared assets, without downloads or expanding the raw scans.
// One child process per GLB releases decoder and WASM memory before the next asset.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
sharp.cache(false);sharp.concurrency(1);
const root='public/assets',raw='assets-src/polyhaven',file=root+'/environment.json';
const info=JSON.parse(fs.readFileSync(file));
const id=process.argv[2];
if(!id){
 for(const record of info.models){const result=spawnSync(process.execPath,['--max-old-space-size=512',import.meta.filename,record.id],{stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);}
 const records=info.models.map(r=>JSON.parse(fs.readFileSync(`${raw}/prepared-${r.id}.json`)));
 fs.writeFileSync(file,JSON.stringify({...info,models:records},null,2));
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));manifest.environment=records;fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2));
 process.exit();
}
const record=info.models.find(r=>r.id===id);if(!record)throw Error('Unknown prepared model '+id);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(`${root}/models/${id}.glb`);
let changed=false;
const alphaDir=`${raw}/${record.name}/${record.lod?'1k':'2k'}/alpha`;
if(fs.existsSync(alphaDir))for(const mask of fs.readdirSync(alphaDir)){
 const key=mask.replace(/\.[^.]+$/,'').toLowerCase(),part=key==='alpha'?'_diff':'_'+key.replace('alpha','diff');
 for(const texture of doc.getRoot().listTextures())if(texture.getName().includes(part)){
  const metadata=await sharp(texture.getImage()).metadata();if(metadata.hasAlpha)continue;
  const alpha=await sharp(`${alphaDir}/${mask}`).resize(metadata.width,metadata.height).toColourspace('b-w').raw().toBuffer({resolveWithObject:true});
  const rgb=await sharp(texture.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const image=await sharp(rgb.data,{raw:{width:rgb.info.width,height:rgb.info.height,channels:3}}).joinChannel(alpha.data,{raw:{width:metadata.width,height:metadata.height,channels:1}}).webp({quality:85,alphaQuality:100}).toBuffer();
  if(!(await sharp(image).metadata()).hasAlpha)throw Error('Missing repaired alpha '+id);
  texture.setImage(image).setMimeType('image/webp');changed=true;
 }
}
if(record.name==='dutch_ship_medium'&&record.lod===1&&record.triangles>3000){
 await MeshoptSimplifier.ready;let count=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())count+=p.getIndices().getCount();
 for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
  const indices=p.getIndices(),target=Math.min(indices.getCount(),Math.max(3,Math.floor(indices.getCount()*1800/count)*3));
  const [reduced]=MeshoptSimplifier.simplifySloppy(new Uint32Array(indices.getArray()),p.getAttribute('POSITION').getArray(),3,null,target,.2);if(reduced.length)indices.setArray(reduced);
 }await doc.transform(prune());changed=true;
}
for(const scene of doc.getRoot().listScenes()){
 const b=getBounds(scene),translation=[-(b.min[0]+b.max[0])/2,-b.min[1],-(b.min[2]+b.max[2])/2];
 if(translation.some(v=>Math.abs(v)>.01)){const origin=doc.createNode('grounded').setTranslation(translation);for(const child of scene.listChildren()){scene.removeChild(child);origin.addChild(child);}scene.addChild(origin);changed=true;}
}
if(changed)await io.write(`${root}/models/${id}.glb`,doc);
let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
const result={...record,triangles,bounds:getBounds(doc.getRoot().listScenes()[0]),bytes:fs.statSync(`${root}/models/${id}.glb`).size};
fs.writeFileSync(`${raw}/prepared-${id}.json`,JSON.stringify(result,null,2));console.log(id,triangles,changed?'repaired':'retained');
