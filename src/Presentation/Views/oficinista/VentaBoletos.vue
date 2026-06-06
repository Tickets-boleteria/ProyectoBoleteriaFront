<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { SupabaseVentasRepository } from '../../../Infrastructure/Repositories/SupabaseVentasRepository'
import { SupabaseBoletosRepository } from '../../../Infrastructure/Repositories/SupabaseBoletosRepository'
import { VenderBoleto } from '../../../Application/UseCases/VenderBoleto'
import { useAuthStore } from '../../Store/authStore'
import { useUiStore } from '../../Store/uiStore'
import { SupabasePaymentRepository } from '../../../Infrastructure/Repositories/SupabasePaymentRepository'
import { PrepararPagoStripe } from '../../../Application/UseCases/PrepararPagoStripe'
import StripePaymentForm from '../../Components/StripePaymentForm.vue'
import PaginationControls from '../../Components/PaginationControls.vue'

type AnyRow = Record<string, any>

interface RutaDisponible {
  id: number
  frecuenciaId: number
  busId: number
  estado: string
  origen: string
  destino: string
  fecha: string
  hora: string
  esDirecto: boolean
  bus: string
  precioBase: number
}

interface ParadaDisponible {
  id: number
  ciudad: string
  permiteVenta: boolean
}

interface AsientoDisponible {
  Id: number
  NumeroAsiento: string
  Tipo?: string
  precioBase: number
}

const authStore = useAuthStore()
const uiStore = useUiStore()

const ventasRepo = new SupabaseVentasRepository()
const boletosRepo = new SupabaseBoletosRepository()
const venderBoleto = new VenderBoleto(ventasRepo, boletosRepo)
const paymentRepo = new SupabasePaymentRepository()
const prepararPagoStripe = new PrepararPagoStripe(paymentRepo)

const loading = ref(false)
const vendiendo = ref(false)
const error = ref('')
const success = ref('')

// Paginación de rutas
const currentPage = ref(1)
const itemsPerPage = 5

const filtros = reactive({
  origen: '',
  destino: '',
  fecha: new Date().toISOString().slice(0, 10),
})

const rutas = ref<RutaDisponible[]>([])
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const paradas = ref<ParadaDisponible[]>([])
const asientos = ref<AsientoDisponible[]>([])
const asientoSeleccionadoId = ref<number | null>(null)
const paradaDestinoId = ref<number | null>(null)

const pasajero = reactive({
  cedula: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  discapacidad: false,
  metodoPago: 'Efectivo',
})

const ventaGenerada = ref<any | null>(null)
const clientSecret = ref('')
const stripeLoading = ref(false)

// --- REALTIME LOGIC ---
const realTimeChannel = ref<any>(null)

function setupRealTime(rutaId: number) {
  if (realTimeChannel.value) {
    supabase.removeChannel(realTimeChannel.value)
  }

  realTimeChannel.value = supabase
    .channel(`public:Boletos:sync:venta:${rutaId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Boletos',
      },
      async (payload) => {
        console.log('Actualización de asientos detectada (Venta):', payload)
        // Refrescar asientos disponibles
        const disponibles = await boletosRepo.obtenerAsientosDisponiblesPorRuta(rutaId)
        asientos.value = disponibles.map((a: any) => {
          const config = relation(getField(a, 'ConfiguracionesAsientos'))
          return {
            Id: Number(getField(a, 'Id')),
            NumeroAsiento: String(getField(a, 'NumeroAsiento') || ''),
            Tipo: String(getField(a, 'Tipo') || ''),
            precioBase: Number(getField(config, 'PrecioBase') || 0),
          }
        })
      }
    )
    .subscribe()
}

onUnmounted(() => {
  if (realTimeChannel.value) {
    supabase.removeChannel(realTimeChannel.value)
  }
})
// ----------------------

// Lógica de Paginación
const totalItems = computed(() => rutasFiltradas.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))
const pagedRutas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return rutasFiltradas.value.slice(start, start + itemsPerPage)
})

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

function getField(obj: AnyRow | null | undefined, field: string) {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())
  return key ? obj[key] : undefined
}

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function usuarioActualId() {
  const tablaId = (authStore.user as any)?.usuarioTablaId
  if (tablaId && String(tablaId) !== 'NaN') return String(tablaId)
  return String(authStore.user?.id || '')
}

function validarCedulaEcuador(cedula: string) {
  const value = String(cedula || '').trim()
  if (!/^\d{10}$/.test(value)) return false
  const provincia = Number(value.slice(0, 2))
  if (provincia < 1 || provincia > 24) return false
  const tercerDigito = Number(value[2])
  if (tercerDigito >= 6) return false
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  const suma = coeficientes.reduce((acc, coef, index) => {
    let producto = Number(value[index]) * coef
    if (producto >= 10) producto -= 9
    return acc + producto
  }, 0)
  const digitoVerificador = suma % 10 === 0 ? 0 : 10 - (suma % 10)
  return digitoVerificador === Number(value[9])
}

const edad = computed(() => {
  if (!pasajero.fechaNacimiento) return 0
  const nacimiento = new Date(`${pasajero.fechaNacimiento}T00:00:00`)
  const hoy = new Date()
  let value = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) value--
  return value
})

const esMenor = computed(() => edad.value > 0 && edad.value < 12)
const esTerceraEdad = computed(() => edad.value >= 65)
const porcentajeDescuento = computed(() => {
  if (pasajero.discapacidad || esTerceraEdad.value || esMenor.value) return 0.5
  return 0
})

const asientoSeleccionado = computed(() =>
  asientos.value.find(a => Number(a.Id) === Number(asientoSeleccionadoId.value)) || null
)
const precioBase = computed(() => Number(asientoSeleccionado.value?.precioBase || rutaSeleccionada.value?.precioBase || 0))
const precioFinal = computed(() => Number((precioBase.value * (1 - porcentajeDescuento.value)).toFixed(2)))
const destinoVenta = computed(() => {
  if (!rutaSeleccionada.value) return ''
  if (!paradaDestinoId.value) return rutaSeleccionada.value.destino
  const parada = paradas.value.find(p => Number(p.id) === Number(paradaDestinoId.value))
  return parada?.ciudad || rutaSeleccionada.value.destino
})
const paradaSeleccionada = computed(() => paradas.value.find(p => Number(p.id) === Number(paradaDestinoId.value)) || null)

async function cargarRutas() {
  loading.value = true
  error.value = ''
  currentPage.value = 1
  try {
    const { data, error: queryError } = await supabase
      .from('Rutas')
      .select(`
        Id, FrecuenciaId, BusId, Fecha, Estado, HoraSalida,
        Frecuencias(Id, CiudadOrigen, CiudadDestino, HoraSalida, EsDirecto, es_directa),
        Buses(Id, Numero, Placa, TotalAsientos)
      `)
      .eq('Fecha', filtros.fecha)
      .order('Id', { ascending: true })

    if (queryError) throw new Error(queryError.message)

    const rutasMapeadas: RutaDisponible[] = []
    for (const row of data || []) {
      const frecuencia = relation(getField(row, 'Frecuencias'))
      const bus = relation(getField(row, 'Buses'))
      const estado = String(getField(row, 'Estado') || '')
      if (estado.toLowerCase().includes('cancel') || estado.toLowerCase().includes('complet')) continue

      const busId = Number(getField(row, 'BusId'))
      const { data: precioData } = await supabase
        .from('ConfiguracionesAsientos')
        .select('PrecioBase')
        .eq('BusId', busId)
        .order('PrecioBase', { ascending: true })
        .limit(1)
        .maybeSingle()

      rutasMapeadas.push({
        id: Number(getField(row, 'Id')),
        frecuenciaId: Number(getField(row, 'FrecuenciaId')),
        busId,
        estado,
        origen: String(getField(frecuencia, 'CiudadOrigen') || ''),
        destino: String(getField(frecuencia, 'CiudadDestino') || ''),
        fecha: String(getField(row, 'Fecha') || '').slice(0, 10),
        hora: String(getField(row, 'HoraSalida') || getField(frecuencia, 'HoraSalida') || '').slice(0, 5),
        esDirecto: Boolean(getField(row, 'es_directa') ?? getField(frecuencia, 'EsDirecto')),
        bus: `Unidad ${getField(bus, 'Numero') || 'Bus'} (${getField(bus, 'Placa') || 'S/P'})`,
        precioBase: Number(getField(precioData, 'PrecioBase') || 0),
      })
    }
    rutas.value = rutasMapeadas
  } catch (err: any) {
    error.value = err.message || 'Error cargando rutas.'
  } finally {
    loading.value = false
  }
}

const rutasFiltradas = computed(() => {
  return rutas.value.filter(ruta => {
    const origenOk = !filtros.origen || ruta.origen.toLowerCase().includes(filtros.origen.toLowerCase())
    const destinoOk = !filtros.destino || ruta.destino.toLowerCase().includes(filtros.destino.toLowerCase())
    return origenOk && destinoOk
  })
})

async function seleccionarRuta(ruta: RutaDisponible) {
  error.value = ''
  rutaSeleccionada.value = ruta
  paradaDestinoId.value = null
  asientoSeleccionadoId.value = null
  paradas.value = []
  asientos.value = []

  try {
    const { data: paradasData } = await supabase
      .from('ParadasIntermedias')
      .select('Id, Ciudad, PermiteVenta')
      .eq('FrecuenciaId', ruta.frecuenciaId)
      .order('Orden', { ascending: true })

    paradas.value = (paradasData || []).map((p: any) => ({
      id: Number(getField(p, 'Id')),
      ciudad: String(getField(p, 'Ciudad') || ''),
      permiteVenta: Boolean(getField(p, 'PermiteVenta')),
    }))

    const disponibles = await boletosRepo.obtenerAsientosDisponiblesPorRuta(ruta.id)
    asientos.value = disponibles.map((a: any) => {
      const config = relation(getField(a, 'ConfiguracionesAsientos'))
      return {
        Id: Number(getField(a, 'Id')),
        NumeroAsiento: String(getField(a, 'NumeroAsiento') || ''),
        Tipo: String(getField(a, 'Tipo') || ''),
        precioBase: Number(getField(config, 'PrecioBase') || ruta.precioBase),
      }
    })

    // Activar sincronización en tiempo real
    setupRealTime(ruta.id)
  } catch (err: any) {
    uiStore.showAlert({ title: 'Error', message: 'No se pudo cargar el detalle de la ruta.', type: 'error' })
  }
}

function validarFormulario() {
  if (!rutaSeleccionada.value) return 'Selecciona una ruta operativa.'
  if (!asientoSeleccionadoId.value) return 'Selecciona un asiento disponible.'
  if (!pasajero.cedula.trim()) return 'Ingresa la cédula del pasajero.'
  if (!validarCedulaEcuador(pasajero.cedula)) return 'Cédula ecuatoriana inválida.'
  if (!pasajero.nombres.trim() || !pasajero.apellidos.trim()) return 'Completa nombres y apellidos.'
  if (!pasajero.fechaNacimiento) return 'Ingresa la fecha de nacimiento.'
  if (rutaSeleccionada.value.esDirecto && paradaDestinoId.value) return 'Ruta directa: no se permiten paradas.'
  return ''
}

async function iniciarPagoTarjeta() {
  const msg = validarFormulario()
  if (msg) { uiStore.showAlert({ title: 'Validación', message: msg, type: 'warning' }); return }
  stripeLoading.value = true
  try {
    const res = await prepararPagoStripe.ejecutar(precioFinal.value)
    clientSecret.value = res.clientSecret
  } catch (err: any) {
    uiStore.showAlert({ title: 'Error Stripe', message: err.message, type: 'error' })
  } finally { stripeLoading.value = false }
}

async function confirmarVenta(stripePaymentIntent?: any) {
  const msg = validarFormulario()
  if (msg) { uiStore.showAlert({ title: 'Validación', message: msg, type: 'warning' }); return }
  vendiendo.value = true
  try {
    const result = await venderBoleto.ejecutar({
      usuarioVendedorId: usuarioActualId(),
      ruta: { id: rutaSeleccionada.value!.id, estado: rutaSeleccionada.value!.estado, origen: rutaSeleccionada.value!.origen, destinoFinal: rutaSeleccionada.value!.destino, esDirecto: rutaSeleccionada.value!.esDirecto },
      ciudadDestinoVenta: destinoVenta.value,
      paradaDestinoId: paradaDestinoId.value,
      paradaPermiteVenta: paradaSeleccionada.value?.permiteVenta,
      metodoPago: pasajero.metodoPago === 'Tarjeta' ? 'Transferencia' : pasajero.metodoPago,
      pasajeros: [{ asientoId: asientoSeleccionadoId.value!, nombres: pasajero.nombres, apellidos: pasajero.apellidos, cedula: pasajero.cedula, fechaNacimiento: pasajero.fechaNacimiento, esMenor: esMenor.value, esDiscapacitado: pasajero.discapacidad, esTerceraEdad: esTerceraEdad.value, descuentoAplicado: porcentajeDescuento.value, precioFinal: precioFinal.value }],
    })
    if (stripePaymentIntent?.id) await supabase.from('Ventas').update({ ComprobanteUrl: `STRIPE_ID:${stripePaymentIntent.id}`, Estado: 'Confirmada' }).eq('Id', result.ventaId)
    ventaGenerada.value = { ...result, ruta: rutaSeleccionada.value, pasajero: { ...pasajero }, asiento: asientoSeleccionado.value, destino: destinoVenta.value, precioBase: precioBase.value, precioFinal: precioFinal.value, descuento: porcentajeDescuento.value, fecha: new Date().toISOString() }
    uiStore.showAlert({ title: 'Éxito', message: 'Venta registrada. Procede a imprimir el boleto.', type: 'success' })
  } catch (err: any) {
    uiStore.showAlert({ title: 'Error de Venta', message: err.message, type: 'error' })
  } finally { vendiendo.value = false }
}

function nuevaVenta() {
  ventaGenerada.value = null; rutaSeleccionada.value = null; paradaDestinoId.value = null; asientoSeleccionadoId.value = null
  pasajero.cedula = ''; pasajero.nombres = ''; pasajero.apellidos = ''; pasajero.fechaNacimiento = ''; pasajero.discapacidad = false; pasajero.metodoPago = 'Efectivo'
  clientSecret.value = ''; void cargarRutas()
}

watch(() => filtros.fecha, cargarRutas)
onMounted(cargarRutas)
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20">
    <section v-if="ventaGenerada" class="rounded-[2.5rem] bg-white p-10 shadow-2xl border-4 border-blue-50 animate-in zoom-in duration-300 print:p-0 print:border-0 print:shadow-none">
      <div class="text-center border-b-2 border-dashed border-slate-100 pb-8 mb-8">
        <div class="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl mx-auto mb-4 shadow-xl shadow-blue-100">🎟️</div>
        <h2 class="text-3xl font-black text-slate-900">Boleto Digital</h2>
        <p class="text-blue-600 font-bold tracking-widest uppercase text-xs mt-1">Comprobante de Venta #{{ ventaGenerada.ventaId }}</p>
      </div>

      <div class="grid gap-8 md:grid-cols-2">
        <div class="space-y-4">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Información del Pasajero</p>
          <div class="bg-slate-50 rounded-2xl p-5 space-y-2">
            <p class="text-lg font-black text-slate-800">{{ ventaGenerada.pasajero.nombres }} {{ ventaGenerada.pasajero.apellidos }}</p>
            <p class="text-sm font-bold text-slate-500">CI: {{ ventaGenerada.pasajero.cedula }}</p>
          </div>
        </div>
        <div class="space-y-4">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalle del Viaje</p>
          <div class="bg-slate-50 rounded-2xl p-5 space-y-1">
            <p class="font-black text-slate-800">{{ ventaGenerada.ruta.origen }} → {{ ventaGenerada.destino }}</p>
            <p class="text-sm font-bold text-blue-600 uppercase">{{ ventaGenerada.ruta.fecha }} · {{ ventaGenerada.ruta.hora }}</p>
            <p class="text-xs font-bold text-slate-500">{{ ventaGenerada.ruta.bus }} · Asiento: {{ ventaGenerada.asiento?.NumeroAsiento }}</p>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
           <p class="text-[10px] font-black uppercase opacity-80 mb-1">Total Pagado</p>
           <p class="text-3xl font-black">${{ ventaGenerada.total.toFixed(2) }}</p>
        </div>
        <div class="bg-slate-900 rounded-3xl p-6 text-white sm:col-span-2 flex items-center justify-between">
           <div class="space-y-1">
             <p class="text-[10px] font-black uppercase opacity-60">Código de Seguridad</p>
             <p class="font-mono text-xs break-all opacity-90">{{ ventaGenerada.boletos?.[0]?.CodigoQr?.slice(0, 32) }}...</p>
           </div>
           <div class="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-2xl">📱</div>
        </div>
      </div>

      <div class="mt-10 flex gap-4 print:hidden">
        <button @click="window.print()" class="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95">Imprimir Ticket</button>
        <button @click="nuevaVenta" class="flex-1 py-4 rounded-2xl bg-blue-50 text-blue-700 font-black hover:bg-blue-100 transition-all active:scale-95">Nueva Venta</button>
      </div>
    </section>

    <template v-else>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">Punto de Venta</h1>
          <p class="text-slate-500 font-medium">Gestión de boletos y cobros presenciales.</p>
        </div>
        <div class="flex gap-2">
           <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase border border-emerald-100">Sistema Conectado</span>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-12 items-start">
        <!-- Columna Izquierda: Búsqueda -->
        <div class="lg:col-span-5 space-y-6">
          <section class="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-100 space-y-6">
            <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
               <span class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm">🔍</span>
               1. Buscar Ruta
            </h2>
            <div class="space-y-4">
              <input v-model="filtros.fecha" type="date" class="w-full rounded-2xl border border-slate-200 p-4 font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
              <div class="grid grid-cols-2 gap-3">
                <input v-model="filtros.origen" placeholder="Origen" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                <input v-model="filtros.destino" placeholder="Destino" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
              </div>
            </div>

            <div v-if="loading" class="py-12 text-center space-y-4">
              <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando...</p>
            </div>

            <div v-else class="space-y-3">
              <article
                v-for="ruta in pagedRutas" :key="ruta.id"
                @click="seleccionarRuta(ruta)"
                class="rounded-3xl border-2 p-5 cursor-pointer transition-all active:scale-[0.98]"
                :class="rutaSeleccionada?.id === ruta.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-black text-slate-900">{{ ruta.origen }} → {{ ruta.destino }}</p>
                    <p class="text-xs font-bold text-blue-600 mt-0.5 uppercase">{{ ruta.hora }} · {{ ruta.bus }}</p>
                  </div>
                  <span class="text-sm font-black text-slate-900">${{ ruta.precioBase.toFixed(2) }}</span>
                </div>
                <div class="mt-3 flex gap-2">
                   <span class="px-2 py-0.5 rounded-lg bg-white text-[9px] font-black uppercase text-slate-400 border border-slate-100" :class="{'text-orange-600': ruta.esDirecto}">{{ ruta.esDirecto ? '⚡ Directa' : '🚌 Paradas' }}</span>
                </div>
              </article>
              
              <div v-if="rutasFiltradas.length === 0" class="py-8 text-center bg-slate-50 rounded-3xl">
                <p class="text-slate-400 font-bold text-xs">No hay rutas disponibles</p>
              </div>

              <PaginationControls
                v-if="totalItems > itemsPerPage"
                :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
                :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
                @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
              />
            </div>
          </section>
        </div>

        <!-- Columna Derecha: Configuración y Pago -->
        <div class="lg:col-span-7 space-y-6">
          <section v-if="rutaSeleccionada" class="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-100 space-y-8 animate-in slide-in-from-right duration-300">
            <div>
              <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
                <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">📍</span>
                2. Configuración de Viaje
              </h2>
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Destino de Entrega</label>
                  <select v-model="paradaDestinoId" class="select-premium">
                    <option :value="null">{{ rutaSeleccionada.destino }} (Terminal Final)</option>
                    <option v-for="p in paradas" :key="p.id" :value="p.id" :disabled="rutaSeleccionada.esDirecto || !p.permiteVenta">{{ p.ciudad }}</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Asiento Asignado</label>
                  <select v-model="asientoSeleccionadoId" class="select-premium">
                    <option :value="null">Seleccione Asiento</option>
                    <option v-for="a in asientos" :key="a.Id" :value="a.Id">Asiento {{ a.NumeroAsiento }} (${{ a.precioBase.toFixed(2) }})</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="pt-6 border-t border-slate-50">
              <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
                <span class="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm">👤</span>
                3. Datos del Pasajero
              </h2>
              <div class="grid gap-5 sm:grid-cols-2">
                <input v-model="pasajero.cedula" maxlength="10" placeholder="Número de Cédula" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all" />
                <input v-model="pasajero.fechaNacimiento" type="date" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all" />
                <input v-model="pasajero.nombres" placeholder="Nombres" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all" />
                <input v-model="pasajero.apellidos" placeholder="Apellidos" class="rounded-2xl border border-slate-200 p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all" />
                
                <label class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 cursor-pointer">
                  <input v-model="pasajero.discapacidad" type="checkbox" class="w-5 h-5 rounded-lg text-orange-600 focus:ring-orange-500" />
                  <span class="text-xs font-black text-slate-600 uppercase tracking-wider">Aplica Discapacidad</span>
                </label>

                <select v-model="pasajero.metodoPago" class="select-premium">
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Tarjeta">💳 Tarjeta (Stripe)</option>
                </select>
              </div>
            </div>

            <div class="rounded-3xl bg-slate-900 p-8 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
               <div class="text-center sm:text-left">
                  <p class="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Resumen de Pago</p>
                  <p class="text-sm font-bold opacity-80">Precio: ${{ precioBase.toFixed(2) }} <span class="text-emerald-400" v-if="porcentajeDescuento > 0">(-{{ porcentajeDescuento * 100 }}%)</span></p>
               </div>
               <div class="text-center sm:text-right">
                  <p class="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Total Final</p>
                  <p class="text-4xl font-black text-blue-400">${{ precioFinal.toFixed(2) }}</p>
               </div>
            </div>

            <div v-if="pasajero.metodoPago === 'Tarjeta'" class="animate-in fade-in duration-500">
               <div v-if="!clientSecret" class="text-center py-4">
                  <button @click="iniciarPagoTarjeta" :disabled="stripeLoading" class="w-full py-5 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-200 transition-all active:scale-95">
                    {{ stripeLoading ? 'Iniciando Pasarela...' : 'Pagar con Tarjeta' }}
                  </button>
               </div>
               <div v-else class="p-6 bg-slate-50 rounded-[2rem] border-2 border-blue-100">
                  <StripePaymentForm :client-secret="clientSecret" :amount="precioFinal" @success="confirmarVenta" />
               </div>
            </div>

            <button
              v-else
              @click="() => confirmarVenta()"
              :disabled="vendiendo"
              class="w-full py-5 rounded-2xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:bg-slate-200 transition-all active:scale-95"
            >
              {{ vendiendo ? 'Procesando Venta...' : 'Confirmar Venta Presencial' }}
            </button>
          </section>

          <div v-else class="h-full flex items-center justify-center py-24 opacity-20 grayscale">
             <div class="text-center space-y-4">
                <div class="text-8xl">🎟️</div>
                <p class="font-black uppercase tracking-[0.2em]">Selecciona una ruta para continuar</p>
             </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-in {
  animation: slide-in-right 0.4s ease-out;
}
@media print {
  :global(aside), :global(header), .print\:hidden { display: none !important; }
  :global(main) { margin: 0 !important; }
}
</style>
