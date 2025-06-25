/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // Expone función para imprimir PDFs directamente desde el renderer
  printDirectly: (buffer, filename) => ipcRenderer.send('print-pdf', { buffer, filename })

})
contextBridge.exposeInMainWorld('electronAPI', {
  // Expone funciones para actualización y logs de actualización al renderer
  getAppVersion: () => ipcRenderer.sendSync('get-app-version'),
  checkUpdateAndInstall: () => ipcRenderer.invoke('check-update-and-install'),
  onUpdateLog: (callback) => ipcRenderer.on('update-log', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback)
})
