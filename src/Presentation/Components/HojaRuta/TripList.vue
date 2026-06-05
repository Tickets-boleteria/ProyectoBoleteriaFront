<template>
  <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
    <div class="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
      <h4 class="font-black text-slate-800 uppercase text-xs tracking-wider">Trayectos Asignados</h4>
      <span class="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold">
        {{ rutas.length }} Trayectos
      </span>
    </div>
    
    <div v-if="rutas.length === 0" class="p-8 text-center text-slate-400 text-sm">
      No hay trayectos asignados para esta hoja de ruta.
    </div>
    
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
          <tr>
            <th class="px-4 py-2">Hora</th>
            <th class="px-4 py-2">Bus</th>
            <th class="px-4 py-2">Frecuencia</th>
            <th class="px-4 py-2">Estado</th>
            <th class="px-4 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="ruta in sortedRutas" :key="ruta.id" class="hover:bg-slate-50/50 transition-colors">
            <td class="px-4 py-3 text-sm font-black text-slate-900">{{ ruta.horaSalida }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {{ ruta.busId }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <button @click="$emit('toggle-directo', ruta)" 
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all active:scale-95"
                      :class="ruta.esDirecta ? 'bg-orange-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'">
                <component :is="ruta.esDirecta ? LightningIcon : BusIcon" class="w-3 h-3" />
                {{ ruta.esDirecta ? 'Directo' : 'Con Paradas' }}
              </button>
            </td>
            <td class="px-4 py-3">
              <span :class="estadoClass(ruta.estado)" class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                {{ ruta.estado }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button class="text-slate-400 hover:text-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Ruta } from '../../../Domain/Entities/Ruta';

const props = defineProps<{
  rutas: Ruta[]
}>();

const sortedRutas = computed(() => {
  return [...props.rutas].sort((a, b) => {
    if (!a.horaSalida || !b.horaSalida) return 0;
    return a.horaSalida.localeCompare(b.horaSalida);
  });
});

defineEmits(['toggle-directo']);

const LightningIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  `
};

const BusIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V14.25M17.25 18.75h1.125c.621 0 1.129-.504 1.129-1.125V14.25M6.75 14.25h10.5V6.75A1.125 1.125 0 0016.125 5.625H7.875A1.125 1.125 0 006.75 6.75v7.5z" />
    </svg>
  `
};

const estadoClass = (estado: string) => {
  switch (estado.toLowerCase()) {
    case 'programada': return 'bg-blue-50 text-blue-600';
    case 'habilitada': return 'bg-emerald-50 text-emerald-600';
    case 'encurso': return 'bg-amber-50 text-amber-600';
    case 'completada': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-50 text-slate-500';
  }
};
</script>
