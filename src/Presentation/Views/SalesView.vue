<script setup lang="ts">
import { computed } from 'vue';
import { useVentaDescuento } from '../Composables/useVentaDescuento';

const {
  cedula,
  edad,
  tieneDiscapacidad,
  precioBase,
  origen,
  destino,
  resultado,
  errorMessage,
  calcular,
} = useVentaDescuento();

const puedeCalcular = computed(() => !!cedula.value && edad.value !== null && precioBase.value !== null);
</script>

<template>
  <section class="sales-view">
    <div class="sales-header">
      <h1>Core de Ventas y Descuentos</h1>
      <p>Validación de cédula + reglas de descuento para menores, discapacidad y tercera edad.</p>
    </div>

    <div class="form-grid">
      <label>
        Cédula
        <input v-model="cedula" type="text" placeholder="1710000009" maxlength="10" />
      </label>

      <label>
        Edad
        <input v-model.number="edad" type="number" min="0" max="120" />
      </label>

      <label>
        Precio base
        <input v-model.number="precioBase" type="number" min="0" step="0.01" placeholder="12.50" />
      </label>

      <label>
        Origen (parada)
        <input v-model="origen" type="text" placeholder="Latacunga" />
      </label>

      <label>
        Destino (parada)
        <input v-model="destino" type="text" placeholder="Cuenca" />
      </label>

      <label class="checkbox-row">
        <input v-model="tieneDiscapacidad" type="checkbox" />
        Pasajero con discapacidad
      </label>

      <button class="btn-calculate" :disabled="!puedeCalcular" @click="calcular">
        Calcular descuento
      </button>
    </div>

    <p class="hint">Nota: El precio base puede venir del cálculo de tramo entre paradas intermedias.</p>

    <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>

    <div v-if="resultado" class="result-box">
      <h2>Resultado</h2>
      <p>Categoría aplicada: <strong>{{ resultado.categoria }}</strong></p>
      <p>Porcentaje de descuento: <strong>{{ (resultado.porcentajeDescuento * 100).toFixed(0) }}%</strong></p>
      <p>Monto descontado: <strong>${{ resultado.montoDescuento.toFixed(2) }}</strong></p>
      <p>Precio final: <strong>${{ resultado.precioFinal.toFixed(2) }}</strong></p>
      <p v-if="origen || destino">Tramo seleccionado: <strong>{{ origen || 'N/A' }} - {{ destino || 'N/A' }}</strong></p>
    </div>
  </section>
</template>

<style scoped>
.sales-view {
  padding: 2rem 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.sales-header {
  margin-bottom: 1.5rem;
}

.sales-header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.25rem;
}

.sales-header p {
  font-size: 1rem;
  color: #666;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #222;
  font-size: 0.95rem;
}

input[type='text'],
input[type='number'] {
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
}

.checkbox-row {
  align-self: end;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.btn-calculate {
  align-self: end;
  padding: 0.7rem 1rem;
  background-color: #157347;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.3s;
}

.btn-calculate:hover:not(:disabled) {
  background-color: #0f5f39;
}

.btn-calculate:disabled {
  background-color: #9db8aa;
  cursor: not-allowed;
}

.hint {
  margin-bottom: 1rem;
  color: #555;
}

.error-box {
  border: 1px solid #f1aaaa;
  background: #fff1f1;
  color: #7f1d1d;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.result-box {
  border: 1px solid #b7e4cc;
  background: #f2fbf6;
  border-radius: 8px;
  padding: 1rem;
}

.result-box h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
}
</style>