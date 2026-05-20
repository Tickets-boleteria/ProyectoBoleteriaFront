<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Hoja de ruta</h2>
        <p class="text-slate-500 text-sm">Programación operativa diaria: bus, chofer y hora de salida.</p>
      </div>
    </div>

    <!-- Filtros + acciones -->
    <section class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div class="rounded-2xl bg-slate-50 p-3">
        <label class="text-xs font-bold text-slate-700">Fecha de salida</label>
        <input v-model="fechaSalida" type="date" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1"/>
      </div>
      <button @click="cargar" class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
        Consultar
      </button>
      <button @click="generar" class="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700">
        Generar automáticas
      </button>
    </section>

    <!-- Generación manual -->
    <section class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
      <h3 class="text-lg font-black text-slate-900 mb-4">Generación manual</h3>
      <form @submit.prevent="crearManualFormulario" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">ID frecuencia activa *</label>
          <input v-model="form.frecuenciaId" required class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">ID bus</label>
          <input v-model="form.busId" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">ID chofer</label>
          <input v-model="form.choferId" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Hora de salida</label>
          <input v-model="form.horaSalida" type="time" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3 sm:col-span-2 lg:col-span-2">
          <label class="text-xs font-bold text-slate-700">Observaciones</label>
          <textarea v-model="form.observaciones" rows="2" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
        </div>
        <div class="sm:col-span-2 lg:col-span-3">
          <button type="submit" class="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
            Crear hoja manual
          </button>
        </div>
      </form>
    </section>

    <p v-if="loading" class="text-slate-500">Procesando...</p>
    <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{{ error }}</p>

    <!-- Tabla -->
    <section v-if="hojasRuta.length" class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-x-auto">
      <table class="w-full">
        <thead class="bg-blue-700 text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Hora</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Ruta</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Paradas</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="hoja in hojasRuta" :key="hoja.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 text-sm">{{ hoja.fechaSalida }}</td>
            <td class="px-4 py-3 text-sm font-bold">{{ hoja.horaSalida }}</td>
            <td class="px-4 py-3 text-sm">{{ hoja.origen }} → {{ hoja.destino }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">{{ hoja.paradas.length ? hoja.paradas.join(' → ') : 'Directo' }}</td>
            <td class="px-4 py-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{{ hoja.tipoGeneracion }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="estadoBadge(hoja.estado)">{{ hoja.estado }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2 flex-wrap">
                <button :disabled="!hoja.id" @click="iniciar(hoja.id!)" class="rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold disabled:opacity-40">Iniciar</button>
                <button :disabled="!hoja.id" @click="finalizar(hoja.id!)" class="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold disabled:opacity-40">Finalizar</button>
                <button :disabled="!hoja.id" @click="cancelar(hoja.id!)" class="rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold disabled:opacity-40">Cancelar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <p v-else-if="!loading" class="text-slate-500">No hay hojas de ruta para la fecha seleccionada.</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useHojaRuta } from '../../Composables/useHojaRuta'

const hoy = new Date().toISOString().slice(0, 10)
const fechaSalida = ref(hoy)

const form = reactive({
  frecuenciaId: '',
  busId: '',
  choferId: '',
  horaSalida: '',
  observaciones: '',
})

const {
  hojasRuta,
  loading,
  error,
  cargarPorFecha,
  generarAutomaticas,
  crearManual,
  iniciarRuta,
  finalizarRuta,
  cancelarRuta,
} = useHojaRuta()

const cargar  = () => cargarPorFecha(fechaSalida.value)
const generar = () => generarAutomaticas(fechaSalida.value)

const crearManualFormulario = async () => {
  await crearManual({
    frecuenciaId: form.frecuenciaId,
    busId: form.busId || undefined,
    choferId: form.choferId || undefined,
    fechaSalida: fechaSalida.value,
    horaSalida: form.horaSalida || undefined,
    observaciones: form.observaciones || undefined,
  })
  form.frecuenciaId = ''; form.busId = ''; form.choferId = ''; form.horaSalida = ''; form.observaciones = ''
}

const iniciar   = (id: string) => iniciarRuta(id, fechaSalida.value)
const finalizar = (id: string) => finalizarRuta(id, fechaSalida.value)
const cancelar  = (id: string) => cancelarRuta(id, fechaSalida.value)

const estadoBadge = (e: string) => ({
  PROGRAMADA: 'bg-blue-100 text-blue-700',
  EN_CURSO:   'bg-amber-100 text-amber-700',
  FINALIZADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA:  'bg-red-100 text-red-700',
}[e] || 'bg-slate-100 text-slate-700')

cargar()
</script>
