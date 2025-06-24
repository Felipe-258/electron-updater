# electron-updater
A test for an Electron Js AutoUpdater with Quasar

An electron App exported with Quasar, check the user current version and the Github Release Lastest. If they are mismatched, it downloads and install the cloud version

# Quasar + Electron Integration Example

Este repositorio muestra cómo convertir una aplicación Quasar en una aplicación de escritorio usando Electron.

## Requisitos Previos

```bash
npm install -g @quasar/cli
```

## Instalación

1. Agregar las dependencias necesarias:

```bash
npm install electron electron-builder electron-updater --save-dev
```

2. Configurar `quasar.conf.js`:

```js
electron: {
  bundler: 'builder', // Configure el bundler
  builder: {
    appId: 'tu.app.id',
    publish: [
      {
        provider: 'github',
        owner: 'tu-usuario',
        repo: 'tu-repo'
      }
    ],
    nsis: {
      runAfterFinish: true
    }
  }
}
```

3. Crear la carpeta `src-electron` con el archivo principal de Electron

## Características Implementadas

- Actualizaciones automáticas desde GitHub
- IPC Communication
- Integración con la UI de Quasar
- Manejo de ventanas nativas

## Publicación de Actualizaciones

1. Actualizar la versión en `package.json`
2. Hacer build de la aplicación
3. Crear un nuevo release en GitHub con el formato `1.0.0`
4. Subir los archivos generados al release
5. Para usar el script de las releases se debe
  Instalar `https://cli.github.com/`
   Utilizar `gh auth` para iniciar sesion.
   Actualizar `apiUrl` con el repositorio y el `GITHUB_TOKEN`
  Reglas para la `versión` en package.json (semver)
```
  Solo números y puntos: X.Y.Z
  Sin letras al principio ni ceros a la izquierda
  Ejemplos válidos:
    "1.0.0"
    "2025.5.13"
    "2025.5.13-beta"
    "2025.5.13-1"
```
7. *Opcional: utilizando node release

## Estructura del Proyecto

```
├── src-electron/
│   └── electron-main.js
├── src/
│   └── pages/
│       └── login.vue
├── quasar.conf.js
├── package.json
└── release.js

```

## Notas Importantes

- Asegúrate de tener un token de GitHub configurado para las actualizaciones automáticas
- La versión en `package.json` debe coincidir con el tag del release en GitHub
- Las actualizaciones automáticas solo funcionan en builds de producción
