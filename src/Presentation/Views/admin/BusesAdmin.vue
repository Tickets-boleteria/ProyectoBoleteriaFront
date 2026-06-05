<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBuses } from '../../Composables/useBuses';
import { useUiStore } from '../../Store/uiStore';
import EditarBusModal from '../../Components/EditarBusModal.vue';
import ReportarIncidenteModal from '../../Components/ReportarIncidenteModal.vue';
import PaginationControls from '../../Components/PaginationControls.vue';

const { buses, nuevoBus, loading, error, registrarBus, guardarBus } = useBuses();
const uiStore = useUiStore();

// Estados para los modales
const mostrarEditarModal = ref(false);
const mostrarIncidenteModal = ref(false);
const busSeleccionado = ref<any | null>(null);

// Paginación
const currentPage = ref(1);
const itemsPerPage = 8;
const totalItems = computed(() => buses.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));

const pagedBuses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return buses.value.slice(start, end);
});

watch(totalItems, () => {
  if (currentPage.value > totalPages.value && totalPages.value > 0) {
    currentPage.value = totalPages.value;
  }
});

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const handleSetPage = (p: number) => { currentPage.value = p; };

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
  uiStore.showAlert({
    title: 'Bus Registrado',
    message: `La unidad ${nuevoBus.value.numero} ha sido añadida a la flota.`,
    type: 'success'
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">Gestión de Flota de Buses</h1>
      <p class="mt-2 text-sm text-slate-300">
        Añade, visualiza y gestiona los vehículos de la cooperativa.
      </p>
    </div>

    <!-- Formulario de Creación -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">Registrar Nuevo Bus</h2>
      <form @submit.prevent="handleRegistrarBus" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div v-if="error" role="alert"
             class="md:col-span-5 p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {{ error }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Número de Unidad</label>
             <input type="text" v-model="nuevoBus.numero" required placeholder="Ej: 045"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Placa</label>
             <input type="text" v-model="nuevoBus.placa" required placeholder="ABC-1234"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Nº de Asientos</label>
          <input type="number" v-model.number="nuevoBus.totalAsientos" required min="1" max="100"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Estructura</label>
          <select v-model="nuevoBus.estructura" required
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="UnPiso">🚌 Un Piso</option>
            <option value="DosPisos">🚍 Dos Pisos</option>
          </select>
        </div>
        <div class="flex items-end">
          <button type="submit" :disabled="loading"
                  class="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-800 transition disabled:bg-slate-400">
            {{ loading ? 'Registrando...' : '✓ Registrar Bus' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabla de Buses -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Listado de Buses ({{ totalItems }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-widest">
            <tr>
              <th class="px-5 py-4 text-left">Nº Unidad</th>
              <th class="px-5 py-4 text-left">Placa</th>
              <th class="px-5 py-4 text-left">Capacidad</th>
              <th class="px-5 py-4 text-left">Estructura</th>
              <th class="px-5 py-4 text-left">Estado</th>
              <th class="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && buses.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400 font-bold">Cargando flota operativa...</td>
            </tr>
            <tr v-else-if="buses.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-slate-400 font-bold">No hay buses registrados en el sistema.</td>
            </tr>
            <tr v-for="bus in pagedBuses" :key="bus.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-5 py-4">
                <span class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700">
                  {{ bus.numero }}
                </span>
              </td>
              <td class="px-5 py-4 font-mono font-bold text-blue-600">{{ bus.placa }}</td>
              <td class="px-5 py-4 font-bold text-slate-600">{{ bus.totalAsientos }} asientos</td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">
                  {{ bus.estructura === 'DosPisos' ? '🚍' : '🚌' }}
                  {{ bus.estructura === 'DosPisos' ? 'Doble Piso' : 'Un Piso' }}
                </span>
              </td>
              <td class="px-5 py-4">
                <span class="inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight"
                      :class="{
                        'bg-emerald-100 text-emerald-700': bus.estado === 'Activo',
                        'bg-orange-100 text-orange-700': bus.estado === 'EnMantenimiento',
                        'bg-red-100 text-red-700': bus.estado === 'Inactivo'
                      }">
                  {{ bus.estado === 'Activo' ? 'Activo' : bus.estado === 'EnMantenimiento' ? 'Mantenimiento' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button 
                    @click="abrirEditarModal(bus)"
                    class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="abrirIncidenteModal(bus)"
                    class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Reportar incidente">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>

    <!-- Modal de Editar Bus -->
    <EditarBusModal
      :is-open="mostrarEditarModal"
      :bus="busSeleccionado"
      @close="mostrarEditarModal = false; busSeleccionado = null"
      @save="handleGuardarBus"
    />

    <!-- Modal de Reportar Incidente -->
    <ReportarIncidenteModal
      :is-open="mostrarIncidenteModal"
      :bus-numero="busSeleccionado?.numero || null"
      @close="mostrarIncidenteModal = false; busSeleccionado = null"
    />
  </div>
</template>
