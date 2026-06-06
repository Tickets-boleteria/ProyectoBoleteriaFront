<template>
  <div class="space-y-8 animate-in">
    <section v-if="loading" class="card-premium p-12 text-center">
      <div class="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p class="mt-4 text-sm font-black text-slate-400 uppercase tracking-widest">
        Sincronizando operaciones...
      </p>
    </section>

    <section v-else-if="error" class="rounded-[2rem] border-2 border-rose-100 bg-rose-50 p-8 text-rose-700 text-center shadow-xl">
      <p class="text-xl font-black">Error de Conexión</p>
      <p class="mt-2 text-sm font-medium opacity-80">{{ error }}</p>

      <button @click="recargar" class="mt-6 btn-primary mx-auto bg-rose-600 hover:bg-rose-700 shadow-rose-200">
        Reintentar Sincronización
      </button>
    </section>

    <template v-else>
      <!-- Hero Header Premium -->
      <section class="header-premium !p-10 lg:!p-12">
        <div class="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <span class="inline-flex px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-emerald-400/20">
              <span class="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5"></span>
              Sistema Operativo Online
            </span>
            <span class="text-xs font-bold text-blue-200">{{ saludoHora }}</span>
          </div>

          <h2 class="text-4xl lg:text-5xl font-black leading-tight text-white tracking-tighter">
            Bienvenido, <span class="text-blue-400">{{ displayName }}</span>.
          </h2>

          <p class="text-slate-400 mt-4 max-w-2xl font-medium text-lg">
            {{ rolMensaje }}
          </p>
        </div>
      </section>

      <!-- KPIs Premium -->
      <section v-if="resumen" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="kpi in resumen.kpis"
          :key="kpi.label"
          class="card-premium group hover:-translate-y-1 transition-all duration-300 !p-6"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {{ kpi.label }}
              </p>
              <p class="text-3xl font-black text-slate-900 tracking-tight">
                {{ kpi.value }}
              </p>
            </div>
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl group-hover:scale-110 transition-transform">{{ kpi.icon }}</span>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <p v-if="kpi.hint" class="text-[10px] font-bold text-slate-400 uppercase">
              {{ kpi.hint }}
            </p>
            <div
              v-else-if="typeof kpi.delta === 'number'"
              class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter"
              :class="kpi.delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
            >
              <span>{{ kpi.delta >= 0 ? '▲' : '▼' }}</span>
              {{ Math.abs(kpi.delta) }}%
            </div>
          </div>
        </article>
      </section>

      <!-- Secciones Operativas -->
      <section v-if="esChofer" class="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="card-premium p-8">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h3 class="text-xl font-black text-slate-900">Itinerario Operativo</h3>
              <p class="text-xs text-slate-400 font-bold uppercase mt-1">Próximo servicio asignado</p>
            </div>
            <span class="p-3 rounded-2xl bg-blue-50 text-blue-600 text-2xl">📅</span>
          </div>

          <div v-if="proximoViaje" class="rounded-3xl bg-slate-900 text-white p-8 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <p class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">
              {{ proximoViaje.fecha }} <span class="mx-2 opacity-30">|</span> {{ proximoViaje.hora || '--:--' }}
            </p>

            <h4 class="text-3xl font-black tracking-tighter">
              {{ proximoViaje.origen }} <span class="text-slate-600">→</span> {{ proximoViaje.destino }}
            </h4>

            <div class="mt-8 grid gap-4 sm:grid-cols-3">
              <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unidad</p>
                <p class="font-black text-lg mt-1">{{ proximoViaje.bus || 'N/D' }}</p>
              </div>

              <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Placa</p>
                <p class="font-black text-lg mt-1">{{ proximoViaje.placa || '---' }}</p>
              </div>

              <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Estado</p>
                <p class="font-black text-lg mt-1 text-emerald-400">{{ proximoViaje.estado || 'OK' }}</p>
              </div>
            </div>
          </div>

          <div v-else class="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p class="text-slate-400 font-bold text-sm">Sin despachos próximos registrados.</p>
          </div>
        </article>

        <article class="card-premium p-8 flex flex-col justify-center bg-slate-50/50">
          <div class="text-center space-y-6">
            <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-200 text-4xl">📷</div>
            <div>
              <h3 class="text-xl font-black text-slate-900">Control de Abordaje</h3>
              <p class="text-sm text-slate-500 mt-2 font-medium">Valida los boletos de los pasajeros mediante escaneo QR en tiempo real.</p>
            </div>
            <router-link to="/abordaje" class="btn-primary !py-4 w-full text-base">
              Iniciar Escáner
            </router-link>
          </div>
        </article>
      </section>

      <!-- Quick Access Premium -->
      <section class="card-premium p-8">
        <h3 class="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <span class="p-2 rounded-xl bg-slate-100">⚡</span>
          Accesos Directos
        </h3>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="accion in accesosRapidos"
            :key="accion.to"
            :to="accion.to"
            class="group rounded-2xl border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/50 transition-all p-5 flex items-center gap-4 shadow-sm"
          >
            <span class="text-3xl group-hover:scale-110 transition-transform">
              {{ accion.icon }}
            </span>

            <div>
              <p class="font-black text-slate-900 text-sm tracking-tight leading-none">
                {{ accion.label }}
              </p>

              <p class="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                {{ accion.desc }}
              </p>
            </div>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-in { animation: fadeIn 0.6s ease-out; }
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../Store/authStore'
import { useDashboard } from '../Composables/useDashboard'

const authStore = useAuthStore()
const { resumen, loading, error, recargar } = useDashboard()

const displayName = computed(() => {
  const usuario: any = authStore.user

  return (
    usuario?.nombres ||
    usuario?.user_metadata?.nombres ||
    usuario?.email?.split('@')[0] ||
    'Usuario'
  )
})

const saludoHora = computed(() => {
  const hora = new Date().getHours()

  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'

  return 'Buenas noches'
})

const rolMensaje = computed(() => {
  return resumen.value?.rolMensaje || 'Bienvenido al sistema de boletería.'
})

const esCliente = computed(() => resumen.value?.tipo === 'cliente')
const esCooperativa = computed(() => resumen.value?.tipo === 'cooperativa')
const esChofer = computed(() => resumen.value?.tipo === 'chofer')

const ventasSemana = computed(() => resumen.value?.ventasSemana ?? [])
const rutasTop = computed(() => resumen.value?.rutasTop ?? [])
const gastosMeses = computed(() => resumen.value?.gastosMeses ?? [])
const proximoViaje = computed(() => resumen.value?.proximoViaje ?? null)
const accesosRapidos = computed(() => resumen.value?.accesosRapidos ?? [])

const maxVenta = computed(() => {
  return Math.max(1, ...ventasSemana.value.map((item: any) => Number(item.value || 0)))
})

const maxGasto = computed(() => {
  return Math.max(1, ...gastosMeses.value.map((item: any) => Number(item.value || 0)))
})

const maxRutaTop = computed(() => {
  return Math.max(1, ...rutasTop.value.map((item: any) => Number(item.boletos || 0)))
})
</script>