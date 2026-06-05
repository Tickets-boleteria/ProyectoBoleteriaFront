<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../Store/authStore'
import { SupabaseTicketRepository } from '../../../Infrastructure/Repositories/SupabaseTicketRepository'
import QRCode from 'qrcode'

type EstadoUi = 'PENDIENTE' | 'CONFIRMADO' | 'USADO' | 'CANCELADO'

interface Boleto {
  id: string
  codigo: string
  origen: string
  destino: string
  fecha: string
  hora: string
  asiento: string
  cooperativa: string
  busPlaca: string
  precio: number
  metodoPago: string
  comprobanteUrl: string
  estadoVenta: string
  estadoBoleto: string
  estado: EstadoUi
}

const authStore = useAuthStore()
const boletos = ref<Boleto[]>([])
const loading = ref(false)
const error = ref('')

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}
const firstRel = (v: any) => (Array.isArray(v) ? v[0] : v)
const isValidText = (value: any) => typeof value === 'string' && value.trim().length > 0

/**
 * Mapea el estado de la UI combinando el estado de la VENTA y del BOLETO.
 * Reglas:
 *  - Venta Pendiente .................. PENDIENTE (sin QR usable)
 *  - Venta Cancelada / Boleto Cancelado CANCELADO (sin QR usable)
 *  - Boleto Validado .................. USADO (ya abordó)
 *  - Venta AprobadaPago/Confirmada + Boleto Emitido ... CONFIRMADO (QR usable)
 */
const mapEstado = (estadoBoleto: string, estadoVenta: string): EstadoUi => {
  const b = String(estadoBoleto ?? '').toLowerCase().trim()
  const v = String(estadoVenta ?? '').toLowerCase().trim()

  if (b === 'cancelado' || v === 'cancelada') return 'CANCELADO'
  if (b === 'validado') return 'USADO'
  if ((v === 'aprobadapago' || v === 'confirmada') && b === 'emitido') return 'CONFIRMADO'
  return 'PENDIENTE'
}

const cargarBoletos = async () => {
  const cedulaUsuario = authStore.user?.cedula?.trim()
  if (!cedulaUsuario) {
    error.value = 'No se encontró la cédula del usuario autenticado.'
    boletos.value = []
    return
  }

  loading.value = true
  error.value = ''

  try {
    const repo = new SupabaseTicketRepository()
    const data = await repo.obtenerBoletosPorUsuario(cedulaUsuario)

    boletos.value = (data || []).map((row: any) => {
      const venta = firstRel(getFieldValue(row, 'Ventas')) ?? {}
      const ruta = firstRel(getFieldValue(venta, 'Rutas')) ?? {}
      const frecuencia = firstRel(getFieldValue(ruta, 'Frecuencias')) ?? {}
      const asiento = firstRel(getFieldValue(row, 'Asientos')) ?? {}
      const bus = firstRel(getFieldValue(asiento, 'Buses')) ?? {}

      const estadoBoleto = String(getFieldValue(row, 'Estado') ?? '')
      const estadoVenta = String(getFieldValue(venta, 'Estado') ?? '')

      return {
        id: String(getFieldValue(row, 'Id') ?? ''),
        codigo: String(getFieldValue(row, 'CodigoQr') ?? getFieldValue(row, 'CodigoBarras') ?? ''),
        origen: String(getFieldValue(frecuencia, 'CiudadOrigen') ?? getFieldValue(venta, 'CiudadOrigenVenta') ?? '') || 'Origen',
        destino: String(getFieldValue(frecuencia, 'CiudadDestino') ?? getFieldValue(venta, 'CiudadDestinoVenta') ?? '') || 'Destino',
        fecha: String(getFieldValue(ruta, 'Fecha') ?? getFieldValue(venta, 'FechaVenta') ?? '').slice(0, 10),
        hora: String(getFieldValue(frecuencia, 'HoraSalida') ?? '').slice(0, 5),
        asiento: String(getFieldValue(asiento, 'NumeroAsiento') ?? ''),
        cooperativa: String(getFieldValue(bus, 'Numero') ?? ''),
        busPlaca: String(getFieldValue(bus, 'Placa') ?? getFieldValue(bus, 'Numero') ?? ''),
        precio: Number(getFieldValue(row, 'PrecioFinal') ?? 0),
        metodoPago: String(getFieldValue(venta, 'MetodoPago') ?? ''),
        comprobanteUrl: String(getFieldValue(venta, 'ComprobanteUrl') ?? ''),
        estadoVenta,
        estadoBoleto,
        estado: mapEstado(estadoBoleto, estadoVenta),
      }
    })
    // Mostramos TODOS los boletos reales del usuario (confirmados y pendientes).
    // Solo descartamos filas sin identidad (sin id ni codigo).
    .filter((b) => isValidText(b.id) || isValidText(b.codigo))
  } catch (err: any) {
    error.value = err.message || 'No fue posible cargar tus boletos.'
    boletos.value = []
  } finally {
    loading.value = false
  }
}

const filtroEstado = ref<'Todos' | EstadoUi>('Todos')
const boletoActivo = ref<Boleto | null>(null)
const qrDataUrl = ref<string>('')

const boletosFiltrados = computed(() =>
  boletos.value.filter(b => filtroEstado.value === 'Todos' || b.estado === filtroEstado.value)
)

// El QR solo es usable cuando la venta está aprobada/confirmada y el boleto sigue Emitido.
const qrUsable = (b: Boleto) => b.estado === 'CONFIRMADO'

async function verBoleto(b: Boleto) {
  boletoActivo.value = b
  if (!qrUsable(b)) {
    qrDataUrl.value = ''
    return
  }
  qrDataUrl.value = await QRCode.toDataURL(b.codigo, {
    width: 240, margin: 2,
    color: { dark: '#1e40af', light: '#ffffff' },
  })
}

const estadoBadge = (e: EstadoUi) => ({
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-emerald-100 text-emerald-700',
  USADO: 'bg-slate-200 text-slate-700',
  CANCELADO: 'bg-red-100 text-red-700',
}[e])

const mensajeEstado = (b: Boleto) => {
  switch (b.estado) {
    case 'PENDIENTE': return 'Pago pendiente de aprobación'
    case 'CONFIRMADO': return 'Boleto aprobado — presenta el QR al abordar'
    case 'USADO': return 'Boleto ya validado / pasajero abordado'
    case 'CANCELADO': return b.estadoBoleto === 'Cancelado' ? 'Boleto cancelado' : 'Compra cancelada'
    default: return ''
  }
}

// Barcode simplificado para visual
function barcodeBars(codigo: string): { width: number; black: boolean }[] {
  const bars = []
  for (let i = 0; i < codigo.length; i++) {
    const c = codigo.charCodeAt(i)
    const pattern = [(c & 1) + 1, ((c >> 1) & 1) + 1, ((c >> 2) & 1) + 2, ((c >> 3) & 1) + 1]
    pattern.forEach((w, idx) => bars.push({ width: w, black: idx % 2 === 0 }))
  }
  return bars
}
const barsForActive = computed(() => (boletoActivo.value ? barcodeBars(boletoActivo.value.codigo) : []))
const barcodeWidth = computed(() => barsForActive.value.reduce((sum, b) => sum + b.width, 0))

onMounted(() => { void cargarBoletos() })
</script>

<template>
  <div class="space-y-6">
    <!-- ===== DETALLE DE BOLETO ===== -->
    <div v-if="boletoActivo" class="space-y-4">
      <button @click="boletoActivo = null" class="text-sm font-bold text-blue-700 underline underline-offset-4">← Volver a mis boletos</button>

      <article class="rounded-2xl bg-white shadow-2xl border border-slate-200 max-w-2xl overflow-hidden">
        <header class="bg-blue-700 text-white p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-blue-200">Bus {{ boletoActivo.busPlaca || 'N/D' }}</p>
            <h2 class="text-2xl font-black">Boleto {{ boletoActivo.codigo }}</h2>
          </div>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(boletoActivo.estado)">{{ boletoActivo.estado }}</span>
        </header>

        <div class="px-6 pt-4">
          <p class="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">{{ mensajeEstado(boletoActivo) }}</p>
        </div>

        <div class="p-6 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <dt class="font-bold text-slate-500">Origen</dt><dd>{{ boletoActivo.origen }}</dd>
            <dt class="font-bold text-slate-500">Destino</dt><dd>{{ boletoActivo.destino }}</dd>
            <dt class="font-bold text-slate-500">Fecha</dt><dd>{{ boletoActivo.fecha }}</dd>
            <dt class="font-bold text-slate-500">Hora</dt><dd class="font-bold">{{ boletoActivo.hora }}</dd>
            <dt class="font-bold text-slate-500">Asiento</dt><dd class="text-xl font-black text-blue-700">{{ boletoActivo.asiento }}</dd>
            <dt class="font-bold text-slate-500">Bus</dt><dd>{{ boletoActivo.busPlaca || 'N/D' }}</dd>
            <dt class="font-bold text-slate-500">Método de pago</dt><dd>{{ boletoActivo.metodoPago || 'N/D' }}</dd>
            <dt class="font-bold text-slate-500">Precio</dt><dd class="font-bold">${{ boletoActivo.precio.toFixed(2) }}</dd>
          </dl>
          <div class="text-center">
            <template v-if="qrDataUrl">
              <img :src="qrDataUrl" alt="QR" class="border-4 border-white rounded-xl shadow-lg"/>
              <p class="text-xs text-slate-500 mt-2 font-mono">{{ boletoActivo.codigo }}</p>
            </template>
            <div v-else class="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
              <span class="text-3xl grayscale opacity-50">🕒</span>
              <p class="text-[10px] font-black uppercase text-slate-500 leading-tight">QR no disponible<br/>{{ mensajeEstado(boletoActivo) }}</p>
            </div>
          </div>
        </div>

        <div v-if="boletoActivo.comprobanteUrl" class="px-6 pb-2">
          <a :href="boletoActivo.comprobanteUrl" target="_blank" rel="noopener"
            class="text-sm font-bold text-blue-700 underline underline-offset-4">Ver comprobante de pago</a>
        </div>

        <!-- Barcode (solo si el QR es usable) -->
        <div v-if="qrDataUrl" class="px-6 pb-6">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código de barras</p>
          <div class="bg-white p-3 border border-slate-200 rounded-xl overflow-x-auto">
            <svg :viewBox="`0 0 ${barcodeWidth} 100`" :width="Math.max(240, barcodeWidth * 2)" height="100" preserveAspectRatio="xMidYMin meet">
              <g>
                <rect v-for="(bar, i) in barsForActive" :key="i"
                  :x="barsForActive.slice(0, i).reduce((s, b) => s + b.width, 0)"
                  y="0" :width="bar.width" height="80"
                  :fill="bar.black ? '#0f172a' : '#ffffff'"/>
              </g>
              <text :x="barcodeWidth / 2" :y="96" text-anchor="middle" font-family="monospace" font-size="12" fill="#0f172a" style="letter-spacing:1px">{{ boletoActivo.codigo }}</text>
            </svg>
          </div>
          <p class="text-xs text-slate-500 mt-2">Presenta el QR o el código de barras al chofer al abordar.</p>
        </div>
      </article>
    </div>

    <!-- ===== LISTA DE BOLETOS ===== -->
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black text-slate-900">Mis boletos</h2>
          <p class="text-slate-500 text-sm">Aquí están tus pasajes activos, pendientes y pasados.</p>
        </div>
        <select v-model="filtroEstado" class="rounded-xl border border-slate-200 bg-white px-4 py-2">
          <option>Todos</option><option>PENDIENTE</option><option>CONFIRMADO</option><option>USADO</option><option>CANCELADO</option>
        </select>
      </div>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        {{ error }}
      </div>

      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Cargando tus boletos desde la base de datos...
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="b in boletosFiltrados" :key="b.id"
          class="rounded-2xl bg-white shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all overflow-hidden">
          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bus {{ b.busPlaca || 'N/D' }}</p>
                <h3 class="text-lg font-black text-slate-900">{{ b.origen }} → {{ b.destino }}</h3>
              </div>
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(b.estado)">{{ b.estado }}</span>
            </div>
            <div class="space-y-1 text-sm text-slate-600 mb-3">
              <p>📅 {{ b.fecha }} · ⏰ {{ b.hora }}</p>
              <p>💺 Asiento <strong>{{ b.asiento }}</strong> · {{ b.metodoPago || 'N/D' }}</p>
              <p class="font-mono text-xs">{{ b.codigo }}</p>
            </div>
            <p class="text-xs font-bold mb-3" :class="b.estado === 'CONFIRMADO' ? 'text-emerald-600' : b.estado === 'CANCELADO' ? 'text-red-600' : 'text-amber-600'">
              {{ mensajeEstado(b) }}
            </p>
            <button @click="verBoleto(b)"
              class="w-full rounded-2xl bg-blue-600 py-3 font-black text-white shadow-md hover:bg-blue-700">
              {{ qrUsable(b) ? 'Ver QR y código' : 'Ver detalle' }}
            </button>
          </div>
        </article>
        <div v-if="boletosFiltrados.length === 0 && !loading" class="md:col-span-2 lg:col-span-3 rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
          No tienes boletos para este filtro.
        </div>
      </div>
    </template>
  </div>
</template>