<template>
  <section class="hoja-ruta">
    <h2>Módulo de Hoja de Ruta</h2>

    <div class="panel">
      <label>
        Fecha de salida
        <input v-model="fechaSalida" type="date" />
      </label>

      <button @click="cargar">Consultar</button>
      <button @click="generar">Generar automáticas</button>
    </div>

    <form class="panel" @submit.prevent="crearManualFormulario">
      <h3>Generación manual</h3>
      <input v-model="form.frecuenciaId" placeholder="ID de frecuencia activa" required />
      <input v-model="form.busId" placeholder="ID de bus (opcional)" />
      <input v-model="form.choferId" placeholder="ID de chofer (opcional)" />
      <input v-model="form.horaSalida" type="time" placeholder="Hora de salida" />
      <textarea v-model="form.observaciones" placeholder="Observaciones"></textarea>
      <button type="submit">Crear hoja manual</button>
    </form>

    <p v-if="loading">Procesando...</p>
    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="hojasRuta.length">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Ruta</th>
          <th>Paradas</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="hoja in hojasRuta" :key="hoja.id">
          <td>{{ hoja.fechaSalida }}</td>
          <td>{{ hoja.horaSalida }}</td>
          <td>{{ hoja.origen }} - {{ hoja.destino }}</td>
          <td>{{ hoja.paradas.length ? hoja.paradas.join(' → ') : 'Directo' }}</td>
          <td>{{ hoja.tipoGeneracion }}</td>
          <td>{{ hoja.estado }}</td>
          <td>
            <button :disabled="!hoja.id" @click="iniciar(hoja.id!)">Iniciar</button>
            <button :disabled="!hoja.id" @click="finalizar(hoja.id!)">Finalizar</button>
            <button :disabled="!hoja.id" @click="cancelar(hoja.id!)">Cancelar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading">No hay hojas de ruta para la fecha seleccionada.</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useHojaRuta } from '../Composables/useHojaRuta';

const hoy = new Date().toISOString().slice(0, 10);
const fechaSalida = ref(hoy);

const form = reactive({
  frecuenciaId: '',
  busId: '',
  choferId: '',
  horaSalida: '',
  observaciones: '',
});

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
} = useHojaRuta();

const cargar = () => cargarPorFecha(fechaSalida.value);
const generar = () => generarAutomaticas(fechaSalida.value);

const crearManualFormulario = async () => {
  await crearManual({
    frecuenciaId: form.frecuenciaId,
    busId: form.busId || undefined,
    choferId: form.choferId || undefined,
    fechaSalida: fechaSalida.value,
    horaSalida: form.horaSalida || undefined,
    observaciones: form.observaciones || undefined,
  });

  form.frecuenciaId = '';
  form.busId = '';
  form.choferId = '';
  form.horaSalida = '';
  form.observaciones = '';
};

const iniciar = (id: string) => iniciarRuta(id, fechaSalida.value);
const finalizar = (id: string) => finalizarRuta(id, fechaSalida.value);
const cancelar = (id: string) => cancelarRuta(id, fechaSalida.value);

cargar();
</script>

<style scoped>
.hoja-ruta { padding: 20px; }
.panel { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
input, textarea, button { padding: 8px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #1E3A5F; color: white; }
.error { color: #b00020; font-weight: bold; }
</style>
