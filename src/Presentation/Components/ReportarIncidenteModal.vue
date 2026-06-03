<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div
        class="sticky top-0 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-4 border-b border-red-200 flex items-center justify-between"
      >
        <div>
          <h2 class="text-xl font-bold">Reportar Incidente Operativo</h2>
          <p class="text-sm text-red-100 mt-1">
            Marca un bus como En mantenimiento
          </p>
        </div>
        <button
          @click="cerrar"
          class="ml-4 text-2xl hover:text-red-200 transition-colors"
        >
          ×
        </button>
      </div>

      <!-- Contenido del formulario -->
      <form @submit.prevent="enviarFormulario" class="p-6 space-y-4">
        <!-- Mensaje de éxito -->
        <div
          v-if="success"
          class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
        >
          <strong>✓ Éxito:</strong> {{ responseData?.acciones.mensaje }}
        </div>

        <!-- Mensaje de error -->
        <div
          v-if="error"
          class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          <strong>✗ Error:</strong> {{ error }}
        </div>

        <!-- Campo: Número de Unidad -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >Número de Unidad *</label
          >
          <div class="relative">
            <input
              v-model="formIncidente.busNumero"
              type="text"
              placeholder="Ej: 045"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              :disabled="loading || props.busNumero !== null"
              @blur="validarBusNumero"
            />
            <span
              v-if="busNumeroValidando"
              class="absolute right-3 top-2.5 text-gray-500"
              >⏳</span
            >
            <span
              v-if="busNumeroExiste === true"
              class="absolute right-3 top-2.5 text-green-500"
              >✓</span
            >
            <span
              v-if="busNumeroExiste === false"
              class="absolute right-3 top-2.5 text-red-500"
              >✗</span
            >
          </div>
          <p v-if="busNumeroExiste === false" class="text-xs text-red-600 mt-1">
            {{ busNumeroError }}
          </p>
          <p v-else-if="busNumeroError" class="text-xs text-red-600 mt-1">
            {{ busNumeroError }}
          </p>
          <p v-if="props.busNumero === null" class="text-xs text-gray-500 mt-1">
            Usa el número visible de la unidad, por ejemplo 045
          </p>
        </div>

        <!-- Campo: Motivo (Chips) -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2"
            >Motivo del Incidente *</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="motivo in motivosCatalogo"
              :key="motivo.value"
              type="button"
              @click="seleccionarMotivo(motivo.value)"
              class="px-3 py-2 rounded-full text-sm font-medium transition-all"
              :class="
                formIncidente.motivo === motivo.value
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
              :disabled="loading"
            >
              {{ motivo.label }}
            </button>
          </div>
        </div>

        <!-- Campo: Descripción -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >Descripción</label
          >
          <textarea
            v-model="formIncidente.descripcion"
            placeholder="Ej: Falla de frenos, ruido en el motor..."
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="loading || formIncidente.motivo !== 'Otro'"
          />
          <p
            v-if="formIncidente.motivo && formIncidente.motivo !== 'Otro'"
            class="text-xs text-gray-500 mt-1"
          >
            La descripción se autocompleta según el motivo seleccionado.
          </p>
        </div>

        <!-- Campo: Fecha del Incidente -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >Fecha del Incidente</label
          >
          <input
            v-model="formIncidente.fechaIncidente"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="loading"
          />
        </div>

        <!-- Campo: Bus de Reemplazo -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >Número de Unidad de Reemplazo (Opcional)</label
          >
          <input
            v-model="formIncidente.replacementBusNumero"
            type="text"
            placeholder="Ej: 045 (dejar vacío si no hay reemplazo)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="loading"
          />
          <p class="text-xs text-gray-500 mt-1">
            El administrador decidirá si reasignar este bus
          </p>
        </div>

        <!-- Campo: Reportado Por -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >Tu Usuario</label
          >
          <input
            v-model="formIncidente.reportadoPor"
            type="text"
            placeholder="Tu nombre/ID"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            :disabled="loading"
          />
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="cerrar"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition-colors"
            :disabled="loading"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="
              loading ||
              !formIncidente.busNumero ||
              busNumeroExiste !== true ||
              !formIncidente.motivo
            "
          >
            {{ loading ? "Reportando..." : "Reportar Incidente" }}
          </button>
        </div>
      </form>

      <!-- Info adicional (si hay respuesta) -->
      <div
        v-if="responseData && success"
        class="bg-blue-50 px-6 py-4 border-t border-blue-200"
      >
        <h3 class="font-bold text-blue-900 mb-2">📊 Resumen</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Bus:</strong> {{ responseData.busActualizado.numero }} (ID
            interno: {{ responseData.busActualizado.id }})
          </li>
          <li>
            <strong>Rutas Afectadas:</strong> {{ responseData.rutasAfectadas }}
          </li>
          <li>
            <strong>Reemplazo Posible:</strong>
            {{ responseData.acciones.reemplazoPosible ? "Sí" : "No" }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from "vue";
import { useReportarIncidente } from "../Composables/useReportarIncidente";
import { SupabaseBusRepository } from "../../Infrastructure/Repositories/SupabaseBusRepository";
import { useBuses } from "../Composables/useBuses";

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  busNumero: {
    type: String,
    required: false,
    default: null,
  },
});

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const {
  formIncidente,
  motivosCatalogo,
  seleccionarMotivo,
  loading,
  error,
  success,
  responseData,
  reportarIncidente,
  limpiarFormulario,
} = useReportarIncidente();

// Estados de validación
const busNumeroValidando = ref(false);
const busNumeroExiste = ref<boolean | null>(null);
const busNumeroError = ref("");
const busRepository = new SupabaseBusRepository();
const { reportarIncidenteYRefrescar, loading: loadingBuses } = useBuses();

// Cuando se abre el modal con un número de unidad prop, lo usa automáticamente
watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal && props.busNumero) {
      formIncidente.busNumero = props.busNumero;
      await validarBusNumero(false); // Sin mostrar validando mientras se carga
    }
  },
);

async function validarBusNumero(mostrarValidando = true) {
  busNumeroError.value = "";

  const busNumeroValue = String(formIncidente.busNumero ?? "").trim();

  if (!busNumeroValue) {
    busNumeroError.value = "Ingresa el número de unidad";
    busNumeroExiste.value = false;
    return;
  }

  // Validar que exista en la BD
  if (mostrarValidando) busNumeroValidando.value = true;

  try {
    const bus = await busRepository.obtenerPorNumero(busNumeroValue);
    if (bus) {
      busNumeroExiste.value = true;
      busNumeroError.value = "";
    } else {
      busNumeroError.value = "Bus no encontrado en el sistema";
      busNumeroExiste.value = false;
    }
  } catch (err: any) {
    // Si el error es "No rows found", el bus no existe
    if (err.message && err.message.includes("No rows found")) {
      busNumeroError.value = "Bus no encontrado en el sistema";
    } else {
      busNumeroError.value = "Error al validar bus: " + err.message;
    }
    busNumeroExiste.value = false;
  } finally {
    busNumeroValidando.value = false;
  }
}

async function enviarFormulario() {
  // Validación final antes de enviar
  if (!formIncidente.busNumero || busNumeroExiste.value !== true) {
    error.value = "Debes ingresar un número de unidad válido y existente";
    return;
  }

  try {
    // 1. Consultamos los IDs internos numéricos en Supabase usando los números visibles ("045")
    const busAveriado = await busRepository.obtenerPorNumero(
      String(formIncidente.busNumero).trim(),
    );

    let replacementId: number | undefined = undefined;
    if (formIncidente.replacementBusNumero) {
      const busReemplazo = await busRepository.obtenerPorNumero(
        String(formIncidente.replacementBusNumero).trim(),
      );
      if (busReemplazo) {
        replacementId = busReemplazo.id;
      }
    }

    if (!busAveriado) {
      error.value = "No se pudo recuperar la información del bus averiado.";
      return;
    }

    // 2. 🚀 EXECUTAMOS NUESTRA FUNCIÓN OPTIMIZADA: Guarda en BD y refresca las tablas locales
    await reportarIncidenteYRefrescar(
      busAveriado.id!,
      replacementId,
      formIncidente.motivo,
      formIncidente.descripcion,
    );

    // Activamos la bandera de éxito para mostrar el banner verde
    success.value = true;

    // 3. Cierre controlado y emisión de eventos de éxito
    setTimeout(() => {
      cerrar();
      emit("success");
    }, 2000);
  } catch (err: any) {
    error.value = "Error al procesar el incidente: " + (err.message || err);
  }
}

function cerrar() {
  limpiarFormulario();
  busNumeroExiste.value = null;
  busNumeroError.value = "";
  busNumeroValidando.value = false;
  emit("close");
}
</script>

<style scoped>
/* Animación de entrada suave */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

div[role="dialog"] {
  animation: slideIn 0.3s ease-out;
}
</style>
