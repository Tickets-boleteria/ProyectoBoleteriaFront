<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useReportes } from '../../Composables/useReportes'

const { boletos, auditoria, loading, error, cargarBoletos } = useReportes()

type Categoria = 'ninguno' | 'nino' | 'discapacidad' | 'tercera_edad'

interface BoletoReporte {
  id: string
  fecha: string
  ruta: string
  cooperativa: string
  precioBase: number
  precioFinal: number
  descuento: number
  categoria: Categoria
}
type TipoCambio = 'Normal' | 'Estándar' | 'Emergencia' | 'Implementado'

interface AuditoriaEntry {
  id: string
  fecha: string
  usuario: string
  rol: string
  accion: string
  modulo: string
  tipoCambio: TipoCambio
  detalle: string
}

/* ──────────────────────────────────────────────────────────────────────────
 *  FILTROS
 * ────────────────────────────────────────────────────────────────────────── */
const filtros = ref({
  desde: '',
  hasta: '',
  cooperativa: '',
  ruta: '',
})

// Cuando los filtros cambien, recargar los datos de boletos
watch(filtros, (nuevosFiltros) => {
  cargarBoletos(nuevosFiltros)
}, { deep: true })

const cooperativas = computed(() => Array.from(new Set(boletos.value.map(b => b.cooperativa))))
const rutas         = computed(() => Array.from(new Set(boletos.value.map(b => b.ruta))))

const boletosFiltrados = computed(() => boletos.value.filter((b: BoletoReporte) => {
  if (filtros.value.desde && b.fecha < filtros.value.desde) return false
  if (filtros.value.hasta && b.fecha > filtros.value.hasta) return false
  if (filtros.value.cooperativa && b.cooperativa !== filtros.value.cooperativa) return false
  if (filtros.value.ruta && b.ruta !== filtros.value.ruta) return false
  return true
}))

/* ──────────────────────────────────────────────────────────────────────────
 *  KPIs GLOBALES
 * ────────────────────────────────────────────────────────────────────────── */
const kpis = computed(() => {
  const lista       = boletosFiltrados.value
  const ingresos    = lista.reduce((s, b) => s + b.precioFinal, 0)
  const descuentos  = lista.reduce((s, b) => s + b.descuento, 0)
  const bruto       = lista.reduce((s, b) => s + b.precioBase, 0)
  const ocupacion   = lista.length === 0 ? 0 : Math.min(100, Math.round((lista.length / 60) * 100))
  return {
    totalBoletos: lista.length,
    ingresos,
    descuentos,
    bruto,
    ocupacion,
    ahorroPct: bruto === 0 ? 0 : Math.round((descuentos / bruto) * 100),
  }
})

/* ──────────────────────────────────────────────────────────────────────────
 *  TOTALES POR CATEGORÍA DE DESCUENTO
 * ────────────────────────────────────────────────────────────────────────── */
const categorias: Array<{ key: Categoria; label: string; icon: string; color: string }> = [
  { key: 'ninguno',      label: 'Tarifa completa',  icon: '🎫', color: 'slate'   },
  { key: 'nino',         label: 'Niños (50%)',      icon: '🧒', color: 'sky'     },
  { key: 'discapacidad', label: 'Discapacidad (50%)', icon: '♿', color: 'violet'  },
  { key: 'tercera_edad', label: 'Tercera edad (50%)', icon: '👴', color: 'amber'   },
]

const totalesPorCategoria = computed(() => categorias.map(c => {
  const lista     = boletosFiltrados.value.filter(b => b.categoria === c.key)
  const cantidad  = lista.length
  const ingresos  = lista.reduce((s, b) => s + b.precioFinal, 0)
  const descuento = lista.reduce((s, b) => s + b.descuento, 0)
  return { ...c, cantidad, ingresos, descuento }
}))

/* ──────────────────────────────────────────────────────────────────────────
 *  INGRESOS POR RUTA  (gráfico de barras horizontales)
 * ────────────────────────────────────────────────────────────────────────── */
const ingresosPorRuta = computed(() => {
  const mapa = new Map<string, { cantidad: number; ingresos: number }>()
  for (const b of boletosFiltrados.value) {
    const prev = mapa.get(b.ruta) ?? { cantidad: 0, ingresos: 0 }
    mapa.set(b.ruta, { cantidad: prev.cantidad + 1, ingresos: prev.ingresos + b.precioFinal })
  }
  return Array.from(mapa.entries())
    .map(([ruta, val]) => ({ ruta, ...val }))
    .sort((a, b) => b.ingresos - a.ingresos)
})

const maxIngresoRuta = computed(() => Math.max(1, ...ingresosPorRuta.value.map(r => r.ingresos)))

/* ──────────────────────────────────────────────────────────────────────────
 *  AUDITORÍA - filtro por rol y módulo
 * ────────────────────────────────────────────────────────────────────────── */
const filtroAuditoria = ref({ rol: '', modulo: '', tipoCambio: '' })

const auditoriaFiltrada = computed(() => auditoria.value.filter((a: AuditoriaEntry) => {
  if (filtroAuditoria.value.rol    && a.rol    !== filtroAuditoria.value.rol)    return false
  if (filtroAuditoria.value.modulo && a.modulo !== filtroAuditoria.value.modulo) return false
  if (filtroAuditoria.value.tipoCambio && a.tipoCambio !== filtroAuditoria.value.tipoCambio) return false
  return true
}))

// Fijamos los 4 tipos de cambios obligatorios para el dashboard de auditoría (así mostrará 0 si no hay ninguno)
const tiposCambio: TipoCambio[] = ['Normal', 'Estándar', 'Emergencia', 'Implementado']
const rolesAud   = computed(() => Array.from(new Set(auditoria.value.map((a: AuditoriaEntry) => a.rol))))
const modulosAud = computed(() => Array.from(new Set(auditoria.value.map((a: AuditoriaEntry) => a.modulo))))

const colorAccion = (accion: string) => {
  const map: Record<string, string> = {
    Crear:      'bg-emerald-100 text-emerald-700',
    Venta:      'bg-blue-100 text-blue-700',
    Modificar:  'bg-amber-100 text-amber-700',
    Validar:    'bg-sky-100 text-sky-700',
    Descuento:  'bg-violet-100 text-violet-700',
    Cancelar:   'bg-red-100 text-red-700',
    Desactivar: 'bg-red-100 text-red-700',
    Finalizar:  'bg-emerald-100 text-emerald-700',
  }
  return map[accion] ?? 'bg-slate-100 text-slate-700'
}

const colorTipoCambio = (tipo: TipoCambio) => {
  const map: Record<TipoCambio, string> = {
    'Normal': 'bg-sky-100 text-sky-700',
    'Estándar': 'bg-slate-100 text-slate-700',
    'Emergencia': 'bg-red-100 text-red-700',
    'Implementado': 'bg-emerald-100 text-emerald-700',
  }
  return map[tipo]
}

const kpisAuditoria = computed(() => {
  return tiposCambio.map(tipo => ({ tipo, total: auditoriaFiltrada.value.filter((a: AuditoriaEntry) => a.tipoCambio === tipo).length }))
});

const exportarCSV = () => {
  const headers = ['ID', 'Fecha', 'Ruta', 'Cooperativa', 'Precio Base', 'Descuento', 'Precio Final', 'Categoría']
  const rows = boletosFiltrados.value.map(b =>
    [b.id, b.fecha, b.ruta, b.cooperativa, b.precioBase, b.descuento, b.precioFinal, b.categoria].join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-boletos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const exportarPDF = () => {
  alert('Exportar PDF: integrar con jsPDF o un servicio del backend. Por ahora puedes usar Imprimir (Ctrl+P).')
  window.print()
}

const limpiarFiltros = () => {
  filtros.value = { desde: '', hasta: '', cooperativa: '', ruta: '' }
}

onMounted(() => {
  cargarBoletos(filtros.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado + acciones -->
    <div class="rounded-[2rem] bg-blue-700 text-white shadow-2xl p-6 md:p-8">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-blue-200">Panel de control</p>
          <h1 class="mt-1 text-2xl md:text-3xl font-black">Reportes y Auditoría</h1>
          <p class="mt-2 text-sm text-blue-100">
            Resumen de ventas, descuentos aplicados y registro de cambios del sistema.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="exportarCSV"
            class="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold backdrop-blur hover:bg-white/25 transition"
          >
            📥 Exportar CSV
          </button>
          <button
            @click="exportarPDF"
            class="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-lg hover:shadow-xl transition"
          >
            🖨 Exportar PDF
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">Filtros del reporte</h2>
        <button
          @click="limpiarFiltros"
          class="text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          Limpiar
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Desde</label>
          <input
            type="date"
            v-model="filtros.desde"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Hasta</label>
          <input
            type="date"
            v-model="filtros.hasta"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Cooperativa</label>
          <select
            v-model="filtros.cooperativa"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas</option>
            <option v-for="c in cooperativas" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Ruta</label>
          <select
            v-model="filtros.ruta"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas</option>
            <option v-for="r in rutas" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-blue-100 p-3 text-2xl">🎫</div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Boletos vendidos</p>
            <p class="text-2xl font-black text-slate-800">{{ kpis.totalBoletos }}</p>
          </div>
        </div>
      </div>
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-emerald-100 p-3 text-2xl">💰</div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos netos</p>
            <p class="text-2xl font-black text-slate-800">${{ kpis.ingresos.toFixed(2) }}</p>
          </div>
        </div>
      </div>
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-violet-100 p-3 text-2xl">🎁</div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Descuentos otorgados</p>
            <p class="text-2xl font-black text-slate-800">${{ kpis.descuentos.toFixed(2) }}</p>
            <p class="text-xs font-bold text-violet-600 mt-0.5">{{ kpis.ahorroPct }}% sobre tarifa bruta</p>
          </div>
        </div>
      </div>
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-amber-100 p-3 text-2xl">📊</div>
          <div class="flex-1">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Ocupación promedio</p>
            <p class="text-2xl font-black text-slate-800">{{ kpis.ocupacion }}%</p>
            <div class="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-amber-400 rounded-full transition-all" :style="{ width: `${kpis.ocupacion}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Totales por categoría de descuento + Ingresos por ruta -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Categorías de descuento -->
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">
          Totales por tipo de descuento
        </h2>
        <div class="space-y-3">
          <div
            v-for="cat in totalesPorCategoria"
            :key="cat.key"
            class="rounded-xl bg-slate-50 p-4 hover:bg-slate-100 transition"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ cat.icon }}</span>
                <div>
                  <p class="font-bold text-slate-800 text-sm">{{ cat.label }}</p>
                  <p class="text-xs text-slate-500">{{ cat.cantidad }} boletos emitidos</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-black text-slate-800">${{ cat.ingresos.toFixed(2) }}</p>
                <p v-if="cat.descuento > 0" class="text-xs font-bold text-violet-600">
                  −${{ cat.descuento.toFixed(2) }} descontado
                </p>
              </div>
            </div>
            <div class="h-1.5 rounded-full bg-white overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="{
                  'bg-slate-400':   cat.color === 'slate',
                  'bg-sky-400':     cat.color === 'sky',
                  'bg-violet-400':  cat.color === 'violet',
                  'bg-amber-400':   cat.color === 'amber',
                }"
                :style="{ width: `${kpis.totalBoletos === 0 ? 0 : (cat.cantidad / kpis.totalBoletos) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Ingresos por ruta -->
      <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">
          Ingresos por ruta
        </h2>
        <div v-if="ingresosPorRuta.length === 0" class="text-center py-8 text-sm text-slate-500">
          Sin datos para los filtros seleccionados.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(r, i) in ingresosPorRuta"
            :key="r.ruta"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                  {{ i + 1 }}
                </span>
                <span class="font-bold text-slate-800">{{ r.ruta }}</span>
              </div>
              <div class="text-right">
                <span class="font-black text-slate-800">${{ r.ingresos.toFixed(2) }}</span>
                <span class="ml-2 text-xs text-slate-500">{{ r.cantidad }} boletos</span>
              </div>
            </div>
            <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                class="h-full bg-blue-600 rounded-full transition-all"
                :style="{ width: `${(r.ingresos / maxIngresoRuta) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs de Auditoría -->
    <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
      <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">Resumen de Cambios</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="kpi in kpisAuditoria" :key="kpi.tipo" class="rounded-xl p-4" :class="colorTipoCambio(kpi.tipo)">
          <p class="text-xs font-bold uppercase tracking-wider">{{ kpi.tipo }}</p>
          <p class="text-2xl font-black">{{ kpi.total }}</p>
        </div>
      </div>
    </div>


    <!-- Detalle de boletos -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
          Detalle de boletos ({{ boletosFiltrados.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-blue-700 text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">ID</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Ruta</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Cooperativa</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Categoría</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Base</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Desc.</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Final</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="boletosFiltrados.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-sm text-slate-500">
                No hay boletos para los filtros seleccionados.
              </td>
            </tr>
            <tr v-for="b in boletosFiltrados" :key="b.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700">{{ b.id }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ b.fecha }}</td>
              <td class="px-4 py-3 text-sm font-bold text-slate-800">{{ b.ruta }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ b.cooperativa }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="{
                    'bg-slate-100 text-slate-700':  b.categoria === 'ninguno',
                    'bg-sky-100 text-sky-700':      b.categoria === 'nino',
                    'bg-violet-100 text-violet-700':b.categoria === 'discapacidad',
                    'bg-amber-100 text-amber-700':  b.categoria === 'tercera_edad',
                  }"
                >
                  {{ b.categoria === 'ninguno' ? 'Normal' :
                     b.categoria === 'nino' ? 'Niño' :
                     b.categoria === 'discapacidad' ? 'Discapacidad' : 'Tercera edad' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-right text-slate-600">${{ b.precioBase.toFixed(2) }}</td>
              <td class="px-4 py-3 text-sm text-right font-bold"
                  :class="b.descuento > 0 ? 'text-violet-600' : 'text-slate-400'">
                {{ b.descuento > 0 ? `−$${b.descuento.toFixed(2)}` : '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-right font-black text-emerald-700">${{ b.precioFinal.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="boletosFiltrados.length > 0" class="bg-slate-50">
            <tr>
              <td colspan="5" class="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-700">
                Totales
              </td>
              <td class="px-4 py-3 text-sm text-right font-black text-slate-700">${{ kpis.bruto.toFixed(2) }}</td>
              <td class="px-4 py-3 text-sm text-right font-black text-violet-700">−${{ kpis.descuentos.toFixed(2) }}</td>
              <td class="px-4 py-3 text-sm text-right font-black text-emerald-700">${{ kpis.ingresos.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Log de auditoría -->
    <div class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div class="p-5 border-b border-slate-100">
        <div v-if="error.auditoria" role="alert"
             class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          <strong>Error:</strong> {{ error.auditoria }}
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
          <div>
            <h2 class="text-sm font-black uppercase tracking-wider text-slate-700">
              Registro de auditoría
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              Acciones realizadas por administradores, oficinistas y choferes.
            </p>
          </div>          
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            v-model="filtroAuditoria.rol"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los roles</option>
            <option v-for="r in rolesAud" :key="r" :value="r">{{ r }}</option>
          </select>
          <select
            v-model="filtroAuditoria.modulo"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los módulos</option>
            <option v-for="m in modulosAud" :key="m" :value="m">{{ m }}</option>
          </select>
          <select
            v-model="filtroAuditoria.tipoCambio"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los tipos</option>
            <option v-for="t in tiposCambio" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-blue-700 text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha y hora</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Rol</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Acción</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tipo de Cambio</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Módulo</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Detalle</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading.auditoria">
              <td colspan="7" class="px-4 py-12 text-center text-sm text-slate-500">
                Cargando registros de auditoría...
              </td>
            </tr>
            <tr v-else-if="auditoriaFiltrada.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-sm text-slate-500">
                No hay registros para los filtros seleccionados.
              </td>
            </tr>
            <tr v-for="a in (auditoriaFiltrada as AuditoriaEntry[])" :key="a.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 text-xs font-mono text-slate-500">{{ a.fecha }}</td>
              <td class="px-4 py-3 text-sm font-bold text-slate-800">{{ a.usuario }}</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  {{ a.rol }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="colorAccion(a.accion)"
                >
                  {{ a.accion }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold" :class="colorTipoCambio(a.tipoCambio)">
                  {{ a.tipoCambio }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ a.modulo }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ a.detalle }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer ligero -->
    <p class="text-center text-xs text-slate-400 pb-2">
      Datos generados desde el módulo de Reportes · Boletería Interprovincial
    </p>
  </div>
</template>

<style scoped>
@media print {
  button { display: none; }
  .rounded-\[2rem\] { background: white !important; color: black !important; box-shadow: none !important; }
  .rounded-2xl     { box-shadow: none !important; border: 1px solid #ddd !important; }
}
</style>
