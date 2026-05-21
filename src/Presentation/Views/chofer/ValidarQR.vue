<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../../Store/authStore'

const videoRef = ref<HTMLVideoElement | null>(null)
const escaneando = ref(false)
const codigoManual = ref('')
const resultado = ref<null | { tipo: 'ok' | 'error' | 'duplicado'; mensaje: string; boleto?: any }>(null)
const historial = ref<{ codigo: string; hora: string; estado: string }[]>([])

let stream: MediaStream | null = null
let detectorLoopId: number | null = null
const authStore = useAuthStore()

const boletosAbordados = new Set<string>()

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}

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
  validarBoletoReal(limpio)
}

async function validarBoletoReal(codigo: string) {
  if (boletosAbordados.has(codigo)) {
    resultado.value = { tipo: 'duplicado', mensaje: `Este boleto ya fue usado: ${codigo}` }
    historial.value.unshift({ codigo, hora: new Date().toLocaleTimeString(), estado: '⚠ Duplicado' })
    return
  }

  try {
    const { data: boletoData, error: boletoError } = await supabase
      .from('Boletos')
      .select(`
        Id,
        CodigoQr,
        CodigoBarras,
        Estado,
        Ventas!inner(
          Id,
          Rutas!inner(
            Id,
            Fecha,
            Frecuencias!inner(
              Id,
              CiudadOrigen,
              CiudadDestino,
              HoraSalida,
              Cooperativas!inner(Id, Nombre)
            )
          )
        ),
        Asientos!inner(
          NumeroAsiento,
          Buses!inner(Placa)
        )
      `)
      .or(`CodigoQr.eq.${codigo},CodigoBarras.eq.${codigo}`)
      .limit(1)

    if (boletoError) throw new Error(boletoError.message)

    const boleto = boletoData?.[0]
    if (!boleto) {
      resultado.value = { tipo: 'error', mensaje: `Boleto inválido: ${codigo}` }
      historial.value.unshift({ codigo, hora: new Date().toLocaleTimeString(), estado: '✗ Inválido' })
      return
    }

    const { data: validaciones, error: validacionError } = await supabase
      .from('ValidacionesBoleto')
      .select('Id, BoletoId')
      .eq('BoletoId', getFieldValue(boleto, 'Id'))
      .limit(1)

    if (validacionError) throw new Error(validacionError.message)

    const ventas = boleto.Ventas ?? boleto.ventas ?? {}
    const rutas = ventas.Rutas ?? ventas.rutas ?? {}
    const frecuencias = rutas.Frecuencias ?? rutas.frecuencias ?? {}
    const cooperativas = frecuencias.Cooperativas ?? frecuencias.cooperativas ?? {}
    const asientos = boleto.Asientos ?? boleto.asientos ?? {}
    const buses = asientos.Buses ?? asientos.buses ?? {}

    const boletoLegible = {
      pasajero: `Boleto ${String(getFieldValue(boleto, 'Id') ?? '')}`,
      asiento: String(getFieldValue(asientos, 'NumeroAsiento') ?? '—'),
      origen: String(getFieldValue(frecuencias, 'CiudadOrigen') ?? 'Origen'),
      destino: String(getFieldValue(frecuencias, 'CiudadDestino') ?? 'Destino'),
      fecha: String(getFieldValue(rutas, 'Fecha') ?? '').slice(0, 10),
      hora: String(getFieldValue(frecuencias, 'HoraSalida') ?? '--:--').slice(0, 5),
      cooperativa: String(getFieldValue(cooperativas, 'Nombre') ?? 'Cooperativa'),
      busPlaca: String(getFieldValue(buses, 'Placa') ?? 'Sin placa'),
    }

    if ((validaciones || []).length > 0) {
      resultado.value = { tipo: 'duplicado', mensaje: `Este boleto ya fue usado: ${codigo}`, boleto: boletoLegible }
      historial.value.unshift({ codigo, hora: new Date().toLocaleTimeString(), estado: '⚠ Duplicado' })
      return
    }

    const usuarioValidadorId = authStore.user?.id
    if (usuarioValidadorId) {
      const { error: insertError } = await supabase.from('ValidacionesBoleto').insert({
        BoletoId: getFieldValue(boleto, 'Id'),
        UsuarioValidadorId: usuarioValidadorId,
        Dispositivo: navigator.userAgent,
        Resultado: 'Aceptado',
      })
      if (insertError) throw new Error(insertError.message)
    }

    boletosAbordados.add(codigo)
    resultado.value = { tipo: 'ok', mensaje: `Abordaje confirmado: ${codigo}`, boleto: boletoLegible }
    historial.value.unshift({ codigo, hora: new Date().toLocaleTimeString(), estado: '✓ Abordado' })
  } catch (err: any) {
    resultado.value = { tipo: 'error', mensaje: err.message || 'No fue posible validar el boleto.' }
    historial.value.unshift({ codigo, hora: new Date().toLocaleTimeString(), estado: '✗ Error' })
  }
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
              class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2"/>
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
