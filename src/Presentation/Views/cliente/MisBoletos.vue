<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../../Store/authStore'
import QRCode from 'qrcode'

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
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'USADO' | 'CANCELADO'
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

const isValidText = (value: any) => typeof value === 'string' && value.trim().length > 0

const mapEstado = (estado: any): Boleto['estado'] => {
  const e = String(estado ?? '').toUpperCase()
  if (e.includes('CONF')) return 'CONFIRMADO'
  if (e.includes('USAD')) return 'USADO'
  if (e.includes('CANC')) return 'CANCELADO'
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
    const { data, error: queryError } = await supabase
      .from('Boletos')
      .select(`
        Id,
        CodigoQr,
        CodigoBarras,
        Estado,
        PrecioFinal,
        CreatedAt,
        Asientos!inner(
          Id,
          NumeroAsiento,
          Buses!inner(
            Placa
          )
        ),
        Ventas!inner(
          Id,
          UsuarioVendedorId,
          FechaVenta,
          Estado,
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
        )
      `)
      .eq('CedulaPasajero', cedulaUsuario)
      .order('CreatedAt', { ascending: false })

    if (queryError) throw new Error(queryError.message)

    boletos.value = (data || []).map((row: any) => {
      const ventas = row.Ventas ?? row.ventas ?? {}
      const rutas = ventas.Rutas ?? ventas.rutas ?? {}
      const frecuencias = rutas.Frecuencias ?? rutas.frecuencias ?? {}
      const cooperativas = frecuencias.Cooperativas ?? frecuencias.cooperativas ?? {}
      const asientos = row.Asientos ?? row.asientos ?? {}
      const buses = asientos.Buses ?? asientos.buses ?? {}

      return {
        id: String(getFieldValue(row, 'Id') ?? ''),
        codigo: String(getFieldValue(row, 'CodigoQr') ?? getFieldValue(row, 'CodigoBarras') ?? ''),
        origen: String(getFieldValue(frecuencias, 'CiudadOrigen') ?? ''),
        destino: String(getFieldValue(frecuencias, 'CiudadDestino') ?? ''),
        fecha: String(getFieldValue(rutas, 'Fecha') ?? getFieldValue(ventas, 'FechaVenta') ?? '').slice(0, 10),
        hora: String(getFieldValue(frecuencias, 'HoraSalida') ?? '').slice(0, 5),
        asiento: String(getFieldValue(asientos, 'NumeroAsiento') ?? ''),
        cooperativa: String(getFieldValue(cooperativas, 'Nombre') ?? ''),
        busPlaca: String(getFieldValue(buses, 'Placa') ?? ''),
        precio: Number(getFieldValue(row, 'PrecioFinal') ?? 0),
        estado: mapEstado(getFieldValue(row, 'Estado') ?? getFieldValue(ventas, 'Estado')),
      }
    }).filter((boleto) =>
      isValidText(boleto.codigo) &&
      isValidText(boleto.origen) &&
      isValidText(boleto.destino) &&
      isValidText(boleto.fecha) &&
      isValidText(boleto.hora) &&
      isValidText(boleto.asiento) &&
      isValidText(boleto.cooperativa) &&
      isValidText(boleto.busPlaca) &&
      boleto.precio > 0
    )
  } catch (err: any) {
    error.value = err.message || 'No fue posible cargar tus boletos.'
    boletos.value = []
  } finally {
    loading.value = false
  }
}

const filtroEstado = ref<'Todos' | Boleto['estado']>('Todos')
const boletoActivo = ref<Boleto | null>(null)
const qrDataUrl = ref<string>('')

const boletosFiltrados = computed(() => boletos.value.filter(b =>
  filtroEstado.value === 'Todos' || b.estado === filtroEstado.value
))

async function verBoleto(b: Boleto) {
  boletoActivo.value = b
  if (b.estado === 'PENDIENTE') {
    qrDataUrl.value = ''
    return
  }
  qrDataUrl.value = await QRCode.toDataURL(b.codigo, {
    width: 240, margin: 2,
    color: { dark: '#1e40af', light: '#ffffff' },
  })
}

const estadoBadge = (e: Boleto['estado']) => ({
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-emerald-100 text-emerald-700',
  USADO: 'bg-slate-200 text-slate-700',
  CANCELADO: 'bg-red-100 text-red-700',
}[e])

// Generación de barcode (Code 128 simplificado para visual)
// Para producción usar `jsbarcode` (lo recomiendo abajo).
function barcodeBars(codigo: string): { width: number; black: boolean }[] {
  // Hash del código para generar un patrón determinista
  const bars = []
  for (let i = 0; i < codigo.length; i++) {
    const c = codigo.charCodeAt(i)
    const pattern = [(c & 1) + 1, ((c >> 1) & 1) + 1, ((c >> 2) & 1) + 2, ((c >> 3) & 1) + 1]
    pattern.forEach((w, idx) => bars.push({ width: w, black: idx % 2 === 0 }))
  }
  return bars
}

const barsForActive = computed(() =>
  boletoActivo.value ? barcodeBars(boletoActivo.value.codigo) : []
)
const barcodeWidth = computed(() => barsForActive.value.reduce((sum, b) => sum + b.width, 0))

onMounted(() => {
  void cargarBoletos()
})
</script>

<template>
  <div class="space-y-6">
    <!-- ===== DETALLE DE BOLETO ===== -->
    <div v-if="boletoActivo" class="space-y-4">
      <button @click="boletoActivo = null" class="text-sm font-bold text-blue-700 underline underline-offset-4">← Volver a mis boletos</button>

      <article class="rounded-2xl bg-white shadow-2xl border border-slate-200 max-w-2xl overflow-hidden">
        <header class="bg-blue-700 text-white p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-blue-200">{{ boletoActivo.cooperativa }}</p>
            <h2 class="text-2xl font-black">Boleto {{ boletoActivo.codigo }}</h2>
          </div>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(boletoActivo.estado)">{{ boletoActivo.estado }}</span>
        </header>

        <div class="p-6 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <dt class="font-bold text-slate-500">Origen</dt><dd>{{ boletoActivo.origen }}</dd>
            <dt class="font-bold text-slate-500">Destino</dt><dd>{{ boletoActivo.destino }}</dd>
            <dt class="font-bold text-slate-500">Fecha</dt><dd>{{ boletoActivo.fecha }}</dd>
            <dt class="font-bold text-slate-500">Hora</dt><dd class="font-bold">{{ boletoActivo.hora }}</dd>
            <dt class="font-bold text-slate-500">Asiento</dt><dd class="text-xl font-black text-blue-700">{{ boletoActivo.asiento }}</dd>
            <dt class="font-bold text-slate-500">Bus</dt><dd>{{ boletoActivo.busPlaca }}</dd>
            <dt class="font-bold text-slate-500">Precio</dt><dd class="font-bold">${{ boletoActivo.precio.toFixed(2) }}</dd>
          </dl>
          <div class="text-center">
            <template v-if="qrDataUrl">
              <img :src="qrDataUrl" alt="QR" class="border-4 border-white rounded-xl shadow-lg"/>
              <p class="text-xs text-slate-500 mt-2 font-mono">{{ boletoActivo.codigo }}</p>
            </template>
            <div v-else class="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
              <span class="text-3xl grayscale opacity-50">🕒</span>
              <p class="text-[10px] font-black uppercase text-slate-500 leading-tight">QR no disponible<br/>hasta confirmar pago</p>
            </div>
          </div>
        </div>

        <!-- Barcode -->
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
              <text :x="barcodeWidth / 2" :y="96" text-anchor="middle" font-family="monospace" font-size="12" fill="#0f172a" dominant-baseline="alphabetic" style="letter-spacing:1px">{{ boletoActivo.codigo }}</text>
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
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ b.cooperativa }}</p>
                <h3 class="text-lg font-black text-slate-900">{{ b.origen }} → {{ b.destino }}</h3>
              </div>
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(b.estado)">{{ b.estado }}</span>
            </div>
            <div class="space-y-1 text-sm text-slate-600 mb-4">
              <p>📅 {{ b.fecha }} · ⏰ {{ b.hora }}</p>
              <p>💺 Asiento <strong>{{ b.asiento }}</strong> · Bus {{ b.busPlaca }}</p>
              <p class="font-mono text-xs">{{ b.codigo }}</p>
            </div>
            <button @click="verBoleto(b)"
              class="w-full rounded-2xl bg-blue-600 py-3 font-black text-white shadow-md hover:bg-blue-700">
              Ver QR y código
            </button>
          </div>
        </article>
        <div v-if="boletosFiltrados.length === 0" class="md:col-span-2 lg:col-span-3 rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
          No tienes boletos para este filtro.
        </div>
      </div>
    </template>
  </div>
</template>
