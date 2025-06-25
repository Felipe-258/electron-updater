// Detecta si la app corre en Electron o en navegador
const isElectron = () => {
  return !!(window && window.process && window.process.type)
}

// Parsea el formato de expiración (años, horas, milisegundos)
function parseExpires (expires) {
  if (!expires) return null
  if (typeof expires === 'string' && expires.endsWith('Y')) {
    // Años
    return Date.now() + parseInt(expires) * 365 * 24 * 60 * 60 * 1000
  }
  if (typeof expires === 'string' && expires.endsWith('h')) {
    // Horas
    return Date.now() + parseInt(expires) * 60 * 60 * 1000
  }
  if (typeof expires === 'number') {
    return Date.now() + expires
  }
  return null
}

const session = {
  // Guarda un valor en sessionStorage o en el almacenamiento de Electron, con expiración opcional
  set (key, value, options = {}) {
    const expires = options.expires ? parseExpires(options.expires) : null
    const data = JSON.stringify({ value, expires })
    if (isElectron() && window.electronAPI) {
      window.electronAPI.setSessionItem(key, data)
    } else {
      window.sessionStorage.setItem(key, data)
    }
  },
  // Obtiene un valor, chequeando si expiró
  get (key) {
    let data
    if (isElectron() && window.electronAPI) {
      data = window.electronAPI.getSessionItem(key)
    } else {
      data = window.sessionStorage.getItem(key)
    }
    if (!data) return null
    try {
      const { value, expires } = JSON.parse(data)
      if (expires && Date.now() > expires) {
        // Vencido, lo borro
        session.remove(key)
        return null
      }
      return value
    } catch (e) {
      // Si no es JSON, devuelvo el valor crudo (compatibilidad vieja)
      return data
    }
  },
  // Elimina un valor del almacenamiento
  remove (key) {
    if (isElectron() && window.electronAPI) {
      window.electronAPI.removeSessionItem(key)
    } else {
      window.sessionStorage.removeItem(key)
    }
  }
}

export default session
