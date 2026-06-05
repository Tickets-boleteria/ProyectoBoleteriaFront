<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useChoferRuta } from '../../Composables/useChoferRuta'
import { extraerCodigoBoleto } from '../../../utils/qrcode'

const QR_READER_ID = 'chofer-qr-reader'

const codigoManual = ref('')
const mensajeCamara = ref('')
const camaraActiva = ref(false)
const procesandoEscaneo = ref(false)
const ultimoResultado = ref<any | null>(null)

const mostrarModalObservacion = ref(false)
const mostrarModalEmergencia = ref(false)
const observacion = ref('')

let html5QrCode: Html5Qrcode | null = null
let ultimoCodigo = ''
let ultimoScanAt = 0

const {
  rutaActual,
  pasajeros,
  historial,
  loading,
  error,
  success,
  resultado,
  rutaHabilitada,
  rutaEnCurso,
  rutaCompletada,
  rutaCancelada,
  minutosDesdeSalida,
  cargarRutaChofer,
  iniciarViaje,
  intentarFinalizarViaje,
  finalizarViaje,
  marcarEmergencia,
  validarQrBoleto,
} = useChoferRuta()

const puedeValidar = computed(() => rutaEnCurso.value && !loading.value)

onMounted(async () => {
  await cargarRutaChofer()
})

onBeforeUnmount(() => {
  void detenerCamara()
})

async function onIniciarViaje() {
  const res = await iniciarViaje()
  ultimoResultado.value = res

  if (!res.ok) {
    await detenerCamara()
  }
}

async function onIntentarFinalizar() {
  const res = await intentarFinalizarViaje()
  ultimoResultado.value = res

  if (res.requiereObservacion) {
    mostrarModalObservacion.value = true
  }

  if (res.ok) {
    await detenerCamara()
  }
}

async function onConfirmarFinalizacionConObservacion() {
  const res = await finalizarViaje(observacion.value)
  ultimoResultado.value = res

  if (res.ok) {
    mostrarModalObservacion.value = false
    observacion.value = ''
    await detenerCamara()
  }
}

async function onMarcarEmergencia() {
  const res = await marcarEmergencia(observacion.value)
  ultimoResultado.value = res

  if (res.ok) {
    mostrarModalEmergencia.value = false
    observacion.value = ''
  }
}

async function iniciarCamara() {
  mensajeCamara.value = ''

  if (!rutaEnCurso.value) {
    mensajeCamara.value = 'Primero debes iniciar la ruta.'
    return
  }

  if (camaraActiva.value || procesandoEscaneo.value) {
    return
  }

  if (!window.isSecureContext && location.hostname !== 'localhost') {
    mensajeCamara.value = 'El navegador solo permite usar cámara en HTTPS o localhost.'
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    mensajeCamara.value = 'Este navegador no permite acceder a la cámara. Ingresa el código manualmente.'
    return
  }

  try {
    await nextTick()

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode(QR_READER_ID)
    }

    const config = {
      fps: 10,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
    }

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        await onCodigoDetectado(decodedText)
      },
      () => {
        // html5-qrcode llama esto muchas veces mientras busca códigos.
        // No se muestra error para no molestar al chofer.
      }
    )

    camaraActiva.value = true
    mensajeCamara.value = 'Cámara activa. Apunta al QR o código de barras del boleto.'
  } catch (err: any) {
    camaraActiva.value = false
    mensajeCamara.value = obtenerMensajeErrorCamara(err)
  }
}

async function detenerCamara() {
  mensajeCamara.value = ''

  if (!html5QrCode) {
    camaraActiva.value = false
    return
  }

  try {
    if (camaraActiva.value) {
      await html5QrCode.stop()
    }

    await html5QrCode.clear()
  } catch {
    // Si la cámara ya estaba detenida, no se debe bloquear la vista.
  } finally {
    html5QrCode = null
    camaraActiva.value = false
    procesandoEscaneo.value = false
  }
}

async function onCodigoDetectado(valor: string) {
  const codigo = extraerCodigoBoleto(valor)
  const ahora = Date.now()

  if (!codigo) return

  if (procesandoEscaneo.value) return

  if (codigo === ultimoCodigo && ahora - ultimoScanAt < 4000) {
    return
  }

  ultimoCodigo = codigo
  ultimoScanAt = ahora

  procesandoEscaneo.value = true

  try {
    if (html5QrCode && camaraActiva.value) {
      try {
        html5QrCode.pause(true)
      } catch {
        // Algunos navegadores no soportan pause correctamente.
      }
    }

    await procesarCodigo(codigo)
  } finally {
    window.setTimeout(() => {
      procesandoEscaneo.value = false

      if (html5QrCode && camaraActiva.value) {
        try {
          html5QrCode.resume()
        } catch {
          // Si no se puede reanudar, el chofer puede presionar iniciar otra vez.
        }
      }
    }, 1800)
  }
}

async function procesarCodigoManual() {
  const codigo = extraerCodigoBoleto(codigoManual.value)

  if (!codigo) {
    ultimoResultado.value = {
      ok: false,
      mensaje: 'Ingrese un código QR o código de barras.',
    }
    return
  }

  await procesarCodigo(codigo)
  codigoManual.value = ''
}

async function procesarCodigo(codigo: string) {
  if (!rutaEnCurso.value) {
    ultimoResultado.value = {
      ok: false,
      mensaje: 'Primero debes iniciar la ruta.',
    }
    return
  }

  const res = await validarQrBoleto(codigo)
  ultimoResultado.value = res
}

function obtenerMensajeErrorCamara(err: any) {
  const name = String(err?.name || '')
  const message = String(err?.message || '')

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permiso de cámara denegado. Activa el permiso de cámara en el navegador.'
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No se encontró una cámara disponible en este dispositivo.'
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La cámara está en uso por otra aplicación o no se pudo iniciar.'
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'No se pudo usar la cámara trasera. Intenta con otra cámara o ingresa el código manualmente.'
  }

  if (message.toLowerCase().includes('permission')) {
    return 'Permiso de cámara denegado. Activa el permiso de cámara en el navegador.'
  }

  return 'No se pudo abrir la cámara. Verifica permisos, HTTPS o usa el ingreso manual.'
}

function estadoRutaClass(estado?: string) {
  if (estado === 'Programada' || estado === 'Habilitada') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (estado === 'EnCurso') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (estado === 'Completada') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (estado === 'Cancelada') return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function resultadoClass(ok?: boolean) {
  if (ok === true) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (ok === false) return 'border-red-200 bg-red-50 text-red-700'
  return 'border-blue-200 bg-blue-50 text-blue-700'
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-[2rem] bg-slate-900 p-6 text-white shadow-2xl md:p-8">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-black uppercase tracking-wider text-blue-200">
            Panel del chofer
          </p>

          <h1 class="mt-2 text-2xl font-black md:text-3xl">
            Control de viaje y validación QR
          </h1>

          <p class="mt-2 text-sm text-slate-300">
            Inicia la ruta, escanea boletos y registra el abordaje de pasajeros.
          </p>
        </div>

        <button
          type="button"
          @click="cargarRutaChofer"
          :disabled="loading"
          class="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>
    </section>

    <section
      v-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
    >
      {{ error }}
    </section>

    <section
      v-if="success"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"
    >
      {{ success }}
    </section>

    <section
      v-if="resultado && !ultimoResultado"
      class="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700"
    >
      {{ resultado }}
    </section>

    <section
      v-if="ultimoResultado"
      class="rounded-2xl border p-4 text-sm font-bold"
      :class="resultadoClass(ultimoResultado.ok)"
    >
      {{ ultimoResultado.mensaje }}
    </section>

    <section
      v-if="!rutaActual && !loading"
      class="rounded-2xl border border-slate-100 bg-white p-6 shadow-md"
    >
      <h2 class="text-xl font-black text-slate-900">
        No tienes una ruta asignada para hoy
      </h2>

      <p class="mt-2 text-sm text-slate-500">
        Cuando el administrador te asigne una ruta para la fecha actual, aparecerá en esta pantalla.
      </p>
    </section>

    <template v-if="rutaActual">
      <section class="grid gap-4 lg:grid-cols-4">
        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md lg:col-span-2">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Ruta actual
          </p>

          <h2 class="mt-2 text-2xl font-black text-slate-900">
            {{ rutaActual.Frecuencias?.CiudadOrigen || 'Origen' }}
            <span class="text-slate-400">→</span>
            {{ rutaActual.Frecuencias?.CiudadDestino || 'Destino' }}
          </h2>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p class="text-xs font-bold uppercase text-slate-400">
                Fecha
              </p>
              <p class="font-black text-slate-800">
                {{ rutaActual.Fecha }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p class="text-xs font-bold uppercase text-slate-400">
                Hora salida
              </p>
              <p class="font-black text-slate-800">
                {{ rutaActual.HoraSalida || 'Sin iniciar' }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p class="text-xs font-bold uppercase text-slate-400">
                Estado
              </p>
              <span
                class="mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-black"
                :class="estadoRutaClass(rutaActual.Estado)"
              >
                {{ rutaActual.Estado }}
              </span>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Bus
          </p>

          <p class="mt-2 text-2xl font-black text-slate-900">
            Unidad {{ rutaActual.Buses?.Numero || rutaActual.BusId }}
          </p>

          <p class="mt-1 text-sm text-slate-500">
            Placa: {{ rutaActual.Buses?.Placa || 'Sin placa' }}
          </p>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Tiempo en viaje
          </p>

          <p class="mt-2 text-3xl font-black text-slate-900">
            {{ minutosDesdeSalida }} min
          </p>

          <p class="mt-1 text-sm text-slate-500">
            Se exige observación desde los 30 min.
          </p>
        </article>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Total
          </p>
          <p class="mt-2 text-3xl font-black text-slate-900">
            {{ pasajeros.total }}
          </p>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Pendientes
          </p>
          <p class="mt-2 text-3xl font-black text-blue-700">
            {{ pasajeros.pendientes }}
          </p>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            En viaje
          </p>
          <p class="mt-2 text-3xl font-black text-amber-700">
            {{ pasajeros.enViaje }}
          </p>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Finalizados
          </p>
          <p class="mt-2 text-3xl font-black text-emerald-700">
            {{ pasajeros.finalizados }}
          </p>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Rechazados
          </p>
          <p class="mt-2 text-3xl font-black text-red-700">
            {{ pasajeros.rechazados }}
          </p>
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <h2 class="text-lg font-black text-slate-900">
            Validación de boletos
          </h2>

          <p class="mt-1 text-sm text-slate-500">
            Presiona “Iniciar cámara” y apunta al QR o código de barras. En celular se intentará usar la cámara trasera.
          </p>

          <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <div id="chofer-qr-reader" class="min-h-72 w-full"></div>
          </div>

          <p
            v-if="mensajeCamara"
            class="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-700"
          >
            {{ mensajeCamara }}
          </p>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              @click="iniciarCamara"
              :disabled="!puedeValidar || camaraActiva || procesandoEscaneo"
              class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Iniciar cámara
            </button>

            <button
              type="button"
              @click="detenerCamara"
              :disabled="!camaraActiva"
              class="rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Detener cámara
            </button>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              v-model="codigoManual"
              type="text"
              placeholder="Código QR o código de barras"
              class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm"
              :disabled="!puedeValidar || procesandoEscaneo"
              @keyup.enter="procesarCodigoManual"
            />

            <button
              type="button"
              @click="procesarCodigoManual"
              :disabled="!puedeValidar || procesandoEscaneo || !codigoManual.trim()"
              class="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Validar código
            </button>
          </div>

          <div
            v-if="procesandoEscaneo"
            class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700"
          >
            Validando boleto. Espera un momento...
          </div>
        </article>

        <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
          <h2 class="text-lg font-black text-slate-900">
            Control del viaje
          </h2>

          <div class="mt-4 space-y-3">
            <button
              v-if="rutaHabilitada"
              type="button"
              @click="onIniciarViaje"
              :disabled="loading"
              class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Iniciar ruta
            </button>

            <button
              v-if="rutaEnCurso"
              type="button"
              @click="onIntentarFinalizar"
              :disabled="loading"
              class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Finalizar viaje
            </button>

            <button
              v-if="rutaHabilitada || rutaEnCurso"
              type="button"
              @click="mostrarModalEmergencia = true"
              :disabled="loading"
              class="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
            >
              Marcar emergencia
            </button>

            <p
              v-if="rutaCompletada || rutaCancelada"
              class="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600"
            >
              Esta ruta ya no permite validar boletos.
            </p>
          </div>
        </article>
      </section>

      <section
        v-if="ultimoResultado?.pasajero"
        class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-md"
      >
        <h2 class="text-lg font-black text-emerald-700">
          Último pasajero validado
        </h2>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl bg-slate-50 p-3">
            <p class="text-xs font-bold uppercase text-slate-400">Nombre</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.nombre }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 p-3">
            <p class="text-xs font-bold uppercase text-slate-400">Cédula</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.cedula }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 p-3">
            <p class="text-xs font-bold uppercase text-slate-400">Asiento</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.asiento }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 p-3">
            <p class="text-xs font-bold uppercase text-slate-400">Bus</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.bus }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 sm:col-span-2">
            <p class="text-xs font-bold uppercase text-slate-400">Origen</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.origen }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 p-3 sm:col-span-2">
            <p class="text-xs font-bold uppercase text-slate-400">Destino</p>
            <p class="font-black text-slate-800">{{ ultimoResultado.pasajero.destino }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
        <h2 class="text-lg font-black text-slate-900">
          Historial de pasajeros validados
        </h2>

        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
                <th class="py-3 pr-4">Código</th>
                <th class="py-3 pr-4">Hora</th>
                <th class="py-3 pr-4">Resultado</th>
                <th class="py-3 pr-4">Pasajero</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in historial"
                :key="item.codigo + item.hora"
                class="border-b border-slate-100"
              >
                <td class="py-3 pr-4 font-mono text-xs font-bold text-slate-700">
                  {{ item.codigo }}
                </td>

                <td class="py-3 pr-4 text-slate-600">
                  {{ item.hora }}
                </td>

                <td class="py-3 pr-4">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-black"
                    :class="item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ item.resultado }}
                  </span>
                </td>

                <td class="py-3 pr-4 text-slate-700">
                  {{ item.pasajero?.nombre || '—' }}
                </td>
              </tr>

              <tr v-if="historial.length === 0">
                <td colspan="4" class="py-8 text-center text-slate-500">
                  Aún no hay boletos escaneados en esta sesión.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div
      v-if="mostrarModalObservacion"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 class="text-xl font-black text-slate-900">
          Observación requerida
        </h2>

        <p class="mt-2 text-sm text-slate-500">
          El viaje superó los 30 minutos. Ingresa una observación para poder finalizarlo.
        </p>

        <textarea
          v-model="observacion"
          rows="5"
          placeholder="Describe el motivo de la demora..."
          class="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        ></textarea>

        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            @click="mostrarModalObservacion = false"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="onConfirmarFinalizacionConObservacion"
            :disabled="loading || !observacion.trim()"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Enviar y finalizar
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="mostrarModalEmergencia"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 class="text-xl font-black text-red-700">
          Reportar emergencia
        </h2>

        <p class="mt-2 text-sm text-slate-500">
          Ingresa la observación de emergencia. Se guardará directamente en la ruta.
        </p>

        <textarea
          v-model="observacion"
          rows="5"
          placeholder="Describe la emergencia..."
          class="mt-4 w-full rounded-xl border border-red-200 px-4 py-3 text-sm"
        ></textarea>

        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            @click="mostrarModalEmergencia = false"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="onMarcarEmergencia"
            :disabled="loading || !observacion.trim()"
            class="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
          >
            Enviar emergencia
          </button>
        </div>
      </div>
    </div>
  </div>
</template>