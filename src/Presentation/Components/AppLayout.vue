<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    <!-- ============ SIDEBAR PERSISTENTE (se expande con hover) ============ -->
    <aside
      class="fixed top-0 left-0 z-40 h-screen bg-blue-700 text-white shadow-2xl transition-all duration-300 ease-out flex flex-col"
      :class="expanded ? 'w-64' : 'w-16'"
      @mouseenter="expanded = true"
      @mouseleave="expanded = false"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 p-4 border-b border-white/10">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white font-black text-blue-700">B</span>
        <span
          class="font-black whitespace-nowrap transition-opacity duration-200"
          :class="expanded ? 'opacity-100' : 'opacity-0'"
        >
          Boletería
        </span>
      </div>

      <!-- Saludo -->
      <div class="px-4 py-3 border-b border-white/10 overflow-hidden">
        <p class="text-[10px] uppercase tracking-wider text-blue-200">Sesión</p>
        <p
          class="font-bold text-sm whitespace-nowrap transition-opacity duration-200"
          :class="expanded ? 'opacity-100' : 'opacity-0'"
        >
          {{ displayName }}
        </p>
        <span
          v-if="role"
          class="inline-block mt-1 text-[10px] font-bold rounded-full bg-emerald-400/20 text-emerald-200 px-2 py-0.5 whitespace-nowrap transition-opacity duration-200"
          :class="expanded ? 'opacity-100' : 'opacity-0'"
        >
          {{ role }}
        </span>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <!-- Skeleton mientras la sesión se rehidrata -->
        <template v-if="!ready">
          <div
            v-for="n in 5"
            :key="n"
            class="mx-2 mb-1 h-11 rounded-xl bg-white/10 animate-pulse"
          />
        </template>

        <template v-else>
          <router-link
            v-for="item in visibleItems"
            :key="item.to"
            :to="item.to"
            v-slot="{ isActive }"
            custom
          >
            <a
              :href="item.to"
              @click.prevent="go(item.to)"
              class="group flex items-center gap-3 mx-2 mb-1 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer"
              :class="isActive
                ? 'bg-white text-blue-700 shadow-md'
                : 'text-blue-100 hover:bg-white/10'"
              :title="!expanded ? item.label : ''"
            >
              <span class="text-xl shrink-0 w-6 text-center">{{ item.icon }}</span>
              <span
                class="text-sm font-bold whitespace-nowrap transition-opacity duration-200"
                :class="expanded ? 'opacity-100' : 'opacity-0'"
              >
                {{ item.label }}
              </span>
            </a>
          </router-link>
        </template>
      </nav>

      <!-- Logout -->
      <div class="p-3 border-t border-white/10">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-red-500/90 hover:bg-red-500 transition-colors font-bold cursor-pointer"
          :title="!expanded ? 'Cerrar sesión' : ''"
        >
          <span class="text-xl shrink-0 w-6 text-center">⎋</span>
          <span
            class="text-sm whitespace-nowrap transition-opacity duration-200"
            :class="expanded ? 'opacity-100' : 'opacity-0'"
          >
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>

    <!-- ============ ÁREA PRINCIPAL ============ -->
    <main class="ml-16 transition-all duration-300 min-h-screen">
      <header class="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Boletería Interprovincial</p>
          <h1 class="text-lg font-black text-slate-800">{{ currentTitle }}</h1>
        </div>
        <div class="text-xs text-slate-500 font-medium">
          {{ todayLabel }}
        </div>
      </header>

      <div class="p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../Store/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const { user, ready, role } = storeToRefs(authStore)

const expanded = ref(false)

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[]
}

const ADMIN = ['admin', 'administrador']
const OFICINISTA = ['oficinista']
const CHOFER = ['chofer']
const CLIENTE = ['cliente', 'usuario final']

const items: NavItem[] = [
  // Todos los roles autenticados
  {
    to: '/',
    label: 'Dashboard',
    icon: '🏠',
  },

  // Usuario final / Cliente
  {
    to: '/mis-boletos',
    label: 'Mis boletos',
    icon: '🎟️',
    roles: CLIENTE,
  },
  {
    to: '/buscar',
    label: 'Buscar ruta',
    icon: '🔎',
    roles: CLIENTE,
  },

  // Venta: cliente, oficinista, chofer y administrador
  {
    to: '/venta',
    label: 'Venta',
    icon: '💳',
    roles: [ ...OFICINISTA, ...CHOFER, ...ADMIN],
  },

  // Abordaje: oficinista, chofer y administrador
  {
    to: '/abordaje',
    label: 'Abordaje',
    icon: '📷',
    roles: [...OFICINISTA, ...CHOFER, ...ADMIN],
  },

  // Rutas: oficinista y administrador
  {
    to: '/admin/rutas',
    label: 'Rutas',
    icon: '🛣️',
    roles: [...OFICINISTA, ...ADMIN],
  },

  // Reportes: oficinista y administrador
  {
    to: '/reportes',
    label: 'Reportes',
    icon: '📊',
    roles: [...OFICINISTA, ...ADMIN],
  },

  // Opciones exclusivas del administrador
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: '👥',
    roles: ADMIN,
  },
  {
    to: '/admin/buses',
    label: 'Buses',
    icon: '🚌',
    roles: ADMIN,
  },
  {
    to: '/admin/frecuencias',
    label: 'Frecuencias',
    icon: '⏰',
    roles: ADMIN,
  },
]

const displayName = computed(() => {
  const u: any = user.value
  return u?.nombres || u?.user_metadata?.nombres || u?.email || 'Invitado'
})

const normalizeRole = (value: string | null | undefined) => {
  const normalized = (value || '').toLowerCase().trim()

  if (normalized === 'usuario final') return 'cliente'
  if (normalized === 'administrador') return 'admin'

  return normalized
}

const visibleItems = computed(() => {
  const currentRole = normalizeRole(role.value)

  if (!currentRole) {
    return items.filter(item => !item.roles)
  }

  return items.filter(item => {
    if (!item.roles) return true

    return item.roles.some(itemRole => {
      return normalizeRole(itemRole) === currentRole
    })
  })
})

const currentTitle = computed(() => {
  const match = items.find(item => item.to === route.path)
  if (match) return match.label

  return 'Boletería'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
)

function go(to: string) {
  router.push(to)
}

async function logout() {
  if (!confirm('¿Estás seguro de cerrar sesión?')) return

  await authStore.logout()
  router.push('/login')
}
</script>