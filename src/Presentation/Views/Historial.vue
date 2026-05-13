<script setup lang="ts">
import { useTickets } from '../Composables/useTickets';

const { boletos, isLoading, errorMessage, cargarHistorial } = useTickets();

const testFetch = () => {
  // Pasamos un ID de prueba (por ejemplo, 1). 
  cargarHistorial(1);
};
</script>

<template>
  <div style="padding: 20px;">
    <h1>Estado de la Conexión con Supabase</h1>
    
    <button @click="testFetch" :disabled="isLoading" style="background: #3eaf7c; color: white; padding: 10px; border-radius: 5px; cursor: pointer; border: none;">
      {{ isLoading ? 'Conectando...' : 'Probar Conexión (Cargar Cooperativas)' }}
    </button>

    <div v-if="errorMessage" style="color: red; margin-top: 20px;">
      <strong>Error:</strong> {{ errorMessage }}
    </div>

    <div style="margin-top: 20px; text-align: left;">
      <strong>Datos recibidos (Arquitectura Limpia):</strong>
      <pre v-if="boletos.length > 0" style="background: #f4f4f4; padding: 1rem; border-radius: 8px; color: black">{{ boletos }}</pre>
      <div v-else-if="!errorMessage && !isLoading">
        No hay datos o no se ha iniciado la prueba.
      </div>
    </div>
  </div>
</template>