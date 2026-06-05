<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { SupabaseVentasRepository } from '../../../Infrastructure/Repositories/SupabaseVentasRepository'
import { SupabaseBoletosRepository } from '../../../Infrastructure/Repositories/SupabaseBoletosRepository'
import { VenderBoleto } from '../../../Application/UseCases/VenderBoleto'
import { useAuthStore } from '../../Store/authStore'
import { SupabasePaymentRepository } from '../../../Infrastructure/Repositories/SupabasePaymentRepository'
import { PrepararPagoStripe } from '../../../Application/UseCases/PrepararPagoStripe'
import StripePaymentForm from '../../Components/StripePaymentForm.vue'

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

const ventasRepo = new SupabaseVentasRepository()
const boletosRepo = new SupabaseBoletosRepository()
const venderBoleto = new VenderBoleto(ventasRepo, boletosRepo)
const paymentRepo = new SupabasePaymentRepository()
const prepararPagoStripe = new PrepararPagoStripe(paymentRepo)

const loading = ref(false)
const vendiendo = ref(false)
const error = ref('')
const success = ref('')

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

  if (tablaId && String(tablaId) !== 'NaN') {
    return String(tablaId)
  }

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

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    value--
  }

  return value
})

const esMenor = computed(() => edad.value > 0 && edad.value < 12)
const esTerceraEdad = computed(() => edad.value >= 65)

const porcentajeDescuento = computed(() => {
  if (pasajero.discapacidad) return 0.5
  if (esTerceraEdad.value) return 0.5
  if (esMenor.value) return 0.5
  return 0
})

const asientoSeleccionado = computed(() =>
  asientos.value.find(a => Number(a.Id) === Number(asientoSeleccionadoId.value)) || null
)

const precioBase = computed(() => {
  return Number(asientoSeleccionado.value?.precioBase || rutaSeleccionada.value?.precioBase || 0)
})

const precioFinal = computed(() => {
  return Number((precioBase.value * (1 - porcentajeDescuento.value)).toFixed(2))
})

const destinoVenta = computed(() => {
  if (!rutaSeleccionada.value) return ''

  if (!paradaDestinoId.value) return rutaSeleccionada.value.destino

  const parada = paradas.value.find(p => Number(p.id) === Number(paradaDestinoId.value))
  return parada?.ciudad || rutaSeleccionada.value.destino
})

const paradaSeleccionada = computed(() =>
  paradas.value.find(p => Number(p.id) === Number(paradaDestinoId.value)) || null
)

function limpiarMensajes() {
  error.value = ''
  success.value = ''
}

async function cargarRutas() {
  loading.value = true
  limpiarMensajes()

  try {
    const { data, error: queryError } = await supabase
      .from('Rutas')
      .select(`
        Id,
        FrecuenciaId,
        BusId,
        Fecha,
        Estado,
        HoraSalida,
        Frecuencias(
          Id,
          CiudadOrigen,
          CiudadDestino,
          HoraSalida,
          EsDirecto,
          es_directa
        ),
        Buses(
          Id,
          Numero,
          Placa,
          TotalAsientos
        )
      `)
      .eq('Fecha', filtros.fecha)
      .order('Id', { ascending: true })

    if (queryError) throw new Error(queryError.message)

    const rutasMapeadas: RutaDisponible[] = []

    for (const row of data || []) {
      const frecuencia = relation(getField(row, 'Frecuencias'))
      const bus = relation(getField(row, 'Buses'))

      const estado = String(getField(row, 'Estado') || '')
      const estadoNormalizado = estado.toLowerCase()

      if (estadoNormalizado.includes('cancel') || estadoNormalizado.includes('complet')) {
        continue
      }

      const rutaId = Number(getField(row, 'Id'))
      const busId = Number(getField(row, 'BusId'))
      let precio = 0

      const { data: precioData } = await supabase
        .from('ConfiguracionesAsientos')
        .select('PrecioBase')
        .eq('BusId', busId)
        .order('PrecioBase', { ascending: true })
        .limit(1)
        .maybeSingle()

      precio = Number(getField(precioData, 'PrecioBase') || 0)

      rutasMapeadas.push({
        id: rutaId,
        frecuenciaId: Number(getField(row, 'FrecuenciaId')),
        busId,
        estado,
        origen: String(getField(frecuencia, 'CiudadOrigen') || ''),
        destino: String(getField(frecuencia, 'CiudadDestino') || ''),
        fecha: String(getField(row, 'Fecha') || '').slice(0, 10),
        hora: String(getField(row, 'HoraSalida') || getField(frecuencia, 'HoraSalida') || '').slice(0, 5),
        esDirecto: Boolean(getField(frecuencia, 'EsDirecto') ?? getField(frecuencia, 'es_directa')),
        bus: `${getField(bus, 'Numero') || 'Bus'} - ${getField(bus, 'Placa') || 'Sin placa'}`,
        precioBase: precio,
      })
    }

    rutas.value = rutasMapeadas
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar las rutas.'
    rutas.value = []
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
  limpiarMensajes()
  rutaSeleccionada.value = ruta
  paradaDestinoId.value = null
  asientoSeleccionadoId.value = null
  paradas.value = []
  asientos.value = []

  try {
    const { data: paradasData, error: paradasError } = await supabase
      .from('ParadasIntermedias')
      .select('Id, Ciudad, PermiteVenta')
      .eq('FrecuenciaId', ruta.frecuenciaId)
      .order('Orden', { ascending: true })

    if (paradasError) throw new Error(paradasError.message)

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
  } catch (err: any) {
    error.value = err.message || 'No se pudo cargar el detalle de la ruta.'
  }
}

function validarFormulario() {
  if (!rutaSeleccionada.value) return 'Debe seleccionar una ruta.'
  if (!asientoSeleccionadoId.value) return 'Debe seleccionar un asiento.'
  if (!pasajero.cedula.trim()) return 'Debe ingresar la cédula.'
  if (!validarCedulaEcuador(pasajero.cedula)) return 'La cédula ingresada no es válida.'
  if (!pasajero.nombres.trim()) return 'Debe ingresar los nombres.'
  if (!pasajero.apellidos.trim()) return 'Debe ingresar los apellidos.'
  if (!pasajero.fechaNacimiento) return 'Debe ingresar la fecha de nacimiento.'
  if (rutaSeleccionada.value.esDirecto && paradaDestinoId.value) {
    return 'No se puede vender hacia paradas intermedias en una ruta directa.'
  }
  if (paradaDestinoId.value && paradaSeleccionada.value?.permiteVenta === false) {
    return 'La parada seleccionada no permite venta.'
  }
  return ''
}

async function iniciarPagoTarjeta() {
  limpiarMensajes()
  const mensaje = validarFormulario()
  if (mensaje) {
    error.value = mensaje
    return
  }

  stripeLoading.value = true
  try {
    const total = precioFinal.value
    const res = await prepararPagoStripe.ejecutar(total)
    clientSecret.value = res.clientSecret
  } catch (err: any) {
    error.value = 'No se pudo iniciar Stripe: ' + err.message
  } finally {
    stripeLoading.value = false
  }
}

async function confirmarVenta(stripePaymentIntent?: any) {
  limpiarMensajes()

  const mensaje = validarFormulario()
  if (mensaje) {
    error.value = mensaje
    return
  }

  if (!rutaSeleccionada.value || !asientoSeleccionadoId.value) return

  vendiendo.value = true

  try {
    const result = await venderBoleto.ejecutar({
      usuarioVendedorId: usuarioActualId(),
      ruta: {
        id: rutaSeleccionada.value.id,
        estado: rutaSeleccionada.value.estado,
        origen: rutaSeleccionada.value.origen,
        destinoFinal: rutaSeleccionada.value.destino,
        esDirecto: rutaSeleccionada.value.esDirecto,
      },
      ciudadDestinoVenta: destinoVenta.value,
      paradaDestinoId: paradaDestinoId.value,
      paradaPermiteVenta: paradaSeleccionada.value?.permiteVenta,
      metodoPago: pasajero.metodoPago === 'Tarjeta' ? 'Transferencia' : pasajero.metodoPago, // Trick for ENUM
      pasajeros: [
        {
          asientoId: asientoSeleccionadoId.value,
          nombres: pasajero.nombres,
          apellidos: pasajero.apellidos,
          cedula: pasajero.cedula,
          fechaNacimiento: pasajero.fechaNacimiento,
          esMenor: esMenor.value,
          esDiscapacitado: pasajero.discapacidad,
          esTerceraEdad: esTerceraEdad.value,
          descuentoAplicado: porcentajeDescuento.value,
          precioFinal: precioFinal.value,
        },
      ],
    })

    // If Stripe payment, we update the ComprobanteUrl with Stripe ID since the use case doesn't do it natively yet.
    if (stripePaymentIntent && stripePaymentIntent.id) {
      await supabase.from('Ventas')
        .update({ ComprobanteUrl: `STRIPE_ID:${stripePaymentIntent.id}`, Estado: 'Confirmada' })
        .eq('Id', result.ventaId)
    }

    ventaGenerada.value = {
      ...result,
      ruta: rutaSeleccionada.value,
      pasajero: { ...pasajero },
      asiento: asientoSeleccionado.value,
      destino: destinoVenta.value,
      precioBase: precioBase.value,
      precioFinal: precioFinal.value,
      descuento: porcentajeDescuento.value,
      fecha: new Date().toISOString(),
    }

    success.value = `Venta ${result.ventaId} registrada correctamente.`
    await seleccionarRuta(rutaSeleccionada.value)
  } catch (err: any) {
    error.value = err.message || 'No se pudo registrar la venta.'
  } finally {
    vendiendo.value = false
  }
}

function nuevaVenta() {
  ventaGenerada.value = null
  rutaSeleccionada.value = null
  paradaDestinoId.value = null
  asientoSeleccionadoId.value = null
  paradas.value = []
  asientos.value = []
  pasajero.cedula = ''
  pasajero.nombres = ''
  pasajero.apellidos = ''
  pasajero.fechaNacimiento = ''
  pasajero.discapacidad = false
  pasajero.metodoPago = 'Efectivo'
  clientSecret.value = ''
  limpiarMensajes()
  void cargarRutas()
}

function imprimir() {
  window.print()
}

watch(() => filtros.fecha, cargarRutas)

onMounted(cargarRutas)
</script>

<template>
  <div class="space-y-6">
    <section v-if="ventaGenerada" class="rounded-2xl bg-white p-6 shadow-xl border print:shadow-none">
      <div class="text-center border-b border-dashed pb-4 mb-4">
        <h2 class="text-2xl font-black">Boleto generado</h2>
        <p class="text-sm text-slate-500">Venta #{{ ventaGenerada.ventaId }}</p>
      </div>

      <div class="grid gap-2 text-sm sm:grid-cols-2">
        <p><strong>Pasajero:</strong> {{ ventaGenerada.pasajero.nombres }} {{ ventaGenerada.pasajero.apellidos }}</p>
        <p><strong>Cédula:</strong> {{ ventaGenerada.pasajero.cedula }}</p>
        <p><strong>Ruta:</strong> {{ ventaGenerada.ruta.origen }} → {{ ventaGenerada.destino }}</p>
        <p><strong>Fecha:</strong> {{ ventaGenerada.ruta.fecha }} · {{ ventaGenerada.ruta.hora }}</p>
        <p><strong>Bus:</strong> {{ ventaGenerada.ruta.bus }}</p>
        <p><strong>Asiento:</strong> {{ ventaGenerada.asiento?.NumeroAsiento }}</p>
        <p><strong>Estado:</strong> Pagado</p>
        <p><strong>Método de pago:</strong> {{ ventaGenerada.pasajero.metodoPago }}</p>
      </div>

      <div class="mt-4 rounded-xl bg-blue-50 p-4">
        <p><strong>Precio base:</strong> ${{ ventaGenerada.precioBase.toFixed(2) }}</p>
        <p><strong>Descuento:</strong> {{ (ventaGenerada.descuento * 100).toFixed(0) }}%</p>
        <p class="text-xl font-black text-blue-700">
          Total: ${{ ventaGenerada.total.toFixed(2) }}
        </p>
      </div>

      <div class="mt-4 rounded-xl bg-slate-50 p-4">
        <p class="font-bold">Código QR:</p>
        <p class="break-all font-mono text-xs">{{ ventaGenerada.boletos?.[0]?.CodigoQr }}</p>
        <p class="font-bold mt-2">Código de barras:</p>
        <p class="break-all font-mono text-xs">{{ ventaGenerada.boletos?.[0]?.CodigoBarras }}</p>
      </div>

      <div class="mt-5 flex gap-3 print:hidden">
        <button @click="imprimir" class="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">
          Imprimir boleto
        </button>
        <button @click="nuevaVenta" class="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700">
          Nueva venta
        </button>
      </div>
    </section>

    <template v-else>
      <div>
        <h1 class="text-2xl font-black text-slate-900">Venta presencial de boletos</h1>
        <p class="text-sm text-slate-500">Registra ventas reales en Supabase.</p>
      </div>

      <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
        {{ error }}
      </div>

      <div v-if="success" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
        {{ success }}
      </div>

      <section class="rounded-2xl bg-white p-5 shadow border">
        <h2 class="font-black mb-4">1. Buscar ruta</h2>

        <div class="grid gap-3 sm:grid-cols-3">
          <input v-model="filtros.origen" placeholder="Origen" class="rounded-xl border p-3" />
          <input v-model="filtros.destino" placeholder="Destino" class="rounded-xl border p-3" />
          <input v-model="filtros.fecha" type="date" class="rounded-xl border p-3" />
        </div>

        <p v-if="loading" class="mt-4 text-sm text-slate-500">Cargando rutas...</p>

        <div class="mt-4 grid gap-3">
          <article
            v-for="ruta in rutasFiltradas"
            :key="ruta.id"
            class="rounded-xl border p-4 flex flex-wrap justify-between gap-3"
            :class="rutaSeleccionada?.id === ruta.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'"
          >
            <div>
              <p class="font-black">{{ ruta.origen }} → {{ ruta.destino }}</p>
              <p class="text-sm text-slate-500">
                {{ ruta.fecha }} · {{ ruta.hora }} · {{ ruta.bus }} · {{ ruta.esDirecto ? 'Directa' : 'Con paradas' }}
              </p>
            </div>

            <button @click="seleccionarRuta(ruta)" class="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
              Seleccionar
            </button>
          </article>
        </div>
      </section>

      <section v-if="rutaSeleccionada" class="rounded-2xl bg-white p-5 shadow border">
        <h2 class="font-black mb-4">2. Destino y asiento</h2>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs font-bold text-slate-600">Destino</label>
            <select v-model="paradaDestinoId" class="mt-1 w-full rounded-xl border p-3">
              <option :value="null">{{ rutaSeleccionada.destino }} / Terminal final</option>
              <option
                v-for="parada in paradas"
                :key="parada.id"
                :value="parada.id"
                :disabled="rutaSeleccionada.esDirecto || !parada.permiteVenta"
              >
                {{ parada.ciudad }}
                {{ rutaSeleccionada.esDirecto ? '(bloqueada por ruta directa)' : !parada.permiteVenta ? '(no permite venta)' : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-600">Asiento disponible</label>
            <select v-model="asientoSeleccionadoId" class="mt-1 w-full rounded-xl border p-3">
              <option :value="null">Seleccione asiento</option>
              <option v-for="asiento in asientos" :key="asiento.Id" :value="asiento.Id">
                Asiento {{ asiento.NumeroAsiento }} · ${{ asiento.precioBase.toFixed(2) }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section v-if="rutaSeleccionada" class="rounded-2xl bg-white p-5 shadow border">
        <h2 class="font-black mb-4">3. Datos del pasajero</h2>

        <div class="grid gap-3 sm:grid-cols-2">
          <input v-model="pasajero.cedula" maxlength="10" placeholder="Cédula" class="rounded-xl border p-3" />
          <input v-model="pasajero.fechaNacimiento" type="date" class="rounded-xl border p-3" />
          <input v-model="pasajero.nombres" placeholder="Nombres" class="rounded-xl border p-3" />
          <input v-model="pasajero.apellidos" placeholder="Apellidos" class="rounded-xl border p-3" />

          <label class="flex items-center gap-2 rounded-xl border p-3">
            <input v-model="pasajero.discapacidad" type="checkbox" />
            Tiene discapacidad
          </label>

          <select v-model="pasajero.metodoPago" class="rounded-xl border p-3">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>
        </div>

        <div class="mt-4 rounded-xl bg-slate-50 p-4">
          <p>Edad calculada: <strong>{{ edad || '—' }}</strong></p>
          <p>Precio base: <strong>${{ precioBase.toFixed(2) }}</strong></p>
          <p>Descuento: <strong>{{ (porcentajeDescuento * 100).toFixed(0) }}%</strong></p>
          <p class="text-xl font-black text-blue-700">
            Total a pagar: ${{ precioFinal.toFixed(2) }}
          </p>
        </div>

        <div v-if="pasajero.metodoPago === 'Tarjeta'" class="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div v-if="!clientSecret" class="text-center">
             <button @click="iniciarPagoTarjeta" :disabled="stripeLoading" class="rounded-xl bg-blue-600 px-6 py-3 font-black text-white disabled:opacity-50">
               {{ stripeLoading ? 'Conectando...' : 'Pagar con Tarjeta' }}
             </button>
          </div>
          <div v-else>
             <StripePaymentForm 
               :client-secret="clientSecret" 
               :amount="precioFinal" 
               @success="confirmarVenta"
             />
          </div>
        </div>

        <button
          v-else
          @click="() => confirmarVenta()"
          :disabled="vendiendo"
          class="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-50"
        >
          {{ vendiendo ? 'Registrando...' : 'Confirmar venta presencial' }}
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
@media print {
  :global(aside),
  :global(header),
  .print\:hidden {
    display: none !important;
  }

  :global(main) {
    margin: 0 !important;
  }
}
</style>