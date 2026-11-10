import urllib.request,pathlib,json,concurrent.futures
jobs=[]
for label,name in [('tropic','kloofendal_48d_partly_cloudy_puresky'),('ice','qwantani_dusk_2_puresky'),('city','shanghai_bund')]:jobs.append((f'skies/{label}.hdr',f'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/{name}_1k.hdr',name))
for label,name in [('sand','aerial_beach_01'),('rock','rock_boulder_dry'),('snow','snow_02'),('concrete','concrete_floor_02'),('metal','metal_plate')]:
 for channel in ['diff','nor_gl','rough']:jobs.append((f'textures/{label}_{channel}.jpg',f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{name}/{name}_{channel}_1k.jpg',name))
def run(job):
 dest,url,name=job
 try:
  data=urllib.request.urlopen(url,timeout=65).read();p=pathlib.Path('public/assets')/dest;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);print(dest,len(data),flush=True);return {'file':dest,'url':url,'bytes':len(data),'asset':name,'license':'CC0'}
 except Exception as e:print(dest,e,flush=True);return {'file':dest,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:results=list(ex.map(run,jobs))
p=pathlib.Path('assets-src/polyhaven');p.mkdir(parents=True,exist_ok=True);(p/'download.json').write_text(json.dumps(results,indent=2))
