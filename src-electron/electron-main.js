import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import os from 'os'
import fs from 'fs'
import { print } from 'pdf-to-printer' // <--- Agrega esto
const { autoUpdater } = require('electron-updater')
const fetch = require('node-fetch')
const path = require('path')

// Importaciones principales de Electron y módulos de Node.js

// Detecta el sistema operativo actual
const platform = process.platform || os.platform()

try {
  // Elimina extensiones de DevTools en Windows si está en modo oscuro
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    fs.unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

let mainWindow
// Evento principal: cuando la app está lista, crea la ventana y borra instaladores viejos
app.whenReady().then(() => {
  createWindow()
  borrarInstaladoresViejos()
  // Mostrar mensaje si existe el flag de actualización exitosa
  const flagPath = path.join(app.getPath('userData'), 'update-success.flag')
  if (fs.existsSync(flagPath)) {
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('update-success')
      })
    }
    fs.unlinkSync(flagPath)
  }
})

function createWindow () {
  /**
   * Configuración inicial de la ventana principal de la app
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
    }
  })

  mainWindow.loadURL(process.env.APP_URL)

  if (process.env.DEBUGGING) {
    // Desarrollo
    mainWindow.webContents.openDevTools()
  } else {
    // Produccion
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
    mainWindow.removeMenu()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Eventos de ciclo de vida de la aplicación (cerrar, activar)
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// NUEVO: Manejar impresión directa de PDF
ipcMain.on('print-pdf', (event, { buffer, filename }) => {
  const tempPath = path.join(os.tmpdir(), filename)
  fs.writeFile(tempPath, Buffer.from(buffer), (err) => {
    if (err) {
      console.error('Error guardando PDF:', err)
      return
    }
    // Imprimir directamente el PDF sin abrir ventana
    print(tempPath, { silent: true })
      .then(() => {
        // Opcional: eliminar el archivo temporal después de imprimir
        fs.unlink(tempPath, () => { })
      })
      .catch((error) => {
        console.error('Error imprimiendo PDF:', error)
      })
  })
})

// Evento para iniciar la búsqueda de actualizaciones en producción
app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') {
    autoUpdater.checkForUpdatesAndNotify()
  }
})

// Evento para obtener la versión actual de la app
ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion()
})

// Función auxiliar para enviar logs y progreso al renderer
function enviarLog (mensaje) {
  if (mainWindow) mainWindow.webContents.send('update-log', mensaje)
}
function enviarProgreso (percent) {
  if (mainWindow) mainWindow.webContents.send('update-progress', percent)
}

// Función principal: chequea si hay una nueva versión en GitHub y la instala si corresponde
async function checkAndUpdateFromGithub () {
  /* enviarLog('Buscando nueva versión...') */
  enviarProgreso(-1) // <- Esto es clave
  const apiUrl = 'https://api.github.com/repos/TU-USUARIO/TU-REPO/releases/latest'
  const GITHUB_TOKEN = 'TU-TOKEN'

  const headers = GITHUB_TOKEN
    ? {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    : {
        Accept: 'application/vnd.github.v3+json'
      }

  /* enviarLog('preFetch') */
  /* enviarLog(apiUrl) */
  /* enviarLog(GITHUB_TOKEN) */
  const res = await fetch(apiUrl, { headers })
  /* enviarLog('Respuesta fetch releases: ' + res.status) */
  const release = await res.json()
  /* enviarLog('Release info: ' + JSON.stringify(release)) */

  // Usar la versión nativa de Electron
  const currentVersion = app.getVersion()
  // El tag del release debe ser igual al valor de "version" en package.json
  const latestVersion = release.tag_name.replace(/^v/, '') // quita la "v" si la tiene

  enviarLog(`Versión actual: ${currentVersion}`)
  enviarLog(`Última versión: ${latestVersion}`)
  if (latestVersion === currentVersion) {
    /* enviarLog('Ya tienes la última versión.') */
    return { updated: false, message: 'Ya tienes la última versión.' }
  }
  enviarLog('Descargando...')
  // Buscar el instalador adecuado
  let asset
  if (process.platform === 'win32') {
    asset = release.assets.find(a => a.name.endsWith('.exe'))
  } else if (process.platform === 'darwin') {
    asset = release.assets.find(a => a.name.endsWith('.dmg'))
  } else if (process.platform === 'linux') {
    asset = release.assets.find(a => a.name.endsWith('.AppImage'))
  }
  if (!asset) {
    /* enviarLog('No se encontró el instalador adecuado para este sistema.') */
    return { updated: false, message: 'No se encontró el instalador adecuado.' }
  }

  // Descargar el instalador
  const installerPath = path.join(app.getPath('userData'), asset.name)
  const file = fs.createWriteStream(installerPath)
  await new Promise((resolve, reject) => {
    fetch(asset.browser_download_url, { headers }).then(res => {
      const total = Number(res.headers.get('content-length')) || 0
      let downloaded = 0
      res.body.on('data', chunk => {
        downloaded += chunk.length
        if (total > 0) {
          enviarProgreso(Math.round((downloaded / total) * 100))
        }
      })
      res.body.pipe(file)
      res.body.on('error', reject)
      file.on('finish', () => {
        file.close(resolve)
      })
    })
  })
  /* enviarLog('Instalador descargado: ' + installerPath) */

  // Ejecutar el instalador (ejemplo para Windows)
  if (process.platform === 'win32') {
    require('child_process').spawn(installerPath, ['/S'], { detached: true, stdio: 'ignore' }).unref()
    // Crea un script VBScript para mostrar el mensaje
    const vbsPath = path.join(app.getPath('userData'), 'update-msg.vbs')
    const vbsContent = `
      MsgBox "El programa se actualizo correctamente. Por favor, vuelva a abrirlo.", 64, "Actualizacion completada"
    `
    fs.writeFileSync(vbsPath, vbsContent)
    // Ejecuta el script de mensaje (ventana independiente)
    require('child_process').spawn('cscript', ['//Nologo', vbsPath], { detached: true, stdio: 'ignore' }).unref()
    // Crea el flag de actualizacion exitosa (opcional, si lo sigues usando)
    const flagPath = path.join(app.getPath('userData'), 'update-success.flag')
    fs.writeFileSync(flagPath, '')
    return { updated: true, message: 'El programa se actualizo correctamente. Por favor, vuelva a abrirlo.' }
  }
  // Agrega lógica similar para otros sistemas operativos si lo necesitas
}

// IPC handler para que el renderer pueda disparar la actualización
ipcMain.handle('check-update-and-install', async () => {
  try {
    return await checkAndUpdateFromGithub()
  } catch (e) {
    return { updated: false, message: 'Error al actualizar: ' + e.message }
  }
})

// Borra instaladores viejos para evitar acumulación de archivos
function borrarInstaladoresViejos () {
  const userDir = app.getPath('userData')
  fs.readdir(userDir, (err, files) => {
    if (err) return
    files.forEach(file => {
      if (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.AppImage')) {
        try {
          fs.unlinkSync(path.join(userDir, file))
        } catch (e) {}
      }
    })
  })
}
