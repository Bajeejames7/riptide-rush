// Browser-only verification. Never starts Electron. Captures errors, budgets and native-size races.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {createServer} from 'vite';
import WebSocket from 'ws';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function measure(){
 const {graphics:g,boats}=window.rrVerify,tune=g.autoTune;
 g.autoTune=()=>{};g.dyn=1;g.resize();
 try{
  const frames=[],start=performance.now();await new Promise(done=>{function tick(){frames.push({...g.frameStats});performance.now()-start>4000?done():requestAnimationFrame(tick);}tick();});
  const gl=g.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {fps:frames.length/((performance.now()-start)/1000),size:[innerWidth,innerHeight],buffer:[g.renderer.domElement.width,g.renderer.domElement.height],quality:g.settings.quality,boats:boats.length,allAI:boats.every(b=>!b.local),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),maxCalls:Math.max(...frames.map(s=>s.maxCalls||0)),maxTriangles:Math.max(...frames.map(s=>s.maxTriangles||0)),hud:document.querySelector('#hud')?.innerText};
 }finally{g.autoTune=tune;}
}
const server=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:5199}});await server.listen();
fs.mkdirSync('artifacts/round6',{recursive:true});
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9335','--window-size=1426,827','--user-data-dir='+process.cwd()+'/.chrome-round6','about:blank'],{stdio:'ignore',windowsHide:true});
try{
 let target;for(let i=0;i<40&&!target;i++){await sleep(250);try{target=(await(await fetch('http://127.0.0.1:9335/json')).json()).find(t=>t.type==='page');}catch{}}
 if(!target)throw Error('Chrome debugging unavailable');const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
 let id=0,failed=false;const pending=new Map(),errors=[];ws.on('message',raw=>{const d=JSON.parse(raw);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}if(d.method==='Runtime.exceptionThrown'||d.method==='Log.entryAdded'&&d.params.entry.level==='error'||d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push(d.params);});
 const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});
 await send('Runtime.enable');await send('Log.enable');await send('Emulation.setDeviceMetricsOverride',{width:1426,height:827,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:5199/'});await sleep(1000);
 const qualities=process.argv.includes('--high')?[2]:[0];
 for(const quality of qualities)for(const track of [0,1,2]){
  errors.length=0;await send('Runtime.evaluate',{expression:`localStorage.setItem('rr.settings',JSON.stringify({quality:${quality},scale:1}));`});
  await send('Page.navigate',{url:`http://127.0.0.1:5199/?verify=1&track=${track}`});
  let ready=false;for(let i=0;i<180&&!ready;i++){await sleep(500);const r=await send('Runtime.evaluate',{expression:'!!window.rrVerify?.graphics?.water',returnByValue:true});ready=r.result?.result?.value;}
  if(!ready)throw Error('Race failed to load '+track+' quality '+quality);
  await sleep(3000);
  const r=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(${measure.toString()})()`});
  if(r.result?.exceptionDetails||errors.length)failed=true;
  const result={track,quality,result:r.result?.result,errors:[...errors]};fs.writeFileSync(`artifacts/round6/track${track}-q${quality}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:85});if(shot.result?.data)fs.writeFileSync(`artifacts/round6/track${track}-q${quality}.jpg`,Buffer.from(shot.result.data,'base64'));
 }
 ws.close();
 if(failed)process.exitCode=1;
}finally{child.kill();await server.close();}
