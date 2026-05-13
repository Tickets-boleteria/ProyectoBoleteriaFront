<template>
  <div>
    <nav style="background:#1E3A5F; padding:10px 20px; display:flex; gap:20px;">
      <router-link to="/" style="color:white; text-decoration:none;">
        Historial
      </router-link>
      <router-link to="/hoja-ruta" style="color:white; text-decoration:none;">
        Hoja de Ruta
      </router-link>
      <router-link to="/usuarios" style="color:white; text-decoration:none;">
        Usuarios
      </router-link>
    </nav>

    <main>
      <h1>Bienvenido a la Boletería</h1>
      <p>Módulo de ventas con descuentos por reglas de negocio.</p>
      <hr />

      <SalesView />

      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import SalesView from './Presentation/Views/SalesView.vue';
</script>