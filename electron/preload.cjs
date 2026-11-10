const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  host: (port) => ipcRenderer.invoke("host", port),
  discover: () => ipcRenderer.invoke("discover"),
  addresses: () => ipcRenderer.invoke("addresses"),
  fullscreen: () => ipcRenderer.invoke("fullscreen"),
  stopHost: () => ipcRenderer.invoke("stop-host"),
});
