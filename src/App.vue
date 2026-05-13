<script setup lang="ts">
import SalesView from './Presentation/Views/SalesView.vue';
</script>

<template>
  <main>
    <h1>Bienvenido a la Boletería</h1>
    <p>Módulo de ventas con descuentos por reglas de negocio.</p>
    <hr />
    <SalesView />
  </main>
</template>

<style scoped>
main {
  text-align: center;
  padding: 2rem;
  font-family: sans-serif;
}
</style>