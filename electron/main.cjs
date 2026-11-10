const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const path = require("node:path");
const { hostGame, discover, addresses } = require("./server.cjs");
const { pathToFileURL } = require('node:url');
const { resolveAssetUrl } = require('./assets.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'riptide-assets',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let hosted, window;
app.setPath("userData", path.join(app.getPath("appData"), "Riptide Rush"));
app.whenReady().then(() => {
  // Serve only bundled art through a fetch-capable scheme. Keep the existing file
  // page origin so saved records, settings and controller bindings stay available.
  protocol.handle('riptide-assets', async (request) => {
    try {
      const target=resolveAssetUrl(request.url,path.join(__dirname,'../dist/assets'));
      if(!target || request.method!=='GET') return new Response('Not found',{status:404});
      const result=await net.fetch(pathToFileURL(target).toString());
      const headers=new Headers(result.headers);headers.set('Access-Control-Allow-Origin','*');
      return new Response(result.body,{status:result.status,headers});
    } catch { return new Response('Bundled asset unavailable',{status:404,headers:{'Access-Control-Allow-Origin':'*'}}); }
  });
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#061424",
    icon: path.join(__dirname, "../build/icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL)
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  else window.loadFile(path.join(__dirname, "../dist/index.html"));
});
ipcMain.handle("host", async (_, port) => {
  if (hosted) await hosted.close();
  hosted = await hostGame(
    Math.max(1024, Math.min(65535, Number(port) || 27015)),
  );
  return { port: hosted.port, addresses: hosted.addresses };
});
ipcMain.handle("discover", () => discover());
ipcMain.handle("addresses", () => addresses());
ipcMain.handle("fullscreen", () => {
  window.setFullScreen(!window.isFullScreen());
  return window.isFullScreen();
});
ipcMain.handle("stop-host", async () => {
  if (hosted) await hosted.close();
  hosted = null;
});
app.on("window-all-closed", () => {
  hosted?.close();
  app.quit();
});
