<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface Bus {
  id: number
  numero: string
  placa: string
  marcaChasis: string
  marcaCarroceria: string
  anio: number
  totalAsientos: number
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento'
}

// MOCK – reemplaza con SupabaseBusRepository / BusUseCases
const buses = ref<Bus[]>([
  { id: 1, numero: '07', placa: 'TBA-0234', marcaChasis: 'Hino', marcaCarroceria: 'IMCE', anio: 2021, totalAsientos: 44, estado: 'Activo' },
  { id: 2, numero: '08', placa: 'TBC-1192', marcaChasis: 'Volkswagen', marcaCarroceria: 'Patricio Cepeda', anio: 2019, totalAsientos: 40, estado: 'Mantenimiento' },
  { id: 3, numero: '09', placa: 'TBA-0099', marcaChasis: 'Scania', marcaCarroceria: 'Marcopolo', anio: 2023, totalAsientos: 46, estado: 'Activo' },
])

const filtroEstado = ref<'Todos' | Bus['estado']>('Todos')
const busqueda = ref('')
const mostrarForm = ref(false)
const editingId = ref<number | null>(null)
const mensaje = ref({ tipo: '' as 'ok' | 'error' | '', texto: '' })

const form = reactive<Omit<Bus, 'id'>>({
  numero: '', placa: '', marcaChasis: '', marcaCarroceria: '',
  anio: new Date().getFullYear(), totalAsientos: 40, estado: 'Activo',
})

const errores = reactive({ numero: '', placa: '', totalAsientos: '' })

function resetForm() {
  Object.assign(form, {
    numero: '', placa: '', marcaChasis: '', marcaCarroceria: '',
    anio: new Date().getFullYear(), totalAsientos: 40, estado: 'Activo',
  })
  errores.numero = ''; errores.placa = ''; errores.totalAsientos = ''
  editingId.value = null
}

function validar(): boolean {
  errores.numero = !form.numero.trim() ? 'Número requerido.' : ''
  errores.placa = !/^[A-Z]{3}-\d{3,4}$/i.test(form.placa.trim())
    ? 'Formato esperado ABC-1234.' : ''
  errores.totalAsientos = (form.totalAsientos <= 0 || form.totalAsientos > 80)
    ? 'Entre 1 y 80.' : ''
  return !errores.numero && !errores.placa && !errores.totalAsientos
}

function guardar() {
  if (!validar()) {
    mensaje.value = { tipo: 'error', texto: 'Revisa los campos marcados.' }
    return
  }
  if (editingId.value != null) {
    const idx = buses.value.findIndex(b => b.id === editingId.value)
    if (idx >= 0) buses.value[idx] = { ...form, id: editingId.value }
    mensaje.value = { tipo: 'ok', texto: 'Bus actualizado correctamente.' }
  } else {
    const nextId = Math.max(0, ...buses.value.map(b => b.id)) + 1
    buses.value.push({ ...form, id: nextId })
    mensaje.value = { tipo: 'ok', texto: 'Bus registrado correctamente.' }
  }
  mostrarForm.value = false
  resetForm()
  setTimeout(() => mensaje.value = { tipo: '', texto: '' }, 3000)
}

function editar(b: Bus) {
  Object.assign(form, b)
  editingId.value = b.id
  mostrarForm.value = true
}

function eliminar(id: number) {
  if (!confirm('¿Eliminar este bus? Esta acción no se puede deshacer.')) return
  buses.value = buses.value.filter(b => b.id !== id)
}

function cambiarEstado(b: Bus, nuevo: Bus['estado']) {
  b.estado = nuevo
}

const busesFiltrados = computed(() => buses.value.filter(b => {
  const matchEstado = filtroEstado.value === 'Todos' || b.estado === filtroEstado.value
  const q = busqueda.value.toLowerCase().trim()
  const matchQ = !q || b.placa.toLowerCase().includes(q) || b.numero.includes(q) ||
    b.marcaChasis.toLowerCase().includes(q) || b.marcaCarroceria.toLowerCase().includes(q)
  return matchEstado && matchQ
}))

const estadoBadge = (e: Bus['estado']) => ({
  Activo: 'bg-emerald-100 text-emerald-700',
  Inactivo: 'bg-slate-200 text-slate-700',
  Mantenimiento: 'bg-amber-100 text-amber-700',
}[e])

onMounted(() => { /* cargar desde repo real */ })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Buses</h2>
        <p class="text-slate-500 text-sm">Mantén el inventario actualizado para asignar hojas de ruta sin errores.</p>
      </div>
      <button @click="() => { resetForm(); mostrarForm = !mostrarForm }"
        class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        {{ mostrarForm ? 'Cancelar' : '+ Registrar bus' }}
      </button>
    </div>

    <div v-if="mensaje.texto" class="rounded-xl border p-3 text-sm font-bold"
      :class="mensaje.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'">
      {{ mensaje.tipo === 'ok' ? '✓' : '✗' }} {{ mensaje.texto }}
    </div>

    <!-- Form -->
    <section v-if="mostrarForm" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
      <h3 class="text-lg font-black text-slate-900 mb-4">{{ editingId ? 'Editar bus' : 'Nuevo bus' }}</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Número de unidad</label>
          <input v-model="form.numero" class="w-full rounded-xl border bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            :class="errores.numero ? 'border-red-400 bg-red-50' : 'border-slate-200'" placeholder="07"/>
          <p v-if="errores.numero" class="mt-1 text-xs font-bold text-red-600">{{ errores.numero }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Placa</label>
          <input v-model="form.placa" class="w-full rounded-xl border bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            :class="errores.placa ? 'border-red-400 bg-red-50' : 'border-slate-200'" placeholder="TBA-0234"/>
          <p v-if="errores.placa" class="mt-1 text-xs font-bold text-red-600">{{ errores.placa }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Total asientos</label>
          <input v-model.number="form.totalAsientos" type="number" min="1" max="80"
            class="w-full rounded-xl border bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            :class="errores.totalAsientos ? 'border-red-400 bg-red-50' : 'border-slate-200'"/>
          <p v-if="errores.totalAsientos" class="mt-1 text-xs font-bold text-red-600">{{ errores.totalAsientos }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Marca chasis</label>
          <input v-model="form.marcaChasis" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Hino"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Marca carrocería</label>
          <input v-model="form.marcaCarroceria" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="IMCE"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Año</label>
          <input v-model.number="form.anio" type="number" min="1990" :max="new Date().getFullYear() + 1"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3 sm:col-span-2 lg:col-span-3">
          <label class="text-xs font-bold text-slate-700">Estado</label>
          <select v-model="form.estado" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1">
            <option>Activo</option><option>Inactivo</option><option>Mantenimiento</option>
          </select>
        </div>
      </div>
      <div class="mt-5 flex gap-3">
        <button @click="guardar" class="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
          {{ editingId ? 'Guardar cambios' : 'Registrar bus' }}
        </button>
        <button @click="() => { mostrarForm = false; resetForm() }" class="rounded-2xl bg-slate-100 px-6 py-3 font-bold text-slate-700 hover:bg-slate-200">
          Cancelar
        </button>
      </div>
    </section>

    <!-- Filtros -->
    <section class="rounded-2xl bg-white p-4 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-[200px]">
        <label class="text-xs font-bold text-slate-700">Buscar</label>
        <input v-model="busqueda" type="text" placeholder="Placa, número o marca"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-700">Estado</label>
        <select v-model="filtroEstado" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1">
          <option>Todos</option><option>Activo</option><option>Inactivo</option><option>Mantenimiento</option>
        </select>
      </div>
    </section>

    <!-- Lista -->
    <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="b in busesFiltrados" :key="b.id"
        class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bus #{{ b.numero }}</p>
            <h3 class="text-xl font-black text-slate-900">{{ b.placa }}</h3>
          </div>
          <span class="text-xs font-bold rounded-full px-3 py-1" :class="estadoBadge(b.estado)">{{ b.estado }}</span>
        </div>
        <div class="space-y-1 text-sm text-slate-600 mb-4">
          <p><span class="font-bold">Chasis:</span> {{ b.marcaChasis }}</p>
          <p><span class="font-bold">Carrocería:</span> {{ b.marcaCarroceria }}</p>
          <p><span class="font-bold">Año:</span> {{ b.anio }}</p>
          <p><span class="font-bold">Asientos:</span> {{ b.totalAsientos }}</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button @click="editar(b)" class="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold">Editar</button>
          <select :value="b.estado" @change="cambiarEstado(b, ($event.target as HTMLSelectElement).value as Bus['estado'])"
            class="rounded-xl bg-slate-50 text-slate-700 px-2 py-1.5 text-xs font-bold border border-slate-200">
            <option>Activo</option><option>Inactivo</option><option>Mantenimiento</option>
          </select>
          <button @click="eliminar(b.id)" class="rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold ml-auto">Eliminar</button>
        </div>
      </article>
      <div v-if="busesFiltrados.length === 0" class="md:col-span-2 lg:col-span-3 rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
        No hay buses que coincidan con tu búsqueda.
      </div>
    </section>
  </div>
</template>
