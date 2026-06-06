<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '../../Store/authStore'
import { SupabaseTicketRepository } from '../../../Infrastructure/Repositories/SupabaseTicketRepository'
import QRCode from 'qrcode'
import PaginationControls from '../../Components/PaginationControls.vue'
import PremiumSelect from '../../Components/PremiumSelect.vue'

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
    const raw = await repo.obtenerPorCedulaPasajero(cedulaUsuario)

    boletos.value = raw.map((r: any) => {
      const ruta = firstRel(getFieldValue(r, 'Ventas')?.Rutas)
      const frecuencia = firstRel(getFieldValue(ruta, 'Frecuencias'))
      const cooperativa = firstRel(getFieldValue(frecuencia, 'Cooperativas'))
      const bus = firstRel(getFieldValue(ruta, 'Buses'))

      const o = getFieldValue(frecuencia, 'CiudadOrigen') ?? getFieldValue(r, 'Ventas')?.CiudadOrigenVenta ?? 'N/D'
      const d = getFieldValue(frecuencia, 'CiudadDestino') ?? getFieldValue(r, 'Ventas')?.CiudadDestinoVenta ?? 'N/D'

      return {
        id: String(getFieldValue(r, 'Id')),
        codigo: String(getFieldValue(r, 'CodigoQr') || getFieldValue(r, 'CodigoBarras') || 'SIN-CODIGO'),
        origen: String(o),
        destino: String(d),
        fecha: String(getFieldValue(ruta, 'Fecha') || 'N/D'),
        hora: String(getFieldValue(ruta, 'HoraSalida') || getFieldValue(frecuencia, 'HoraSalida') || '--:--'),
        asiento: String(getFieldValue(r, 'AsientoId') || 'N/D'),
        cooperativa: String(getFieldValue(cooperativa, 'Nombre') || 'Cooperativa'),
        busPlaca: String(getFieldValue(bus, 'Placa') || 'N/D'),
        precio: Number(getFieldValue(r, 'PrecioFinal') || 0),
        metodoPago: String(getFieldValue(r, 'Ventas')?.MetodoPago || 'N/D'),
        comprobanteUrl: getFieldValue(r, 'Ventas')?.ComprobanteUrl,
        estadoVenta: String(getFieldValue(r, 'Ventas')?.Estado),
        estadoBoleto: String(getFieldValue(r, 'Estado')),
        estado: mapEstado(String(getFieldValue(r, 'Estado')), String(getFieldValue(r, 'Ventas')?.Estado)),
      }
    })
  } catch (err: any) {
    error.value = 'Error al recuperar tus boletos: ' + (err.message || 'Error desconocido')
  } finally {
    loading.value = false
  }
}

const filtroEstado = ref('Todos')
const boletoActivo = ref<Boleto | null>(null)
const qrDataUrl = ref('')

const boletosFiltrados = computed(() =>
  boletos.value.filter(b => filtroEstado.value === 'Todos' || b.estado === filtroEstado.value)
)

const totalItems = computed(() => boletosFiltrados.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
const pagedBoletos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return boletosFiltrados.value.slice(start, start + itemsPerPage.value)
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

const optionsEstado = [
  { label: 'Todos los Estados', value: 'Todos' },
  { label: 'Confirmados (Aprobados)', value: 'CONFIRMADO', icon: '✅' },
  { label: 'Pendientes (Pago)', value: 'PENDIENTE', icon: '⏳' },
  { label: 'Usados (Historial)', value: 'USADO', icon: '🏁' },
  { label: 'Cancelados', value: 'CANCELADO', icon: '❌' }
]

onMounted(cargarBoletos)
</script>

<template>
  <div class="space-y-10 animate-in">
    <!-- Header Premium -->
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Mis Boletos</h1>
          <p class="mt-2 text-slate-400 font-medium">Historial de viajes y acceso a tus códigos QR.</p>
        </div>
        
        <PremiumSelect
          v-model="filtroEstado"
          :options="optionsEstado"
          container-class="w-64"
        />
      </div>
    </header>

    <div v-if="error" class="rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-6 text-rose-700 font-bold shadow-xl animate-in">
      {{ error }}
    </div>

    <div v-if="loading" class="py-20 text-center">
      <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p class="mt-4 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Recuperando boletos...</p>
    </div>

    <template v-else>
      <section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="b in pagedBoletos"
          :key="b.id"
          @click="verBoleto(b)"
          class="group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl border border-slate-100"
        >
          <div class="flex justify-between items-start mb-6">
             <span class="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" :class="estadoBadge(b.estado)">
               {{ b.estado }}
             </span>
             <p class="font-black text-slate-900 text-lg">$ {{ b.precio.toFixed(2) }}</p>
          </div>

          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ b.fecha }} · {{ b.hora }}</p>
          <h3 class="text-2xl font-black text-slate-900 leading-tight mb-4">
            {{ b.origen }} <span class="text-slate-300">→</span><br/>{{ b.destino }}
          </h3>

          <div class="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
            <div>
              <p class="text-[9px] font-black text-slate-400 uppercase">Asiento</p>
              <p class="font-black text-blue-600">#{{ b.asiento }}</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] font-black text-slate-400 uppercase">Unidad</p>
              <p class="font-black text-slate-700">{{ b.busPlaca }}</p>
            </div>
          </div>
          
          <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
        </article>
      </section>

      <div v-if="!loading && (boletos || []).length === 0" class="rounded-[2.5rem] bg-white p-20 text-center text-slate-400 border-2 border-dashed border-slate-100 shadow-inner">
        <p class="text-5xl mb-4">🎫</p>
        <p class="font-black uppercase tracking-widest text-xs">No tienes boletos registrados aún</p>
      </div>

      <!-- Paginación Premium -->
      <div class="mt-10">
        <PaginationControls
          v-if="totalItems > itemsPerPage"
          :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
          :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
          @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
        />
      </div>
    </template>
  </div>

  <!-- Modal Detalle Boleto -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="boletoActivo" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-md" @click="boletoActivo = null"></div>
        
        <div class="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in">
          <div class="p-10 text-center">
            <div class="inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6" :class="estadoBadge(boletoActivo.estado)">
              {{ boletoActivo.estado }}
            </div>
            
            <h2 class="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Resumen de Boleto</h2>
            <p class="text-slate-400 font-medium">{{ boletoActivo.cooperativa }}</p>

            <!-- QR Area -->
            <div class="my-10 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-center">
              <div v-if="qrUsable(boletoActivo)" class="bg-white p-4 rounded-3xl shadow-xl">
                <img :src="qrDataUrl" alt="QR Code" class="w-48 h-48"/>
              </div>
              <div v-else class="py-12 px-6">
                <p class="text-sm font-bold text-slate-400 italic leading-relaxed">
                  {{ boletoActivo.estado === 'PENDIENTE' ? 'El código QR se habilitará cuando el pago sea aprobado.' : 'Este boleto no está disponible para abordar.' }}
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex justify-between p-4 bg-slate-50 rounded-2xl">
                <div class="text-left">
                  <p class="text-[9px] font-black text-slate-400 uppercase">Origen</p>
                  <p class="font-black text-slate-900">{{ boletoActivo.origen }}</p>
                </div>
                <div class="text-right">
                  <p class="text-[9px] font-black text-slate-400 uppercase">Destino</p>
                  <p class="font-black text-slate-900">{{ boletoActivo.destino }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                  <p class="text-[9px] font-black text-slate-400 uppercase">Fecha / Hora</p>
                  <p class="font-black text-slate-900 text-sm">{{ boletoActivo.fecha }} · {{ boletoActivo.hora }}</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                  <p class="text-[9px] font-black text-slate-400 uppercase">Asiento</p>
                  <p class="font-black text-blue-600 text-xl">#{{ boletoActivo.asiento }}</p>
                </div>
              </div>
            </div>

            <button @click="boletoActivo = null" class="mt-10 w-full btn-primary !py-4">
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from { opacity: 0; filter: blur(4px); transform: scale(0.95); }
.modal-leave-to { opacity: 0; transform: scale(1.02); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-in { animation: fadeIn 0.6s ease-out; }
</style>
