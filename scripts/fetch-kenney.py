import urllib.request,json,zipfile,io,pathlib,concurrent.futures,http.cookiejar
urls={
'watercraft-kit':'https://kenney.nl/media/pages/assets/watercraft-kit/a335cfed49-1713519620/kenney_watercraft-pack.zip',
'pirate-kit':'https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip',
'city-kit-commercial':'https://kenney.nl/media/pages/assets/city-kit-commercial/a742d900eb-1753115042/kenney_city-kit-commercial_2.1.zip',
# Particle PNGs use fetch-particles.py to avoid the host's truncated full-archive stream.
}
def run(pair):
 pack,url=pair
 try:
  o=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));o.addheaders=[('User-Agent','Mozilla/5.0'),('Referer','https://kenney.nl/assets/'+pack),('X-Requested-With','XMLHttpRequest')];o.open('https://kenney.nl/assets/'+pack).read();url=json.load(o.open('https://kenney.nl/download-link/'+('assets/'+pack).encode().hex()))['url'];data=o.open(url,timeout=90).read();folder=pathlib.Path('assets-src')/pack;folder.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   for item in z.infolist():
    p=pathlib.PurePosixPath(item.filename)
    if '..' in p.parts or any(':' in part for part in p.parts) or p.is_absolute() or p.suffix.lower() not in ['.glb','.gltf','.bin','.obj','.fbx','.png','.jpg','.webp','.hdr','.exr','.txt']:continue
    t=folder/pathlib.Path(*p.parts);t.parent.mkdir(parents=True,exist_ok=True);t.write_bytes(z.read(item))
  (folder/'download.json').write_text(json.dumps({'url':url,'bytes':len(data),'license':'CC0','page':'https://kenney.nl/assets/'+pack}));print(pack,len(data),flush=True)
 except Exception as e: print(pack,e,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(run,urls.items()))
