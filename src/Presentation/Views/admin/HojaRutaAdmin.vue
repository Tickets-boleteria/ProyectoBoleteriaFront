<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useHojaRuta } from '../../Composables/useHojaRuta'
import { useUiStore } from '../../Store/uiStore'
import TripList from '../../Components/HojaRuta/TripList.vue'
import PaginationControls from '../../Components/PaginationControls.vue'

const hoy = new Date().toISOString().slice(0, 10)
const fechaFiltro = ref(hoy)
const uiStore = useUiStore()

const form = reactive({
  frecuenciaId: undefined as number | undefined,
  busId: undefined as number | undefined,
})

const {
  hojasRuta,
  loading,
  error,
  cargarPorFecha,
  agregarTrayecto,
  iniciarRuta,
  finalizarRuta,
  toggleTipoRuta,
} = useHojaRuta()

// Paginación
const currentPage = ref(1)
const itemsPerPage = 3 // Las hojas de ruta son grandes, mostramos pocas por página
const totalItems = computed(() => hojasRuta.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

const pagedHojas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return hojasRuta.value.slice(start, end)
})

const handlePrevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const handleNextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const handleSetPage = (p: number) => { currentPage.value = p }

const cargar = () => {
  currentPage.value = 1
  cargarPorFecha(fechaFiltro.value)
}

const asignarNuevoTrayecto = async () => {
  if (!form.frecuenciaId || !form.busId) {
    uiStore.showAlert({ title: 'Validación', message: 'ID de Frecuencia y ID de Bus son requeridos.', type: 'warning' })
    return
  }
  
  const success = await agregarTrayecto(form.busId, form.frecuenciaId, fechaFiltro.value)
  
  if (success) {
    uiStore.showAlert({ title: 'Trayecto Asignado', message: 'El bus ha sido vinculado a la frecuencia en el plan diario.', type: 'success' })
    form.frecuenciaId = undefined
    form.busId = undefined
  }
}

const handleIniciar = async (id: number) => {
  const confirm = await uiStore.showConfirm({
    title: 'Iniciar Operación',
    message: '¿Confirmas el inicio de operación para esta hoja de ruta?',
    type: 'info'
  })
  if (confirm) await iniciarRuta(id, fechaFiltro.value)
}

const handleFinalizar = async (id: number) => {
  const confirm = await uiStore.showConfirm({
    title: 'Cerrar Hoja',
    message: '¿Estás seguro de cerrar la hoja de ruta? Esto completará todos los trayectos pendientes.',
    type: 'warning'
  })
  if (confirm) {
    await finalizarRuta(id, fechaFiltro.value)
    uiStore.showAlert({ title: 'Operación Finalizada', message: 'La hoja de ruta ha sido cerrada correctamente.', type: 'success' })
  }
}

const estadoBadge = (e: string) => ({
  Borrador:  'bg-blue-100 text-blue-700 border-blue-200',
  Publicada: 'bg-amber-100 text-amber-700 border-amber-200',
  Cerrada:   'bg-emerald-100 text-emerald-700 border-emerald-200',
}[e] || 'bg-slate-100 text-slate-700')

cargar()
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Hoja de ruta</h2>
        <p class="text-slate-500 text-sm">Programación operativa diaria: asignación de buses a frecuencias.</p>
      </div>
    </div>

    <!-- Filtros + acciones -->
    <section class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div class="rounded-2xl bg-slate-50 p-3 border border-slate-100">
        <label class="block text-[10px] font-black uppercase text-slate-400 mb-1">Fecha operativa</label>
        <input v-model="fechaFiltro" type="date" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"/>
      </div>
      <button @click="cargar" class="rounded-2xl bg-slate-900 px-6 py-3.5 font-black text-white shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
        Consultar Plan
      </button>
    </section>

    <!-- Asignación de Trayecto -->
    <section class="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl backdrop-blur-xl border border-slate-100">
      <h3 class="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
        <span class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </span>
        Asignar Nuevo Trayecto
      </h3>
      <form @submit.prevent="asignarNuevoTrayecto" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div class="space-y-1.5">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Frecuencia (ID)</label>
          <input v-model.number="form.frecuenciaId" type="number" required placeholder="Ej: 1" class="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"/>
        </div>
        <div class="space-y-1.5">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Bus (ID)</label>
          <input v-model.number="form.busId" type="number" required placeholder="Ej: 50" class="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"/>
        </div>
        <div class="flex items-end">
          <button type="submit" :disabled="loading" class="w-full rounded-2xl bg-blue-600 px-6 py-4 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-95">
            {{ loading ? 'Procesando...' : 'Vincular Unidad' }}
          </button>
        </div>
      </form>
    </section>

    <div v-if="error" class="rounded-2xl border-l-4 border-red-500 bg-red-50 p-5 shadow-md flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xl">⚠️</div>
      <p class="text-sm font-black text-red-700 leading-tight">{{ error }}</p>
    </div>

    <!-- Visualización de Hojas de Ruta -->
    <div v-if="pagedHojas.length" class="space-y-10">
      <div v-for="hoja in pagedHojas" :key="hoja.id" class="space-y-5 animate-in slide-in-from-bottom duration-500">
        <div class="flex items-center justify-between px-3">
          <div class="flex items-center gap-4">
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">Hoja de Ruta #{{ hoja.id }}</h3>
            <span :class="estadoBadge(hoja.estado)" class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm">
              {{ hoja.estado }}
            </span>
          </div>
          <div class="flex gap-3">
            <button v-if="hoja.estado === 'Borrador'" @click="handleIniciar(hoja.id!)" class="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">INICIAR OPERACIÓN</button>
            <button v-if="hoja.estado === 'Publicada'" @click="handleFinalizar(hoja.id!)" class="px-6 py-2.5 rounded-2xl bg-blue-600 text-white text-[11px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">CERRAR HOJA</button>
          </div>
        </div>

        <TripList 
          :rutas="hoja.rutas || []" 
          @toggle-directo="(r) => toggleTipoRuta(r, fechaFiltro)"
        />
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
    </div>
    
    <div v-else-if="!loading" class="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
      <div class="max-w-xs mx-auto space-y-5">
        <div class="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <p class="text-slate-900 font-black text-xl">Sin programación activa</p>
          <p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed px-4">Asigne el primer trayecto para generar automáticamente la hoja del día.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-in {
  animation: slide-up 0.4s ease-out;
}
</style>
