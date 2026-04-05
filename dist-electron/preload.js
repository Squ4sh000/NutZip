import { contextBridge as l, ipcRenderer as o } from "electron";
const i = {
  windowControl: (e) => o.send("window-control", e),
  selectFile: () => o.invoke("select-file"),
  selectFolder: () => o.invoke("select-folder"),
  compressFile: (e) => o.invoke("compress-file", e),
  decompressFile: (e) => o.invoke("decompress-file", e)
};
try {
  l.exposeInMainWorld("electronAPI", i);
} catch {
  window.electronAPI = i;
}
