<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface Ruta {
  id: number
  frecuenciaId: number
  busPlaca: string
  fecha: string
  hora: string
  origen: string
  destino: string
  estado: 'Programada' | 'En curso' | 'Finalizada' | 'Cancelada'
  asientosVendidos: number
  asientosTotal: number
}

// MOCK
const rutas = ref<Ruta[]>([
  { id: 1, frecuenciaId: 1, busPlaca: 'TBA-0234', fecha: '2026-05-20', hora: '06:00', origen: 'Latacunga', destino: 'Quito', estado: 'En curso', asientosVendidos: 38, asientosTotal: 44 },
  { id: 2, frecuenciaId: 2, busPlaca: 'TBA-0099', fecha: '2026-05-20', hora: '07:30', origen: 'Latacunga', destino: 'Cuenca', estado: 'Programada', asientosVendidos: 12, asientosTotal: 46 },
  { id: 3, frecuenciaId: 1, busPlaca: 'TBC-1192', fecha: '2026-05-19', hora: '06:00', origen: 'Latacunga', destino: 'Quito', estado: 'Finalizada', asientosVendidos: 44, asientosTotal: 44 },
])

const filtroFecha = ref(new Date().toISOString().slice(0, 10))
const filtroEstado = ref<'Todas' | Ruta['estado']>('Todas')

const mostrarForm = ref(false)
const mensaje = ref({ tipo: '' as '' | 'ok' | 'error', texto: '' })

const form = reactive({
  frecuenciaId: 1,
  busPlaca: '',
  fecha: filtroFecha.value,
  hora: '06:00',
})

function habilitar() {
  if (!form.busPlaca.trim()) {
    mensaje.value = { tipo: 'error', texto: 'Debes asignar un bus.' }
    return
  }
  const nextId = Math.max(0, ...rutas.value.map(r => r.id)) + 1
  rutas.value.push({
    id: nextId, frecuenciaId: form.frecuenciaId, busPlaca: form.busPlaca,
    fecha: form.fecha, hora: form.hora, origen: 'Latacunga', destino: 'Quito',
    estado: 'Programada', asientosVendidos: 0, asientosTotal: 44,
  })
  mostrarForm.value = false
  form.busPlaca = ''
  mensaje.value = { tipo: 'ok', texto: 'Ruta diaria habilitada.' }
  setTimeout(() => mensaje.value = { tipo: '', texto: '' }, 3000)
}

function cambiarEstado(r: Ruta, nuevo: Ruta['estado']) { r.estado = nuevo }

function eliminar(id: number) {
  if (!confirm('¿Cancelar y eliminar esta ruta?')) return
  rutas.value = rutas.value.filter(r => r.id !== id)
}

const rutasFiltradas = computed(() => rutas.value.filter(r => {
  const matchFecha  = !filtroFecha.value || r.fecha === filtroFecha.value
  const matchEstado = filtroEstado.value === 'Todas' || r.estado === filtroEstado.value
  return matchFecha && matchEstado
}))

const estadoBadge = (e: Ruta['estado']) => ({
  Programada: 'bg-blue-100 text-blue-700',
  'En curso': 'bg-amber-100 text-amber-700',
  Finalizada: 'bg-emerald-100 text-emerald-700',
  Cancelada: 'bg-red-100 text-red-700',
}[e])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Rutas diarias</h2>
        <p class="text-slate-500 text-sm">Habilita la ejecución diaria de una frecuencia con un bus asignado.</p>
      </div>
      <button @click="mostrarForm = !mostrarForm"
        class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        {{ mostrarForm ? 'Cancelar' : '+ Habilitar ruta' }}
      </button>
    </div>

    <div v-if="mensaje.texto" class="rounded-xl border p-3 text-sm font-bold"
      :class="mensaje.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'">
      {{ mensaje.tipo === 'ok' ? '✓' : '✗' }} {{ mensaje.texto }}
    </div>

    <section v-if="mostrarForm" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
      <h3 class="text-lg font-black text-slate-900 mb-4">Habilitar ruta diaria</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Frecuencia</label>
          <select v-model.number="form.frecuenciaId" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1">
            <option :value="1">Latacunga → Quito (06:00)</option>
            <option :value="2">Latacunga → Cuenca (07:30)</option>
            <option :value="3">Ambato → Guayaquil (21:00)</option>
          </select>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Bus (placa)</label>
          <input v-model="form.busPlaca" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1" placeholder="TBA-0234"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Fecha</label>
          <input v-model="form.fecha" type="date" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Hora</label>
          <input v-model="form.hora" type="time" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
      </div>
      <button @click="habilitar" class="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        Habilitar ruta
      </button>
    </section>

    <section class="rounded-2xl bg-white p-4 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div>
        <label class="text-xs font-bold text-slate-700">Fecha</label>
        <input v-model="filtroFecha" type="date" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1"/>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-700">Estado</label>
        <select v-model="filtroEstado" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1">
          <option>Todas</option><option>Programada</option><option>En curso</option><option>Finalizada</option><option>Cancelada</option>
        </select>
      </div>
    </section>

    <section class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-x-auto">
      <table v-if="rutasFiltradas.length" class="w-full">
        <thead class="bg-blue-700 text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Ruta</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha / Hora</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Bus</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Ocupación</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in rutasFiltradas" :key="r.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-bold text-slate-900">{{ r.origen }} → {{ r.destino }}</td>
            <td class="px-4 py-3 text-sm">{{ r.fecha }} · {{ r.hora }}</td>
            <td class="px-4 py-3 text-sm">{{ r.busPlaca }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" :style="{ width: ((r.asientosVendidos / r.asientosTotal) * 100) + '%' }"></div>
                </div>
                <span class="text-xs font-bold text-slate-600">{{ r.asientosVendidos }}/{{ r.asientosTotal }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(r.estado)">{{ r.estado }}</span>
            </td>
            <td class="px-4 py-3 text-right flex justify-end gap-2 flex-wrap">
              <select :value="r.estado" @change="cambiarEstado(r, ($event.target as HTMLSelectElement).value as Ruta['estado'])"
                class="rounded-xl bg-slate-50 text-slate-700 px-2 py-1.5 text-xs font-bold border border-slate-200">
                <option>Programada</option><option>En curso</option><option>Finalizada</option><option>Cancelada</option>
              </select>
              <button @click="eliminar(r.id)" class="rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="p-8 text-center text-slate-500">No hay rutas para los filtros seleccionados.</div>
    </section>
  </div>
</template>
