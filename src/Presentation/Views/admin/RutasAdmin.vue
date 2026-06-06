<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { useRutas } from '../../Composables/useRutas'
import { useUiStore } from '../../Store/uiStore'
import { EstadoRuta, getEstadoRutaLabel } from '../../../Domain/Constants/EstadosSistema'
import PaginationControls from '../../Components/PaginationControls.vue'
import PremiumSelect from '../../Components/PremiumSelect.vue'

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

// Estados para modales
const mostrarCrearModal = ref(false)

// Paginación
const currentPage = ref(1)
const itemsPerPage = ref(8)
const totalItems = computed(() => rutasFiltradas.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

const pagedRutas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return (rutasFiltradas.value || []).slice(start, end)
})

watch([filtroEstado, filtroFecha, filtroTexto], () => {
  currentPage.value = 1
})

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

const opcionesEstado = computed(() => [
  { label: 'Todos los Estados', value: 'Todas' },
  ...ESTADOS_RUTA.map(e => ({ label: getEstadoRutaLabel(e), value: e }))
])

const opcionesFrecuencia = computed(() => 
  (frecuencias.value || []).map(f => ({
    label: `${f.CiudadOrigen} → ${f.CiudadDestino}`,
    value: f.Id,
    description: `Salida: ${f.HoraSalida}`
  }))
)

const opcionesBus = computed(() => 
  (busesDisponibles.value || []).map(b => ({
    label: `Disco ${b.Numero}`,
    value: b.Id,
    description: `Placa: ${b.Placa} · ${b.TotalAsientos} Asientos`,
    icon: b.Estructura === 'DosPisos' ? '🚍' : '🚌'
  }))
)

const opcionesChofer = computed(() => 
  (choferes.value || []).map(c => ({
    label: `${c.Nombres} ${c.Apellidos}`,
    value: c.Cedula,
    description: `Cédula: ${c.Cedula}`
  }))
)

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

function abrirCrearModal() {
  resetNuevaRuta()
  mostrarCrearModal.value = true
}

function resetNuevaRuta() {
  nuevaRuta.value.frecuenciaId = ''
  nuevaRuta.value.busId = ''
  nuevaRuta.value.fecha = fechaHoy
  nuevaRuta.value.choferId = ''
}

async function handleRegistrar() {
  if (!nuevaRuta.value.frecuenciaId || !nuevaRuta.value.busId || !nuevaRuta.value.fecha) {
    uiStore.showAlert({ title: 'Validación', message: 'Selecciona frecuencia, bus y fecha.', type: 'warning' })
    return
  }
  await registrarRuta()
  if (!error.value) {
    uiStore.showAlert({ title: 'Ruta Creada', message: 'El trayecto ha sido programado correctamente.', type: 'success' })
    mostrarCrearModal.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado Premium -->
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Control de Operaciones</h1>
          <p class="mt-2 text-slate-400 font-medium">Programación diaria y despacho de unidades en tiempo real.</p>
        </div>
        <button @click="abrirCrearModal" class="btn-primary">
          <span class="text-2xl">+</span>
          <span>Programar Viaje</span>
        </button>
      </div>
    </header>

    <!-- Tabla Listado Premium -->
    <section class="card-premium">
      <div class="p-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-50/30">
        <div>
          <h2 class="text-sm font-black uppercase tracking-widest text-slate-400">Despachos Registrados</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Filtro de Estado -->
          <PremiumSelect
            v-model="filtroEstado"
            :options="opcionesEstado"
            container-class="w-48"
          />

          <input v-model="filtroFecha" type="date" class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">🔍</span>
            <input v-model="filtroTexto" type="text" placeholder="Buscar unidad o destino..." 
              class="rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all w-64" />
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th class="px-8 py-5">Ruta / Trayecto</th>
              <th class="px-8 py-5">Unidad Asignada</th>
              <th class="px-8 py-5 text-center">Estado Operativo</th>
              <th class="px-8 py-5 text-right">Despacho</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="ruta in pagedRutas" :key="ruta.Id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="px-8 py-6">
                <div class="font-black text-slate-900 text-base leading-tight">
                  {{ ruta.Frecuencias?.CiudadOrigen }} 
                  <span class="text-slate-300 mx-1">→</span>
                  {{ ruta.Frecuencias?.CiudadDestino }}
                </div>
                <div class="flex items-center gap-2 mt-2">
                   <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">{{ ruta.Frecuencias?.HoraSalida }}</span>
                   <span v-if="ruta.ObservacionChofer?.includes('INCIDENTE')" class="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-black uppercase">🚨 Incidente</span>
                   <span v-if="ruta.ObservacionChofer?.includes('Transbordo')" class="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-black uppercase">🔄 Transbordo</span>
                </div>
              </td>
              <td class="px-8 py-6">
                <div class="flex items-center gap-3">
                  <span class="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs">
                    {{ ruta.Buses?.Numero || ruta.BusId }}
                  </span>
                  <div>
                    <p class="font-bold text-slate-700 text-sm tracking-tight">{{ nombreChofer(ruta.ChoferId) }}</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ ruta.Buses?.Placa || 'S/P' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6 text-center">
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-tight shadow-sm"
                  :class="estadoBadgeClass(ruta.Estado)">
                  <div class="h-1.5 w-1.5 rounded-full" :class="{
                    'bg-slate-500': ruta.Estado === 'Programada',
                    'bg-blue-500': ruta.Estado === 'Habilitada',
                    'bg-amber-500': ruta.Estado === 'EnCurso',
                    'bg-emerald-500': ruta.Estado === 'Completada',
                  }"></div>
                  {{ getEstadoRutaLabel(ruta.Estado) }}
                </span>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex justify-end gap-2">
                  <button v-if="puedeAvanzar(ruta.Estado)" @click="handleAvanzar(ruta)" 
                    class="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                    {{ accionPrincipalLabel(ruta.Estado) }}
                  </button>
                  <button v-if="ruta.Estado === 'Programada'" @click="handleAbrirVenta(ruta)" 
                    class="px-5 py-2.5 rounded-xl border-2 border-blue-50 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-50 transition-all">
                    Abrir Venta
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="pagedRutas.length === 0">
              <td colspan="4" class="py-20 text-center">
                <p class="text-4xl mb-4">🔍</p>
                <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin operaciones registradas para esta fecha</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-6 bg-slate-50/30 border-t border-slate-50">
        <div class="flex items-center gap-3 mb-4">
           <PremiumSelect
             v-model="itemsPerPage"
             :options="opcionesFilas"
             label="Ver"
             container-class="w-32"
           />
        </div>
        <PaginationControls
          v-if="totalItems > itemsPerPage"
          :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
          :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
          @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
        />
      </div>
    </section>

    <!-- Modal de Programación -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="mostrarCrearModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="mostrarCrearModal = false"></div>
          <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div class="bg-slate-900 p-8 text-white">
              <h3 class="text-2xl font-black tracking-tight">Programar Nuevo Viaje</h3>
              <p class="text-slate-400 text-xs mt-1 font-medium">Asigna una unidad y un chofer a una frecuencia aprobada.</p>
            </div>
            
            <form @submit.prevent="handleRegistrar" class="p-8 space-y-6">
              <div v-if="error" class="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-black text-rose-600 uppercase tracking-widest">{{ error }}</div>
              
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="nuevaRuta.frecuenciaId"
                    :options="opcionesFrecuencia"
                    label="Frecuencia Base *"
                    placeholder="Seleccione Trayecto"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Salida *</label>
                  <input v-model="nuevaRuta.fecha" type="date" :min="fechaHoy" class="input-premium" :class="{'border-rose-300 bg-rose-50': !isDiaValido}" required />
                  <p v-if="!isDiaValido" class="text-[9px] text-rose-600 font-bold uppercase mt-1 tracking-tighter">La frecuencia no opera este día.</p>
                </div>

                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="nuevaRuta.busId"
                    :options="opcionesBus"
                    label="Unidad Disponible *"
                    placeholder="Seleccione Bus"
                    :disabled="!isDiaValido"
                  />
                </div>

                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="nuevaRuta.choferId"
                    :options="opcionesChofer"
                    label="Chofer Asignado"
                    placeholder="Sin asignar"
                    :disabled="!isDiaValido"
                  />
                </div>
              </div>

              <div class="flex gap-3 pt-6 border-t border-slate-50">
                <button type="submit" :disabled="loading || !isDiaValido" class="btn-primary flex-1">
                  {{ loading ? '...' : '✓ Programar Despacho' }}
                </button>
                <button type="button" @click="mostrarCrearModal = false" class="px-8 py-3 rounded-2xl bg-slate-50 font-black text-slate-400 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from { opacity: 0; filter: blur(4px); transform: scale(0.95); }
.modal-leave-to { opacity: 0; transform: scale(1.02); }
</style>
