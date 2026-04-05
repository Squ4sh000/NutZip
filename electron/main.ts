import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join, dirname } from 'path'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

process.env.DIST = join(__dirname, '../dist')
process.env.VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let win: BrowserWindow | null

const BACKEND_PATH = join(process.cwd(), 'backend/nutzip.exe')

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: join(__dirname, '../assets/nut-icon.png'), // Placeholder icon for production
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false, 
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(process.env.DIST!, 'index.html'))
  }

  // Handle window control
  ipcMain.on('window-control', (_event, type) => {
    switch (type) {
      case 'minimize': win?.minimize(); break;
      case 'maximize': win?.isMaximized() ? win.unmaximize() : win?.maximize(); break;
      case 'close': win?.close(); break;
    }
  })

  // Handle file opening in folder
  ipcMain.on('open-in-folder', (_event, path) => {
    shell.showItemInFolder(path)
  })

  // Handle opening external links
  ipcMain.on('open-external', (_event, url) => {
    shell.openExternal(url)
  })

  // Handle file dialog
  ipcMain.handle('select-file', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    })
    return filePaths
  })

  ipcMain.handle('select-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return filePaths[0]
  })

  // Handle compression logic
  ipcMain.handle('compress-file', async (_event, { inputs, output, format, level }) => {
    return new Promise((resolve, reject) => {
      // inputs is now an array
      const args = ['compress', output, format, level.toString(), inputs.length.toString(), ...inputs]
      execFile(BACKEND_PATH, args, (error, stdout, _stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout)
      })
    })
  })

  ipcMain.handle('decompress-file', async (_event, { input, output, format }) => {
    return new Promise((resolve, reject) => {
      execFile(BACKEND_PATH, ['decompress', input, output, format], (error, stdout, _stderr) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout)
      })
    })
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
