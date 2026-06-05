<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useFrecuencias, DIAS_SEMANA } from '../../Composables/useFrecuencias';
import { useUiStore } from '../../Store/uiStore';
import PaginationControls from '../../Components/PaginationControls.vue';

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

// Paginación
const currentPage = ref(1);
const itemsPerPage = 8;
const totalItems = computed(() => frecuencias.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));

const pagedFrecuencias = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return frecuencias.value.slice(start, end);
});

watch(totalItems, () => {
  if (currentPage.value > totalPages.value && totalPages.value > 0) {
    currentPage.value = totalPages.value;
  }
});

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const handleSetPage = (p: number) => { currentPage.value = p; };

const editandoId = ref<number | null>(null);
const editForm = ref<any>(null);

function iniciarEdicion(f: any) {
  editandoId.value = f.id || f.Id;
  editForm.value = { ...f };
}

function cancelarEdicion() {
  editandoId.value = null;
  editForm.value = null;
}

async function guardarEdicion() {
  if (!editandoId.value) return;
  await actualizarFrecuencia(editandoId.value, editForm.value);
  uiStore.showAlert({
    title: 'Frecuencia Actualizada',
    message: 'Los cambios en el trayecto han sido guardados.',
    type: 'success'
  });
  editandoId.value = null;
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
    <!-- Encabezado -->
    <div class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">Catálogo de Frecuencias Base</h1>
      <p class="mt-2 text-sm text-slate-300">
        Define los orígenes, destinos y horarios aprobados para la cooperativa.
      </p>
    </div>

    <!-- Formulario de Creación -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">Registrar Nuevo Trayecto</h2>
      
      <form @submit.prevent="handleRegistrar" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-if="error" role="alert" class="md:col-span-3 p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg font-bold">
          {{ error }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Ciudad de Origen</label>
          <input type="text" v-model="nuevaFrecuencia.ciudadOrigen" required placeholder="Ej: Quito"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        
        <div>
          <label class="text-xs font-bold text-slate-700">Ciudad de Destino</label>
          <input type="text" v-model="nuevaFrecuencia.ciudadDestino" required placeholder="Ej: Ambato"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Hora de Salida</label>
          <input type="time" v-model="nuevaFrecuencia.horaSalida" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-bold text-slate-700">Días de Operación</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <button v-for="dia in DIAS_SEMANA" :key="dia" type="button"
                    @click="toggleDia(nuevaFrecuencia, dia)"
                    :class="nuevaFrecuencia.diasOperacion.includes(dia) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
                    class="px-3 py-1 rounded-lg text-[10px] font-bold transition-colors">
              {{ dia }}
            </button>
          </div>
        </div>

        <div class="flex flex-col justify-center">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" v-model="nuevaFrecuencia.esDirecto" class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span class="text-sm font-bold text-slate-700">Ruta Directa (Sin paradas)</span>
          </label>
        </div>
        
        <div class="md:col-span-3 flex justify-end">
          <button type="submit" :disabled="loading"
                  class="rounded-2xl bg-blue-700 px-8 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-800 transition disabled:bg-slate-400">
            {{ loading ? 'Guardando...' : '✓ Registrar Frecuencia' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabla de Frecuencias -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex justify-between items-center">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Frecuencias Aprobadas ({{ totalItems }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-widest">
            <tr>
              <th class="px-5 py-4 text-left">Trayecto</th>
              <th class="px-5 py-4 text-left">Horario y Días</th>
              <th class="px-5 py-4 text-left">Tipo</th>
              <th class="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="f in pagedFrecuencias" :key="f.id || f.Id" class="hover:bg-slate-50/50 transition-colors">
              <template v-if="editandoId === (f.id || f.Id)">
                <td class="px-5 py-4" colspan="2">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                       <label class="text-[10px] font-bold text-slate-400 uppercase">Origen</label>
                       <input v-model="editForm.ciudadOrigen" class="w-full border rounded-lg p-2 text-xs font-bold" />
                    </div>
                    <div class="space-y-1">
                       <label class="text-[10px] font-bold text-slate-400 uppercase">Destino</label>
                       <input v-model="editForm.ciudadDestino" class="w-full border rounded-lg p-2 text-xs font-bold" />
                    </div>
                    <div class="space-y-1">
                       <label class="text-[10px] font-bold text-slate-400 uppercase">Hora Salida</label>
                       <input v-model="editForm.horaSalida" type="time" class="w-full border rounded-lg p-2 text-xs font-bold" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-400 uppercase">Días</label>
                      <div class="flex flex-wrap gap-1">
                        <button v-for="dia in DIAS_SEMANA" :key="dia" type="button"
                                @click="toggleDia(editForm, dia)"
                                :class="editForm.diasOperacion?.includes(dia) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'"
                                class="px-1.5 py-0.5 rounded text-[8px] font-bold">
                          {{ dia.slice(0,2) }}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-center">
                   <div class="flex flex-col items-center gap-1">
                     <label class="text-[10px] font-bold text-slate-400 uppercase">Directo</label>
                     <input type="checkbox" v-model="editForm.esDirecto" class="w-5 h-5" />
                   </div>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button @click="guardarEdicion" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-[10px] uppercase shadow-sm">Guardar</button>
                    <button @click="cancelarEdicion" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                  </div>
                </td>
              </template>
              <template v-else>
                <td class="px-5 py-4">
                  <div class="font-black text-slate-900 text-sm">
                    {{ f.ciudadOrigen }} → {{ f.ciudadDestino }}
                  </div>
                  <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">ID Operativo: {{ f.id }}</div>
                </td>
                <td class="px-5 py-4">
                  <div class="text-sm font-black text-blue-600">{{ f.horaSalida }}</div>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    <span v-for="dia in f.diasOperacion" :key="dia" class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-black uppercase">
                      {{ dia }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm"
                        :class="f.esDirecto ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'">
                    <span v-if="f.esDirecto">⚡</span>
                    <span v-else>🚌</span>
                    {{ f.esDirecto ? 'Directo' : 'Con Paradas' }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button @click="iniciarEdicion(f)" class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button @click="handleDesactivar(f.id)" class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </template>
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
  </div>
</template>
