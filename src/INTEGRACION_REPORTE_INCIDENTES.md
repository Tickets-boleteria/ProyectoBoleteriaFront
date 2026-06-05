/**
 * EJEMPLO DE INTEGRACIÓN: ReportarIncidenteModal
 * 
 * Este archivo muestra cómo integrar el componente ReportarIncidenteModal
 * en una vista existente (por ejemplo, en la página de gestión de buses).
 */

/*
=== OPCIÓN 1: En un componente de vista (ej. GestionarBuses.vue) ===

<template>
  <div>
    <!-- ... otros contenidos de la vista ... -->
    
    <!-- Botón para abrir el modal -->
    <button
      @click="abrirModalReporte"
      class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition-colors"
    >
      🚨 Reportar Incidente Operativo
    </button>

    <!-- Modal de reporte -->
    <ReportarIncidenteModal
      :isOpen="mostrarModalReporte"
      @close="cerrarModalReporte"
      @success="alReporteExitoso"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ReportarIncidenteModal from '../Components/ReportarIncidenteModal.vue';

const mostrarModalReporte = ref(false);

function abrirModalReporte() {
  mostrarModalReporte.value = true;
}

function cerrarModalReporte() {
  mostrarModalReporte.value = false;
}

function alReporteExitoso() {
  // Aquí puedes:
  // - Recargar la lista de buses
  // - Mostrar notificación de éxito
  // - Navegar a otra sección
  console.log('Incidente reportado exitosamente');
  // Ejemplo: await cargarBuses();
}
</script>

*/

/*
=== OPCIÓN 2: En un componente separado (ControlIncidentes.vue) ===

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="text-3xl">⚠️</div>
      <div class="flex-1">
        <h3 class="font-bold text-red-900">Centro de Control de Incidentes</h3>
        <p class="text-sm text-red-700">Reporta buses fuera de servicio inmediatamente</p>
      </div>
      <button
        @click="abrirReporte"
        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
      >
        Nuevo Reporte
      </button>
    </div>

    <ReportarIncidenteModal
      :isOpen="mostrarReporte"
      @close="mostrarReporte = false"
      @success="onReporteExitoso"
    />

    <!-- Lista de incidentes recientes (si lo necesitas) -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="font-bold mb-3">Incidentes Recientes</h3>
      <p class="text-gray-500">Los incidentes reportados aparecerán aquí</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ReportarIncidenteModal from '../Components/ReportarIncidenteModal.vue';

const mostrarReporte = ref(false);

function abrirReporte() {
  mostrarReporte.value = true;
}

function onReporteExitoso() {
  // Notificar al administrador
  console.log('Incidente reportado y operaciones notificada');
}
</script>

*/

/*
=== FLUJO COMPLETO DE LA ARQUITECTURA ===

1. PRESENTACIÓN (UI):
   - ReportarIncidenteModal.vue → Formulario con chips de motivos
   - useReportarIncidente composable → Estado y lógica de presentación

2. APPLICATION (Orquestación):
   - ReportarIncidenteOperativo use case → Validaciones de negocio
   - ReactivarBus use case → Reactivación de bus

3. DOMAIN (Lógica de negocio):
   - BusFueraDeServicioException → Excepciones específicas del dominio
   - ESTADOS_BUS enum → Estados válidos del bus

4. INFRASTRUCTURE (Persistencia):
   - SupabaseBusRepository.marcarFueraDeServicio() → Actualiza estado en BD
   - SupabaseBusRepository.reactivarBus() → Reactiva bus
   - SupabaseBusRepository.obtenerRutasAfectadas() → Conta rutas impactadas

=== RESPONSABILIDADES POR CAPA ===

✅ PRESENTACIÓN:
  - Renderizar formulario
  - Manejar eventos del usuario
  - Mostrar feedback (loading, error, éxito)
  - NO valida lógica de negocio

✅ APPLICATION:
  - Valida motivos válidos (catálogo)
  - Valida bus de reemplazo
  - Orquesta el cambio de estado
  - Genera respuesta enriquecida al front

✅ DOMAIN:
  - Define excepciones de negocio
  - Define estados válidos
  - Mantiene coherencia de entidades

✅ INFRASTRUCTURE:
  - Ejecuta queries a BD
  - Persiste cambios
  - No implementa lógica de negocio

=== CASOS DE USO SOPORTADOS ===

1. Reportar bus averiado → FueraDeServicio inmediatamente
2. Sugerir reemplazo → Admin elige si aceptar
3. Reactivar bus → Cambiar de FueraDeServicio a Activo
4. Auditoría → Quién reportó, cuándo, por qué
5. Notificaciones → Operaciones recibe alerta

*/
