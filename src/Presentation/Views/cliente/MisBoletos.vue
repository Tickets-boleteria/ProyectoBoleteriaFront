<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '../../Store/authStore'
import { SupabaseTicketRepository } from '../../../Infrastructure/Repositories/SupabaseTicketRepository'
import QRCode from 'qrcode'
import PaginationControls from '../../Components/PaginationControls.vue'

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

// Paginación
const currentPage = ref(1)
const itemsPerPage = 6

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}
const firstRel = (v: any) => (Array.isArray(v) ? v[0] : v)
const isValidText = (value: any) => typeof value === 'string' && value.trim().length > 0

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
        origen: String(getFieldValue(frecuencia, 'CiudadOrigen') ?? getFieldValue(venta, 'CiudadOrigenVenta') ?? ''),
        destino: String(getFieldValue(frecuencia, 'CiudadDestino') ?? getFieldValue(venta, 'CiudadDestinoVenta') ?? ''),
        fecha: String(getFieldValue(ruta, 'Fecha') ?? getFieldValue(venta, 'FechaVenta') ?? '').slice(0, 10),
        hora: String(getFieldValue(frecuencia, 'HoraSalida') ?? '').slice(0, 5),
        asiento: String(getFieldValue(asiento, 'NumeroAsiento') ?? ''),
        cooperativa: String(getFieldValue(bus, 'Numero') ?? ''),
        busPlaca: String(getFieldValue(bus, 'Placa') ?? getFieldValue(bus, 'Numero') ?? ''),
        precio: Number(getFieldValue(row, 'PrecioFinal') ?? 0),
        metodoPago: String(getFieldValue(venta, 'MetodoPago') ?? ''),
        comprobanteUrl: String(getFieldValue(venta, 'ComprobanteUrl') ?? ''),
        estadoVenta, estadoBoleto,
        estado: mapEstado(estadoBoleto, estadoVenta),
      }
    }).filter((b) => isValidText(b.codigo) && isValidText(b.origen) && isValidText(b.destino))
  } catch (err: any) {
    error.value = err.message || 'Error cargando boletos.'
    boletos.value = []
  } finally { loading.value = false }
}

const filtroEstado = ref<'Todos' | EstadoUi>('Todos')
const boletoActivo = ref<Boleto | null>(null)
const qrDataUrl = ref<string>('')

const boletosFiltrados = computed(() =>
  boletos.value.filter(b => filtroEstado.value === 'Todos' || b.estado === filtroEstado.value)
)

const totalItems = computed(() => boletosFiltrados.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))
const pagedBoletos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return boletosFiltrados.value.slice(start, start + itemsPerPage)
})

watch(filtroEstado, () => { currentPage.value = 1 })

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

const qrUsable = (b: Boleto) => b.estado === 'CONFIRMADO'

async function verBoleto(b: Boleto) {
  boletoActivo.value = b
  if (!qrUsable(b)) { qrDataUrl.value = ''; return }
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
    <div v-if="boletoActivo" class="space-y-4 animate-in fade-in zoom-in duration-300">
      <button @click="boletoActivo = null" class="text-sm font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
        <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">←</span>
        Volver a la lista
      </button>

      <article class="rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 max-w-2xl overflow-hidden mx-auto">
        <header class="bg-slate-900 text-white p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Unidad {{ boletoActivo.busPlaca }}</p>
            <h2 class="text-2xl font-black">Boleto Digital</h2>
          </div>
          <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20" :class="estadoBadge(boletoActivo.estado)">{{ boletoActivo.estado }}</span>
        </header>

        <div class="p-8 space-y-8">
           <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
              <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">ℹ️</div>
              <p class="text-sm font-bold text-slate-600 leading-tight">{{ mensajeEstado(boletoActivo) }}</p>
           </div>

           <div class="grid sm:grid-cols-2 gap-8 items-center">
              <div class="space-y-6">
                 <div class="space-y-1">
                    <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ruta</p>
                    <p class="font-black text-slate-900 text-lg leading-tight">{{ boletoActivo.origen }}<br/>→ {{ boletoActivo.destino }}</p>
                 </div>
                 <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                       <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</p>
                       <p class="font-bold text-slate-700">{{ boletoActivo.fecha }}</p>
                    </div>
                    <div class="space-y-1">
                       <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hora</p>
                       <p class="font-bold text-slate-700">{{ boletoActivo.hora }}</p>
                    </div>
                 </div>
                 <div class="space-y-1">
                    <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asiento</p>
                    <p class="text-4xl font-black text-blue-600">{{ boletoActivo.asiento }}</p>
                 </div>
              </div>

              <div class="flex flex-col items-center gap-4">
                 <template v-if="qrDataUrl">
                    <img :src="qrDataUrl" alt="QR" class="p-4 bg-white border-2 border-slate-50 rounded-[2rem] shadow-xl w-full max-w-[200px]"/>
                    <p class="font-mono text-[10px] text-slate-400 tracking-widest">{{ boletoActivo.codigo }}</p>
                 </template>
                 <div v-else class="w-full aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 grayscale opacity-30">
                    <span class="text-5xl">🕒</span>
                    <p class="text-[10px] font-black uppercase text-center px-4">QR no generado</p>
                 </div>
              </div>
           </div>
        </div>

        <div v-if="qrDataUrl" class="px-8 pb-8">
           <div class="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
              <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Código de Barras Operativo</p>
              <div class="overflow-x-auto flex justify-center py-2">
                 <svg :viewBox="`0 0 ${barcodeWidth} 100`" :width="barcodeWidth * 1.5" height="60">
                    <rect v-for="(bar, i) in barsForActive" :key="i"
                      :x="barsForActive.slice(0, i).reduce((s, b) => s + b.width, 0)"
                      y="0" :width="bar.width" height="100"
                      :fill="bar.black ? '#0f172a' : '#f8fafc'"/>
                 </svg>
              </div>
           </div>
        </div>
      </article>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-black text-slate-900 tracking-tight">Mis Boletos</h2>
          <p class="text-slate-500 font-medium mt-1">Historial de viajes y tickets activos.</p>
        </div>
        <select v-model="filtroEstado" class="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-xs uppercase tracking-widest shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all">
          <option>Todos</option><option>PENDIENTE</option><option>CONFIRMADO</option><option>USADO</option><option>CANCELADO</option>
        </select>
      </div>

      <div v-if="error" class="rounded-2xl border-l-4 border-red-500 bg-red-50 p-5 shadow-md flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xl">⚠️</div>
        <p class="text-sm font-black text-red-700 leading-tight">{{ error }}</p>
      </div>

      <div v-if="loading" class="py-20 text-center space-y-4 opacity-40">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="font-black uppercase text-[10px] tracking-[0.3em] text-slate-600">Sincronizando tickets...</p>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="b in pagedBoletos" :key="b.id"
          class="rounded-[2rem] bg-white shadow-xl border border-slate-100 hover:shadow-2xl hover:border-blue-200 transition-all overflow-hidden flex flex-col group active:scale-[0.98]">
          <div class="p-7 flex-1 flex flex-col">
            <div class="flex items-start justify-between mb-6">
              <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">🎟️</div>
              <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" :class="estadoBadge(b.estado)">{{ b.estado }}</span>
            </div>
            <div class="space-y-1 mb-6 flex-1">
               <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Viaje</p>
               <h3 class="text-xl font-black text-slate-900 leading-tight">{{ b.origen }} → {{ b.destino }}</h3>
               <div class="flex items-center gap-3 mt-4">
                  <div class="px-3 py-1 rounded-lg bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">{{ b.fecha }}</div>
                  <div class="px-3 py-1 rounded-lg bg-slate-50 text-blue-600 font-bold text-[10px] uppercase">{{ b.hora }}</div>
               </div>
            </div>
            <div class="flex items-center justify-between pt-6 border-t border-slate-50">
               <div class="space-y-0.5">
                  <p class="text-[9px] font-black uppercase text-slate-400">Asiento</p>
                  <p class="text-2xl font-black text-slate-900">{{ b.asiento }}</p>
               </div>
               <button @click="verBoleto(b)" class="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase shadow-lg shadow-slate-100 hover:bg-blue-600 transition-all">Ver Detalle</button>
            </div>
          </div>
        </article>

        <div v-if="boletosFiltrados.length === 0" class="md:col-span-2 lg:col-span-3 py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
           <div class="max-w-xs mx-auto space-y-4 opacity-30 grayscale">
              <div class="text-7xl">🎫</div>
              <p class="font-black uppercase text-[10px] tracking-widest">No se encontraron boletos</p>
           </div>
        </div>
      </div>

      <PaginationControls
        v-if="totalItems > itemsPerPage"
        :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
        :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
        @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
      />
    </template>
  </div>
</template>

<style scoped>
@keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.animate-in { animation: zoom-in 0.3s ease-out; }
</style>
