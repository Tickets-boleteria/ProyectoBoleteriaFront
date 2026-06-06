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
  reporteGeneracion,
  cargarPorFecha,
  agregarTrayecto,
  iniciarRuta,
  finalizarRuta,
  toggleTipoRuta,
  generarAuto,
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

const handleGenerarAuto = async () => {
  const confirm = await uiStore.showConfirm({
    title: 'Generación Automática',
    message: `¿Deseas generar automáticamente la hoja de ruta para el ${fechaFiltro.value}? El sistema asignará buses disponibles a las frecuencias activas.`,
    type: 'info'
  })

  if (confirm) {
    const success = await generarAuto(fechaFiltro.value)
    if (success && reporteGeneracion.value) {
      uiStore.showAlert({
        title: 'Generación Completada',
        message: `Se crearon ${reporteGeneracion.value.rutasCreadas} rutas. Frecuencias sin bus: ${reporteGeneracion.value.frecuenciasSinBus}. Buses de parada: ${reporteGeneracion.value.busesDeParada}.`,
        type: 'success'
      })
    }
  }
}

const mostrarAsignarModal = ref(false)

cargar()
</script>

<template>
  <div class="space-y-8 animate-in">
    <!-- Encabezado Premium -->
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Despacho y Programación</h1>
          <p class="mt-2 text-slate-400 font-medium">Gestión de itinerarios diarios y asignación de flota.</p>
        </div>
        <div class="flex gap-3">
          <button @click="mostrarAsignarModal = true" class="px-6 py-3 rounded-2xl bg-white/10 text-white font-black text-sm hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
            Manual
          </button>
          <button @click="handleGenerarAuto" :disabled="loading" class="btn-primary !bg-blue-500 hover:bg-blue-400 shadow-blue-900/20">
            <span class="text-xl">⚡</span>
            <span>Auto-Generar</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Filtros Premium -->
    <section class="card-premium p-6 flex flex-wrap items-center gap-6 bg-white/80 backdrop-blur-sm">
      <div class="flex-1 min-w-[240px]">
        <label class="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Fecha de Operación</label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2">📅</span>
          <input v-model="fechaFiltro" type="date" class="input-premium !pl-12 !py-3"/>
        </div>
      </div>
      <button @click="cargar" class="btn-primary !bg-slate-900 hover:bg-slate-800 !px-10">
        Consultar Plan
      </button>
    </section>

    <div v-if="error" class="rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-5 shadow-md flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">!</div>
      <p class="text-sm font-black text-rose-700">{{ error }}</p>
    </div>

    <!-- Listado de Hojas -->
    <div v-if="loading" class="card-premium p-20 text-center">
      <div class="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p class="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando operaciones...</p>
    </div>

    <div v-else class="space-y-10">
      <div v-for="hoja in pagedHojas" :key="hoja.id" class="animate-in">
        <div class="card-premium overflow-hidden">
          <div class="p-8 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6 bg-slate-50/30">
            <div class="flex items-center gap-6">
              <div class="bg-white px-6 py-3 rounded-3xl border border-slate-100 shadow-sm text-center">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Hoja de Ruta</p>
                <p class="text-xl font-black text-slate-900">#{{ hoja.id }}</p>
              </div>
              <div>
                <span class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                  :class="estadoBadge(hoja.state || hoja.estado)">
                  {{ hoja.state || hoja.estado }}
                </span>
                <p class="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  Generación: {{ hoja.tipoGeneracion === 'Manual' ? '📝 Manual' : '🤖 Automática' }}
                </p>
              </div>
            </div>
            
            <div class="flex gap-3">
              <button v-if="hoja.estado === 'Borrador'" @click="handleIniciar(hoja.id!)" 
                class="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all">
                PUBLICAR PLAN
              </button>
              <button v-if="hoja.estado === 'Publicada'" @click="handleFinalizar(hoja.id!)" 
                class="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all">
                CERRAR DESPACHOS
              </button>
            </div>
          </div>

          <div class="p-8">
            <TripList 
              :rutas="hoja.rutas || []" 
              @toggle-directo="(r) => toggleTipoRuta(r, fechaFiltro)"
            />
          </div>
        </div>
      </div>

      <div v-if="hojasRuta.length === 0" class="card-premium p-24 text-center opacity-40">
        <p class="text-5xl mb-4">📭</p>
        <p class="font-black text-slate-400 uppercase tracking-widest text-xs">Sin planificación registrada</p>
      </div>

      <PaginationControls
        v-if="totalItems > itemsPerPage"
        :current-page="currentPage" :total-pages="totalPages" :total-items="totalItems" :items-per-page="itemsPerPage"
        :has-prev-page="currentPage > 1" :has-next-page="currentPage < totalPages"
        @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
      />
    </div>

    <!-- Modal Asignar Trayecto -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="mostrarAsignarModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="mostrarAsignarModal = false"></div>
          <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div class="bg-slate-900 p-8 text-white">
              <h3 class="text-2xl font-black tracking-tight">Asignación Manual</h3>
              <p class="text-slate-400 text-xs mt-1 font-medium">Vincula una unidad de transporte a una frecuencia específica para el día de hoy.</p>
            </div>
            
            <form @submit.prevent="asignarNuevoTrayecto" class="p-8 space-y-6">
              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Frecuencia *</label>
                  <input v-model.number="form.frecuenciaId" type="number" required placeholder="Ej: 1" class="input-premium" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Bus *</label>
                  <input v-model.number="form.busId" type="number" required placeholder="Ej: 50" class="input-premium" />
                </div>
              </div>

              <div class="flex gap-3 pt-6 border-t border-slate-50">
                <button type="submit" :disabled="loading" class="btn-primary flex-1">
                  {{ loading ? 'Asignando...' : '✓ Confirmar Vinculación' }}
                </button>
                <button type="button" @click="mostrarAsignarModal = false" class="px-8 py-3 rounded-2xl bg-slate-50 font-black text-slate-400 hover:bg-slate-100 transition-all">
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
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-in { animation: fadeIn 0.5s ease-out; }
</style>
