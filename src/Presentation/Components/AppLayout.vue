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
        >Boletería</span>
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
        <!-- Skeleton mientras la sesión se rehidrata: evita el parpadeo
             en el que solo aparecen las rutas públicas al recargar -->
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
              >{{ item.label }}</span>
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
          >Cerrar sesión</span>
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

// storeToRefs mantiene la reactividad de user/ready/role.
// Si los desestructuras sin esto, pierden reactividad y NO se actualizan
// cuando la sesión se rehidrata tras recargar.
const { user, ready, role } = storeToRefs(authStore)

const expanded = ref(false)

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[] // si no se define, visible para cualquier rol autenticado
}

const items: NavItem[] = [
  { to: '/',                  label: 'Dashboard',     icon: '🏠' },
  { to: '/buscar',            label: 'Buscar rutas',  icon: '🔎', roles: ['Cliente', 'Administrador', 'Admin', 'Oficinista'] },
  { to: '/mis-boletos',       label: 'Mis boletos',   icon: '🎟️', roles: ['Cliente', 'Administrador', 'Admin'] },
  { to: '/venta',             label: 'Venta',         icon: '💳', roles: ['Oficinista', 'Administrador', 'Admin'] },
  { to: '/abordaje',          label: 'Abordaje',      icon: '📷', roles: ['Chofer', 'Administrador', 'Admin'] },
  { to: '/admin/buses',       label: 'Buses',         icon: '🚌', roles: ['Administrador', 'Admin'] },
  { to: '/admin/frecuencias', label: 'Frecuencias',   icon: '⏰', roles: ['Administrador', 'Admin'] },
  { to: '/admin/rutas',       label: 'Rutas',         icon: '🛣️', roles: ['Administrador', 'Admin'] },
  { to: '/admin/hoja-ruta',   label: 'Hoja de ruta',  icon: '📋', roles: ['Administrador', 'Admin', 'Oficinista'] },
  { to: '/admin/usuarios',    label: 'Usuarios',      icon: '👥', roles: ['Administrador', 'Admin'] },
  { to: '/reportes',          label: 'Reportes',      icon: '📊', roles: ['Administrador', 'Admin'] },
]

const displayName = computed(() => {
  const u: any = user.value
  return u?.nombres || u?.user_metadata?.nombres || u?.email || 'Invitado'
})

const visibleItems = computed(() => {
  if (!role.value) return items.filter(i => !i.roles) // solo públicas si no hay rol
  return items.filter(i => !i.roles || i.roles.includes(role.value!))
})

const currentTitle = computed(() => {
  const match = items.find(i => i.to === route.path)
  if (match) return match.label
  return 'Boletería'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-EC', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
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