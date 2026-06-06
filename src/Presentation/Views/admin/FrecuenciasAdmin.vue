<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useFrecuencias, DIAS_SEMANA } from '../../Composables/useFrecuencias';
import { useUiStore } from '../../Store/uiStore';
import PaginationControls from '../../Components/PaginationControls.vue';
import PremiumSelect from '../../Components/PremiumSelect.vue';

const { 
  frecuencias, 
  nuevaFrecuencia, 
  loading, 
  error, 
  success, 
  registrarFrecuencia,
  actualizarFrecuencia,
  desactivarFrecuencia
} = useFrecuencias();

const uiStore = useUiStore();

// Estados para modales
const mostrarCrearModal = ref(false);
const mostrarEditarModal = ref(false);
const editForm = ref<any>(null);

// Filtros
const busqueda = ref('');
const filtroDirecto = ref('Todos');

// Paginación
const currentPage = ref(1);
const itemsPerPage = ref(8);

const opcionesFiltroDirecto = [
  { label: 'Todas las modalidades', value: 'Todos' },
  { label: 'Viaje Directo', value: 'Directo', icon: '⚡' },
  { label: 'Con Paradas', value: 'Paradas', icon: '🚌' }
];

const frecuenciasFiltradas = computed(() => {
  return (frecuencias.value || []).filter(f => {
    const q = busqueda.value.toLowerCase().trim();
    const matchBusqueda = !q || 
      String(f.ciudadOrigen || '').toLowerCase().includes(q) || 
      String(f.ciudadDestino || '').toLowerCase().includes(q);
      
    let matchTipo = true;
    if (filtroDirecto.value === 'Directo') matchTipo = f.esDirecto === true;
    if (filtroDirecto.value === 'Paradas') matchTipo = f.esDirecto === false;
    
    return matchBusqueda && matchTipo;
  });
});

const totalItems = computed(() => frecuenciasFiltradas.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value));

const pagedFrecuencias = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return frecuenciasFiltradas.value.slice(start, end);
});

watch([busqueda, filtroDirecto, itemsPerPage], () => {
  currentPage.value = 1;
});

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const handleSetPage = (p: number) => { currentPage.value = p; };

const opcionesDirecto = [
  { label: 'Con Paradas Intermedias', value: false, icon: '🚌' },
  { label: 'Viaje Directo (Express)', value: true, icon: '⚡' }
]

const opcionesFilas = [
  { label: '5 filas', value: 5 },
  { label: '8 filas', value: 8 },
  { label: '20 filas', value: 20 }
]

function abrirCrearModal() {
  resetNuevaFrecuencia();
  mostrarCrearModal.value = true;
}

function resetNuevaFrecuencia() {
  nuevaFrecuencia.value.ciudadOrigen = '';
  nuevaFrecuencia.value.ciudadDestino = '';
  nuevaFrecuencia.value.horaSalida = '';
  nuevaFrecuencia.value.diasOperacion = [...DIAS_SEMANA];
  nuevaFrecuencia.value.esDirecto = false;
}

function iniciarEdicion(f: any) {
  editForm.value = { ...f };
  mostrarEditarModal.value = true;
}

async function guardarEdicion() {
  if (!editForm.value?.id) return;
  await actualizarFrecuencia(editForm.value.id, editForm.value);
  uiStore.showAlert({
    title: 'Frecuencia Actualizada',
    message: 'Los cambios en el trayecto han sido guardados.',
    type: 'success'
  });
  mostrarEditarModal.value = false;
}

async function handleRegistrar() {
  if (!nuevaFrecuencia.value.ciudadOrigen || !nuevaFrecuencia.value.ciudadDestino || !nuevaFrecuencia.value.horaSalida) {
    uiStore.showAlert({
      title: 'Validación',
      message: 'Por favor complete origen, destino y hora de salida.',
      type: 'warning'
    });
    return;
  }
  await registrarFrecuencia();
  if (!error.value) {
    uiStore.showAlert({
      title: 'Éxito',
      message: 'Nueva frecuencia registrada en el catálogo.',
      type: 'success'
    });
    mostrarCrearModal.value = false;
  }
}

async function handleDesactivar(id: number) {
  const confirm = await uiStore.showConfirm({
    title: 'Desactivar Frecuencia',
    message: '¿Estás seguro de desactivar este trayecto? No aparecerá más en la programación diaria.',
    type: 'warning'
  });
  
  if (confirm) {
    await desactivarFrecuencia(id);
    uiStore.showAlert({
      title: 'Desactivada',
      message: 'La frecuencia ha sido retirada del servicio.',
      type: 'info'
    });
  }
}

function toggleDia(target: any, dia: string) {
  if (!target.diasOperacion) target.diasOperacion = [];
  const index = target.diasOperacion.indexOf(dia);
  if (index === -1) {
    target.diasOperacion.push(dia);
  } else {
    target.diasOperacion.splice(index, 1);
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
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Catálogo de Frecuencias</h1>
          <p class="mt-2 text-slate-400 font-medium">Define los orígenes, destinos y horarios aprobados por la ANT.</p>
        </div>
        <button @click="abrirCrearModal" class="btn-primary">
          <span class="text-2xl">+</span>
          <span>Nueva Frecuencia</span>
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
        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Búsqueda por ciudad</label>
        <div class="relative mt-2">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          <input v-model="busqueda" type="text" placeholder="Filtrar por origen o destino..."
            class="input-premium !pl-12 !py-3.5"/>
        </div>
      </div>
      <div class="w-full sm:w-72">
        <PremiumSelect
          v-model="filtroDirecto"
          :options="opcionesFiltroDirecto"
          label="Filtrar por Modalidad"
        />
      </div>
    </section>

    <!-- Tabla de Frecuencias Premium -->
    <section class="card-premium">
      <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <h2 class="text-sm font-black uppercase tracking-widest text-slate-400">
          Frecuencias Base ({{ totalItems }})
        </h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th class="px-8 py-5">Trayecto Operativo</th>
              <th class="px-8 py-5">Horario / Disponibilidad</th>
              <th class="px-8 py-5 text-center">Tipo de Viaje</th>
              <th class="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="f in pagedFrecuencias" :key="f.id || f.Id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="px-8 py-6">
                <div class="font-black text-slate-900 text-base leading-tight">
                  {{ f.ciudadOrigen }} 
                  <span class="text-slate-300 mx-1">→</span>
                  {{ f.ciudadDestino }}
                </div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">ID: #{{ f.id }}</div>
              </td>
              <td class="px-8 py-6">
                <div class="text-lg font-black text-blue-600">{{ f.horaSalida }}</div>
                <div class="flex flex-wrap gap-1 mt-2">
                  <span v-for="dia in f.diasOperacion" :key="dia" class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-tighter">
                    {{ dia }}
                  </span>
                </div>
              </td>
              <td class="px-8 py-6 text-center">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                      :class="f.esDirecto ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'">
                  {{ f.esDirecto ? '⚡ Directo' : '🚌 Con Paradas' }}
                </span>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="iniciarEdicion(f)" 
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="handleDesactivar(f.id)" 
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

    <!-- Modal de Creación / Edición -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="mostrarCrearModal || mostrarEditarModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="mostrarCrearModal = false; mostrarEditarModal = false"></div>
          <div class="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div class="bg-slate-900 p-8 text-white">
              <h3 class="text-2xl font-black tracking-tight">
                {{ mostrarEditarModal ? 'Actualizar Frecuencia' : 'Registrar Nuevo Trayecto' }}
              </h3>
              <p class="text-slate-400 text-xs mt-1 font-medium">Configura el origen, destino y horarios aprobados para el catálogo.</p>
            </div>
            
            <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ciudad Origen *</label>
                  <input type="text" v-model="(mostrarEditarModal ? editForm : nuevaFrecuencia).ciudadOrigen" required placeholder="Ej: Quito" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ciudad Destino *</label>
                  <input type="text" v-model="(mostrarEditarModal ? editForm : nuevaFrecuencia).ciudadDestino" required placeholder="Ej: Ambato" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hora de Salida *</label>
                  <input type="time" v-model="(mostrarEditarModal ? editForm : nuevaFrecuencia).horaSalida" required class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="(mostrarEditarModal ? editForm : nuevaFrecuencia).esDirecto"
                    :options="opcionesDirecto"
                    label="Modalidad de Viaje *"
                  />
                </div>
              </div>

              <div class="space-y-3">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Días de Operación Aprobados</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="dia in DIAS_SEMANA" :key="dia" type="button"
                          @click="toggleDia(mostrarEditarModal ? editForm : nuevaFrecuencia, dia)"
                          :class="(mostrarEditarModal ? editForm : nuevaFrecuencia).diasOperacion?.includes(dia) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100'"
                          class="px-4 py-2 rounded-xl text-xs font-black transition-all">
                    {{ dia }}
                  </button>
                </div>
              </div>

              <div class="flex gap-3 pt-6 border-t border-slate-50">
                <button @click="mostrarEditarModal ? guardarEdicion() : handleRegistrar()" :disabled="loading" class="btn-primary flex-1">
                  {{ loading ? 'Guardando...' : '✓ Confirmar Configuración' }}
                </button>
                <button type="button" @click="mostrarCrearModal = false; mostrarEditarModal = false" class="px-8 py-3 rounded-2xl bg-slate-50 font-black text-slate-400 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
              </div>
            </div>
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
