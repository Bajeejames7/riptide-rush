"""Supplement glTF JPEG foliage with separately published CC0 alpha masks."""
import pathlib,json,urllib.request,concurrent.futures,time
root=pathlib.Path('assets-src/polyhaven');selection=json.loads((root/'selection.json').read_text(encoding='utf8'));jobs=[]
for name in selection['models']:
 files=json.loads((root/('files_'+name+'.json')).read_text(encoding='utf8'))
 for key,values in files.items():
  if 'alpha' not in key.lower():continue
  for res in ['1k','2k']:
   e=values.get(res,{}).get('png') or values.get(res,{}).get('jpg')
   if e:jobs.append((e['url'],root/name/res/'alpha'/(key+pathlib.Path(e['url']).suffix)))
def run(job):
 url,p=job
 if p.exists():return
 if not url.startswith('https://dl.polyhaven.org/'):raise ValueError(url)
 for attempt in range(4):
  try:
   data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=120).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);print(p,flush=True);return
  except Exception:
   if attempt==3:raise
   time.sleep(attempt+1)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(run,jobs))
(root/'alpha-download.json').write_text(json.dumps([{'url':u,'file':str(p),'license':'CC0'} for u,p in jobs],indent=2))
