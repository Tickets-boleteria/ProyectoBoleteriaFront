<template>
  <div class="space-y-6">

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
    <section v-if="esCooperativa" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <section v-if="esCliente" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <section v-if="esCooperativa" class="grid gap-6 lg:grid-cols-3">
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
    <section v-if="esCliente" class="grid gap-6 lg:grid-cols-3">
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

const authStore = useAuthStore()

const role = computed<string | null>(() => {
  const u: any = authStore.user
  return u?.rol || u?.role || u?.user_metadata?.rol || u?.user_metadata?.role || null
})
const esCooperativa = computed(() =>
  ['Administrador', 'Admin', 'Oficinista'].includes(role.value || ''))
const esCliente = computed(() => role.value === 'Cliente' || !role.value)

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
  if (role.value === 'Administrador' || role.value === 'Admin')
    return 'Aquí tienes el pulso de la cooperativa en un vistazo.'
  if (role.value === 'Oficinista')
    return 'Listo para registrar nuevas ventas con rapidez y precisión.'
  if (role.value === 'Chofer')
    return 'Tus rutas asignadas para hoy te esperan.'
  return 'Encuentra tu próximo viaje en pocos clics.'
})

// =================== DATOS MOCK (reemplaza por composables reales) ===================
const kpisCooperativa = [
  { label: 'Boletos hoy',      value: '142', delta: 8,  icon: '🎟️' },
  { label: 'Recaudación',      value: '$ 1.842', delta: 12, icon: '💰' },
  { label: 'Buses en ruta',    value: '18',  delta: 0,  icon: '🚌' },
  { label: 'Ocupación media',  value: '74%', delta: -3, icon: '📈' },
]

const kpisCliente = [
  { label: 'Viajes hechos',   value: '14', hint: 'Histórico total',   icon: '🗺️' },
  { label: 'Gasto total',     value: '$ 168', hint: 'En 12 meses',    icon: '💵' },
  { label: 'Próximo viaje',   value: '3 días', hint: 'Latacunga → Quito', icon: '⏳' },
  { label: 'Cooperativa fav', value: 'Latinos', hint: '6 viajes',     icon: '⭐' },
]

const ventasSemana = [
  { label: 'Lun', value: 98 },
  { label: 'Mar', value: 112 },
  { label: 'Mié', value: 130 },
  { label: 'Jue', value: 121 },
  { label: 'Vie', value: 165 },
  { label: 'Sáb', value: 184 },
  { label: 'Dom', value: 142 },
]
const maxVenta = computed(() => Math.max(...ventasSemana.map(v => v.value)))

const rutasTop = [
  { ruta: 'Latacunga – Quito',     boletos: 412 },
  { ruta: 'Ambato – Guayaquil',    boletos: 388 },
  { ruta: 'Riobamba – Cuenca',     boletos: 261 },
  { ruta: 'Quito – Loja',          boletos: 198 },
  { ruta: 'Manta – Quito',         boletos: 154 },
]

const gastosMeses = [
  { label: 'Dic', value: 18 },
  { label: 'Ene', value: 24 },
  { label: 'Feb', value: 12 },
  { label: 'Mar', value: 36 },
  { label: 'Abr', value: 28 },
  { label: 'May', value: 42 },
]
const maxGasto = computed(() => Math.max(...gastosMeses.map(g => g.value)))

const proximoViaje = {
  fecha: 'Sábado 23 may, 08:30',
  origen: 'Latacunga',
  destino: 'Quito',
  cooperativa: 'Trans Latinos',
  asiento: '12B',
}

const accesosRapidos = computed(() => {
  if (esCooperativa.value) {
    return [
      { to: '/venta',             label: 'Nueva venta',     desc: 'Atender pasajero',     icon: '💳' },
      { to: '/admin/hoja-ruta',   label: 'Hojas de ruta',   desc: 'Programar y revisar',  icon: '📋' },
      { to: '/admin/frecuencias', label: 'Frecuencias',     desc: 'Horarios autorizados', icon: '⏰' },
      { to: '/reportes',          label: 'Reportes',        desc: 'Auditoría y totales',  icon: '📊' },
    ]
  }
  return [
    { to: '/buscar',      label: 'Buscar rutas',  desc: 'Origen y destino',          icon: '🔎' },
    { to: '/mis-boletos', label: 'Mis boletos',   desc: 'QR y comprobantes',         icon: '🎟️' },
  ]
})
</script>
