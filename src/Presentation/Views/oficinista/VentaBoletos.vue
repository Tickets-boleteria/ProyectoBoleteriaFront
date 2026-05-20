<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useVentaDescuento } from '../../Composables/useVentaDescuento'

// Mock de rutas disponibles
interface RutaDisponible {
  id: number
  origen: string
  destino: string
  hora: string
  fecha: string
  cooperativa: string
  precioBase: number
  asientosLibres: number
  busPlaca: string
}

const rutasMock: RutaDisponible[] = [
  { id: 1, origen: 'Latacunga', destino: 'Quito',     hora: '06:00', fecha: '2026-05-20', cooperativa: 'Trans Latinos', precioBase: 2.50,  asientosLibres: 6,  busPlaca: 'TBA-0234' },
  { id: 2, origen: 'Latacunga', destino: 'Quito',     hora: '08:30', fecha: '2026-05-20', cooperativa: 'Trans Latinos', precioBase: 2.50,  asientosLibres: 22, busPlaca: 'TBA-0099' },
  { id: 3, origen: 'Latacunga', destino: 'Cuenca',    hora: '07:30', fecha: '2026-05-20', cooperativa: 'Trans Latinos', precioBase: 12.00, asientosLibres: 34, busPlaca: 'TBA-0099' },
  { id: 4, origen: 'Ambato',    destino: 'Guayaquil', hora: '21:00', fecha: '2026-05-20', cooperativa: 'Trans Latinos', precioBase: 9.50,  asientosLibres: 16, busPlaca: 'TBC-1192' },
]

// PASO 1: Búsqueda
const filtros = reactive({
  origen: '', destino: '', fecha: new Date().toISOString().slice(0, 10), hora: '',
})

const resultados = computed(() => rutasMock.filter(r => {
  return (!filtros.origen  || r.origen.toLowerCase().includes(filtros.origen.toLowerCase()))
      && (!filtros.destino || r.destino.toLowerCase().includes(filtros.destino.toLowerCase()))
      && (!filtros.fecha   || r.fecha === filtros.fecha)
      && (!filtros.hora    || r.hora >= filtros.hora)
}))

// PASO 2: Pasajero seleccionado
const rutaSeleccionada = ref<RutaDisponible | null>(null)

const {
  cedula, edad, tieneDiscapacidad, precioBase,
  origen, destino, resultado, errorMessage, calcular,
} = useVentaDescuento()

const pasajero = reactive({
  nombres: '', apellidos: '', telefono: '',
  tipoDescuento: 'ninguno' as 'ninguno' | 'nino' | 'discapacidad' | 'tercera_edad',
  cantidadBoletos: 1,
  metodoPago: 'efectivo' as 'efectivo' | 'transferencia' | 'tarjeta',
})

// derivar edad y tieneDiscapacidad desde tipoDescuento (UI más simple)
function aplicarTipoDescuento() {
  tieneDiscapacidad.value = pasajero.tipoDescuento === 'discapacidad'
  if (pasajero.tipoDescuento === 'nino')           edad.value = 7
  else if (pasajero.tipoDescuento === 'tercera_edad') edad.value = 70
  else if (edad.value === 7 || edad.value === 70) edad.value = 30
}

function seleccionarRuta(r: RutaDisponible) {
  rutaSeleccionada.value = r
  precioBase.value = r.precioBase
  origen.value = r.origen
  destino.value = r.destino
}

function calcularDescuento() {
  aplicarTipoDescuento()
  calcular()
}

// PASO 3: comprobante
const ventaConfirmada = ref<null | {
  codigo: string
  ruta: RutaDisponible
  pasajero: typeof pasajero
  precioFinal: number
  total: number
  fecha: string
}>(null)

function confirmarVenta() {
  if (!rutaSeleccionada.value) return
  if (!cedula.value || !pasajero.nombres || !pasajero.apellidos) {
    errorMessage.value = 'Completa los datos del pasajero antes de confirmar.'
    return
  }
  const precioFinal = resultado.value?.precioFinal ?? rutaSeleccionada.value.precioBase
  const total = precioFinal * pasajero.cantidadBoletos
  ventaConfirmada.value = {
    codigo: 'BOL-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    ruta: rutaSeleccionada.value,
    pasajero: { ...pasajero },
    precioFinal,
    total,
    fecha: new Date().toISOString(),
  }
}

function nuevaVenta() {
  ventaConfirmada.value = null
  rutaSeleccionada.value = null
  cedula.value = ''
  edad.value = null
  tieneDiscapacidad.value = false
  precioBase.value = null
  pasajero.nombres = ''; pasajero.apellidos = ''; pasajero.telefono = ''
  pasajero.tipoDescuento = 'ninguno'
  pasajero.cantidadBoletos = 1
  pasajero.metodoPago = 'efectivo'
}

function imprimir() { window.print() }
</script>

<template>
  <div class="space-y-6">
    <!-- ========== PASO 3: COMPROBANTE ========== -->
    <div v-if="ventaConfirmada" class="space-y-6">
      <div class="rounded-2xl bg-emerald-600 text-white p-6 shadow-2xl flex items-center gap-4">
        <span class="text-4xl">✓</span>
        <div>
          <p class="text-emerald-100 text-sm font-bold uppercase tracking-wider">Venta registrada</p>
          <h2 class="text-2xl font-black">Comprobante {{ ventaConfirmada.codigo }}</h2>
        </div>
      </div>

      <article class="rounded-2xl bg-white p-8 shadow-xl border border-slate-200 max-w-2xl">
        <div class="text-center pb-4 border-b-2 border-dashed border-slate-200 mb-4">
          <p class="font-black text-2xl text-slate-900">{{ ventaConfirmada.ruta.cooperativa }}</p>
          <p class="text-xs text-slate-500">Boletería Interprovincial · Comprobante de venta</p>
        </div>
        <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
          <dt class="font-bold text-slate-500">Código</dt>      <dd class="font-mono">{{ ventaConfirmada.codigo }}</dd>
          <dt class="font-bold text-slate-500">Fecha emisión</dt><dd>{{ new Date(ventaConfirmada.fecha).toLocaleString('es-EC') }}</dd>
          <dt class="font-bold text-slate-500">Pasajero</dt>    <dd>{{ ventaConfirmada.pasajero.nombres }} {{ ventaConfirmada.pasajero.apellidos }}</dd>
          <dt class="font-bold text-slate-500">Cédula</dt>      <dd>{{ cedula }}</dd>
          <dt class="font-bold text-slate-500">Ruta</dt>        <dd>{{ ventaConfirmada.ruta.origen }} → {{ ventaConfirmada.ruta.destino }}</dd>
          <dt class="font-bold text-slate-500">Salida</dt>      <dd>{{ ventaConfirmada.ruta.fecha }} · {{ ventaConfirmada.ruta.hora }}</dd>
          <dt class="font-bold text-slate-500">Bus</dt>         <dd>{{ ventaConfirmada.ruta.busPlaca }}</dd>
          <dt class="font-bold text-slate-500">Boletos</dt>     <dd>{{ ventaConfirmada.pasajero.cantidadBoletos }}</dd>
          <dt class="font-bold text-slate-500">Método pago</dt> <dd>{{ ventaConfirmada.pasajero.metodoPago }}</dd>
        </dl>
        <div class="rounded-xl bg-blue-50 p-4 mb-4 border border-blue-200">
          <div class="flex justify-between text-sm"><span>Precio unitario</span> <span class="font-bold">${{ ventaConfirmada.precioFinal.toFixed(2) }}</span></div>
          <div v-if="resultado && resultado.porcentajeDescuento > 0" class="flex justify-between text-sm text-emerald-700"><span>Descuento aplicado</span><span class="font-bold">{{ (resultado.porcentajeDescuento * 100).toFixed(0) }}%</span></div>
          <div class="flex justify-between text-lg mt-2 pt-2 border-t border-blue-200"><span class="font-bold">Total</span><span class="font-black text-blue-700">${{ ventaConfirmada.total.toFixed(2) }}</span></div>
        </div>
        <div class="flex gap-3">
          <button @click="imprimir" class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">🖨️ Imprimir</button>
          <button @click="nuevaVenta" class="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700 hover:bg-slate-200">Nueva venta</button>
        </div>
      </article>
    </div>

    <!-- ========== FLUJO DE VENTA ========== -->
    <template v-else>
      <div>
        <h2 class="text-2xl font-black text-slate-900">Venta de boletos</h2>
        <p class="text-slate-500 text-sm">Atiende al pasajero en 3 pasos: buscar, registrar y confirmar.</p>
      </div>

      <!-- Stepper visual -->
      <ol class="flex items-center gap-4 text-sm">
        <li class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full font-black"
            :class="rutaSeleccionada ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'">1</span>
          <span class="font-bold" :class="rutaSeleccionada ? 'text-emerald-600' : 'text-blue-700'">Buscar ruta</span>
        </li>
        <span class="text-slate-300">›</span>
        <li class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full font-black"
            :class="rutaSeleccionada ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'">2</span>
          <span class="font-bold" :class="rutaSeleccionada ? 'text-blue-700' : 'text-slate-400'">Registrar pasajero</span>
        </li>
        <span class="text-slate-300">›</span>
        <li class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full font-black bg-slate-200 text-slate-500">3</span>
          <span class="font-bold text-slate-400">Comprobante</span>
        </li>
      </ol>

      <!-- ===== PASO 1: BÚSQUEDA ===== -->
      <section v-if="!rutaSeleccionada" class="space-y-4">
        <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
          <h3 class="text-lg font-black text-slate-900 mb-4">Buscar disponibilidad</h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Origen</label>
              <input v-model="filtros.origen" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="Latacunga"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Destino</label>
              <input v-model="filtros.destino" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="Quito"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Fecha</label>
              <input v-model="filtros.fecha" type="date" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Hora desde</label>
              <input v-model="filtros.hora" type="time" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
          </div>
        </div>

        <div class="grid gap-3">
          <article v-for="r in resultados" :key="r.id"
            class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ r.cooperativa }}</p>
              <p class="text-xl font-black text-slate-900">{{ r.origen }} → {{ r.destino }}</p>
              <p class="text-sm text-slate-500">{{ r.fecha }} · Salida {{ r.hora }} · Bus {{ r.busPlaca }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-black text-blue-700">${{ r.precioBase.toFixed(2) }}</p>
              <p class="text-xs font-bold" :class="r.asientosLibres > 10 ? 'text-emerald-600' : r.asientosLibres > 0 ? 'text-amber-600' : 'text-red-600'">
                {{ r.asientosLibres > 0 ? r.asientosLibres + ' asientos libres' : 'Lleno' }}
              </p>
            </div>
            <button :disabled="r.asientosLibres === 0" @click="seleccionarRuta(r)"
              class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
              Seleccionar
            </button>
          </article>
          <div v-if="resultados.length === 0" class="rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
            No hay rutas disponibles con esos filtros. Ajusta la búsqueda.
          </div>
        </div>
      </section>

      <!-- ===== PASO 2: PASAJERO ===== -->
      <section v-else class="space-y-4">
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase text-blue-600 tracking-wider">Ruta seleccionada</p>
            <p class="font-black text-slate-900">{{ rutaSeleccionada.origen }} → {{ rutaSeleccionada.destino }} · {{ rutaSeleccionada.fecha }} · {{ rutaSeleccionada.hora }}</p>
          </div>
          <button @click="rutaSeleccionada = null" class="text-sm font-bold text-blue-700 underline underline-offset-4">Cambiar ruta</button>
        </div>

        <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
          <h3 class="text-lg font-black text-slate-900 mb-4">Datos del pasajero</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Cédula *</label>
              <input v-model="cedula" maxlength="10" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="1801234567"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Teléfono</label>
              <input v-model="pasajero.telefono" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="0991234567"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Nombres *</label>
              <input v-model="pasajero.nombres" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Apellidos *</label>
              <input v-model="pasajero.apellidos" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Número de boletos</label>
              <input v-model.number="pasajero.cantidadBoletos" type="number" min="1" max="10" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Método de pago</label>
              <select v-model="pasajero.metodoPago" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
              <label class="text-xs font-bold text-slate-700 mb-2 block">Descuento aplicable</label>
              <div class="grid gap-2 sm:grid-cols-4">
                <label v-for="opt in [
                  { v: 'ninguno', l: 'Ninguno', emoji: '🎫' },
                  { v: 'nino', l: 'Niño (< 12)', emoji: '🧒' },
                  { v: 'discapacidad', l: 'Discapacidad', emoji: '♿' },
                  { v: 'tercera_edad', l: 'Tercera edad', emoji: '🧓' },
                ]" :key="opt.v"
                  class="rounded-xl border-2 cursor-pointer flex items-center gap-2 p-3 transition-all"
                  :class="pasajero.tipoDescuento === opt.v ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'">
                  <input v-model="pasajero.tipoDescuento" type="radio" :value="opt.v" class="hidden"/>
                  <span class="text-xl">{{ opt.emoji }}</span>
                  <span class="text-sm font-bold">{{ opt.l }}</span>
                </label>
              </div>
            </div>
          </div>

          <button @click="calcularDescuento" class="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700">
            Calcular precio final
          </button>

          <div v-if="errorMessage" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{{ errorMessage }}</div>

          <div v-if="resultado" class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p class="font-bold text-emerald-700">Categoría: {{ resultado.categoria }}</p>
            <p class="text-sm">Descuento: <strong>{{ (resultado.porcentajeDescuento * 100).toFixed(0) }}%</strong> · Ahorro: <strong>${{ resultado.montoDescuento.toFixed(2) }}</strong></p>
            <p class="text-lg mt-2">Precio final por boleto: <strong class="text-emerald-700">${{ resultado.precioFinal.toFixed(2) }}</strong></p>
            <p class="text-xl mt-1">Total ({{ pasajero.cantidadBoletos }} boletos): <strong class="text-emerald-700">${{ (resultado.precioFinal * pasajero.cantidadBoletos).toFixed(2) }}</strong></p>
          </div>

          <div class="mt-5 flex gap-3">
            <button @click="confirmarVenta" :disabled="!resultado"
              class="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
              Confirmar venta y generar comprobante
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
@media print {
  :global(aside), :global(header) { display: none !important; }
  :global(main) { margin: 0 !important; }
}
</style>
