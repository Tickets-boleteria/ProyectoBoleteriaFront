<template>
  <div class="space-y-6">
    <section v-if="loading" class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
      <p class="text-sm font-bold text-slate-500">
        Cargando dashboard desde la base de datos...
      </p>
    </section>

    <section v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p class="font-bold">No se pudo cargar el dashboard</p>
      <p class="mt-1 text-sm">{{ error }}</p>

      <button
        @click="recargar"
        class="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
      >
        Reintentar
      </button>
    </section>

    <template v-else>
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

        <p class="text-blue-100 mt-2">
          {{ rolMensaje }}
        </p>
      </section>

      <section v-if="resumen" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="kpi in resumen.kpis"
          :key="kpi.label"
          class="rounded-2xl bg-white p-5 shadow-md border border-slate-100"
        >
          <div class="flex items-start justify-between">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
              {{ kpi.label }}
            </p>
            <span class="text-2xl">{{ kpi.icon }}</span>
          </div>

          <p class="mt-3 text-3xl font-black text-slate-900">
            {{ kpi.value }}
          </p>

          <p v-if="kpi.hint" class="mt-1 text-xs text-slate-500">
            {{ kpi.hint }}
          </p>

          <p
            v-else-if="typeof kpi.delta === 'number'"
            class="mt-1 text-xs font-bold"
            :class="kpi.delta >= 0 ? 'text-emerald-600' : 'text-red-600'"
          >
            {{ kpi.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(kpi.delta) }}%
          </p>
        </article>
      </section>

      <section v-if="esChofer" class="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Viaje actual o próximo
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Información operativa del viaje asignado.
          </p>

          <div v-if="proximoViaje" class="rounded-2xl bg-blue-50 border border-blue-200 p-5">
            <p class="text-xs font-black uppercase tracking-wider text-blue-600">
              {{ proximoViaje.fecha }} · {{ proximoViaje.hora || '--:--' }}
            </p>

            <h4 class="mt-2 text-2xl font-black text-slate-900">
              {{ proximoViaje.origen }} → {{ proximoViaje.destino }}
            </h4>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl bg-white p-4 border border-blue-100">
                <p class="text-xs font-bold text-slate-400 uppercase">Bus</p>
                <p class="font-black text-slate-900">
                  {{ proximoViaje.bus || 'N/D' }}
                </p>
              </div>

              <div class="rounded-xl bg-white p-4 border border-blue-100">
                <p class="text-xs font-bold text-slate-400 uppercase">Placa</p>
                <p class="font-black text-slate-900">
                  {{ proximoViaje.placa || 'Sin placa' }}
                </p>
              </div>

              <div class="rounded-xl bg-white p-4 border border-blue-100">
                <p class="text-xs font-bold text-slate-400 uppercase">Estado</p>
                <p class="font-black text-slate-900">
                  {{ proximoViaje.estado || 'Programado' }}
                </p>
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-slate-500">
            No tienes viaje asignado por el momento.
          </p>
        </article>

        <article class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Control de abordaje
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Escanea los boletos de los pasajeros al subir al bus.
          </p>

          <router-link
            to="/abordaje"
            class="block rounded-2xl bg-blue-600 px-5 py-4 text-center font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700"
          >
            📷 Escanear QR
          </router-link>

          <router-link
            to="/venta"
            class="mt-3 block rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-center font-black text-blue-700 hover:bg-blue-100"
          >
            💳 Venta en bus
          </router-link>
        </article>
      </section>

      <section v-if="esCooperativa" class="grid gap-6 lg:grid-cols-3">
        <article class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Boletos vendidos esta semana
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Ventas desde el lunes hasta la fecha actual.
          </p>

          <div class="flex items-end gap-3 h-48">
            <div
              v-for="dia in ventasSemana"
              :key="dia.label"
              class="flex-1 flex flex-col items-center gap-2"
            >
              <div class="text-xs font-bold text-slate-700">
                {{ dia.value }}
              </div>

              <div class="w-full bg-blue-100 rounded-t-lg relative overflow-hidden" style="height:140px">
                <div
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                  :style="{ height: ((dia.value / maxVenta) * 100) + '%' }"
                ></div>
              </div>

              <div class="text-[10px] font-bold uppercase text-slate-400">
                {{ dia.label }}
              </div>
            </div>
          </div>
        </article>

        <article class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Rutas más vendidas
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Demanda principal de la semana.
          </p>

          <div v-if="rutasTop.length" class="space-y-3">
            <div v-for="ruta in rutasTop" :key="ruta.ruta">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-bold text-slate-700">
                  {{ ruta.ruta }}
                </span>

                <span class="text-slate-500">
                  {{ ruta.boletos }}
                </span>
              </div>

              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full bg-blue-600 rounded-full"
                  :style="{ width: ((ruta.boletos / maxRutaTop) * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-slate-500">
            Aún no hay ventas registradas esta semana.
          </p>
        </article>
      </section>

      <section v-if="esCliente" class="grid gap-6 lg:grid-cols-3">
        <article class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Tus gastos en boletos
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Resumen de los últimos 6 meses.
          </p>

          <div v-if="gastosMeses.length" class="flex items-end gap-3 h-48">
            <div
              v-for="mes in gastosMeses"
              :key="mes.label"
              class="flex-1 flex flex-col items-center gap-2"
            >
              <div class="text-xs font-bold text-slate-700">
                ${{ mes.value.toFixed(2) }}
              </div>

              <div class="w-full bg-emerald-100 rounded-t-lg relative overflow-hidden" style="height:140px">
                <div
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400"
                  :style="{ height: ((mes.value / maxGasto) * 100) + '%' }"
                ></div>
              </div>

              <div class="text-[10px] font-bold uppercase text-slate-400">
                {{ mes.label }}
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-slate-500">
            Todavía no tienes gastos registrados.
          </p>
        </article>

        <article class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
          <h3 class="font-black text-slate-900 mb-1">
            Próximo viaje
          </h3>

          <p class="text-sm text-slate-500 mb-4">
            Boleto activo más cercano.
          </p>

          <div v-if="proximoViaje" class="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p class="text-xs font-bold uppercase text-blue-600 tracking-wider">
              {{ proximoViaje.fecha }} · {{ proximoViaje.hora || '--:--' }}
            </p>

            <p class="text-lg font-black text-slate-900 mt-1">
              {{ proximoViaje.origen }} → {{ proximoViaje.destino }}
            </p>

            <p class="text-sm text-slate-600 mt-1">
              {{ proximoViaje.cooperativa || 'Cooperativa' }} · Asiento {{ proximoViaje.asiento || 'N/D' }}
            </p>

            <p class="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
              {{ proximoViaje.estado || 'Emitido' }}
            </p>

            <router-link
              to="/mis-boletos"
              class="mt-4 block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white"
            >
              Ver boleto y QR
            </router-link>
          </div>

          <div v-else class="text-sm text-slate-500">
            No tienes viajes próximos.

            <router-link to="/buscar" class="font-bold text-blue-700 underline">
              Buscar ruta
            </router-link>
          </div>
        </article>
      </section>

      <section class="rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        <h3 class="font-black text-slate-900 mb-4">
          Accesos rápidos
        </h3>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="accion in accesosRapidos"
            :key="accion.to"
            :to="accion.to"
            class="rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all p-4 flex items-center gap-3"
          >
            <span class="text-2xl">
              {{ accion.icon }}
            </span>

            <div>
              <p class="font-bold text-slate-900 text-sm">
                {{ accion.label }}
              </p>

              <p class="text-xs text-slate-500">
                {{ accion.desc }}
              </p>
            </div>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

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