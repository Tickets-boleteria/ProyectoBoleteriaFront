<template>
  <div v-if="authStore.isAuthenticated">
    <nav style="background:#1E3A5F; padding:10px 20px; display:flex; gap:20px; justify-content: space-between; align-items: center;">
      <div style="display: flex; gap: 20px;">
        <router-link to="/" style="color:white; text-decoration:none;">
          Historial
        </router-link>
        <router-link to="/hoja-ruta" style="color:white; text-decoration:none;">
          Hoja de Ruta
        </router-link>
        <router-link to="/usuarios" style="color:white; text-decoration:none;">
          Usuarios
        </router-link>
      </div>
      <button 
        @click="logout"
        style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;"
      >
        Cerrar Sesión
      </button>
    </nav>

    <main>
      <h1>Bienvenido a la Boletería</h1>
      <p>Módulo de ventas con descuentos por reglas de negocio.</p>
      <hr />

      <SalesView />

      <router-view />
    </main>
  </div>
  <div v-else>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './Presentation/Store/authStore'
import { useRouter } from 'vue-router'
import SalesView from './Presentation/Views/SalesView.vue'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>