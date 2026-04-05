import { contextBridge, ipcRenderer } from 'electron'

const api = {
  windowControl: (type: string) => ipcRenderer.send('window-control', type),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  compressFile: (data: any) => ipcRenderer.invoke('compress-file', data),
  decompressFile: (data: any) => ipcRenderer.invoke('decompress-file', data),
}

// Support both contextIsolation true and false
try {
  contextBridge.exposeInMainWorld('electronAPI', api)
} catch (e) {
  // Fallback if contextBridge is not available (contextIsolation: false)
  // @ts-ignore
  window.electronAPI = api
}
