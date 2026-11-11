import * as T from 'three';
import {assets,surface,instanceModel} from './assets.js';
import {onShortcut,nearest} from './core/tracks.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function prepareImpostors(renderer,environment,quality,theme){
 for(const name of theme==='tropic'?['island_tree_01']:theme==='ice'?['pine_sapling_small']:[]){
  const id=`ph_${name}_lod${quality<2?1:0}`,key=id+'_impostor_'+environment.uuid,source=assets.models.get(id);if(!source||assets.textures.has(key))continue;
  const scene=new T.Scene(),tree=source.clone(true);scene.add(tree);scene.environment=environment;scene.add(new T.HemisphereLight(0xffffff,0x49513c,2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(5,12,8);scene.add(sun);
  const b=new T.Box3().setFromObject(tree),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),extent=Math.max(size.x,size.z)*.6;
  const camera=new T.OrthographicCamera(-extent,extent,size.y*.55,-size.y*.55,.1,Math.max(100,size.z*5));camera.position.set(center.x,center.y,center.z+Math.max(30,size.z*2));camera.lookAt(center);
  const target=new T.WebGLRenderTarget(256,512);target.texture.generateMipmaps=true;target.texture.minFilter=T.LinearMipmapLinearFilter;const old=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new T.Color());renderer.setClearColor(0,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(old);renderer.setClearColor(color,alpha);
  target.texture.userData={shared:true,target,width:extent*2,height:size.y*1.1,center};assets.textures.set(key,target.texture);
 }
}
const noise=(x,z)=>Math.sin(x*.027+Math.sin(z*.019)*2)*Math.cos(z*.023)+.4*Math.sin(x*.071+z*.049);
export function terrainMaterial(theme,quality){
 let m=surface(theme==='ice'?'snow':theme==='city'?'concrete':'sand');
 if(quality===0){const source=m;m=new T.MeshLambertMaterial({color:source.color,map:source.map,normalMap:source.normalMap});source.dispose();}
 m.side=T.DoubleSide;
 // One diffuse and one normal on Low. No hidden PBR auxiliary samplers.
 m.aoMap=null;m.roughnessMap=null;m.displacementMap=null;
 m.normalScale.setScalar(theme==='ice'?.28:.65);
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 landPosition,landNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nlandPosition=(modelMatrix*vec4(transformed,1.)).xyz;landNormal=normalize(mat3(modelMatrix)*normal);');
  const prefix=quality>=2?'hi_':'';
  s.uniforms.landRock={value:assets.textures.get(prefix+(theme==='ice'?'glacier':theme==='city'?'asphalt':'rock')+'_diff')};
  s.fragmentShader='varying vec3 landPosition,landNormal;uniform sampler2D landRock;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   vec2 landUV=landPosition.xz*.075;
   float macro=sin(landPosition.x*.031+sin(landPosition.z*.043)*2.);
   float stone=smoothstep(.24,.62,1.-abs(normalize(landNormal).y)+macro*.055);
   // Steep faces get real rock, projected from the side so it does not smear down the cliff.
   vec2 sideUV=vec2(landPosition.x+landPosition.z,landPosition.y*1.4)*.06;
   ${quality===0?"vec3 ground=texture2D(map,stone>.5?sideUV:landUV).rgb;ground=mix(ground,ground*vec3(.7,.64,.58),stone);":"vec3 ground=mix(texture2D(map,landUV).rgb,texture2D(landRock,sideUV).rgb*1.15,stone);"}
   ground*=.94+.06*macro;
   ${theme==='ice'?"ground=mix(ground*.84,ground,smoothstep(-1.,2.,landPosition.y));":"ground*=mix(.65,1.,smoothstep(-.7,2.,landPosition.y));"}
   diffuseColor.rgb*=ground;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 mapN=texture2D(normalMap,landUV).xyz*2.-1.;mapN.xy*=normalScale;normal=normalize(getTangentFrame(-vViewPosition,normal,landUV)*mapN);`);
 };
 m.customProgramCacheKey=()=>`terrain-${theme}-${quality}-r9`;return m;
}
export function addEnvironment(scene,track,quality=0){
 const ice=track.theme==='ice',city=track.theme==='city',land=terrainMaterial(track.theme,quality);
 const landmarkIndices=Array.from({length:5},(_,area)=>{
  const seed=Math.floor(track.samples.length*(.08+area*.19)),radius=Math.floor(track.samples.length*.04);let best=seed,score=-1;
  for(let d=-radius;d<=radius;d++){const i=(seed+d+track.samples.length)%track.samples.length,a=track.samples[(i+10)%track.samples.length].heading,b=track.samples[(i-10+track.samples.length)%track.samples.length].heading,turn=Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))-Math.abs(d)*.00001;if(turn>score){score=turn;best=i;}}return best;
 });
 const coves=[landmarkIndices[1],landmarkIndices[3]].map(i=>track.samples[i]);
 const height=(p,d)=>{const bay=!ice&&coves.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<48);if(bay&&d<18)return -2.8;return city?Math.min(5,Math.max(-2,d*.65-2)): -2+Math.min(d/7,1)*3+Math.max(0,d-6)*(ice?.66:.22)+noise(p.x+d,p.z)*Math.min(d*.17,5);};
 // Submerged riverbed gives the depth/refraction pass real shallow geometry.
 {const pos=[],uv=[],idx=[];for(let i=0;i<=track.samples.length;i+=3){const p=track.samples[i%track.samples.length];for(const side of [-1,0,1]){const d=p.width*.5*side,x=p.x+Math.cos(p.heading)*d,z=p.z-Math.sin(p.heading)*d;pos.push(x,side?-2:-9,z);uv.push(x*.08,z*.08);}}for(let i=0;i<pos.length/9-1;i++)for(let j=0;j<2;j++){const a=i*3+j;idx.push(a,a+3,a+1,a+1,a+3,a+4);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=surface(ice?'rock':'wet');m.side=T.DoubleSide;scene.add(new T.Mesh(g,m));}
 for(const side of [-1,1]){
  const pos=[],uv=[],idx=[],allowed=[],columns=9,step=quality===0?3:quality===1?2:1;
  const samples=track.samples.filter((_,i)=>i%step===0);samples.push(samples[0]);
  for(const p of samples)for(let j=0;j<columns;j++){const d=j*j*1.5,offset=p.width/2+d;const x=p.x+Math.cos(p.heading)*side*offset,z=p.z-Math.sin(p.heading)*side*offset,n=nearest(track,x,z);pos.push(x,height(p,Math.max(0,Math.min(d,n.distance-n.point.width/2))),z);uv.push(x*.075,z*.075);allowed.push(!onShortcut(track,x,z)&&n.distance>=n.point.width/2-.5);}
  for(let i=0;i<samples.length-1;i++)for(let j=0;j<columns-1;j++){const a=i*columns+j;for(const tri of [[a,a+columns,a+1],[a+1,a+columns,a+columns+1]]){if(!tri.every(v=>allowed[v]))continue;const x=tri.reduce((s,v)=>s+pos[v*3],0)/3,z=tri.reduce((s,v)=>s+pos[v*3+2],0)/3,n=nearest(track,x,z);if(n.distance>=n.point.width/2-.5&&!onShortcut(track,x,z))idx.push(...tri);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('uv1',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,land);mesh.receiveShadow=true;scene.add(mesh);
 }
 const lod=quality<2?1:0;
 let palm;
 if(!ice&&!city){
  let leaves;assets.models.get(`ph_fern_02_lod${lod}`)?.traverse(o=>{if(o.material?.map)leaves=o.material;});
  if(leaves){
   if(quality===0)leaves=new T.MeshBasicMaterial({map:leaves.map,color:leaves.color,alphaTest:.45,side:T.DoubleSide,alphaToCoverage:true});
   const pos=[],uv=[],idx=[];for(let j=0;j<=12;j++)for(let k=0;k<=8;k++){const t=j/12,a=k/8*Math.PI*2,r=.45*(1-t)+.16;pos.push(Math.sin(t*1.3)*1.6+Math.cos(a)*r,t*12,Math.sin(a)*r);uv.push(k/8,t*4);}
   for(let j=0;j<12;j++)for(let k=0;k<8;k++){const a=j*9+k;idx.push(a,a+9,a+1,a+1,a+9,a+10);}const trunk=new T.BufferGeometry();trunk.setAttribute('position',new T.Float32BufferAttribute(pos,3));trunk.setAttribute('uv',new T.Float32BufferAttribute(uv,2));trunk.setIndex(idx);trunk.computeVertexNormals();
   const cards=[];for(let k=0;k<(quality===0?4:9);k++){const g=new T.PlaneGeometry(2.2,6,1,5),a=g.attributes.position;for(let i=0;i<a.count;i++){const t=(a.getY(i)+3)/6;const radius=t*5;a.setXYZ(i,a.getX(i)*Math.sin(t*Math.PI)*1.1,12.2+Math.sin(t*Math.PI)*1.5-t*t*3,radius);}g.rotateY(k/(quality===0?4:9)*Math.PI*2);g.translate(1.5,0,0);g.computeVertexNormals();cards.push(g);}const fronds=mergeGeometries(cards);cards.forEach(g=>g.dispose());
   palm={trunk,fronds,bark:surface('bark'),leaves};
  }
 }
 const contacts=[];
 const batch=(parent,name,placements)=>{
  const id=`ph_${name}_lod${lod}`;if(!assets.models.has(id)||!placements.length)return;
  const image=assets.textures.get(id+'_impostor_'+scene.environment?.uuid);
  if(image){const near=new T.Group(),far=new T.Group();if(quality>0)instanceModel(near,id,placements);const {width,height,center}=image.userData;
   const a=new T.PlaneGeometry(width,height);a.translate(center.x,center.y,center.z);const b=a.clone().rotateY(Math.PI/2),g=mergeGeometries([a,b]);a.dispose();b.dispose();const m=new T.MeshBasicMaterial({map:image,alphaTest:.4,side:T.DoubleSide,alphaToCoverage:true});m.forceSinglePass=true;
   const instances=new T.InstancedMesh(g,m,placements.length),d=new T.Object3D();placements.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.y=p.ry;d.scale.setScalar(p.scale);d.updateMatrix();instances.setMatrixAt(i,d.matrix);});far.add(instances);parent.add(near,far);parent.userData.treeLods={near,far,distance:quality===0?0:240};
  }else if(quality>=2&&assets.models.has(`ph_${name}_lod1`)){const near=new T.Group(),far=new T.Group();instanceModel(near,id,placements);instanceModel(far,`ph_${name}_lod1`,placements);parent.add(near,far);(parent.userData.objectLods??=[]).push({near,far,distance:180});}
  else instanceModel(parent,id,placements);
  contacts.push(...placements.map(p=>({...p,scale:p.scale*(name.includes('tree')?3:1.5)})));
 };
 // Five deliberately composed areas. Vegetation stays above the wet beach, rocks frame bends.
 const names=city?['Container quay','Timber landing','Canal bridge','Fuel wharf','Outer harbour']:ice?['Glacier gate','Pine cove','Ice gorge','Research landing','Rock arch']:['Rocky headland','Forest cove','Cliff gorge','Timber jetty','Driftwood beach'];
 for(let area=0;area<5;area++){
  const center=track.samples[landmarkIndices[area]],group=new T.Group();group.userData.keep=true;group.userData.landmark=names[area];scene.add(group);
  let seed=area+17;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const placements=(count,near,spread,scale)=>Array.from({length:count},()=>{const anchor=track.samples[(landmarkIndices[area]+Math.floor((rand()-.5)*50)+track.samples.length)%track.samples.length],d=near+rand()*spread,side=area%2?1:-1;const p={x:anchor.x+Math.cos(anchor.heading)*side*(anchor.width/2+d),z:anchor.z-Math.sin(anchor.heading)*side*(anchor.width/2+d)};const pn=nearest(track,p.x,p.z),dl=Math.max(0,Math.min(d,pn.distance-pn.point.width/2));return {...p,y:height(anchor,dl)-.4,slope:Math.abs(height(anchor,d+1)-height(anchor,d)),ry:rand()*Math.PI*2,scale:scale*(.7+rand()*.6)};}).filter(p=>!onShortcut(track,p.x,p.z)&&nearest(track,p.x,p.z).distance>center.width/2+2&&(near<13||p.y>.4));
  const rocks=placements(quality===0?3:7,9,25,ice?7:5);batch(group,'namaqualand_boulder_02',rocks);
  if(area===0||area===2)batch(group,ice?'namaqualand_cliff_01':'namaqualand_boulder_02',placements(1,34,8,ice?8:7));
  if(!city){batch(group,ice?'pine_sapling_small':'island_tree_01',placements(quality===0?0:10,25,36,ice?1.2:1));batch(group,'dead_tree_trunk',placements(1,14,12,1.5));if(!ice){batch(group,'fern_02',placements(quality===0?0:12,16,18,2));batch(group,'grass_medium_01',placements(quality===0?0:12,13,12,2));}}
  if(palm){const sites=placements(quality===0?2:4,16,15,1);for(const [geo,material] of [[palm.trunk,palm.bark],[palm.fronds,palm.leaves]]){const mesh=new T.InstancedMesh(geo,material,sites.length),d=new T.Object3D();sites.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.y=p.ry;d.scale.setScalar(p.scale);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}}
  if(!ice&&!city)batch(group,'shrub_01',placements(quality===0?2:6,23,15,2));
  if(city||area===1||area===3){batch(group,'modular_wooden_pier',placements(1,3,0,2));batch(group,'wooden_crate_01',placements(2,12,5,1.5));batch(group,'Barrel_01',placements(2,14,3,1.5));batch(group,'street_lamp_01',placements(1,10,0,1.6));}
  batch(group,'tree_stump_01',placements(1,14,5,2));
  if(city&&area===3){const side=1,scale=.7,source=assets.models.get(`ph_dutch_ship_medium_lod${lod}`);if(source){const b=new T.Box3().setFromObject(source);batch(group,'dutch_ship_medium',[{x:center.x+Math.cos(center.heading)*side*(center.width/2+9),z:center.z-Math.sin(center.heading)*side*(center.width/2+9),y:-b.min.y*scale-1.5,ry:center.heading,scale}]);}}
  if(area===1||area===3)batch(group,'ocean_buoy',[-1,1].map(side=>({x:center.x+Math.cos(center.heading)*side*(center.width/2+1),z:center.z-Math.sin(center.heading)*side*(center.width/2+1),y:-.8,scale:.65,ry:area})));
  if(city&&area%2===0){const concrete=surface('concrete'),steel=surface('metal');const bridge=new T.Group();bridge.position.set(center.x,0,center.z);bridge.rotation.y=center.heading;group.add(bridge);for(const side of [-1,1]){const pier=new T.Mesh(new T.BoxGeometry(4,18,12),concrete);pier.position.set(side*(center.width/2+3),7,0);bridge.add(pier);}const deck=new T.Mesh(new T.BoxGeometry(center.width+12,2,14),steel);deck.position.y=16;bridge.add(deck);}
  if(ice&&(area===0||area===4)){const arch=new T.Mesh(new T.TorusGeometry(center.width*.65,6,6,24,Math.PI),surface('ice'));arch.position.set(center.x,8,center.z);arch.rotation.y=center.heading;arch.castShadow=arch.receiveShadow=true;group.add(arch);}
  if(!ice&&!city&&area===0){const p=placements(1,34,0,1)[0];if(p){const tower=new T.Mesh(new T.CylinderGeometry(2.2,3.5,23,20),surface('concrete'));tower.position.set(p.x,p.y+11.5,p.z);group.add(tower);const lantern=new T.Mesh(new T.CylinderGeometry(2.5,2.5,2,16),new T.MeshPhysicalMaterial({color:0xd5e0dc,metalness:.5,roughness:.15,emissive:0xffd28b,emissiveIntensity:.35}));lantern.position.set(p.x,p.y+24,p.z);group.add(lantern);}}
  // Distance culling is evaluated per viewport, preserving split-screen visibility.
  group.userData.sceneryCenter=new T.Vector3(center.x,0,center.z);group.userData.sceneryDistance=quality===0?650:quality===1?700:800;
 }
 // Both banks, including the start straight. Each cluster has its own culling bound.
 if(!city)for(let sector=0;sector<5;sector++){
  const group=new T.Group();group.userData.keep=true;const trees=[],rocks=[],shrubs=[];
  const begin=Math.floor(sector*track.samples.length/5),end=Math.floor((sector+1)*track.samples.length/5);
  for(let i=begin;i<end;i+=65)for(const side of [-1,1]){
   const anchor=track.samples[i];
   for(const [k,d] of [7,17,29].entries()){
    const p={x:anchor.x+Math.cos(anchor.heading)*side*(anchor.width/2+d),z:anchor.z-Math.sin(anchor.heading)*side*(anchor.width/2+d),y:height(anchor,d)-.15,ry:i*.73+k,scale:k===0?(ice?3:2.8):k===1?(ice?1.8:2.2):1.6};
    if(p.y>-.5&&!onShortcut(track,p.x,p.z)&&nearest(track,p.x,p.z).distance>=anchor.width/2+3)(k===0?rocks:k===1?trees:shrubs).push(p);
   }
  }
  batch(group,'namaqualand_boulder_02',rocks);batch(group,ice?'pine_sapling_small':'island_tree_01',trees);batch(group,ice?'dead_tree_trunk':'shrub_01',shrubs);
  const anchor=track.samples[Math.floor((begin+end)/2)];group.userData.sceneryCenter=new T.Vector3(anchor.x,0,anchor.z);group.userData.sceneryDistance=700;scene.add(group);
 }
 // Photo-textured waterfront warehouses, with restrained lit window rows at night.
 if(city){const brick=surface('brick'),metal=surface('metal');brick.onBeforeCompile=s=>{
   s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec2 cell=fract(vMapUv*vec2(3.,4.));float window=step(.22,cell.x)*step(cell.x,.7)*step(.3,cell.y)*step(cell.y,.68);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.022,.035,.045),window);');
   s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.9,.55,.22)*window*.6;');
  };
  for(let i=0;i<10;i++){const p=track.samples[Math.floor(i/10*track.samples.length)],height=14+i%3*8,geometry=new T.BoxGeometry(22,height,18),uv=geometry.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*4,uv.getY(k)*2);
   const building=new T.Group();building.position.set(p.x+Math.cos(p.heading)*(p.width/2+45),5,p.z-Math.sin(p.heading)*(p.width/2+45));building.rotation.y=p.heading;scene.add(building);
   const wall=new T.Mesh(geometry,i%3?brick:metal);wall.position.y=height/2;wall.castShadow=wall.receiveShadow=true;building.add(wall);
   const base=new T.Mesh(new T.BoxGeometry(26,6,22),surface('concrete'));base.position.y=-1;building.add(base);
   const roof=new T.Mesh(new T.BoxGeometry(24,1.2,20),metal);roof.position.y=height+.6;building.add(roof);
   const annex=new T.Mesh(new T.BoxGeometry(10,7+i%3*2,12),brick);annex.position.set(i%2?15:-15,4,1);building.add(annex);
   for(const x of [-9,0,9]){const pilaster=new T.Mesh(new T.BoxGeometry(.65,height,1),metal);pilaster.position.set(x,height/2,-9.3);building.add(pilaster);}

  }}
 if(city){const edge=surface('concrete',0xb5bdc1),count=Math.ceil(track.samples.length/3)*2,curbs=new T.InstancedMesh(new T.BoxGeometry(2,2.2,1),edge,count),dummy=new T.Object3D();let n=0;
  for(let i=0;i<track.samples.length;i+=3){const p=track.samples[i],q=track.samples[(i+3)%track.samples.length];for(const side of [-1,1]){const x=p.x+Math.cos(p.heading)*side*(p.width/2+1.5),z=p.z-Math.sin(p.heading)*side*(p.width/2+1.5),xx=q.x+Math.cos(q.heading)*side*(q.width/2+1.5),zz=q.z-Math.sin(q.heading)*side*(q.width/2+1.5);dummy.position.set((x+xx)/2,.1,(z+zz)/2);dummy.rotation.y=Math.atan2(xx-x,zz-z);dummy.scale.set(1,1,Math.hypot(xx-x,zz-z)+.3);dummy.updateMatrix();curbs.setMatrixAt(n++,dummy.matrix);}}
  curbs.castShadow=curbs.receiveShadow=true;scene.add(curbs);
 }

 // Channel edge markers and shortcut signs retain strong arcade contrast.
 const markerMat=new T.MeshStandardMaterial({color:0x68ccb9,emissive:0x15483d});const sites=track.samples.filter((_,i)=>i%20===0),markers=new T.InstancedMesh(new T.CylinderGeometry(.3,.5,1.7,6),markerMat,sites.length*2),dummy=new T.Object3D();let n=0;
 for(const p of sites)for(const side of [-1,1]){dummy.position.set(p.x+Math.cos(p.heading)*side*(p.width/2-1),.7,p.z-Math.sin(p.heading)*side*(p.width/2-1));dummy.updateMatrix();markers.setMatrixAt(n++,dummy.matrix);}scene.add(markers);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#081a21';ctx.fillRect(0,0,512,128);ctx.fillStyle='#ffcf68';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText('SHORTCUT / RISK',256,80);const signTexture=new T.CanvasTexture(canvas);signTexture.colorSpace=T.SRGBColorSpace;const signMaterial=new T.MeshBasicMaterial({map:signTexture,side:T.DoubleSide,toneMapped:false});
 for(const shortcut of track.shortcuts){const sign=new T.Mesh(new T.PlaneGeometry(14,3.5),signMaterial);sign.position.set(shortcut.a.x,10,shortcut.a.z);sign.rotation.y=Math.atan2(shortcut.b.x-shortcut.a.x,shortcut.b.z-shortcut.a.z)+Math.PI;scene.add(sign);}
 if(quality===0&&contacts.length){const g=new T.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);const m=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){float a=1.-smoothstep(.05,.5,length(v-.5));gl_FragColor=vec4(.07,.09,.08,a*.24);}'});const o=new T.InstancedMesh(g,m,contacts.length);contacts.forEach((p,i)=>{dummy.position.set(p.x,p.y+.06,p.z);dummy.scale.setScalar(p.scale);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});scene.add(o);}
}
