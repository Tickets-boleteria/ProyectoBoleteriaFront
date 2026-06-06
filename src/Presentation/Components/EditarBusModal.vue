<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  bus: any | null;
}>();

const emit = defineEmits(['close', 'save']);

// Estados locales reactivos para el formulario
const estado = ref('Activo');
const estructura = ref('UnPiso');
const numero = ref('');
const placa = ref('');
const totalAsientos = ref(0);

// Escuchar cuando cambie el bus seleccionado para cargar sus datos en el formulario
watch(() => props.bus, (nuevoBus) => {
  if (nuevoBus) {
    numero.value = nuevoBus.numero;
    placa.value = nuevoBus.placa;
    totalAsientos.value = nuevoBus.totalAsientos;
    estado.value = nuevoBus.estado || 'Activo';
    estructura.value = nuevoBus.estructura || 'UnPiso';
  }
}, { immediate: true });

function guardarCambios() {
  emit('save', {
    id: props.bus.id,
    numero: numero.value,
    placa: placa.value,
    totalAsientos: totalAsientos.value,
    estado: estado.value,
    estructura: estructura.value
  });
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <h3 class="text-lg font-black text-slate-800">⚙️ Editar Vehículo (Disco {{ numero }})</h3>
        <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
      </div>

      <form @submit.prevent="guardarCambios" class="space-y-4">
        <!-- Modificar Estado (Reactivación) -->
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado de Operación</label>
          <select v-model="estado" class="select-premium mt-1">
            <option value="Activo">🟢 Activo (Disponible)</option>
            <option value="EnMantenimiento">🟠 En Mantenimiento</option>
            <option value="Inactivo">🔴 Inactivo</option>
          </select>
        </div>

        <!-- Campo solicitado: Estructura del Bus -->
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estructura del Vehículo</label>
          <select v-model="estructura" class="select-premium mt-1">
            <option value="UnPiso">🚌 Autobús de Un Piso (Estándar)</option>
            <option value="DosPisos">🚍 Autobús de Dos Pisos (Double Decker)</option>
          </select>
        </div>

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nº de Asientos</label>
          <input type="number" v-model.number="totalAsientos" required class="input-premium mt-1" />
        </div>

        <div class="flex space-x-3 pt-2">
          <button type="button" @click="emit('close')" class="w-1/2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" class="w-1/2 rounded-xl bg-blue-700 py-3 text-sm font-black text-white hover:bg-blue-800 shadow-md">
            ✓ Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  </div>
</template>