<template>
  <q-layout class="fondo-pantalla flex flex-center">
    <q-page-container>
      <q-card class="bg-login q-pa-xs q-mx-auto" style="width: 45vh;">
        <q-card-section>
          <img
            alt="Facturalo-Simple"
            class="logo-centro"
            src="~assets/logo-creadores-facturalo-simple.png"
            style="width: 13rem;"
          >
          <p class="text-h5 text-center">Iniciar Sesión</p>
        </q-card-section>
        <div v-if="descargando === true">
          <q-linear-progress
            :value="progreso"
            color="primary"
            class="q-mb-md"
            size="20px"
          />
          <q-list bordered>
            <q-item v-for="(linea, idx) in logActualizacion" :key="idx">
              <q-item-section>{{ linea }}</q-item-section>
            </q-item>
          </q-list>
        </div>
        <q-form @submit.prevent="btnOk()" class="form-header">
          <div class="q-pa-sm">
            <q-input
              type="email"
              v-model="usuario"
              label="Email"
              lazy-rules
              autofocus
              dark
              :rules="[ val => val && val.length > 0 || 'Ingrese un mail']"
            />
          </div>

          <div class="q-pa-sm">
            <q-input
              v-model="password"
              label="Contraseña"
              lazy-rules
              type="password"
              clearable
              dark
              :rules="[ val => val && val.length > 0 || 'Ingrese password']"
            />
          </div>

          <div class="row justify-center">
            <div class="mensaje">{{mensaje}}</div>
          </div>

          <div class="q-pa-xs text-center">
            <q-btn :disable="descargando" type="submit" class="css-boton" label="Ingresar" />
          </div>
        </q-form>

        <q-card-section class="row q-pt-none">
          <div class="col-xs-12 text-center olvide-password">
            <span>Olvidé mi Contraseña. </span><a class="a-color" @click="recuperarPassword" href="javascript:void(0)">Recuperar</a>
          </div>
          <div class="row justify-end full-width">
            <div class="col-xs-12 col-sm-3">
              <span class="text-grey" style="font-size: 0.8rem;">{{store.state.modGestion.version}}</span>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-page-container>
  </q-layout>
</template>

<script>
import { useQuasar } from 'quasar'
import pedirDatos from '../components/pedirDatos.js'
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import mostrarLog from '../components/consoleLog.js'
import sessionStorage from 'src/components/sessionStorage'

export default {
  setup (props, context) {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const log = mostrarLog()
    const $q = useQuasar()
    const ejecutar = pedirDatos()
    const usuario = ref('')
    const password = ref('')
    const cuentas = ref([])
    const mensaje = ref('')
    const version = ref('')
    const descargando = ref(false)
    const progreso = ref(0)
    const logActualizacion = ref([])
    onMounted(() => {
      /* console.log(window.electronAPI) */
      if (window.electronAPI) {
        version.value = window.electronAPI.getAppVersion()
        /* console.log('antes del chequeo') */
        window.electronAPI.checkUpdateAndInstall().then(result => {
          /* console.log('pre-antes del chequeo') */
          if (result.updated) {
            mensaje.value = result.message
          }
        })
        /* console.log('despues del chequeo') */

        window.electronAPI.onUpdateLog((event, log) => {
          /* console.log('update-log recibido:', log) */
          logActualizacion.value.push(log)
        })
        window.electronAPI.onUpdateProgress((event, percent) => {
          if (percent === -1 || percent === null) {
            descargando.value = false
          } else {
            descargando.value = true
            progreso.value = percent
          }
        })
      } else {
        /* console.log('no es electron') */
      }
      if (sessionStorage.get('FacturaloSimple-version')) {
        if (sessionStorage.get('FacturaloSimple-version') !== store.state.modGestion.version) {
          sessionStorage.set('FacturaloSimple-version', store.state.modGestion.version.toString(), { expires: '1Y' })
          window.location.reload()
        }
      } else {
        sessionStorage.set('FacturaloSimple-version', store.state.modGestion.version.toString(), { expires: '1Y' })
      }
      sessionStorage.remove('FacturaloSimple-conexion')
      sessionStorage.remove('FacturaloSimple-autenticado')
      sessionStorage.remove('FacturaloSimple-nombreCuenta')
      sessionStorage.remove('FacturaloSimple-nroCuenta')
      sessionStorage.remove('FacturaloSimple-habilitarLog')
      if (route.query.log !== undefined) {
        sessionStorage.set('FacturaloSimple-habilitarLog', true, { expires: '1Y' })
      }
      if (route.query.registrarse === 'true') {
        registrarse()
      }
    })

    async function btnOk () {
      $q.loading.show({
        message: 'Aguarde un momento...',
        boxClass: 'bg-grey-2 text-grey-9',
        spinnerColor: 'primary'
      })
      this.mensaje = ''
      if (usuario.value !== '' && password.value !== '') {
        const enviar = { accion: 'acceso', datos: { email: usuario.value, clave: password.value } }
        await ejecutar.funcEjecutar('', enviar, store.state.modGestion.URL_WS_LOGIN)
          .then(res => {
            if (res.resultado === 'Aceptar') {
              sessionStorage.set('FacturaloSimple-conexion', res.conexiones[0].conexion, { expires: '1Y' })
              sessionStorage.set('FacturaloSimple-autenticado', true, { expires: '8h' })
              sessionStorage.set('FacturaloSimple-nombreCuenta', res.conexiones[0].nom_cuenta, { expires: '1Y' })
              sessionStorage.set('FacturaloSimple-nroCuenta', res.conexiones[0].nro_cuenta, { expires: '1Y' })

              store.commit('modGestion/autenticar', { conexiones: '' })
              store.commit('modGestion/autenticar', {
                cadenaAutenticacion: sessionStorage.get('FacturaloSimple-conexion'),
                estaAutenticado: sessionStorage.get('FacturaloSimple-autenticado'),
                nombreCuenta: sessionStorage.get('FacturaloSimple-nombreCuenta'),
                nroCuenta: sessionStorage.get('FacturaloSimple-nroCuenta')
              })
            } else {
              store.commit('modGestion/autenticar', { cadenaAutenticacion: 'res.conexion', estaAutenticado: false })
              mensaje.value = 'Usuario o Clave Incorrecta.'
            }
          })
          .then(async () => {
            await ejecutar.funcEjecutar('INFOAccesosPermisos', { opcion: '1' })
              .then(res => {
                sessionStorage.set('FacturaloSimple-admin', res.datos[0].permiso, { expires: '1Y' })
              })
              .catch(() => {
                sessionStorage.set('FacturaloSimple-admin', '0', { expires: '1Y' })
              })
          })
          .then(async () => {
            const enviar = {
              accion: 'consultar',
              numero_registro: sessionStorage.get('FacturaloSimple-nroCuenta'),
              clave_unica: 'nro_cuenta'
            }
            await ejecutar.funcEjecutar('INFOParametros', enviar)
              .then(respParametros => {
                if (respParametros.resultado === 'Aceptar') {
                  if (respParametros.datos[0].modulo_minimercado !== '0') {
                    sessionStorage.set('FacturaloSimple-minimercado', 1, { expires: '1Y' })
                  } else {
                    sessionStorage.set('FacturaloSimple-minimercado', 0, { expires: '1Y' })
                  }
                }
              })
            /* console.log('Antes de router.push') */
            router.push('/')
            /* console.log('Después de router.push') */
          })
          .catch(err => log.err(err))
      } else {
        mensaje.value = 'Ingrese Usuario y Password'
      }
      $q.loading.hide()
    }

    function recuperarPassword () {
      router.push('/recuperarPassword')
    }

    function registrarse () {
      router.push('/registrarse')
    }

    return {
      ...pedirDatos(),
      store,
      usuario,
      password,
      cuentas,
      mensaje,
      btnOk,
      recuperarPassword,
      registrarse,
      version,
      descargando,
      progreso,
      logActualizacion
    }
  }
}
</script>

<style scoped>
  .bg-login {
    background-color : #fff
  }
  .fondo-pantalla {
    background-image: linear-gradient(to right, #245C7B,#c3ddeb)
  }
  .form-header {
    background: #021e26;
    text-align: center;
    padding: 15px 0 30px;
    clip-path: polygon(0 0, 100% 0%, 100% 84%, 0% 100%);
  }
  .form-header img {
    vertical-align: top;
    width: 10rem;
  }
  .form-header h4 {
    color: #fff;
    font-family: Roboto;
    font-weight: lighter;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .form-header span {
    color: #245C7B;
  }
  .form-header h5 {
    color: #fff;
    font-family: Roboto;
    font-weight: lighter;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .sin-cuenta {
    color: #021e26;
    font-family: Roboto;
    font-weight: normal;
    font-size: 0.75rem;
    margin-bottom: 10px;
    margin-top: 15px;
  }
  .sin-cuenta a {
    color: #245C7B;
  }
  .olvide-password {
    color: #021e26;
    font-family: Roboto;
    font-weight: normal;
    font-size: 0.6rem;
  }
  .mensaje {
    color: #fff;
    font-family: Roboto;
    font-weight: normal;
    font-size: 0.75rem;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .css-boton {
    color: #FFF;
    background-color: #245C7B;
    font-family: Roboto;
    font-weight: normal;
    font-size: 1rem;
    margin-bottom: 10px;
    margin-top: 15px;
  }

</style>
