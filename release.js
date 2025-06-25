const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, 'dist', 'electron')

// Función recursiva para buscar instaladores en subcarpetas
function buscarInstaladores (dir) {
  let encontrados = []
  const elementos = fs.readdirSync(dir)
  elementos.forEach(el => {
    const ruta = path.join(dir, el)
    const stat = fs.statSync(ruta)
    if (stat.isDirectory()) {
      encontrados = encontrados.concat(buscarInstaladores(ruta))
    } else {
      // Solo archivos relevantes para el release
      if (
        /Facturalo Simple Setup.*\.exe$/i.test(el) || // Instalador principal
        el === 'latest.yml' ||// Archivo de actualización
        /\.dmg$/i.test(el) ||// Mac
        /\.AppImage$/i.test(el) // Linux
      ) {
        /* console.log('Instalador encontrado:', ruta) */
        encontrados.push(ruta)
      }
    }
  })
  return encontrados
}

const assets = buscarInstaladores(distDir)

if (assets.length === 0) {
  console.error('No se encontraron instaladores ni archivos de release en dist/electron')
  process.exit(1)
}

const repo = 'Felipe-258/electron-updater' // Cambia si es necesario
const packageJsonPath = path.join(__dirname, 'package.json')
let version = ''
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  version = packageJson.version
  if (!version) throw new Error('version vacío en package.json')
} catch (e) {
  console.error('No se pudo leer la versión desde package.json:', e.message)
  process.exit(1)
}
const tag = version // Sin "v" al inicio

try {
  execSync(`gh release create ${tag} ${assets.map(a => `"${a}"`).join(' ')} --repo ${repo} --title "Versión ${version}" --notes "Release automático de FacturaloSimpleV3"`, { stdio: 'inherit' })
} catch (e) {
  execSync(`gh release upload ${tag} ${assets.map(a => `"${a}"`).join(' ')} --repo ${repo} --clobber`, { stdio: 'inherit' })
}

/* console.log('Release publicado correctamente en', repo) */
