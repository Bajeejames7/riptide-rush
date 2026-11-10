import pathlib,struct,json,base64,shutil
root=pathlib.Path('public/assets/models');root.mkdir(parents=True,exist_ok=True)
choices={**{'boat'+str(i):('watercraft-kit','boat-speed-'+chr(97+i)) for i in range(6)},'palm':('pirate-kit','palm-detailed-bend'),'rock':('pirate-kit','rocks-a'),'hut':('pirate-kit','structure'),'pier':('pirate-kit','structure-platform-dock'),'ship':('watercraft-kit','ship-large'),'wreck':('pirate-kit','ship-wreck'),'lighthouse':('pirate-kit','tower-complete-large'),'station':('city-kit-commercial','building-e'),'street':('city-kit-commercial','detail-parasol-a'),**{'building'+str(i):('city-kit-commercial',('building-'+chr(97+i) if i<3 else 'building-skyscraper-c')) for i in range(4)}}
entries=[]
for dest,(pack,name) in choices.items():
 p=next(pathlib.Path('assets-src',pack).rglob(name+'.glb'));b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);tris=sum(d['accessors'][q['indices']]['count']//3 for m in d['meshes'] for q in m['primitives']);print(dest,tris)
 for img in d.get('images',[]):
  if 'uri' in img and not img['uri'].startswith('data:'):img['uri']='data:image/png;base64,'+base64.b64encode((p.parent/img['uri']).read_bytes()).decode()
 payload=json.dumps(d,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);rest=b[20+n:];out=b[:8]+struct.pack('<I',20+len(payload)+len(rest))+struct.pack('<II',len(payload),0x4e4f534a)+payload+rest;(root/(dest+'.glb')).write_bytes(out)
 entries.append({'file':'models/'+dest+'.glb','original':str(p),'bytes':len(out),'triangles':tris,'pack':pack})
pathlib.Path('assets-src/selected.json').write_text(json.dumps(entries,indent=2))
# Original, seamless water-detail normal: generated offline, never at runtime.
import math
from PIL import Image
im=Image.new('RGB',(512,512));pixels=im.load()
for y in range(512):
 for x in range(512):
  dx=dz=0.0
  for kx,kz,amp,phase in [(3,7,.42,.4),(11,-5,.2,1.3),(-17,13,.12,2.1),(29,23,.08,.7)]:
   a=2*math.pi*(kx*x+kz*y)/512+phase;dx+=amp*kx/12*math.cos(a);dz+=amp*kz/12*math.cos(a)
  length=math.sqrt(dx*dx+dz*dz+1);pixels[x,y]=(int((-dx/length*.5+.5)*255),int((-dz/length*.5+.5)*255),int((1/length*.5+.5)*255))
im.save('public/assets/textures/water_normal.jpg',quality=95)
manifest={'fields':['shore_tropic','shore_ice','shore_city'],'models':list(choices),'textures':[p.stem for p in pathlib.Path('public/assets/textures').glob('*.jpg')]};pathlib.Path('public/assets/manifest.json').write_text(json.dumps(manifest,indent=2))
for pack in ['watercraft-kit','pirate-kit','city-kit-commercial']:
 p=pathlib.Path('public/assets/licenses');p.mkdir(exist_ok=True);shutil.copyfile(next(pathlib.Path('assets-src',pack).rglob('License.txt')),p/(pack+'.txt'))

# Selected CC0 particle PNGs recovered from the archive's individually CRC-checked entries.
particle_root=pathlib.Path('assets-src/particle-pack/PNG (Transparent)')
sprite_root=pathlib.Path('public/assets/sprites');sprite_root.mkdir(exist_ok=True)
sprites={'spray':'dirt_02.png','foam':'fire_01.png','flame':'flame_01.png'}
for dest,source in sprites.items():shutil.copyfile(particle_root/source,sprite_root/(dest+'.png'))
pathlib.Path('assets-src/particle-selection.json').write_text(json.dumps(sprites,indent=2))
pathlib.Path('public/assets/licenses/particle-pack.txt').write_text('Kenney Particle Pack\nSource: https://kenney.nl/assets/particle-pack\nAuthor: Kenney\nLicense: Creative Commons Zero (CC0 1.0), as stated on the source page.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nPNG entries recovered from a partial download; the archive licence entry was not reached.\n')
pathlib.Path('public/assets/licenses/polyhaven.txt').write_text('Poly Haven assets\nSource and licence statement: https://polyhaven.com/license\nAll Poly Haven HDRIs, textures and 3D models are licensed CC0.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nSelected source URLs are in ASSETS.md.\n')
