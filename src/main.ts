import { createApp } from 'vue'
import './index.css'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import Login from './Presentation/Views/Login.vue'
import Dashboard from './Presentation/Views/Dashboard.vue'
import Usuarios from './Presentation/Views/Usuarios.vue'
import BusesAdmin from './Presentation/Views/admin/BusesAdmin.vue'
import FrecuenciasAdmin from './Presentation/Views/admin/FrecuenciasAdmin.vue'
import RutasAdmin from './Presentation/Views/admin/RutasAdmin.vue'
import HojaRutaAdmin from './Presentation/Views/admin/HojaRutaAdmin.vue'
import VentaBoletos from './Presentation/Views/oficinista/VentaBoletos.vue'
import BuscarRutas from './Presentation/Views/cliente/BuscarRutas.vue'
import MisBoletos from './Presentation/Views/cliente/MisBoletos.vue'
import ValidarQR from './Presentation/Views/chofer/ValidarQR.vue'
import Reportes from './Presentation/Views/reportes/Reportes.vue'
import { useAuthStore } from './Presentation/Store/authStore'

const ADMIN = ['administrador', 'admin']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
// Mantenemos 'usuario final' por compatibilidad con cuentas antiguas creadas previamente
const CLIENTE = ['cliente', 'usuario final']

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: Login, meta: { public: true } },

    { path: '/', name: 'Dashboard', component: Dashboard },

    // Administración
    { path: '/admin/usuarios',    name: 'Usuarios',         component: Usuarios,        meta: { roles: ADMIN } },
    { path: '/admin/buses',       name: 'BusesAdmin',       component: BusesAdmin,      meta: { roles: ADMIN } },
    { path: '/admin/frecuencias', name: 'FrecuenciasAdmin', component: FrecuenciasAdmin,meta: { roles: ADMIN } },
    { path: '/admin/rutas',       name: 'RutasAdmin',       component: RutasAdmin,      meta: { roles: ADMIN } },
    { path: '/admin/hoja-ruta',   name: 'HojaRutaAdmin',    component: HojaRutaAdmin,   meta: { roles: [...ADMIN, ...OFICINISTA] } },

    // Ventas (Oficinista y Chofer según requerimientos)
    { path: '/venta',             name: 'VentaBoletos',     component: VentaBoletos,    meta: { roles: [...ADMIN, ...OFICINISTA, ...CHOFER] } },

    // Cliente (Flujo estrictamente aislado para evitar cruces con la interfaz de empleados)
    { path: '/buscar',            name: 'BuscarRutas',      component: BuscarRutas,     meta: { roles: CLIENTE } },
    { path: '/mis-boletos',       name: 'MisBoletos',       component: MisBoletos,      meta: { roles: CLIENTE } },

    // Chofer
    { path: '/abordaje',          name: 'ValidarQR',        component: ValidarQR,       meta: { roles: [...CHOFER, ...ADMIN] } },

    // Reportes
    { path: '/reportes',          name: 'Reportes',         component: Reportes,        meta: { roles: ADMIN } },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.user) {
    await authStore.initializeAuth()
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: '/' }
  }
  if (!to.meta.public && !authStore.isAuthenticated) {
    return { path: '/login' }
  }

  const allowedRoles: string[] | undefined = (to.meta as any).roles?.map((r: string) => r.toLowerCase().trim())
  if (!allowedRoles || allowedRoles.length === 0) return true

  const u: any = authStore.user
  const userRole = (u?.rol || u?.user_metadata?.rol || '').toLowerCase().trim()

  // Si el usuario tiene el rol permitido, pasa. Si no, lo devolvemos a la raíz.
  if (userRole && allowedRoles.includes(userRole)) return true
  return { path: '/' }
})

// Esperamos a que el router resuelva la sesión de Supabase (las llamadas async)
// ANTES de dibujar la aplicación de Vue. Esto elimina el parpadeo y la carga vacía.
router.isReady().then(() => {
  app.mount('#app')
})
