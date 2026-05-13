import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Historial from './Presentation/Views/Historial.vue'
import Usuarios from './Presentation/Views/Usuarios.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Historial },
    { path: '/usuarios', component: Usuarios },
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
