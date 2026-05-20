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

const ADMIN = ['Administrador', 'Admin']
const OFICINISTA = ['Oficinista']
const CHOFER = ['Chofer']
const CLIENTE = ['Cliente']

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: Login, meta: { public: true } },

    // Dashboard es polimórfico, sirve para todos los roles autenticados
    { path: '/', name: 'Dashboard', component: Dashboard },

    // Administración
    { path: '/admin/usuarios',    name: 'Usuarios',         component: Usuarios,        meta: { roles: ADMIN } },
    { path: '/admin/buses',       name: 'BusesAdmin',       component: BusesAdmin,      meta: { roles: ADMIN } },
    { path: '/admin/frecuencias', name: 'FrecuenciasAdmin', component: FrecuenciasAdmin,meta: { roles: ADMIN } },
    { path: '/admin/rutas',       name: 'RutasAdmin',       component: RutasAdmin,      meta: { roles: ADMIN } },
    { path: '/admin/hoja-ruta',   name: 'HojaRutaAdmin',    component: HojaRutaAdmin,   meta: { roles: [...ADMIN, ...OFICINISTA] } },

    // Oficinista
    { path: '/venta',             name: 'VentaBoletos',     component: VentaBoletos,    meta: { roles: [...ADMIN, ...OFICINISTA] } },

    // Cliente
    { path: '/buscar',            name: 'BuscarRutas',      component: BuscarRutas,     meta: { roles: [...CLIENTE, ...ADMIN, ...OFICINISTA] } },
    { path: '/mis-boletos',       name: 'MisBoletos',       component: MisBoletos,      meta: { roles: [...CLIENTE, ...ADMIN] } },

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

  const allowedRoles: string[] | undefined = (to.meta as any).roles
  if (!allowedRoles || allowedRoles.length === 0) return true

  const u: any = authStore.user
  const userRole =
    u?.rol || u?.role ||
    u?.user_metadata?.rol || u?.user_metadata?.role ||
    null

  // Si no hay rol disponible, permitir acceso al Dashboard pero bloquear el resto
  if (!userRole) {
    if (to.path === '/') return true
    return { path: '/' }
  }

  if (allowedRoles.includes(userRole)) return true
  return { path: '/' }
})

app.mount('#app')
