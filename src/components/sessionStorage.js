const isElectron = () => {
  return !!(window && window.process && window.process.type)
}

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
  set (key, value, options = {}) {
    const expires = options.expires ? parseExpires(options.expires) : null
    const data = JSON.stringify({ value, expires })
    if (isElectron() && window.electronAPI) {
      window.electronAPI.setSessionItem(key, data)
    } else {
      window.sessionStorage.setItem(key, data)
    }
  },
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
  remove (key) {
    if (isElectron() && window.electronAPI) {
      window.electronAPI.removeSessionItem(key)
    } else {
      window.sessionStorage.removeItem(key)
    }
  }
}

export default session
