<script setup lang="ts">
import { watch } from 'vue'
import { useRutas } from '../../Composables/useRutas'
import { EstadoRuta, getEstadoRutaLabel } from '../../../Domain/Constants/EstadosSistema'

const {
  ESTADOS_RUTA,
  rutasFiltradas,
  resumenEstados,
  busesDisponibles,
  frecuencias,
  choferes,
  nuevaRuta,
  filtroEstado,
  filtroFecha,
  filtroTexto,
  loading,
  error,
  success,
  cargarBusesDisponibles,
  registrarRuta,
  avanzarEstadoRuta,
  cambiarEstadoRuta,
} = useRutas()

watch(
  () => nuevaRuta.value.fecha,
  async (fecha) => {
    await cargarBusesDisponibles(fecha)
  }
)

function estadoBadgeClass(estado: EstadoRuta) {
  const classes: Record<EstadoRuta, string> = {
    Programada: 'bg-slate-100 text-slate-700 border-slate-200',
    Habilitada: 'bg-blue-100 text-blue-700 border-blue-200',
    EnCurso: 'bg-amber-100 text-amber-700 border-amber-200',
    Finalizada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  return classes[estado]
}

function nombreChofer(cedula?: string | null) {
  if (!cedula) return 'Sin asignar'

  const chofer = choferes.value.find((item: any) => String(item.Cedula) === String(cedula))

  if (!chofer) return cedula

  return `${chofer.Nombres} ${chofer.Apellidos || ''}`
}

function accionPrincipalLabel(estado: EstadoRuta) {
  const labels: Record<EstadoRuta, string> = {
    Programada: 'Habilitar',
    Habilitada: 'Iniciar viaje',
    EnCurso: 'Finalizar viaje',
    Finalizada: 'Finalizada',
  }

  return labels[estado]
}

function puedeAvanzar(estado: EstadoRuta) {
  return estado !== 'Finalizada'
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-[2rem] bg-slate-800 text-white shadow-2xl p-6 md:p-8">
      <h1 class="text-2xl md:text-3xl font-black">
        Control de rutas
      </h1>

      <p class="mt-2 text-sm text-slate-300">
        Administra las rutas operativas, filtra por estado y controla el flujo Programada, Habilitada, EnCurso y Finalizada.
      </p>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        v-for="item in resumenEstados"
        :key="item.estado"
        type="button"
        @click="filtroEstado = item.estado"
        class="rounded-2xl border p-4 text-left shadow-sm transition-all"
        :class="filtroEstado === item.estado
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300'"
      >
        <p class="text-xs font-black uppercase tracking-wider text-slate-400">
          {{ getEstadoRutaLabel(item.estado) }}
        </p>

        <p class="mt-2 text-3xl font-black text-slate-900">
          {{ item.total }}
        </p>
      </button>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">
        Crear nueva ruta
      </h2>

      <form @submit.prevent="registrarRuta" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div v-if="error" class="md:col-span-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-700">
          {{ error }}
        </div>

        <div v-if="success" class="md:col-span-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-700">
          {{ success }}
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">
            Frecuencia
          </label>

          <select
            v-model="nuevaRuta.frecuenciaId"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          >
            <option value="">
              Seleccione
            </option>

            <option
              v-for="frecuencia in frecuencias"
              :key="frecuencia.Id"
              :value="frecuencia.Id"
            >
              {{ frecuencia.CiudadOrigen }} → {{ frecuencia.CiudadDestino }} · {{ frecuencia.HoraSalida }}
            </option>
          </select>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">
            Fecha
          </label>

          <input
            v-model="nuevaRuta.fecha"
            type="date"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">
            Bus disponible
          </label>

          <select
            v-model="nuevaRuta.busId"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          >
            <option value="">
              Seleccione
            </option>

            <option
              v-for="bus in busesDisponibles"
              :key="bus.Id"
              :value="bus.Id"
            >
              Bus {{ bus.Numero }} · {{ bus.Placa }} · {{ bus.TotalAsientos }} asientos
            </option>
          </select>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700">
            Chofer
          </label>

          <select
            v-model="nuevaRuta.choferId"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">
              Sin asignar
            </option>

            <option
              v-for="chofer in choferes"
              :key="chofer.Cedula"
              :value="chofer.Cedula"
            >
              {{ chofer.Nombres }} {{ chofer.Apellidos || '' }} - {{ chofer.Cedula }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Crear ruta
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
        <div>
          <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
            Rutas registradas
          </h2>

          <p class="text-sm text-slate-500 mt-1">
            Filtra y controla el estado operativo de cada ruta.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div>
            <label class="text-xs font-bold text-slate-700">
              Estado
            </label>

            <select
              v-model="filtroEstado"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="Todas">
                Todas
              </option>

              <option
                v-for="estado in ESTADOS_RUTA"
                :key="estado"
                :value="estado"
              >
                {{ getEstadoRutaLabel(estado) }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-700">
              Fecha
            </label>

            <input
              v-model="filtroFecha"
              type="date"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label class="text-xs font-bold text-slate-700">
              Buscar
            </label>

            <input
              v-model="filtroTexto"
              type="text"
              placeholder="Origen, destino, bus, placa..."
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
              <th class="py-3 pr-4">Ruta</th>
              <th class="py-3 pr-4">Fecha</th>
              <th class="py-3 pr-4">Bus</th>
              <th class="py-3 pr-4">Chofer</th>
              <th class="py-3 pr-4">Estado</th>
              <th class="py-3 pr-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="ruta in rutasFiltradas"
              :key="ruta.Id"
              class="border-b border-slate-100"
            >
              <td class="py-4 pr-4">
                <p class="font-black text-slate-900">
                  {{ ruta.Frecuencias?.CiudadOrigen || 'Origen' }} → {{ ruta.Frecuencias?.CiudadDestino || 'Destino' }}
                </p>

                <p class="text-xs text-slate-500">
                  Salida: {{ ruta.Frecuencias?.HoraSalida || '--:--' }}
                </p>
              </td>

              <td class="py-4 pr-4 font-bold text-slate-700">
                {{ ruta.Fecha }}
              </td>

              <td class="py-4 pr-4">
                <p class="font-bold text-slate-700">
                  Bus {{ ruta.Buses?.Numero || ruta.BusId }}
                </p>

                <p class="text-xs text-slate-500">
                  {{ ruta.Buses?.Placa || 'Sin placa' }}
                </p>
              </td>

              <td class="py-4 pr-4">
                <span class="font-bold text-slate-700">
                  {{ nombreChofer(ruta.ChoferId) }}
                </span>
              </td>

              <td class="py-4 pr-4">
                <span
                  class="inline-flex rounded-full border px-3 py-1 text-xs font-black"
                  :class="estadoBadgeClass(ruta.Estado)"
                >
                  {{ getEstadoRutaLabel(ruta.Estado) }}
                </span>
              </td>

              <td class="py-4 pr-4">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="puedeAvanzar(ruta.Estado)"
                    type="button"
                    @click="avanzarEstadoRuta(ruta)"
                    :disabled="loading"
                    class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ accionPrincipalLabel(ruta.Estado) }}
                  </button>

                  <button
                    v-if="ruta.Estado === 'Programada'"
                    type="button"
                    @click="cambiarEstadoRuta(ruta, 'Habilitada')"
                    :disabled="loading"
                    class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    Abrir venta
                  </button>

                  <span
                    v-if="ruta.Estado === 'Finalizada'"
                    class="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                  >
                    Cerrada
                  </span>
                </div>
              </td>
            </tr>

            <tr v-if="rutasFiltradas.length === 0">
              <td colspan="6" class="py-8 text-center text-slate-500">
                No hay rutas con los filtros seleccionados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>