<template>
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
    <!-- ============ SIDEBAR PREMIUM ============ -->
    <aside
      class="fixed top-0 left-0 z-50 h-screen bg-slate-900 text-white shadow-[0_0_50px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col border-r border-white/5"
      :class="expanded ? 'w-72' : 'w-20'"
      @mouseenter="expanded = true"
      @mouseleave="expanded = false"
    >
      <!-- Logo Section -->
      <div class="flex items-center gap-4 p-5 h-24 border-b border-white/5">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-blue-500 to-indigo-600 font-black text-white shadow-lg shadow-blue-500/30">
          B
        </div>
        <div
          class="flex flex-col transition-all duration-300"
          :class="expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
        >
          <span class="font-black text-lg leading-none tracking-tight">Boletería</span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ecuador v2.0</span>
        </div>
      </div>

      <!-- User Profile Small -->
      <div class="p-4 border-b border-white/5 bg-white/5 overflow-hidden">
        <div class="flex items-center gap-4">
          <div class="h-10 w-10 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner border border-white/5">
            👤
          </div>
          <div
            class="flex flex-col transition-all duration-300 min-w-0"
            :class="expanded ? 'opacity-100' : 'opacity-0'"
          >
            <p class="font-black text-sm truncate">{{ displayName }}</p>
            <span class="text-[9px] font-black uppercase tracking-tighter text-blue-400 mt-0.5 truncate">
               {{ role }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-6 overflow-y-auto overflow-x-hidden custom-scroll space-y-1">
        <template v-if="!ready">
          <div v-for="n in 6" :key="n" class="mx-4 h-12 rounded-2xl bg-white/5 animate-pulse mb-2"/>
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
              class="group relative flex items-center gap-4 mx-3 px-4 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden"
              :class="isActive
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'"
            >
              <div v-if="isActive" class="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-50"></div>
              
              <span class="text-xl shrink-0 w-6 text-center z-10 transition-transform duration-300 group-hover:scale-110">
                {{ item.icon }}
              </span>
              
              <span
                class="text-sm font-black whitespace-nowrap transition-all duration-300 z-10"
                :class="expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
              >
                {{ item.label }}
              </span>

              <!-- Tooltip on collapsed -->
              <div v-if="!expanded" class="fixed left-24 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-black shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] uppercase tracking-widest border border-white/10">
                {{ item.label }}
              </div>
            </a>
          </router-link>
        </template>
      </nav>

      <!-- Logout Footer -->
      <div class="p-4 border-t border-white/5">
        <button
          @click="logout"
          class="w-full group flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all duration-300"
        >
          <span class="text-xl shrink-0 w-6 text-center">⎋</span>
          <span
            class="text-sm font-black whitespace-nowrap transition-all duration-300"
            :class="expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
          >
            Cerrar Sesión
          </span>
        </button>
      </div>
    </aside>

    <!-- ============ MAIN CONTENT AREA ============ -->
    <main class="transition-all duration-500" :class="expanded ? 'ml-72' : 'ml-20'">
      <!-- Global Top Header -->
      <header class="sticky top-0 z-40 h-24 bg-white/70 backdrop-blur-2xl border-b border-slate-100 px-8 flex items-center justify-between transition-all">
        <div class="flex items-center gap-4">
          <div class="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping"></div>
          <div>
            <h1 class="text-xl font-black text-slate-900 tracking-tight leading-none">{{ currentTitle }}</h1>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Boletería Digital • {{ todayLabel }}</p>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <button class="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100">
            🔔
          </button>
          <div class="h-10 w-[1px] bg-slate-100"></div>
          <div class="flex items-center gap-3">
             <div class="text-right hidden sm:block">
               <p class="text-xs font-black text-slate-900 leading-none">{{ displayName }}</p>
               <p class="text-[9px] font-bold text-slate-400 uppercase mt-1">{{ role }}</p>
             </div>
             <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center text-lg">
               ✨
             </div>
          </div>
        </div>
      </header>

      <!-- View Slot -->
      <div class="p-8 lg:p-10 max-w-[1600px] mx-auto">
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
import { useUiStore } from '../Store/uiStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()

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
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/mis-boletos', label: 'Mis boletos', icon: '🎟️', roles: CLIENTE },
  { to: '/buscar', label: 'Buscar ruta', icon: '🔎', roles: CLIENTE },
  { to: '/oficinista/venta-boletos', label: 'Venta presencial', icon: '💳', roles: [...OFICINISTA, ...ADMIN] },
  { to: '/oficinista/aprobar-pagos', label: 'Aprobar pagos', icon: '✅', roles: [...OFICINISTA, ...ADMIN] },
  { to: '/abordaje', label: 'Abordaje', icon: '📷', roles: [...OFICINISTA, ...CHOFER, ...ADMIN] },
  { to: '/admin/rutas', label: 'Operaciones', icon: '🛣️', roles: [...OFICINISTA, ...ADMIN] },
  { to: '/admin/hoja-ruta', label: 'Despacho', icon: '📋', roles: ADMIN },
  { to: '/reportes', label: 'Reportes', icon: '📊', roles: [...OFICINISTA, ...ADMIN] },
  { to: '/admin/usuarios', label: 'Usuarios', icon: '👥', roles: ADMIN },
  { to: '/admin/buses', label: 'Flota', icon: '🚌', roles: ADMIN },
  { to: '/admin/frecuencias', label: 'Frecuencias', icon: '⏰', roles: ADMIN },
  { to: '/admin/configuracion', label: 'Ajustes', icon: '⚙️', roles: ADMIN },
]

const displayName = computed(() => {
  const u: any = user.value
  return u?.nombres || u?.user_metadata?.nombres || u?.email?.split('@')[0] || 'Invitado'
})

const normalizeRole = (value: string | null | undefined) => {
  const normalized = (value || '').toLowerCase().trim()
  if (normalized === 'usuario final') return 'cliente'
  if (normalized === 'administrador') return 'admin'
  return normalized
}

const visibleItems = computed(() => {
  const currentRole = normalizeRole(role.value)
  if (!currentRole) return items.filter(item => !item.roles)
  return items.filter(item => !item.roles || item.roles.some(r => normalizeRole(r) === currentRole))
})

const currentTitle = computed(() => {
  const match = items.find(item => item.to === route.path)
  return match ? match.label : 'Boletería'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  })
)

function go(to: string) { router.push(to) }

async function logout() {
  const confirm = await uiStore.showConfirm({
    title: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas salir del sistema?',
    type: 'warning',
    confirmText: 'Cerrar Sesión',
    cancelText: 'Permanecer'
  })
  if (!confirm) return
  await authStore.logout()
  router.push('/login')
}
</script>

<style>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
</style>
