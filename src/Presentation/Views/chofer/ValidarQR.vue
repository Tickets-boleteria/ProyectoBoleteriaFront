<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useChoferRuta } from '../../Composables/useChoferRuta'

const videoRef = ref<HTMLVideoElement | null>(null)

const escaneando = ref(false)
const codigoManual = ref('')
const resultado = ref('')

const mostrarModalObservacion = ref(false)
const mostrarModalEmergencia = ref(false)
const observacion = ref('')

let stream: MediaStream | null = null
let detectorLoopId: number | null = null
let ultimoCodigo = ''
let ultimoScanAt = 0

const {
  rutaActual,
  pasajeros,
  historial,
  loading,
  error,
  success,
  rutaHabilitada,
  rutaEnCurso,
  minutosDesdeSalida,
  cargarRutaChofer,
  iniciarViaje,
  intentarFinalizarViaje,
  finalizarViaje,
  marcarEmergencia,
  validarQrBoleto,
} = useChoferRuta()

onMounted(async () => {
  await cargarRutaChofer()
})

onUnmounted(() => {
  detenerCamara()
})

async function onIniciarViaje() {
  const res = await iniciarViaje()
  resultado.value = res.mensaje
}

async function onIntentarFinalizar() {
  const res = await intentarFinalizarViaje()

  resultado.value = res.mensaje

  if (res.requiereObservacion) {
    mostrarModalObservacion.value = true
  }

  if (res.ok) {
    detenerCamara()
  }
}

async function onConfirmarFinalizacionConObservacion() {
  const res = await finalizarViaje(observacion.value)

  resultado.value = res.mensaje

  if (res.ok) {
    mostrarModalObservacion.value = false
    observacion.value = ''
    detenerCamara()
  }
}

async function onMarcarEmergencia() {
  const res = await marcarEmergencia(observacion.value)

  resultado.value = res.mensaje

  if (res.ok) {
    mostrarModalEmergencia.value = false
    observacion.value = ''
  }
}

async function iniciarCamara() {
  resultado.value = ''

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }

    escaneando.value = true
    iniciarLoopDeteccion()
  } catch (err: any) {
    resultado.value = 'No se pudo acceder a la cámara: ' + err.message
  }
}

function detenerCamara() {
  escaneando.value = false

  if (detectorLoopId !== null) {
    cancelAnimationFrame(detectorLoopId)
    detectorLoopId = null
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

async function iniciarLoopDeteccion() {
  const BarcodeDetectorApi = (window as any).BarcodeDetector

  if (!BarcodeDetectorApi) {
    resultado.value = 'Tu navegador no soporta escaneo automático. Ingresa el código manualmente.'
    return
  }

  const detector = new BarcodeDetectorApi({
    formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
  })

  const loop = async () => {
    if (!escaneando.value || !videoRef.value) return

    try {
      const codes = await detector.detect(videoRef.value)

      if (codes.length > 0) {
        const codigo = String(codes[0].rawValue || '').trim()
        const ahora = Date.now()

        if (codigo && (codigo !== ultimoCodigo || ahora - ultimoScanAt > 2500)) {
          ultimoCodigo = codigo
          ultimoScanAt = ahora
          await procesarCodigo(codigo)
        }
      }
    } catch {
      // Evita cortar el escaneo por errores temporales
    }

    detectorLoopId = requestAnimationFrame(loop)
  }

  detectorLoopId = requestAnimationFrame(loop)
}

async function procesarCodigoManual() {
  await procesarCodigo(codigoManual.value)
  codigoManual.value = ''
}

async function procesarCodigo(codigo: string) {
  const res = await validarQrBoleto(codigo)
  resultado.value = res.mensaje
}

function estadoRutaClass(estado?: string) {
  if (estado === 'Habilitada') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (estado === 'EnCurso') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (estado === 'Finalizada') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-[2rem] bg-slate-900 p-6 md:p-8 text-white shadow-2xl">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-black uppercase tracking-wider text-blue-200">
            Panel del chofer
          </p>

          <h1 class="mt-2 text-2xl md:text-3xl font-black">
            Control de viaje y validación QR
          </h1>

          <p class="mt-2 text-sm text-slate-300">
            Inicia el viaje, escanea boletos y finaliza la ruta.
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

    <section v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
      {{ error }}
    </section>

    <section v-if="success" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
      {{ success }}
    </section>

    <section v-if="resultado" class="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
      {{ resultado }}
    </section>

    <section v-if="!rutaActual && !loading" class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
      <h2 class="text-xl font-black text-slate-900">
        No tienes una ruta asignada
      </h2>

      <p class="mt-2 text-sm text-slate-500">
        No existe una ruta habilitada o en curso asignada a tu usuario.
      </p>
    </section>

    <template v-if="rutaActual">
      <section class="grid gap-4 lg:grid-cols-4">
        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 lg:col-span-2">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Ruta asignada
          </p>

          <h2 class="mt-2 text-2xl font-black text-slate-900">
            {{ rutaActual.Frecuencias?.CiudadOrigen || 'Origen' }}
            <span class="text-slate-400">→</span>
            {{ rutaActual.Frecuencias?.CiudadDestino || 'Destino' }}
          </h2>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p class="text-xs font-bold text-slate-400 uppercase">
                Fecha
              </p>
              <p class="font-black text-slate-800">
                {{ rutaActual.Fecha }}
              </p>
            </div>

            <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p class="text-xs font-bold text-slate-400 uppercase">
                Hora salida
              </p>
              <p class="font-black text-slate-800">
                {{ rutaActual.HoraSalida || 'Sin iniciar' }}
              </p>
            </div>

            <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p class="text-xs font-bold text-slate-400 uppercase">
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

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
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

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
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
        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Total
          </p>
          <p class="mt-2 text-3xl font-black text-slate-900">
            {{ pasajeros.total }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Pendientes
          </p>
          <p class="mt-2 text-3xl font-black text-blue-700">
            {{ pasajeros.pendientes }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            En viaje
          </p>
          <p class="mt-2 text-3xl font-black text-amber-700">
            {{ pasajeros.enViaje }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Finalizados
          </p>
          <p class="mt-2 text-3xl font-black text-emerald-700">
            {{ pasajeros.finalizados }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">
            Rechazados
          </p>
          <p class="mt-2 text-3xl font-black text-red-700">
            {{ pasajeros.rechazados }}
          </p>
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <h2 class="text-lg font-black text-slate-900">
            Validación de boletos
          </h2>

          <p class="mt-1 text-sm text-slate-500">
            Solo puedes escanear boletos cuando la ruta está EnCurso.
          </p>

          <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <video ref="videoRef" class="h-72 w-full object-cover"></video>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              v-if="!escaneando"
              type="button"
              @click="iniciarCamara"
              :disabled="!rutaEnCurso || loading"
              class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Iniciar cámara
            </button>

            <button
              v-else
              type="button"
              @click="detenerCamara"
              class="rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Detener cámara
            </button>

            <input
              v-model="codigoManual"
              type="text"
              placeholder="Código QR o código de barras"
              class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm"
              :disabled="!rutaEnCurso"
            />

            <button
              type="button"
              @click="procesarCodigoManual"
              :disabled="!rutaEnCurso || loading"
              class="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Validar
            </button>
          </div>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
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
              Iniciar viaje
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
          </div>
        </article>
      </section>

      <section class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <h2 class="text-lg font-black text-slate-900">
          Historial de escaneos
        </h2>

        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
                <th class="py-3 pr-4">Código</th>
                <th class="py-3 pr-4">Hora</th>
                <th class="py-3 pr-4">Resultado</th>
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

                <td class="py-3 pr-4 text-slate-700">
                  {{ item.resultado }}
                </td>
              </tr>

              <tr v-if="historial.length === 0">
                <td colspan="3" class="py-8 text-center text-slate-500">
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