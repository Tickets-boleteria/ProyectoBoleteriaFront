<script setup lang="ts">
import { useFrecuencias } from '../../Composables/useFrecuencias';

const { frecuencias, nuevaFrecuencia, loading, error, success, registrarFrecuencia } = useFrecuencias();
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
      
      <form @submit.prevent="registrarFrecuencia" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-if="error" role="alert" class="md:col-span-3 p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {{ error }}
        </div>
        <div v-if="success" role="alert" class="md:col-span-3 p-4 mb-4 text-sm text-emerald-700 bg-emerald-100 rounded-lg">
          {{ success }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Ciudad de Origen</label>
          <input type="text" v-model="nuevaFrecuencia.ciudadOrigen" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        
        <div>
          <label class="text-xs font-bold text-slate-700">Ciudad de Destino</label>
          <input type="text" v-model="nuevaFrecuencia.ciudadDestino" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Código ANT (Opcional)</label>
          <input type="text" v-model="nuevaFrecuencia.codigoAnt"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Resolución ANT (Opcional)</label>
          <input type="text" v-model="nuevaFrecuencia.resolucionAnt"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        
        <div>
          <label class="text-xs font-bold text-slate-700">Hora de Salida</label>
          <input type="time" v-model="nuevaFrecuencia.horaSalida" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>

        <div class="flex flex-col justify-center mt-6">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" v-model="nuevaFrecuencia.esDirecto" class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span class="text-sm font-bold text-slate-700">Ruta Directa</span>
          </label>
          <span class="text-[10px] text-slate-500 mt-1 ml-7">Sin paradas intermedias</span>
        </div>
        
        <div class="flex items-end">
          <button type="submit" :disabled="loading"
                  class="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-800 transition disabled:bg-slate-400">
            {{ loading ? 'Guardando...' : '✓ Registrar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabla de Frecuencias -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Frecuencias Aprobadas ({{ frecuencias.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Trayecto</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Hora Salida</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && frecuencias.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-sm text-slate-500">Cargando frecuencias...</td>
            </tr>
            <tr v-else-if="frecuencias.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-sm text-slate-500">Aún no hay frecuencias registradas.</td>
            </tr>
            <tr v-for="f in frecuencias" :key="f.Id || f.id || f.CodigoAnt" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-bold text-slate-800">
                {{ f.CiudadOrigen || f.ciudadorigen }} <span class="text-slate-400 mx-1">→</span> {{ f.CiudadDestino || f.ciudaddestino }}
              </td>
              <td class="px-4 py-3 text-sm text-slate-600 font-mono">
                {{ f.HoraSalida || f.hora_salida }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                      :class="(f.EsDirecto || f.es_directo) ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'">
                  {{ (f.EsDirecto || f.es_directo) ? 'Directo' : 'Con Paradas' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                      :class="(f.Activa || f.activa) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'">
                  {{ (f.Activa || f.activa) ? 'Aprobada' : 'Inactiva' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>