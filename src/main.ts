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
import ConfiguracionAdmin from './Presentation/Views/admin/ConfiguracionAdmin.vue'
import { useAuthStore } from './Presentation/Store/authStore'
import  AprobarPago  from './Presentation/Views/oficinista/AprobarPago.vue'

const ADMIN = ['admin', 'administrador']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
const CLIENTE = ['cliente', 'usuario final']

const TODOS = [
  ...ADMIN,
  ...OFICINISTA,
  ...CHOFER,
  ...CLIENTE,
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { roles: TODOS },
    },

    {
      path: '/admin/usuarios',
      name: 'Usuarios',
      component: Usuarios,
      meta: { roles: ADMIN },
    },
    {
      path: '/admin/buses',
      name: 'BusesAdmin',
      component: BusesAdmin,
      meta: { roles: ADMIN },
    },
    {
      path: '/admin/frecuencias',
      name: 'FrecuenciasAdmin',
      component: FrecuenciasAdmin,
      meta: { roles: ADMIN },
    },
    {
      path: '/admin/hoja-ruta',
      name: 'HojaRutaAdmin',
      component: HojaRutaAdmin,
      meta: { roles: ADMIN },
    },
    {
      path: '/admin/configuracion',
      name: 'ConfiguracionAdmin',
      component: ConfiguracionAdmin,
      meta: { roles: ADMIN },
    },
    {
      path: '/admin/rutas',
      name: 'RutasAdmin',
      component: RutasAdmin,
      meta: { roles: [...ADMIN, ...OFICINISTA] },
    },

    {
      path: '/oficinista/venta-boletos',
      name: 'VentaBoletosOficinista',
      component: VentaBoletos,
      meta: { roles: [...OFICINISTA, ...ADMIN] },
    },

    {
      path: '/cliente/comprar-boleto',
      name: 'ComprarBoletoCliente',
      component: BuscarRutas,
      meta: { roles: [...CLIENTE] },
    },

    {
      path: '/oficinista/aprobar-pagos',
      name: 'AprobarPago',
      component: AprobarPago,
      meta: { roles: [...OFICINISTA, ...ADMIN] },
    },

    {
      path: '/buscar',
      name: 'BuscarRutas',
      component: BuscarRutas,
      meta: { roles: CLIENTE },
    },
    {
      path: '/mis-boletos',
      name: 'MisBoletos',
      component: MisBoletos,
      meta: { roles: CLIENTE },
    },

    {
      path: '/abordaje',
      name: 'ValidarQR',
      component: ValidarQR,
      meta: { roles: [...CHOFER, ...ADMIN] },
    },
    {
      path: '/chofer/validar-qr',
      name: 'ValidarQRChofer',
      component: ValidarQR,
      meta: { roles: [...CHOFER, ...ADMIN] },
    },

    {
      path: '/reportes',
      name: 'Reportes',
      component: Reportes,
      meta: { roles: [...OFICINISTA, ...ADMIN] },
    },

    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const authStore = useAuthStore(pinia)

function normalizeRole(value: string | null | undefined) {
  const normalized = (value || '').toLowerCase().trim()

  if (normalized === 'administrador') return 'admin'
  if (normalized === 'usuario final') return 'cliente'

  return normalized
}

router.beforeEach(async (to) => {
  if (!authStore.ready) {
    await authStore.initializeAuth()
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: '/' }
  }

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { path: '/login' }
  }

  const allowedRoles: string[] | undefined = (to.meta as any).roles

  if (!allowedRoles || allowedRoles.length === 0) {
    return true
  }

  const userRole = normalizeRole(authStore.role)
  const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role))

  if (userRole && normalizedAllowedRoles.includes(userRole)) {
    return true
  }

  return { path: '/' }
})

router.isReady().then(() => {
  app.mount('#app')
})