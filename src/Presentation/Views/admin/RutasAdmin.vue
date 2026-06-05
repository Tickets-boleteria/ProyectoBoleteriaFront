<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useRutas } from '../../Composables/useRutas'
import { useUiStore } from '../../Store/uiStore'
import { EstadoRuta, getEstadoRutaLabel } from '../../../Domain/Constants/EstadosSistema'
import PaginationControls from '../../Components/PaginationControls.vue'

const uiStore = useUiStore()
const {
  ESTADOS_RUTA,
  rutasFiltradas,
  resumenEstados,
  busesDisponibles,
  frecuencias,
  choferes,
  nuevaRuta,
  filtroEstado,
  filtroFecha,
  filtroTexto,
  loading,
  error,
  success,
  cargarTodo,
  cargarBusesDisponibles,
  registrarRuta,
  avanzarEstadoRuta,
  cambiarEstadoRuta,
  finalizarRuta,
} = useRutas()

// Paginación
const currentPage = ref(1)
const itemsPerPage = 8
const totalItems = computed(() => rutasFiltradas.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

const pagedRutas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return rutasFiltradas.value.slice(start, end)
})

watch([filtroEstado, filtroFecha, filtroTexto], () => {
  currentPage.value = 1
})

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

const fechaHoy = new Date().toISOString().split('T')[0];

const selectedFrecuencia = computed(() => {
  return frecuencias.value.find(f => f.Id === Number(nuevaRuta.value.frecuenciaId));
});

const isDiaValido = computed(() => {
  if (!nuevaRuta.value.fecha || !selectedFrecuencia.value || !selectedFrecuencia.value.DiasOperacion || selectedFrecuencia.value.DiasOperacion.length === 0) return true;
  
  const d = new Date(nuevaRuta.value.fecha + 'T12:00:00');
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaElegido = diasSemana[d.getDay()];

  const normalizeDay = (day: string) => day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const diaElegidoNorm = normalizeDay(diaElegido);

  return selectedFrecuencia.value.DiasOperacion.some((dia: string) => normalizeDay(dia) === diaElegidoNorm);
});

watch(
  () => nuevaRuta.value.fecha,
  async (fecha) => {
    await cargarBusesDisponibles(fecha)
  }
)

function estadoBadgeClass(estado: EstadoRuta) {
  const classes: Record<EstadoRuta, string> = {
    Programada: 'bg-slate-100 text-slate-700 border-slate-200',
    Habilitada: 'bg-blue-100 text-blue-700 border-blue-200',
    EnCurso: 'bg-amber-100 text-amber-700 border-amber-200',
    Completada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  return classes[estado]
}

function nombreChofer(cedula?: string | null) {
  if (!cedula) return 'Sin asignar'
  const chofer = choferes.value.find((item: any) => String(item.Cedula) === String(cedula))
  if (!chofer) return cedula
  return `${chofer.Nombres} ${chofer.Apellidos || ''}`
}

function accionPrincipalLabel(estado: EstadoRuta) {
  const labels: Record<EstadoRuta, string> = {
    Programada: 'Habilitar',
    Habilitada: 'Iniciar viaje',
    EnCurso: 'Finalizar viaje',
    Completada: 'Completada',
  }
  return labels[estado]
}

function puedeAvanzar(estado: EstadoRuta) {
  return estado !== 'Completada'
}

async function handleAvanzar(ruta: any) {
  const labels: Record<string, string> = {
    Programada: '¿Deseas habilitar esta ruta para la venta de boletos?',
    Habilitada: '¿Confirmas el inicio del viaje? El bus pasará a estado VIAJANDO.',
    EnCurso: '¿Confirmas que el viaje ha finalizado con éxito?',
  }
  
  const confirm = await uiStore.showConfirm({
    title: 'Control de Operación',
    message: labels[ruta.Estado] || '¿Confirmas esta acción?',
    type: 'info'
  })
  
  if (confirm) {
    if (ruta.Estado === 'EnCurso') {
      await finalizarRuta(ruta)
    } else {
      await avanzarEstadoRuta(ruta)
    }
  }
}

async function handleAbrirVenta(ruta: any) {
  const confirm = await uiStore.showConfirm({
    title: 'Abrir Venta',
    message: '¿Habilitar inmediatamente la venta de boletos para esta unidad?',
    type: 'success'
  })
  if (confirm) await cambiarEstadoRuta(ruta, 'Habilitada')
}

async function handleRegistrar() {
  if (!nuevaRuta.value.frecuenciaId || !nuevaRuta.value.busId || !nuevaRuta.value.fecha) {
    uiStore.showAlert({ title: 'Validación', message: 'Selecciona frecuencia, bus y fecha.', type: 'warning' })
    return
  }
  await registrarRuta()
  if (!error.value) {
    uiStore.showAlert({ title: 'Ruta Creada', message: 'El trayecto ha sido programado correctamente.', type: 'success' })
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">Control de rutas</h1>
      <p class="mt-2 text-sm text-slate-300">Administra las rutas operativas y el flujo de los buses.</p>
    </section>

    <!-- Resumen de Estados -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        v-for="item in resumenEstados" :key="item.estado"
        @click="filtroEstado = item.estado"
        class="rounded-2xl border p-5 text-left transition-all active:scale-95"
        :class="filtroEstado === item.estado ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'"
      >
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ getEstadoRutaLabel(item.estado) }}</p>
        <p class="mt-2 text-3xl font-black text-slate-900">{{ item.total }}</p>
      </button>
    </section>

    <!-- Formulario Crear -->
    <section class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-5">Programar Nuevo Viaje</h2>
      <form @submit.prevent="handleRegistrar" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div v-if="error" class="md:col-span-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-700">{{ error }}</div>
        
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Frecuencia</label>
          <select v-model="nuevaRuta.frecuenciaId" class="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" required>
            <option value="">Seleccione</option>
            <option v-for="f in frecuencias" :key="f.Id" :value="f.Id">{{ f.CiudadOrigen }} → {{ f.CiudadDestino }} ({{ f.HoraSalida }})</option>
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Fecha</label>
          <input v-model="nuevaRuta.fecha" type="date" :min="fechaHoy" class="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" :class="{'border-red-500 bg-red-50': !isDiaValido}" required />
        </div>

        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Bus Disponible</label>
          <select v-model="nuevaRuta.busId" class="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" :disabled="!isDiaValido" required>
            <option value="">Seleccione</option>
            <option v-for="bus in busesDisponibles" :key="bus.Id" :value="bus.Id">Unidad {{ bus.Numero }} ({{ bus.Placa }})</option>
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Chofer</label>
          <select v-model="nuevaRuta.choferId" class="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" :disabled="!isDiaValido">
            <option value="">Sin asignar</option>
            <option v-for="c in choferes" :key="c.Cedula" :value="c.Cedula">{{ c.Nombres }} {{ c.Apellidos }}</option>
          </select>
        </div>

        <div class="flex items-end">
          <button type="submit" :disabled="loading || !isDiaValido" class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:bg-slate-200 transition-all active:scale-95">
            {{ loading ? '...' : 'Programar' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Tabla Listado -->
    <section class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">Rutas Registradas</h2>
          <p class="text-xs text-slate-400 mt-1 font-bold">Total: {{ totalItems }} registros filtrados</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <input v-model="filtroFecha" type="date" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50" />
          <input v-model="filtroTexto" type="text" placeholder="Buscar bus o destino..." class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
            <tr>
              <th class="py-4 px-6 text-left">Ruta / Trayecto</th>
              <th class="py-4 px-6 text-left">Unidad</th>
              <th class="py-4 px-6 text-left">Estado</th>
              <th class="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="ruta in pagedRutas" :key="ruta.Id" class="hover:bg-slate-50/50 transition-colors">
              <td class="py-4 px-6">
                <div class="font-black text-slate-900">{{ ruta.Frecuencias?.CiudadOrigen }} → {{ ruta.Frecuencias?.CiudadDestino }}</div>
                <div class="flex items-center gap-2 mt-1">
                   <span class="text-[10px] font-bold text-blue-500 uppercase">{{ ruta.Frecuencias?.HoraSalida }}</span>
                   <span v-if="ruta.ObservacionChofer?.includes('INCIDENTE')" class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-black uppercase">🚨 Incidente</span>
                   <span v-if="ruta.ObservacionChofer?.includes('Transbordo')" class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black uppercase">🔄 Transbordo</span>
                </div>
              </td>
              <td class="py-4 px-6">
                <div class="font-bold text-slate-700">Unidad {{ ruta.Buses?.Numero || ruta.BusId }}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase">{{ nombreChofer(ruta.ChoferId) }}</div>
              </td>
              <td class="py-4 px-6">
                <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight" :class="estadoBadgeClass(ruta.Estado)">
                  {{ getEstadoRutaLabel(ruta.Estado) }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                  <button v-if="puedeAvanzar(ruta.Estado)" @click="handleAvanzar(ruta)" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                    {{ accionPrincipalLabel(ruta.Estado) }}
                  </button>
                  <button v-if="ruta.Estado === 'Programada'" @click="handleAbrirVenta(ruta)" class="px-4 py-2 rounded-xl border-2 border-blue-100 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-50 transition-all">
                    Abrir Venta
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="pagedRutas.length === 0">
              <td colspan="4" class="py-12 text-center text-slate-400 font-bold">No se encontraron rutas para los criterios seleccionados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControls
        v-if="totalItems > itemsPerPage"
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        :items-per-page="itemsPerPage"
        :has-prev-page="currentPage > 1"
        :has-next-page="currentPage < totalPages"
        @prev="handlePrevPage"
        @next="handleNextPage"
        @set-page="handleSetPage"
      />
    </section>
  </div>
</template>
