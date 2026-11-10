import urllib.request,http.cookiejar,json,struct,zlib,pathlib,time
p='particle-pack';folder=pathlib.Path('assets-src',p);folder.mkdir(parents=True,exist_ok=True)
o=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));o.addheaders=[('User-Agent','Mozilla/5.0'),('Referer','https://kenney.nl/assets/'+p),('X-Requested-With','XMLHttpRequest')]
o.open('https://kenney.nl/assets/'+p,timeout=30).read();u=json.load(o.open('https://kenney.nl/download-link/'+('assets/'+p).encode().hex(),timeout=30))['url'];r=o.open(u,timeout=60);received=0;selected=[]
def read(n):
 global received
 b=r.read(n);received+=len(b)
 if len(b)!=n:raise EOFError()
 return b
for entry in range(800):
 h=read(30)
 if h[:4]!=b'PK\x03\x04':break
 version,flags,method,mtime,mdate,crc,compressed,size,namelen,extralen=struct.unpack('<5H3I2H',h[4:]);name=read(namelen).decode('utf-8');read(extralen);print(name,compressed,flags,flush=True)
 if flags&8:raise RuntimeError('ZIP uses streaming descriptors')
 payload=read(compressed)
 if name.lower().endswith('.png') or 'license' in name.lower():
  data=zlib.decompress(payload,-15) if method==8 else payload
  if zlib.crc32(data)&0xffffffff!=crc:raise RuntimeError('CRC mismatch')
  path=pathlib.PurePosixPath(name)
  if '..' in path.parts or path.is_absolute() or any(':' in part for part in path.parts):raise RuntimeError('Bad entry')
  target=folder/pathlib.Path(*path.parts);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);selected.append(name)
 if len([s for s in selected if s.endswith('.png')])>=12:break
r.close();(folder/'download.json').write_text(json.dumps({'page':'https://kenney.nl/assets/particle-pack','url':u,'bytes':received,'archiveBytes':15001764,'license':'CC0','partial':True,'recovered':selected,'failedPreviousBytes':12287413},indent=2));print('Recovered',received,selected,flush=True)
