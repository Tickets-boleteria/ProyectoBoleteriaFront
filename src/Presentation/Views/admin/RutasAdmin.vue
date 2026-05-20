<script setup lang="ts">
import { useRutas } from '../../Composables/useRutas';

const { rutas, buses, frecuencias, nuevaRuta, loading, error, success, registrarRuta } = useRutas();
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">Habilitación de Rutas Diarias</h1>
      <p class="mt-2 text-sm text-slate-300">
        Asigna unidades (buses) a las frecuencias aprobadas para crear rutas operativas en fechas específicas.
      </p>
    </div>

    <!-- Formulario de Creación -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">Habilitar Nueva Ruta</h2>
      
      <form @submit.prevent="registrarRuta" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-if="error" role="alert" class="md:col-span-4 p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {{ error }}
        </div>
        <div v-if="success" role="alert" class="md:col-span-4 p-4 mb-4 text-sm text-emerald-700 bg-emerald-100 rounded-lg">
          {{ success }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">1. Frecuencia Aprobada</label>
          <select v-model="nuevaRuta.frecuenciaId" required
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="" disabled>Seleccione una frecuencia...</option>
            <!-- Tolerante a minúsculas y mayúsculas según la respuesta de tu BD -->
            <option v-for="f in frecuencias" :key="f.Id || f.id" :value="f.Id || f.id">
              {{ f.CiudadOrigen || f.ciudadorigen }} - {{ f.CiudadDestino || f.ciudaddestino }} ({{ f.HoraSalida || f.hora_salida }})
            </option>
          </select>
        </div>
        
        <div>
          <label class="text-xs font-bold text-slate-700">2. Bus Disponible</label>
          <select v-model="nuevaRuta.busId" required
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="" disabled>Seleccione una unidad...</option>
            <option v-for="b in buses" :key="b.Id || b.id" :value="b.Id || b.id">
              Unidad #{{ b.Numero || b.numero }} ({{ b.Placa || b.placa }})
            </option>
          </select>
        </div>
        
        <div>
          <label class="text-xs font-bold text-slate-700">3. Fecha de Salida</label>
          <input type="date" v-model="nuevaRuta.fecha" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        
        <div class="flex items-end">
          <button type="submit" :disabled="loading"
                  class="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-800 transition disabled:bg-slate-400">
            {{ loading ? 'Procesando...' : '✓ Asignar Ruta' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabla de Rutas Creadas -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Rutas Habilitadas ({{ rutas.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Frecuencia Base</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Unidad Asignada</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && rutas.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-sm text-slate-500">Cargando rutas operativas...</td>
            </tr>
            <tr v-else-if="rutas.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-sm text-slate-500">Aún no hay rutas habilitadas en el sistema.</td>
            </tr>
            <tr v-for="ruta in rutas" :key="ruta.Id || ruta.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700">{{ ruta.Fecha || ruta.fecha }}</td>
              <td class="px-4 py-3 font-bold text-slate-800">
                {{ ruta.Frecuencias?.CiudadOrigen || ruta.Frecuencias?.ciudadorigen || 'Cargando...' }} 
                <span class="text-slate-400 mx-1">→</span> 
                {{ ruta.Frecuencias?.CiudadDestino || ruta.Frecuencias?.ciudaddestino || 'Cargando...' }}
                <span class="text-xs font-normal text-slate-500 ml-1">({{ ruta.Frecuencias?.HoraSalida || ruta.Frecuencias?.hora_salida }})</span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                Unidad #{{ ruta.Buses?.Numero || ruta.Buses?.numero || '?' }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  {{ ruta.Estado || ruta.estado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>