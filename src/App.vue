<template>
  <AppLayout v-if="authStore.isAuthenticated">
    <router-view />
  </AppLayout>
  <router-view v-else />
  <NotificationSystem />
</template>

<script setup lang="ts">
import { useAuthStore } from './Presentation/Store/authStore'
import AppLayout from './Presentation/Components/AppLayout.vue'
import NotificationSystem from './Presentation/Components/NotificationSystem.vue'

const authStore = useAuthStore()
</script>
