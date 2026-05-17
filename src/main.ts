import { createApp } from 'vue'
import './index.css'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import Login from './Presentation/Views/Login.vue'
import Historial from './Presentation/Views/Historial.vue'
import Usuarios from './Presentation/Views/Usuarios.vue'
import HojaRuta from './Presentation/Views/HojaRuta.vue'
import { useAuthStore } from './Presentation/Store/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: Login },
    { path: '/', name: 'Historial', component: Historial },
    { path: '/usuarios', name: 'Usuarios', component: Usuarios, meta: { roles: ['Administrador'] } },
    { path: '/hoja-ruta', name: 'HojaRuta', component: HojaRuta, meta: { roles: ['Administrador', 'Oficinista'] } },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ]
})

const pinia = createPinia()
const app = createApp(App)

// Instalar Pinia antes de usar el store dentro del guard
app.use(pinia)
app.use(router)

// Guard de rutas (ahora Pinia ya está instalado)
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  // Inicializar autenticación si el usuario aún no está cargado
  if (!authStore.user) {
    await authStore.initializeAuth()
  }

  // authStore properties are unwrapped by Pinia when accessed directly
  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: '/' }
  }

  if (to.path !== '/login' && !authStore.isAuthenticated) {
    return { path: '/login' }
  }

  // Si la ruta no define restricciones por roles, permitir
  const allowedRoles: string[] | undefined = (to.meta as any).roles
  if (!allowedRoles || allowedRoles.length === 0) {
    return true
  }

  // Extraer rol del usuario, soportando diferentes shapes (supabase vs domain)
  const u: any = authStore.user
  const userRole = u?.rol || u?.role || u?.user_metadata?.rol || u?.user_metadata?.role || null

  if (!userRole) {
    // No hay rol disponible; redirigir al login por seguridad
    return { path: '/login' }
  }

  if (allowedRoles.includes(userRole)) {
    return true
  }

  // Redirigir a raíz si no tiene permiso
  return { path: '/' }
})

app.mount('#app')
