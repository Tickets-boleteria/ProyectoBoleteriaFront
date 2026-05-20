<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface Frecuencia {
  id: number
  ciudadOrigen: string
  ciudadDestino: string
  horaSalida: string
  esDirecto: boolean
  paradas: string[]
  codigoAnt: string
  activa: boolean
}

// MOCK – reemplaza con SupabaseFrecuenciaRepository
const frecuencias = ref<Frecuencia[]>([
  { id: 1, ciudadOrigen: 'Latacunga', ciudadDestino: 'Quito',  horaSalida: '06:00', esDirecto: false, paradas: ['Lasso', 'Machachi'], codigoAnt: 'ANT-001', activa: true },
  { id: 2, ciudadOrigen: 'Latacunga', ciudadDestino: 'Cuenca', horaSalida: '07:30', esDirecto: true,  paradas: [], codigoAnt: 'ANT-002', activa: true },
  { id: 3, ciudadOrigen: 'Ambato',    ciudadDestino: 'Guayaquil', horaSalida: '21:00', esDirecto: false, paradas: ['Riobamba', 'Babahoyo'], codigoAnt: 'ANT-003', activa: false },
])

const filtroEstado = ref<'Todas' | 'Activas' | 'Inactivas'>('Todas')
const mostrarForm = ref(false)
const editingId = ref<number | null>(null)
const mensaje = ref({ tipo: '' as '' | 'ok' | 'error', texto: '' })

const form = reactive<Omit<Frecuencia, 'id'>>({
  ciudadOrigen: '', ciudadDestino: '', horaSalida: '07:00',
  esDirecto: true, paradas: [], codigoAnt: '', activa: true,
})
const paradaTemp = ref('')

function resetForm() {
  Object.assign(form, {
    ciudadOrigen: '', ciudadDestino: '', horaSalida: '07:00',
    esDirecto: true, paradas: [], codigoAnt: '', activa: true,
  })
  paradaTemp.value = ''
  editingId.value = null
}

function agregarParada() {
  const v = paradaTemp.value.trim()
  if (v && !form.paradas.includes(v)) form.paradas.push(v)
  paradaTemp.value = ''
}
function quitarParada(p: string) { form.paradas = form.paradas.filter(x => x !== p) }

function guardar() {
  if (!form.ciudadOrigen || !form.ciudadDestino || !form.horaSalida) {
    mensaje.value = { tipo: 'error', texto: 'Origen, destino y hora son obligatorios.' }
    return
  }
  if (form.ciudadOrigen.trim().toLowerCase() === form.ciudadDestino.trim().toLowerCase()) {
    mensaje.value = { tipo: 'error', texto: 'Origen y destino no pueden ser iguales.' }
    return
  }
  if (editingId.value != null) {
    const idx = frecuencias.value.findIndex(f => f.id === editingId.value)
    if (idx >= 0) frecuencias.value[idx] = { ...form, paradas: [...form.paradas], id: editingId.value }
    mensaje.value = { tipo: 'ok', texto: 'Frecuencia actualizada.' }
  } else {
    const nextId = Math.max(0, ...frecuencias.value.map(f => f.id)) + 1
    frecuencias.value.push({ ...form, paradas: [...form.paradas], id: nextId })
    mensaje.value = { tipo: 'ok', texto: 'Frecuencia registrada.' }
  }
  mostrarForm.value = false
  resetForm()
  setTimeout(() => mensaje.value = { tipo: '', texto: '' }, 3000)
}

function editar(f: Frecuencia) {
  Object.assign(form, f, { paradas: [...f.paradas] })
  editingId.value = f.id
  mostrarForm.value = true
}

function toggleActiva(f: Frecuencia) { f.activa = !f.activa }

function eliminar(id: number) {
  if (!confirm('¿Eliminar esta frecuencia?')) return
  frecuencias.value = frecuencias.value.filter(f => f.id !== id)
}

const frecuenciasFiltradas = computed(() => frecuencias.value.filter(f => {
  if (filtroEstado.value === 'Activas')   return f.activa
  if (filtroEstado.value === 'Inactivas') return !f.activa
  return true
}))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Frecuencias</h2>
        <p class="text-slate-500 text-sm">Horarios autorizados por la ANT con paradas intermedias.</p>
      </div>
      <button @click="() => { resetForm(); mostrarForm = !mostrarForm }"
        class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        {{ mostrarForm ? 'Cancelar' : '+ Nueva frecuencia' }}
      </button>
    </div>

    <div v-if="mensaje.texto" class="rounded-xl border p-3 text-sm font-bold"
      :class="mensaje.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'">
      {{ mensaje.tipo === 'ok' ? '✓' : '✗' }} {{ mensaje.texto }}
    </div>

    <section v-if="mostrarForm" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
      <h3 class="text-lg font-black text-slate-900 mb-4">{{ editingId ? 'Editar frecuencia' : 'Nueva frecuencia' }}</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Ciudad de origen</label>
          <input v-model="form.ciudadOrigen" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="Latacunga"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Ciudad de destino</label>
          <input v-model="form.ciudadDestino" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="Quito"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Hora de salida</label>
          <input v-model="form.horaSalida" type="time" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Código ANT</label>
          <input v-model="form.codigoAnt" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="ANT-001"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3 flex items-center gap-2">
          <input v-model="form.esDirecto" type="checkbox" id="directo" class="h-5 w-5"/>
          <label for="directo" class="text-sm font-bold text-slate-700">Es ruta directa (sin paradas)</label>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3 flex items-center gap-2">
          <input v-model="form.activa" type="checkbox" id="activa" class="h-5 w-5"/>
          <label for="activa" class="text-sm font-bold text-slate-700">Frecuencia activa</label>
        </div>
        <div v-if="!form.esDirecto" class="rounded-2xl bg-slate-50 p-3 sm:col-span-2 lg:col-span-3">
          <label class="text-xs font-bold text-slate-700">Paradas intermedias</label>
          <div class="flex gap-2 mt-1">
            <input v-model="paradaTemp" @keyup.enter="agregarParada"
              class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2" placeholder="Nombre de la parada"/>
            <button @click="agregarParada" class="rounded-xl bg-blue-600 text-white px-4 py-2 font-bold">+ Añadir</button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="p in form.paradas" :key="p"
              class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm font-bold">
              {{ p }}
              <button @click="quitarParada(p)" class="text-blue-500 hover:text-red-600">×</button>
            </span>
            <span v-if="!form.paradas.length" class="text-xs text-slate-500">Sin paradas configuradas.</span>
          </div>
        </div>
      </div>
      <div class="mt-5 flex gap-3">
        <button @click="guardar" class="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
          {{ editingId ? 'Guardar cambios' : 'Registrar frecuencia' }}
        </button>
        <button @click="() => { mostrarForm = false; resetForm() }" class="rounded-2xl bg-slate-100 px-6 py-3 font-bold text-slate-700 hover:bg-slate-200">
          Cancelar
        </button>
      </div>
    </section>

    <section class="rounded-2xl bg-white p-4 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div>
        <label class="text-xs font-bold text-slate-700">Estado</label>
        <select v-model="filtroEstado" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1">
          <option>Todas</option><option>Activas</option><option>Inactivas</option>
        </select>
      </div>
    </section>

    <section class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-x-auto">
      <table v-if="frecuenciasFiltradas.length" class="w-full">
        <thead class="bg-blue-700 text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Ruta</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Hora</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Paradas</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Código ANT</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="f in frecuenciasFiltradas" :key="f.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-bold text-slate-900">{{ f.ciudadOrigen }} → {{ f.ciudadDestino }}</td>
            <td class="px-4 py-3 text-sm">{{ f.horaSalida }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">
              <span v-if="f.esDirecto" class="text-emerald-600 font-bold">Directo</span>
              <span v-else>{{ f.paradas.join(' → ') || '—' }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">{{ f.codigoAnt || '—' }}</td>
            <td class="px-4 py-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold"
                :class="f.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'">
                {{ f.activa ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right flex justify-end gap-2 flex-wrap">
              <button @click="toggleActiva(f)" class="rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold">
                {{ f.activa ? 'Desactivar' : 'Activar' }}
              </button>
              <button @click="editar(f)" class="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold">Editar</button>
              <button @click="eliminar(f.id)" class="rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="p-8 text-center text-slate-500">No hay frecuencias para el filtro actual.</div>
    </section>
  </div>
</template>
