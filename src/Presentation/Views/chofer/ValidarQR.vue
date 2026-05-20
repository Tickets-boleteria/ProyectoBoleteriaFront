<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'

const videoRef = ref<HTMLVideoElement | null>(null)
const escaneando = ref(false)
const codigoManual = ref('')
const resultado = ref<null | { tipo: 'ok' | 'error' | 'duplicado'; mensaje: string; boleto?: any }>(null)
const historial = ref<{ codigo: string; hora: string; estado: string }[]>([])

let stream: MediaStream | null = null
let detectorLoopId: number | null = null

// Lista mock de boletos válidos
const boletosValidos: Record<string, any> = {
  'BOL-A1B2C3': { pasajero: 'Gisselle Pérez',     asiento: '12B', origen: 'Latacunga', destino: 'Quito' },
  'BOL-X9Y8Z7': { pasajero: 'Carlos Tipán',       asiento: '08A', origen: 'Latacunga', destino: 'Cuenca' },
  'BOL-P5Q6R7': { pasajero: 'Ma. Fernanda López', asiento: '04C', origen: 'Quito',     destino: 'Latacunga' },
}
const boletosAbordados = new Set<string>()

async function iniciarCamara() {
  resultado.value = null
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
  } catch (e: any) {
    resultado.value = { tipo: 'error', mensaje: 'No se pudo acceder a la cámara: ' + e.message }
  }
}

function detenerCamara() {
  escaneando.value = false
  if (detectorLoopId !== null) {
    cancelAnimationFrame(detectorLoopId)
    detectorLoopId = null
  }
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

async function iniciarLoopDeteccion() {
  // Usa BarcodeDetector si está disponible (Chrome / Edge)
  // Para soporte universal recomiendo añadir la dependencia `html5-qrcode`
  const BD = (window as any).BarcodeDetector
  if (!BD) {
    resultado.value = {
      tipo: 'error',
      mensaje: 'Tu navegador no soporta detección automática. Ingresa el código manualmente o usa Chrome/Edge.',
    }
    return
  }
  const detector = new BD({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] })

  const tick = async () => {
    if (!escaneando.value || !videoRef.value) return
    try {
      const detections = await detector.detect(videoRef.value)
      if (detections.length > 0) {
        const codigo = detections[0].rawValue
        procesarCodigo(codigo)
        await new Promise(r => setTimeout(r, 1500)) // anti-doble lectura
      }
    } catch { /* ignore */ }
    if (escaneando.value) {
      detectorLoopId = requestAnimationFrame(tick)
    }
  }
  detectorLoopId = requestAnimationFrame(tick)
}

function procesarCodigo(codigo: string) {
  const limpio = codigo.trim().toUpperCase()
  if (!limpio.startsWith('BOL-')) {
    resultado.value = { tipo: 'error', mensaje: `Código no reconocido: ${limpio}` }
    return
  }
  const boleto = boletosValidos[limpio]
  if (!boleto) {
    resultado.value = { tipo: 'error', mensaje: `Boleto inválido: ${limpio}` }
    historial.value.unshift({ codigo: limpio, hora: new Date().toLocaleTimeString(), estado: '✗ Inválido' })
    return
  }
  if (boletosAbordados.has(limpio)) {
    resultado.value = { tipo: 'duplicado', mensaje: `Este boleto ya fue usado: ${limpio}`, boleto }
    historial.value.unshift({ codigo: limpio, hora: new Date().toLocaleTimeString(), estado: '⚠ Duplicado' })
    return
  }
  boletosAbordados.add(limpio)
  resultado.value = { tipo: 'ok', mensaje: `Abordaje confirmado: ${limpio}`, boleto }
  historial.value.unshift({ codigo: limpio, hora: new Date().toLocaleTimeString(), estado: '✓ Abordado' })
}

function validarManual() {
  if (!codigoManual.value.trim()) return
  procesarCodigo(codigoManual.value)
  codigoManual.value = ''
}

onMounted(() => { /* listo */ })
onUnmounted(detenerCamara)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-black text-slate-900">Validar abordaje</h2>
      <p class="text-slate-500 text-sm">Escanea el QR o código de barras del pasajero y confirma el abordaje al bus.</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_360px]">
      <!-- Cámara -->
      <section class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
        <h3 class="text-lg font-black text-slate-900 mb-4">Cámara</h3>
        <div class="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
          <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover"></video>
          <!-- Overlay de mira -->
          <div v-if="escaneando" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-2/3 max-w-xs aspect-square border-4 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
              <div class="absolute top-0 left-0 right-0 h-1 bg-emerald-400 animate-pulse"></div>
            </div>
          </div>
          <div v-if="!escaneando" class="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
            Cámara apagada
          </div>
        </div>
        <div class="mt-4 flex gap-3">
          <button v-if="!escaneando" @click="iniciarCamara"
            class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
            📷 Iniciar cámara
          </button>
          <button v-else @click="detenerCamara"
            class="rounded-2xl bg-red-500 px-5 py-3 font-black text-white shadow-xl shadow-red-100 hover:bg-red-600">
            ⏹ Detener
          </button>
        </div>

        <!-- Entrada manual fallback -->
        <div class="mt-6 rounded-2xl bg-slate-50 p-4">
          <p class="text-xs font-bold text-slate-700 mb-2">¿Cámara no disponible? Ingresa el código manualmente:</p>
          <div class="flex gap-2">
            <input v-model="codigoManual" @keyup.enter="validarManual"
              class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2" placeholder="BOL-A1B2C3"/>
            <button @click="validarManual" class="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Validar</button>
          </div>
        </div>
      </section>

      <!-- Resultado + historial -->
      <aside class="space-y-4">
        <!-- Resultado actual -->
        <div v-if="resultado" class="rounded-2xl p-5 shadow-xl"
          :class="resultado.tipo === 'ok'
            ? 'bg-emerald-600 text-white'
            : resultado.tipo === 'duplicado'
              ? 'bg-amber-500 text-white'
              : 'bg-red-500 text-white'">
          <p class="text-3xl mb-2">{{ resultado.tipo === 'ok' ? '✓' : resultado.tipo === 'duplicado' ? '⚠' : '✗' }}</p>
          <p class="font-black text-lg leading-tight">{{ resultado.mensaje }}</p>
          <div v-if="resultado.boleto" class="mt-3 pt-3 border-t border-white/30 text-sm space-y-1">
            <p><strong>Pasajero:</strong> {{ resultado.boleto.pasajero }}</p>
            <p><strong>Asiento:</strong> {{ resultado.boleto.asiento }}</p>
            <p><strong>Ruta:</strong> {{ resultado.boleto.origen }} → {{ resultado.boleto.destino }}</p>
          </div>
        </div>
        <div v-else class="rounded-2xl bg-slate-100 p-5 text-center text-slate-500">
          Esperando escaneo…
        </div>

        <!-- Historial sesión -->
        <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-3">Historial de esta sesión</h3>
          <p v-if="historial.length === 0" class="text-sm text-slate-500">Aún no se han escaneado boletos.</p>
          <ul v-else class="space-y-2 max-h-64 overflow-y-auto">
            <li v-for="(h, i) in historial" :key="i"
              class="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
              <span class="font-mono text-xs">{{ h.codigo }}</span>
              <span class="text-xs text-slate-500">{{ h.hora }}</span>
              <span class="text-xs font-bold">{{ h.estado }}</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>
