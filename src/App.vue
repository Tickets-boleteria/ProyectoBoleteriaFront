<template>
  <AppLayout v-if="authStore.isAuthenticated">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>

<script setup lang="ts">
import { useAuthStore } from './Presentation/Store/authStore'
import AppLayout from './Presentation/Components/AppLayout.vue'

const authStore = useAuthStore()
</script>
