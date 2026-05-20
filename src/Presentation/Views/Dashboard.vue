<template>
  <div class="space-y-6">
    <section v-if="loading" class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
      <p class="text-sm font-bold text-slate-500">Cargando dashboard desde la base de datos...</p>
    </section>

    <section v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p class="font-bold">No se pudo cargar el dashboard</p>
      <p class="mt-1 text-sm">{{ error }}</p>
      <button @click="recargar" class="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">
        Reintentar
      </button>
    </section>

    <!-- ====== BIENVENIDA EMOCIONAL ====== -->
    <section class="rounded-[2rem] bg-blue-700 p-6 lg:p-8 text-white shadow-2xl">
      <div class="flex items-center gap-2 mb-3">
        <span class="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
        <span class="text-xs font-bold uppercase tracking-wider text-blue-100">
          {{ saludoHora }}
        </span>
      </div>
      <h2 class="text-3xl lg:text-4xl font-black leading-tight">
        Hola, {{ displayName }}.
      </h2>
      <p class="text-blue-100 mt-2">{{ rolMensaje }}</p>
    </section>

    <!-- ====== RESUMEN COOPERATIVA (Admin / Oficinista) ====== -->
    <section v-if="esCooperativa && resumen" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article v-for="kpi in kpisCooperativa" :key="kpi.label"
        class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-start justify-between">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ kpi.label }}</p>
          <span class="text-2xl">{{ kpi.icon }}</span>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900">{{ kpi.value }}</p>
        <p class="mt-1 text-xs font-bold" :class="kpi.delta >= 0 ? 'text-emerald-600' : 'text-red-600'">
          {{ kpi.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(kpi.delta) }}% vs ayer
        </p>
      </article>
    </section>

    <!-- ====== RESUMEN CLIENTE ====== -->
    <section v-if="esCliente && resumen" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article v-for="kpi in kpisCliente" :key="kpi.label"
        class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-start justify-between">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ kpi.label }}</p>
          <span class="text-2xl">{{ kpi.icon }}</span>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900">{{ kpi.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ kpi.hint }}</p>
      </article>
    </section>

    <!-- ====== GRÁFICOS ====== -->
    <section v-if="esCooperativa && resumen" class="grid gap-6 lg:grid-cols-3">
      <!-- Boletos vendidos últimos 7 días -->
      <div class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        <h3 class="font-black text-slate-900 mb-1">Boletos vendidos – últimos 7 días</h3>
        <p class="text-sm text-slate-500 mb-4">Detección temprana de picos y caídas de demanda.</p>
        <div class="flex items-end gap-3 h-48">
          <div v-for="dia in ventasSemana" :key="dia.label"
            class="flex-1 flex flex-col items-center gap-2">
            <div class="text-xs font-bold text-slate-700">{{ dia.value }}</div>
            <div class="w-full bg-blue-100 rounded-t-lg relative overflow-hidden" style="height:140px">
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                :style="{ height: ((dia.value / maxVenta) * 100) + '%' }"></div>
            </div>
            <div class="text-[10px] font-bold uppercase text-slate-400">{{ dia.label }}</div>
          </div>
        </div>
      </div>

      <!-- Rutas más usadas -->
      <div class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        <h3 class="font-black text-slate-900 mb-1">Rutas más usadas</h3>
        <p class="text-sm text-slate-500 mb-4">Top demanda actual.</p>
        <div class="space-y-3">
          <div v-for="r in rutasTop" :key="r.ruta">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-bold text-slate-700">{{ r.ruta }}</span>
              <span class="text-slate-500">{{ r.boletos }}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full"
                :style="{ width: ((r.boletos / rutasTop[0].boletos) * 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cliente: gastos por mes -->
    <section v-if="esCliente && resumen" class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        <h3 class="font-black text-slate-900 mb-1">Tus gastos en viajes</h3>
        <p class="text-sm text-slate-500 mb-4">Últimos 6 meses.</p>
        <div class="flex items-end gap-3 h-48">
          <div v-for="m in gastosMeses" :key="m.label"
            class="flex-1 flex flex-col items-center gap-2">
            <div class="text-xs font-bold text-slate-700">${{ m.value }}</div>
            <div class="w-full bg-emerald-100 rounded-t-lg relative overflow-hidden" style="height:140px">
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400"
                :style="{ height: ((m.value / maxGasto) * 100) + '%' }"></div>
            </div>
            <div class="text-[10px] font-bold uppercase text-slate-400">{{ m.label }}</div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        <h3 class="font-black text-slate-900 mb-1">Próximo viaje</h3>
        <p class="text-sm text-slate-500 mb-4">Recordatorio activo.</p>
        <div v-if="proximoViaje" class="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p class="text-xs font-bold uppercase text-blue-600 tracking-wider">{{ proximoViaje.fecha }}</p>
          <p class="text-lg font-black text-slate-900 mt-1">{{ proximoViaje.origen }} → {{ proximoViaje.destino }}</p>
          <p class="text-sm text-slate-600 mt-1">{{ proximoViaje.cooperativa }} · Asiento {{ proximoViaje.asiento }}</p>
          <router-link to="/mis-boletos"
            class="mt-3 inline-block text-sm font-bold text-blue-700 underline underline-offset-4">
            Ver boleto y QR →
          </router-link>
        </div>
        <p v-else class="text-slate-500 text-sm">No tienes viajes próximos. <router-link to="/buscar" class="font-bold text-blue-700 underline">Buscar rutas</router-link></p>
      </div>
    </section>

    <!-- ====== ACCIONES RÁPIDAS (Shneiderman: shortcuts) ====== -->
    <section class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
      <h3 class="font-black text-slate-900 mb-4">Accesos rápidos</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <router-link v-for="acc in accesosRapidos" :key="acc.to"
          :to="acc.to"
          class="rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all p-4 flex items-center gap-3">
          <span class="text-2xl">{{ acc.icon }}</span>
          <div>
            <p class="font-bold text-slate-900 text-sm">{{ acc.label }}</p>
            <p class="text-xs text-slate-500">{{ acc.desc }}</p>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../Store/authStore'
import { useDashboard } from '../Composables/useDashboard'

const authStore = useAuthStore()
const { resumen, loading, error, recargar } = useDashboard()

const role = computed<string | null>(() => {
  const u: any = authStore.user
  return u?.rol || u?.role || u?.user_metadata?.rol || u?.user_metadata?.role || null
})

const displayName = computed(() => {
  const u: any = authStore.user
  return u?.nombres || u?.user_metadata?.nombres || (u?.email?.split('@')[0]) || 'Pasajero'
})

const saludoHora = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const rolMensaje = computed(() => {
  return resumen.value?.rolMensaje || 'Encuentra tu próximo viaje en pocos clics.'
})

const kpisCooperativa = computed(() => resumen.value?.kpis ?? [])
const kpisCliente = computed(() => resumen.value?.kpis ?? [])
const ventasSemana = computed(() => resumen.value?.ventasSemana ?? [])
const rutasTop = computed(() => resumen.value?.rutasTop ?? [])
const gastosMeses = computed(() => resumen.value?.gastosMeses ?? [])
const proximoViaje = computed(() => resumen.value?.proximoViaje ?? null)

const maxVenta = computed(() => Math.max(1, ...ventasSemana.value.map(v => v.value)))
const maxGasto = computed(() => Math.max(1, ...gastosMeses.value.map(g => g.value)))

const accesosRapidos = computed(() => {
  return resumen.value?.accesosRapidos ?? []
})

const esCooperativa = computed(() => resumen.value?.tipo === 'cooperativa')
const esCliente = computed(() => resumen.value?.tipo === 'cliente')
</script>
