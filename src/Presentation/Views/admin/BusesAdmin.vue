<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBuses } from '../../Composables/useBuses';
import { useUiStore } from '../../Store/uiStore';
import EditarBusModal from '../../Components/EditarBusModal.vue';
import ReportarIncidenteModal from '../../Components/ReportarIncidenteModal.vue';
import PaginationControls from '../../Components/PaginationControls.vue';
import PremiumSelect from '../../Components/PremiumSelect.vue';

const { buses, nuevoBus, loading, error, registrarBus, guardarBus, reactivarBus } = useBuses();
const uiStore = useUiStore();

// Estados para los modales
const mostrarCrearModal = ref(false);
const mostrarEditarModal = ref(false);
const mostrarIncidenteModal = ref(false);
const busSeleccionado = ref<any | null>(null);

// Filtros
const busqueda = ref('');
const filtroEstado = ref('Todos');
const filtroConfiguracion = ref('Todas');

// Paginación
const currentPage = ref(1);
const itemsPerPage = ref(8);

const opcionesEstado = [
  { label: 'Todos los estados', value: 'Todos' },
  { label: 'Activo / Disponible', value: 'Activo', icon: '🟢' },
  { label: 'En Mantenimiento', value: 'EnMantenimiento', icon: '🟠' },
  { label: 'En Viaje', value: 'Viajando', icon: '🚌' },
  { label: 'Inactivo / Fuera', value: 'Inactivo', icon: '🔴' }
];

const opcionesFiltroConfiguracion = [
  { label: 'Todas las estructuras', value: 'Todas' },
  { label: 'Un Piso (Estándar)', value: 'UnPiso', icon: '🚌' },
  { label: 'Dos Pisos (DD)', value: 'DosPisos', icon: '🚍' }
];

const busesFiltrados = computed(() => {
  return (buses.value || []).filter(bus => {
    const q = busqueda.value.toLowerCase().trim();
    const matchBusqueda = !q || 
      String(bus.numero || '').toLowerCase().includes(q) || 
      String(bus.placa || '').toLowerCase().includes(q);
      
    const matchEstado = filtroEstado.value === 'Todos' || bus.estado === filtroEstado.value;
    const matchConfig = filtroConfiguracion.value === 'Todas' || bus.estructura === filtroConfiguracion.value;
    
    return matchBusqueda && matchEstado && matchConfig;
  });
});

const totalItems = computed(() => busesFiltrados.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value));

const pagedBuses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return busesFiltrados.value.slice(start, end);
});

watch([busqueda, filtroEstado, filtroConfiguracion, itemsPerPage], () => {
  currentPage.value = 1;
});

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const handleSetPage = (p: number) => { currentPage.value = p; };

const opcionesEstructura = [
  { label: 'Autobús de Un Piso (Estándar)', value: 'UnPiso', icon: '🚌' },
  { label: 'Autobús de Dos Pisos (Double Decker)', value: 'DosPisos', icon: '🚍' }
]

const opcionesFilas = [
  { label: '5 filas', value: 5 },
  { label: '8 filas', value: 8 },
  { label: '20 filas', value: 20 }
]

// Abrir modal de creación
function abrirCrearModal() {
  resetNuevoBus();
  mostrarCrearModal.value = true;
}

function resetNuevoBus() {
  nuevoBus.value.numero = '';
  nuevoBus.value.placa = '';
  nuevoBus.value.totalAsientos = 40;
  nuevoBus.value.estructura = 'UnPiso';
}

// Abrir modal de edición
function abrirEditarModal(bus: any) {
  busSeleccionado.value = bus;
  mostrarEditarModal.value = true;
}

// Abrir modal de incidentes
function abrirIncidenteModal(bus: any) {
  busSeleccionado.value = bus;
  mostrarIncidenteModal.value = true;
}

// Reactivar bus
async function handleReactivarBus(bus: any) {
  try {
    await reactivarBus(bus.id);
    uiStore.showAlert({
      title: 'Reactivado',
      message: `El bus ${bus.numero} está nuevamente activo.`,
      type: 'success'
    });
  } catch (err: any) {
    uiStore.showAlert({
      title: 'Error',
      message: err.message || 'No se pudo reactivar el bus.',
      type: 'error'
    });
  }
}

// Guardar cambios del modal de edición
async function handleGuardarBus(busData: any) {
  await guardarBus(busData);
  uiStore.showAlert({
    title: 'Éxito',
    message: 'La información del bus ha sido actualizada correctamente.',
    type: 'success'
  });
  mostrarEditarModal.value = false;
  busSeleccionado.value = null;
}

async function handleRegistrarBus() {
  if (!nuevoBus.value.numero || !nuevoBus.value.placa) {
    uiStore.showAlert({
      title: 'Validación',
      message: 'Por favor complete el número de unidad y la placa.',
      type: 'warning'
    });
    return;
  }
  await registrarBus();
  if (!error.value) {
    uiStore.showAlert({
      title: 'Bus Registrado',
      message: `La unidad ${nuevoBus.value.numero} ha sido añadida a la flota.`,
      type: 'success'
    });
    mostrarCrearModal.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado Premium -->
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Gestión de Flota</h1>
          <p class="mt-2 text-slate-400 font-medium">Control integral de unidades operativas y mantenimiento.</p>
        </div>
        <button @click="abrirCrearModal" class="btn-primary">
          <span class="text-2xl">+</span>
          <span>Registrar Unidad</span>
        </button>
      </div>
    </header>

    <!-- Notificación de Error -->
    <div v-if="error" class="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 font-bold text-sm flex items-center gap-3">
      <span class="h-6 w-6 rounded-full bg-rose-100 flex items-center justify-center text-xs">!</span>
      {{ error }}
    </div>

    <!-- Filtros Elegant -->
    <section class="card-premium p-6 flex flex-wrap items-end gap-6 bg-white/80 backdrop-blur-sm">
      <div class="flex-1 min-w-[280px]">
        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Búsqueda rápida</label>
        <div class="relative mt-2">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          <input v-model="busqueda" type="text" placeholder="Filtrar por número de unidad o placa..."
            class="input-premium !pl-12 !py-3.5"/>
        </div>
      </div>
      <div class="w-full sm:w-60">
        <PremiumSelect
          v-model="filtroEstado"
          :options="opcionesEstado"
          label="Filtrar por Estado"
        />
      </div>
      <div class="w-full sm:w-64">
        <PremiumSelect
          v-model="filtroConfiguracion"
          :options="opcionesFiltroConfiguracion"
          label="Filtrar por Estructura"
        />
      </div>
    </section>

    <!-- Tabla de Buses Premium -->
    <section class="card-premium">
      <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <h2 class="text-sm font-black uppercase tracking-widest text-slate-400">
          Unidades en Servicio ({{ totalItems }})
        </h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th class="px-8 py-5">Unidad</th>
              <th class="px-8 py-5">Placa / Identidad</th>
              <th class="px-8 py-5">Configuración</th>
              <th class="px-8 py-5">Estado</th>
              <th class="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading && (buses || []).length === 0">
              <td colspan="5" class="px-8 py-16 text-center">
                <div class="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p class="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando flota...</p>
              </td>
            </tr>
            <tr v-else-if="busesFiltrados.length === 0">
              <td colspan="5" class="px-8 py-16 text-center text-slate-400 font-bold">No hay unidades que coincidan con los filtros.</td>
            </tr>
            <tr v-for="bus in pagedBuses" :key="bus.id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="px-8 py-6">
                <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-lg shadow-lg">
                  {{ bus.numero }}
                </span>
              </td>
              <td class="px-8 py-6">
                <p class="font-mono font-black text-blue-600 text-base tracking-widest">{{ bus.placa }}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: #{{ bus.id }}</p>
              </td>
              <td class="px-8 py-6">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ bus.estructura === 'DosPisos' ? '🚍' : '🚌' }}</span>
                  <div>
                    <p class="font-black text-slate-700 text-sm">{{ bus.totalAsientos }} Asientos</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">{{ bus.estructura === 'DosPisos' ? 'Doble Piso' : 'Un solo piso' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6">
                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-tight shadow-sm"
                  :class="{
                    'bg-emerald-50 border-emerald-100 text-emerald-600': bus.estado === 'Activo',
                    'bg-orange-50 border-orange-100 text-orange-600': bus.estado === 'EnMantenimiento',
                    'bg-blue-50 border-blue-100 text-blue-600': bus.estado === 'Viajando',
                    'bg-rose-50 border-rose-100 text-rose-600': bus.estado === 'Inactivo'
                  }">
                  <div class="h-1.5 w-1.5 rounded-full" :class="{
                    'bg-emerald-500': bus.estado === 'Activo',
                    'bg-orange-500': bus.estado === 'EnMantenimiento',
                    'bg-blue-500': bus.estado === 'Viajando',
                    'bg-rose-500': bus.estado === 'Inactivo'
                  }"></div>
                  {{ 
                    bus.estado === 'Activo' ? 'Activo' : 
                    bus.estado === 'EnMantenimiento' ? 'Mantenimiento' : 
                    bus.estado === 'Viajando' ? 'En Viaje' : 
                    'Inactivo' 
                  }}
                </span>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="abrirEditarModal(bus)" title="Editar"
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button v-if="bus.estado === 'EnMantenimiento'" @click="handleReactivarBus(bus)" title="Reactivar"
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <button v-if="bus.estado !== 'EnMantenimiento'" @click="abrirIncidenteModal(bus)" title="Reportar Incidente"
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
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

    <!-- Modal de Creación -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="mostrarCrearModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="mostrarCrearModal = false"></div>
          <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div class="bg-slate-900 p-8 text-white">
              <h3 class="text-2xl font-black tracking-tight">Registrar Nueva Unidad</h3>
              <p class="text-slate-400 text-xs mt-1 font-medium">Ingresa los datos técnicos del vehículo para habilitarlo en el sistema.</p>
            </div>
            
            <form @submit.prevent="handleRegistrarBus" class="p-8 space-y-6">
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Número de Unidad *</label>
                  <input type="text" v-model="nuevoBus.numero" required placeholder="Ej: 045" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Placa (Formato Nacional) *</label>
                  <input type="text" v-model="nuevoBus.placa" required placeholder="ABC-1234" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Capacidad Total *</label>
                  <input type="number" v-model.number="nuevoBus.totalAsientos" required min="1" max="100" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="nuevoBus.estructura"
                    :options="opcionesEstructura"
                    label="Estructura del Bus *"
                    placeholder="Seleccione..."
                  />
                </div>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="submit" :disabled="loading" class="btn-primary flex-1">
                  {{ loading ? 'Procesando...' : '✓ Confirmar Registro' }}
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

    <!-- Modales Existentes -->
    <EditarBusModal
      :is-open="mostrarEditarModal"
      :bus="busSeleccionado"
      @close="mostrarEditarModal = false; busSeleccionado = null"
      @save="handleGuardarBus"
    />

    <ReportarIncidenteModal
      :is-open="mostrarIncidenteModal"
      :bus-numero="busSeleccionado?.numero || null"
      @close="mostrarIncidenteModal = false; busSeleccionado = null"
    />
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from { opacity: 0; filter: blur(4px); transform: scale(0.95); }
.modal-leave-to { opacity: 0; transform: scale(1.02); }
</style>
