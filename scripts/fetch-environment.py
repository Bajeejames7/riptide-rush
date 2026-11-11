"""Fetch CC0 data only; invoked by fetch-polyhaven.py --environment."""
import urllib.request,pathlib,json,concurrent.futures,time,sys
ROOT=pathlib.Path('assets-src/polyhaven');ROOT.mkdir(parents=True,exist_ok=True)
MODELS=['island_tree_01','pine_sapling_small','dead_tree_trunk','fern_02','grass_medium_01','shrub_01','tree_stump_01','namaqualand_boulder_02','namaqualand_cliff_01','modular_wooden_pier','wooden_crate_01','Barrel_01','ocean_buoy','street_lamp_01','dutch_ship_medium']
TEXTURES={'sand':'aerial_beach_01','wet':'damp_beach_sand','rock':'rock_boulder_dry','moss':'mossy_rock','grass':'forest_floor','snow':'snow_02','ice':'snow_04','glacier':'rock_06','asphalt':'asphalt_02','concrete':'concrete_floor_02','brick':'brick_wall_001','metal':'corrugated_iron','bark':'palm_bark'}
def get(url,path):
 if not url.startswith(('https://api.polyhaven.com/','https://dl.polyhaven.org/')):raise ValueError(url)
 path=pathlib.Path(path)
 if path.exists() and path.stat().st_size:return path.read_bytes()
 for attempt in range(4):
  try:
   data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=120).read();path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return data
  except Exception:
   if attempt==3:raise
   time.sleep(1+attempt)
def api(endpoint):return json.loads(get('https://api.polyhaven.com/'+endpoint,ROOT/(endpoint.replace('/','_').replace('?','_')+'.json')))
models=api('assets?t=models');textures=api('assets?t=textures')
selected={k:models[k] for k in MODELS if k in models}
(ROOT/'selection.json').write_text(json.dumps({'models':selected,'textures':TEXTURES,'palms':[k for k,v in models.items() if 'palm' in (k+' '+str(v.get('tags',[]))).lower()]},indent=2),encoding='utf8')
jobs=[]
for name in ([] if '--textures-only' in sys.argv else selected):
 files=api('files/'+name)
 for res in ['1k','2k']:
  entry=files['gltf'][res]['gltf'];folder=ROOT/name/res;jobs.append((entry['url'],folder/(name+'.gltf')));jobs.extend((v['url'],folder/k) for k,v in entry.get('include',{}).items())
for label,name in TEXTURES.items():
 if name not in textures:continue
 files=api('files/'+name)
 for res in ['1k','2k']:
  for channel in ['diff','nor_gl','rough','ao','disp']:
   key={'diff':'Diffuse','rough':'Rough','ao':'AO','disp':'Displacement'}.get(channel,channel)
   formats=files.get(key,files.get(channel,{})).get(res,{});entry=formats.get('jpg') or formats.get('png')
   if entry:jobs.append((entry['url'],ROOT/'textures'/res/(label+'_'+channel+pathlib.Path(entry['url']).suffix)))
def job(pair):
 url,path=pair
 try:data=get(url,path);print(str(path),len(data),flush=True);return {'file':str(path),'url':url,'bytes':len(data),'license':'CC0'}
 except Exception as e:print('FAILED',url,str(e),flush=True);return {'url':url,'error':str(e)}
unique={}
for url,path in jobs:unique.setdefault(url,[]).append(path)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:results=list(pool.map(job,[(url,paths[0]) for url,paths in unique.items()]))
import shutil
for paths in unique.values():
 for path in paths[1:]:
  if paths[0].exists():path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(paths[0],path)
(ROOT/('texture-download.json' if '--textures-only' in sys.argv else 'round6-download.json')).write_text(json.dumps(results,indent=2),encoding='utf8')
if any('error' in r for r in results):raise SystemExit('Downloads failed; rerun to retry')
