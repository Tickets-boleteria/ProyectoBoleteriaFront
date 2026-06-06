<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { SupabaseVentasRepository } from '../../../Infrastructure/Repositories/SupabaseVentasRepository'
import { SupabaseBoletosRepository } from '../../../Infrastructure/Repositories/SupabaseBoletosRepository'
import { AprobarPago } from '../../../Application/UseCases/AprobarPago'
import { RechazarPago } from '../../../Application/UseCases/RechazarPago'
import { useAuthStore } from '../../Store/authStore'
import PaginationControls from '../../Components/PaginationControls.vue'
import PremiumSelect from '../../Components/PremiumSelect.vue'

const authStore = useAuthStore()

const ventasRepo = new SupabaseVentasRepository()
const boletosRepo = new SupabaseBoletosRepository()

const aprobarPagoUseCase = new AprobarPago(ventasRepo, boletosRepo)
const rechazarPagoUseCase = new RechazarPago(ventasRepo, boletosRepo)

const ventas = ref<any[]>([])
const loading = ref(false)
const procesandoId = ref<number | null>(null)
const error = ref('')
const success = ref('')

// Paginación
const currentPage = ref(1)
const itemsPerPage = ref(6)

// --- REALTIME LOGIC ---
const realTimeChannel = ref<any>(null)

function setupRealTime() {
  if (realTimeChannel.value) {
    supabase.removeChannel(realTimeChannel.value)
  }

  // Escuchamos cualquier cambio en la tabla Ventas para mantener la lista sincronizada
  realTimeChannel.value = supabase
    .channel('public:Ventas:sync:aprobacion')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'Ventas',
      },
      () => {
        console.log('Sincronización automática: cambio detectado en Ventas.')
        cargarVentasPendientes(false) // Recargar sin spinner invasivo
      }
    )
    .subscribe()
}

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

const opcionesFilas = [
  { label: '5 filas', value: 5 },
  { label: '6 filas', value: 6 },
  { label: '20 filas', value: 20 }
]

const filtros = reactive({
  texto: '',
  fecha: '',
})

function getField(obj: any, field: string) {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())
  return key ? obj[key] : undefined
}

function estadoVentaLabel(estado: string) {
  const value = String(estado || '')

  if (value === 'Pendiente') return 'Pendiente de aprobación'
  if (value === 'AprobadaPago') return 'Pago aprobado'
  if (value === 'Confirmada') return 'Confirmada'
  if (value === 'Cancelada') return 'Cancelada / Rechazada'

  return value
}

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function usuarioActualId() {
  const tablaId = (authStore.user as any)?.usuarioTablaId

  if (tablaId && String(tablaId) !== 'NaN') {
    return String(tablaId)
  }

  return String(authStore.user?.id || '')
}

async function cargarVentasPendientes(showLoading = true) {
  if (showLoading) loading.value = true
  error.value = ''
  // No limpiamos success para que el usuario vea la confirmación de su última acción

  try {
    ventas.value = await ventasRepo.obtenerVentasPendientes()
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar las ventas pendientes.'
    ventas.value = []
  } finally {
    if (showLoading) loading.value = false
  }
}

const ventasFiltradas = computed(() => {
  const texto = filtros.texto.trim().toLowerCase()

  return (ventas.value || []).filter((venta) => {
    const boleto = relation(getField(venta, 'Boletos'))
    const ruta = relation(getField(venta, 'Rutas'))
    const frecuencia = relation(getField(ruta, 'Frecuencias'))

    const fechaVenta = String(getField(venta, 'FechaVenta') || '').slice(0, 10)

    const contenido = [
      getField(venta, 'Id'),
      getField(boleto, 'CedulaPasajero'),
      getField(boleto, 'NombresPasajero'),
      getField(boleto, 'ApellidosPasajero'),
      getField(frecuencia, 'CiudadOrigen'),
      getField(frecuencia, 'CiudadDestino'),
      getField(venta, 'CiudadOrigenVenta'),
      getField(venta, 'CiudadDestinoVenta'),
    ].join(' ').toLowerCase()

    const coincideTexto = !texto || contenido.includes(texto)
    const coincideFecha = !filtros.fecha || fechaVenta === filtros.fecha

    return coincideTexto && coincideFecha
  })
})

const totalItems = computed(() => ventasFiltradas.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

const pagedVentas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return (ventasFiltradas.value || []).slice(start, start + itemsPerPage.value)
})

function abrirComprobante(url: string | null | undefined) {
  if (!url) {
    error.value = 'Esta venta no tiene comprobante.'
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

async function aprobar(ventaId: number) {
  error.value = ''
  success.value = ''
  procesandoId.value = ventaId

  try {
    await aprobarPagoUseCase.ejecutar(ventaId, usuarioActualId())
    success.value = `Venta #${ventaId} aprobada correctamente.`
    ventas.value = ventas.value.filter(v => Number(getField(v, 'Id')) !== ventaId)
  } catch (err: any) {
    error.value = err.message || 'No se pudo aprobar la venta.'
  } finally {
    procesandoId.value = null
  }
}

async function rechazar(ventaId: number) {
  const observacion = window.prompt('Motivo del rechazo (opcional):') || ''

  error.value = ''
  success.value = ''
  procesandoId.value = ventaId

  try {
    await rechazarPagoUseCase.ejecutar(ventaId, usuarioActualId(), observacion)
    success.value = `Venta #${ventaId} rechazada correctamente.`
    ventas.value = ventas.value.filter(v => Number(getField(v, 'Id')) !== ventaId)
  } catch (err: any) {
    error.value = err.message || 'No se pudo rechazar la venta.'
  } finally {
    procesandoId.value = null
  }
}

onMounted(() => {
  cargarVentasPendientes()
  setupRealTime()
})

onUnmounted(() => {
  if (realTimeChannel.value) {
    supabase.removeChannel(realTimeChannel.value)
  }
})
</script>

<template>
  <div class="space-y-8 animate-in">
    <!-- Header Premium -->
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Validación de Pagos</h1>
          <p class="mt-2 text-slate-400 font-medium text-sm md:text-base">Revisión de transferencias y depósitos para emisión de boletos.</p>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur border border-white/10">
          <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-emerald-100">Sincronización en vivo</span>
        </div>
      </div>
    </header>

    <div v-if="error" class="rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-5 shadow-md flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 text-xl font-black">!</div>
      <p class="text-sm font-black text-rose-700 leading-tight">{{ error }}</p>
    </div>

    <div v-if="success" class="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 shadow-md flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xl font-black">✓</div>
      <p class="text-sm font-black text-emerald-700 leading-tight">{{ success }}</p>
    </div>

    <!-- Filtros Elegant -->
    <section class="rounded-[2rem] bg-white p-6 shadow-xl border border-slate-100 flex flex-wrap items-end gap-6">
      <div class="flex-1 min-w-[280px]">
        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filtro Rápido</label>
        <div class="relative mt-2">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          <input v-model="filtros.texto" type="text" placeholder="Buscar por venta, identificación, pasajero..."
            class="input-premium !pl-11"/>
        </div>
      </div>
      <div class="w-full sm:w-60">
        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Transacción</label>
        <input v-model="filtros.fecha" type="date"
          class="input-premium mt-2"/>
      </div>
    </section>

    <div v-if="loading" class="py-20 text-center space-y-4 opacity-40">
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="font-black uppercase text-[10px] tracking-[0.3em] text-slate-600">Sincronizando transacciones...</p>
    </div>

    <section v-else class="grid gap-6">
      <article
        v-for="venta in pagedVentas"
        :key="getField(venta, 'Id')"
        class="card-premium p-8 group animate-in"
      >
        <div class="flex flex-wrap justify-between gap-6">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest border border-blue-100 shadow-sm">
                Venta #{{ getField(venta, 'Id') }}
              </span>
              <span class="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 font-black text-[10px] uppercase tracking-widest border border-amber-100 shadow-sm">
                {{ estadoVentaLabel(getField(venta, 'Estado')) }}
              </span>
            </div>

            <div>
              <h2 class="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {{ getField(relation(getField(venta, 'Boletos')), 'NombresPasajero') }}
                {{ getField(relation(getField(venta, 'Boletos')), 'ApellidosPasajero') }}
              </h2>
              <p class="text-sm font-bold text-slate-400 mt-1">ID: {{ getField(relation(getField(venta, 'Boletos')), 'CedulaPasajero') || 'N/A' }}</p>
            </div>
          </div>

          <div class="text-right">
            <p class="text-xs font-black uppercase text-slate-400 tracking-widest">Monto a Validar</p>
            <p class="text-4xl font-black text-blue-600 mt-1">
              ${{ Number(getField(venta, 'Total') || 0).toFixed(2) }}
            </p>
          </div>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-8 border-t border-slate-50">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha Operativa</p>
            <p class="font-bold text-slate-700 text-xs">{{ String(getField(venta, 'FechaVenta') || '').slice(0, 10) }}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Medio de Pago</p>
            <p class="font-bold text-slate-700 text-xs">{{ getField(venta, 'MetodoPago') }}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Ruta del Viaje</p>
            <p class="font-bold text-slate-700 text-xs truncate">{{ getField(venta, 'CiudadOrigenVenta') }} → {{ getField(venta, 'CiudadDestinoVenta') }}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha de Viaje</p>
            <p class="font-bold text-slate-700 text-xs">{{ getField(relation(getField(venta, 'Rutas')), 'Fecha') }}</p>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <button
            @click="abrirComprobante(getField(venta, 'ComprobanteUrl'))"
            class="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-100 px-8 py-4 font-black text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-200 active:scale-95"
          >
            🖼️ Ver Comprobante
          </button>

          <div class="flex-1 sm:flex-none flex gap-3">
            <button
              @click="aprobar(Number(getField(venta, 'Id')))"
              :disabled="procesandoId === Number(getField(venta, 'Id'))"
              class="flex-1 rounded-2xl bg-emerald-600 px-8 py-4 font-black text-white shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
            >
              ✓ APROBAR
            </button>

            <button
              @click="rechazar(Number(getField(venta, 'Id')))"
              :disabled="procesandoId === Number(getField(venta, 'Id'))"
              class="flex-1 rounded-2xl bg-rose-600 px-8 py-4 font-black text-white shadow-xl shadow-rose-500/20 transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-50"
            >
              ✕ RECHAZAR
            </button>
          </div>
        </div>
      </article>

      <div v-if="ventasFiltradas.length === 0" class="card-premium p-24 text-center opacity-40">
        <p class="text-5xl mb-4">✨</p>
        <p class="font-black text-slate-400 uppercase tracking-widest text-xs">Todo al día. No hay pendientes.</p>
      </div>

      <!-- Paginación Premium -->
      <div v-if="totalItems > itemsPerPage" class="mt-8 pt-8 border-t border-slate-50">
        <div class="flex items-center gap-6 mb-6">
           <PremiumSelect
             v-model="itemsPerPage"
             :options="opcionesFilas"
             label="Ver"
             container-class="w-32"
           />
        </div>
        <PaginationControls
          :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
          :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
          @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-in { animation: fadeIn 0.5s ease-out; }
</style>
