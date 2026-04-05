/// <reference types="vite/client" />

interface ElectronAPI {
  windowControl: (type: string) => void
  selectFile: () => Promise<string[]>
  selectFolder: () => Promise<string>
  compressFile: (data: { input: string; output: string; format: string; level: number }) => Promise<string>
  decompressFile: (data: { input: string; output: string; format: string }) => Promise<string>
}

interface Window {
  electronAPI: ElectronAPI
}
