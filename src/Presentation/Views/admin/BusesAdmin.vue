<script setup lang="ts">
import { useBuses } from '../../Composables/useBuses';

const { buses, nuevoBus, loading, error, registrarBus } = useBuses();
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">Gestión de Flota de Buses</h1>
      <p class="mt-2 text-sm text-slate-300">
        Añade, visualiza y gestiona los vehículos de la cooperativa.
      </p>
    </div>

    <!-- Formulario de Creación -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">Registrar Nuevo Bus</h2>
      <form @submit.prevent="registrarBus" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-if="error" role="alert"
             class="md:col-span-4 p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {{ error }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">Número de Unidad</label>
             <input type="text" v-model="nuevoBus.numero" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Placa</label>
             <input type="text" v-model="nuevoBus.placa" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Estructura del bus</label>
          <select v-model="nuevoBus.estructura"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="UnPiso">Un piso</option>
            <option value="DosPisos">Dos pisos</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Asientos normales</label>
          <input type="number" min="1" v-model.number="nuevoBus.asientosNormales" required
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div v-if="nuevoBus.estructura === 'DosPisos'">
          <label class="text-xs font-bold text-slate-700">Asientos VIP</label>
          <input type="number" min="0" v-model.number="nuevoBus.asientosVip"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div v-if="nuevoBus.estructura === 'DosPisos'">
          <label class="text-xs font-bold text-slate-700">Asientos ejecutivos</label>
          <input type="number" min="0" v-model.number="nuevoBus.asientosEjecutivos"
                 class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </div>
        <div>
          <label class="text-xs font-bold text-slate-700">Total calculado</label>
          <input type="number" :value="nuevoBus.totalAsientos" disabled
                 class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mt-1 outline-none text-slate-600" />
        </div>
        <div class="flex items-end">
          <button type="submit" :disabled="loading"
                  class="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-800 transition disabled:bg-slate-400">
            {{ loading ? 'Registrando...' : '✓ Registrar Bus' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabla de Buses -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Listado de Buses ({{ buses.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Nº Unidad</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Placa</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estructura</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Capacidad</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && buses.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-sm text-slate-500">Cargando flota...</td>
            </tr>
            <tr v-else-if="buses.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-sm text-slate-500">No hay buses registrados.</td>
            </tr>
            <tr v-for="bus in buses" :key="bus.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-bold text-slate-800">{{ bus.numero }}</td>
              <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700">{{ bus.placa }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ bus.estructura === 'DosPisos' ? 'Dos pisos' : 'Un piso' }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ bus.totalAsientos }} asientos</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                      :class="bus.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
                  {{ bus.estado }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button class="text-blue-600 hover:text-blue-800 text-sm font-bold">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>