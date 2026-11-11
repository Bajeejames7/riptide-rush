// Source glTF and textures are data only. Run after fetch-polyhaven.py --environment.
import fs from 'node:fs';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,simplify,textureCompress,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {spawnSync} from 'node:child_process';
sharp.cache(false);sharp.concurrency(1);
const root='assets-src/polyhaven',out='public/assets',selection=JSON.parse(fs.readFileSync(root+'/selection.json'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const requestedLod=process.argv.find(a=>a.startsWith('--lod='))?.slice(6);
if(!process.argv.includes('--worker')&&!process.argv.includes('--textures-only')){
 for(const name of only??Object.keys(selection.models))for(const lod of [0,1]){
  if(fs.existsSync(`${out}/models/ph_${name}_lod${lod}.glb`)&&!process.argv.includes('--force')){console.log('Retaining prepared',name,lod);continue;}
  const result=spawnSync(process.execPath,['--max-old-space-size=512',import.meta.filename,'--worker',`--only=${name}`,`--lod=${lod}`],{stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);
 }
 const result=spawnSync(process.execPath,[import.meta.filename,'--textures-only','--worker'],{stdio:'inherit',windowsHide:true});process.exit(result.status||0);
}
const previous=fs.existsSync(`${out}/environment.json`)?JSON.parse(fs.readFileSync(`${out}/environment.json`)).models:[];
const records=previous.filter(m=>process.argv.includes('--textures-only')||!only?.includes(m.name)||(requestedLod!==undefined&&m.lod!==Number(requestedLod)));
for(const name of (process.argv.includes('--textures-only')?[]:only??Object.keys(selection.models))){
 for(const lod of requestedLod===undefined?[0,1]:[Number(requestedLod)]){
  const res=lod?'1k':'2k',file=`${root}/${name}/${res}/${name}.gltf`;
  if(!fs.existsSync(file))throw Error('Missing '+file);
  const doc=await io.read(file);
  if(name==='modular_wooden_pier')for(const node of doc.getRoot().listNodes())if(node.getMesh()&&!node.getName().endsWith('section_01'))node.dispose();
  for(const scene of doc.getRoot().listScenes()){
   const bounds=getBounds(scene),origin=doc.createNode('grounded').setTranslation([-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2]);
   for(const child of scene.listChildren()){scene.removeChild(child);origin.addChild(child);}scene.addChild(origin);
  }
  let before=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())before+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
  const alphaDir=`${root}/${name}/${res}/alpha`;
  if(fs.existsSync(alphaDir))for(const mask of fs.readdirSync(alphaDir)){
   const key=mask.replace(/\.[^.]+$/,'').toLowerCase(),suffix=key==='alpha'?'_diff_':'_'+key.replace('alpha','diff')+'_';
   for(const texture of doc.getRoot().listTextures())if(texture.getURI().includes(suffix)){
    const alpha=await sharp(`${alphaDir}/${mask}`).toColourspace('b-w').raw().toBuffer({resolveWithObject:true});
    const rgba=await sharp(texture.getImage()).joinChannel(alpha.data,{raw:{width:alpha.info.width,height:alpha.info.height,channels:1}}).png().toBuffer();if(!(await sharp(rgba).metadata()).hasAlpha)throw Error('Alpha merge failed: '+name);texture.setImage(rgba).setMimeType('image/png');
   }
  }
  const budget=lod?(name.includes('tree')||name.includes('sapling')?1300:650):(name.includes('tree')||name.includes('sapling')?12000:6000);
  await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/before),error:lod?.15:.015,lockBorder:false}),prune());
  // The selected Poly Haven texture names contain only letters, digits, underscores and hyphens.
  for(const texture of doc.getRoot().listTextures())await doc.transform(textureCompress({pattern:new RegExp('^'+texture.getName()+'$'),encoder:sharp,targetFormat:'webp',resize:lod?[1024,1024]:[2048,2048]}));
  if(lod&&name==='dutch_ship_medium'){
   let count=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())count+=p.getIndices().getCount();
   for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
    const indices=p.getIndices(),target=Math.max(3,Math.floor(indices.getCount()*1800*3/count/3)*3);
    const [reduced]=MeshoptSimplifier.simplifySloppy(new Uint32Array(indices.getArray()),p.getAttribute('POSITION').getArray(),3,null,Math.min(target,indices.getCount()),.1);
    if(reduced.length)indices.setArray(reduced);
   }
   await doc.transform(prune());
  }
  let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
  const id=`ph_${name}_lod${lod}`;await io.write(`${out}/models/${id}.glb`,doc);records.push({name,id,lod,triangles:Math.ceil(triangles),url:'https://polyhaven.com/a/'+name,license:'CC0'});console.log(id,Math.ceil(triangles));
 }
}
if(process.argv.includes('--textures-only'))for(const res of ['1k','2k'])for(const file of fs.readdirSync(`${root}/textures/${res}`)){
 const dest=`${out}/textures/${res==='2k'?'hi_':''}${file.replace(/\.[^.]+$/,'.jpg')}`;
 await sharp(`${root}/textures/${res}/${file}`).jpeg({quality:85}).toFile(dest);
}
fs.writeFileSync(`${out}/environment.json`,JSON.stringify({models:records,textures:selection.textures,palms:selection.palms},null,2));
const manifest=JSON.parse(fs.readFileSync(`${out}/manifest.json`));manifest.models=manifest.models.filter(n=>n.startsWith('sf_'));manifest.environment=records;manifest.textures=fs.readdirSync(`${out}/textures`).filter(n=>n.endsWith('.jpg')&&!n.startsWith('hi_')).map(n=>n.slice(0,-4));manifest.highTextures=fs.readdirSync(`${out}/textures`).filter(n=>n.startsWith('hi_')).map(n=>n.slice(0,-4));fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
