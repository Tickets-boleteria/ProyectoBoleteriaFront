<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

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
  duracionMin: number
}

const rutasMock: RutaDisponible[] = [
  { id: 1, origen: 'Latacunga', destino: 'Quito',     hora: '06:00', fecha: '2026-05-20', cooperativa: 'Trans Latinos',  precioBase: 2.50,  asientosLibres: 6,  busPlaca: 'TBA-0234', duracionMin: 90 },
  { id: 2, origen: 'Latacunga', destino: 'Quito',     hora: '08:30', fecha: '2026-05-20', cooperativa: 'Trans Latinos',  precioBase: 2.50,  asientosLibres: 22, busPlaca: 'TBA-0099', duracionMin: 90 },
  { id: 3, origen: 'Latacunga', destino: 'Cuenca',    hora: '07:30', fecha: '2026-05-20', cooperativa: 'Trans Latinos',  precioBase: 12.00, asientosLibres: 34, busPlaca: 'TBA-0099', duracionMin: 480 },
  { id: 4, origen: 'Ambato',    destino: 'Guayaquil', hora: '21:00', fecha: '2026-05-20', cooperativa: 'Trans Latinos',  precioBase: 9.50,  asientosLibres: 16, busPlaca: 'TBC-1192', duracionMin: 360 },
]

const filtros = reactive({
  origen: '', destino: '', fecha: new Date().toISOString().slice(0, 10),
})

const resultados = computed(() => rutasMock.filter(r =>
  (!filtros.origen  || r.origen.toLowerCase().includes(filtros.origen.toLowerCase())) &&
  (!filtros.destino || r.destino.toLowerCase().includes(filtros.destino.toLowerCase())) &&
  (!filtros.fecha   || r.fecha === filtros.fecha)
))

// Paso 2: selección
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const asientosSeleccionados = ref<string[]>([])

// Map ficticio de asientos: 11 filas x 4 cols, algunos ocupados
const asientosLayout = computed(() => {
  if (!rutaSeleccionada.value) return []
  const total = 44
  const ocupados = new Set<number>(
    Array.from({ length: total - rutaSeleccionada.value.asientosLibres }, (_, i) => i + 1)
  )
  return Array.from({ length: total }, (_, i) => ({
    numero: (i + 1).toString().padStart(2, '0'),
    ocupado: ocupados.has(i + 1),
  }))
})

function toggleAsiento(a: { numero: string; ocupado: boolean }) {
  if (a.ocupado) return
  if (asientosSeleccionados.value.includes(a.numero)) {
    asientosSeleccionados.value = asientosSeleccionados.value.filter(n => n !== a.numero)
  } else {
    asientosSeleccionados.value.push(a.numero)
  }
}

// Paso 3: pago
const captura = ref<string | null>(null)
const referenciaPago = ref('')
const mostrarPago = ref(false)

function onCapturaUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { captura.value = ev.target?.result as string }
  reader.readAsDataURL(file)
}

// Paso 4: confirmación
const compraConfirmada = ref<null | {
  codigo: string
  ruta: RutaDisponible
  asientos: string[]
  total: number
  captura: string | null
  referencia: string
}>(null)

function confirmarCompra() {
  if (!rutaSeleccionada.value || asientosSeleccionados.value.length === 0) return
  if (!captura.value) {
    alert('Por favor adjunta la captura del pago para continuar.')
    return
  }
  compraConfirmada.value = {
    codigo: 'BOL-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    ruta: rutaSeleccionada.value,
    asientos: [...asientosSeleccionados.value],
    total: rutaSeleccionada.value.precioBase * asientosSeleccionados.value.length,
    captura: captura.value,
    referencia: referenciaPago.value,
  }
}

function nuevaBusqueda() {
  compraConfirmada.value = null
  rutaSeleccionada.value = null
  asientosSeleccionados.value = []
  captura.value = null
  referenciaPago.value = ''
  mostrarPago.value = false
}

const formatoDuracion = (min: number) => {
  const h = Math.floor(min / 60); const m = min % 60
  return h ? `${h}h ${m}m` : `${m}m`
}
</script>

<template>
  <div class="space-y-6">
    <!-- ===== CONFIRMACIÓN ===== -->
    <div v-if="compraConfirmada" class="space-y-6">
      <div class="rounded-2xl bg-emerald-600 text-white p-6 shadow-2xl flex items-center gap-4">
        <span class="text-4xl">🎉</span>
        <div>
          <p class="text-emerald-100 text-sm font-bold uppercase tracking-wider">Compra recibida</p>
          <h2 class="text-2xl font-black">Tu reserva está pendiente de verificación</h2>
        </div>
      </div>
      <article class="rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <p class="font-bold text-slate-700">Código: <span class="font-mono text-blue-700">{{ compraConfirmada.codigo }}</span></p>
        <p class="text-sm text-slate-500 mt-1">El oficinista validará el comprobante y tu boleto con QR aparecerá en
          <router-link to="/mis-boletos" class="font-bold text-blue-700 underline">Mis boletos</router-link>.</p>
        <dl class="grid grid-cols-2 gap-3 text-sm mt-4">
          <dt class="font-bold text-slate-500">Ruta</dt> <dd>{{ compraConfirmada.ruta.origen }} → {{ compraConfirmada.ruta.destino }}</dd>
          <dt class="font-bold text-slate-500">Fecha</dt><dd>{{ compraConfirmada.ruta.fecha }} · {{ compraConfirmada.ruta.hora }}</dd>
          <dt class="font-bold text-slate-500">Asientos</dt><dd>{{ compraConfirmada.asientos.join(', ') }}</dd>
          <dt class="font-bold text-slate-500">Total pagado</dt><dd class="font-black text-blue-700">${{ compraConfirmada.total.toFixed(2) }}</dd>
        </dl>
      </article>
      <button @click="nuevaBusqueda" class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        Buscar otra ruta
      </button>
    </div>

    <template v-else>
      <div>
        <h2 class="text-2xl font-black text-slate-900">Buscar rutas</h2>
        <p class="text-slate-500 text-sm">Encuentra tu viaje y reserva tus asientos en línea.</p>
      </div>

      <!-- ===== Filtros ===== -->
      <section v-if="!rutaSeleccionada" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
        <div class="grid gap-4 sm:grid-cols-3">
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
        </div>
      </section>

      <!-- ===== Resultados ===== -->
      <section v-if="!rutaSeleccionada" class="grid gap-3">
        <article v-for="r in resultados" :key="r.id"
          class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ r.cooperativa }}</p>
              <p class="text-xl font-black text-slate-900">{{ r.origen }} → {{ r.destino }}</p>
              <p class="text-sm text-slate-500">{{ r.fecha }} · Sale {{ r.hora }} · Duración aprox. {{ formatoDuracion(r.duracionMin) }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-black text-blue-700">${{ r.precioBase.toFixed(2) }}</p>
              <p class="text-xs font-bold" :class="r.asientosLibres > 10 ? 'text-emerald-600' : r.asientosLibres > 0 ? 'text-amber-600' : 'text-red-600'">
                {{ r.asientosLibres > 0 ? r.asientosLibres + ' asientos libres' : 'Lleno' }}
              </p>
            </div>
            <button :disabled="r.asientosLibres === 0" @click="rutaSeleccionada = r"
              class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
              Elegir asientos
            </button>
          </div>
        </article>
        <div v-if="resultados.length === 0" class="rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
          No hay rutas con esos filtros. Ajusta la búsqueda.
        </div>
      </section>

      <!-- ===== Selección de asientos y pago ===== -->
      <section v-else class="space-y-6">
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase text-blue-600 tracking-wider">Ruta elegida</p>
            <p class="font-black text-slate-900">{{ rutaSeleccionada.origen }} → {{ rutaSeleccionada.destino }} · {{ rutaSeleccionada.fecha }} · {{ rutaSeleccionada.hora }}</p>
          </div>
          <button @click="rutaSeleccionada = null; asientosSeleccionados = []" class="text-sm font-bold text-blue-700 underline underline-offset-4">Cambiar ruta</button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
            <h3 class="text-lg font-black text-slate-900 mb-4">Selecciona tus asientos</h3>
            <div class="flex items-center gap-4 text-xs mb-4">
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-white border-2 border-slate-300"></span>Libre</div>
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-blue-600"></span>Elegido</div>
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-slate-300"></span>Ocupado</div>
            </div>
            <div class="rounded-xl bg-slate-100 p-4 max-w-md mx-auto">
              <div class="text-center text-xs text-slate-500 mb-3 pb-2 border-b border-slate-200">⬆ Frente del bus</div>
              <div class="grid grid-cols-5 gap-2">
                <template v-for="(a, idx) in asientosLayout" :key="a.numero">
                  <button @click="toggleAsiento(a)" :disabled="a.ocupado"
                    class="aspect-square rounded-lg text-xs font-bold transition-all"
                    :class="a.ocupado
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : asientosSeleccionados.includes(a.numero)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border-2 border-slate-300 hover:border-blue-500'">
                    {{ a.numero }}
                  </button>
                  <div v-if="idx % 4 === 1" class="aspect-square"></div>
                </template>
              </div>
            </div>
          </div>

          <aside class="space-y-4">
            <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
              <h3 class="font-black text-slate-900 mb-3">Resumen</h3>
              <p class="text-sm text-slate-600 mb-1">Asientos: <strong>{{ asientosSeleccionados.join(', ') || '—' }}</strong></p>
              <p class="text-sm text-slate-600 mb-3">Cantidad: <strong>{{ asientosSeleccionados.length }}</strong></p>
              <div class="border-t border-slate-200 pt-3">
                <div class="flex justify-between text-sm"><span>Subtotal</span><span class="font-bold">${{ (rutaSeleccionada.precioBase * asientosSeleccionados.length).toFixed(2) }}</span></div>
                <div class="flex justify-between text-lg mt-1"><span class="font-bold">Total</span><span class="font-black text-blue-700">${{ (rutaSeleccionada.precioBase * asientosSeleccionados.length).toFixed(2) }}</span></div>
              </div>
              <button :disabled="asientosSeleccionados.length === 0" @click="mostrarPago = true"
                class="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
                Ir a pagar
              </button>
            </div>

            <!-- Datos bancarios -->
            <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
              <h4 class="font-bold text-slate-900 mb-2 text-sm">Datos para transferencia</h4>
              <p class="text-xs text-slate-600">Banco Pichincha · Cta. Cte. 2100123456</p>
              <p class="text-xs text-slate-600">RUC 1891234567001 · Trans Latinos</p>
            </div>
          </aside>
        </div>

        <!-- ===== Pago ===== -->
        <section v-if="mostrarPago" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
          <h3 class="text-lg font-black text-slate-900 mb-4">Adjunta tu comprobante de pago</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Referencia / número de transacción</label>
              <input v-model="referenciaPago" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="000123456"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Captura del pago (imagen)</label>
              <input type="file" accept="image/*" @change="onCapturaUpload" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 text-sm"/>
            </div>
          </div>
          <div v-if="captura" class="mt-4">
            <p class="text-xs font-bold text-slate-700 mb-2">Vista previa:</p>
            <img :src="captura" alt="Captura pago" class="rounded-xl border border-slate-200 max-h-64"/>
          </div>
          <button @click="confirmarCompra"
            class="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700">
            Confirmar compra
          </button>
        </section>
      </section>
    </template>
  </div>
</template>
