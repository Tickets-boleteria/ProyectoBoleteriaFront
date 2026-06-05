<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useReportes } from '../../Composables/useReportes'
import { useUiStore } from '../../Store/uiStore'
import PaginationControls from '../../Components/PaginationControls.vue'

const { boletos, auditoria, loading, error, cargarBoletos } = useReportes()
const uiStore = useUiStore()

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

// Paginación Detalle Boletos
const currentBoletoPage = ref(1)
const itemsPerBoletoPage = 10

// Paginación Auditoría
const currentAuditPage = ref(1)
const itemsPerAuditPage = 10

watch(filtros, (nuevosFiltros) => {
  cargarBoletos(nuevosFiltros)
  currentBoletoPage.value = 1
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

const totalBoletosItems = computed(() => boletosFiltrados.value.length)
const totalBoletoPages = computed(() => Math.ceil(totalBoletosItems.value / itemsPerBoletoPage))
const pagedBoletos = computed(() => {
  const start = (currentBoletoPage.value - 1) * itemsPerBoletoPage
  return boletosFiltrados.value.slice(start, start + itemsPerBoletoPage)
})

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
    ingresos, descuentos, bruto, ocupacion,
    ahorroPct: bruto === 0 ? 0 : Math.round((descuentos / bruto) * 100),
  }
})

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

const ingresosPorRuta = computed(() => {
  const mapa = new Map<string, { cantidad: number; ingresos: number }>()
  for (const b of boletosFiltrados.value) {
    const prev = mapa.get(b.ruta) ?? { cantidad: 0, ingresos: 0 }
    mapa.set(b.ruta, { cantidad: prev.cantidad + 1, ingresos: prev.ingresos + b.precioFinal })
  }
  return Array.from(mapa.entries()).map(([ruta, val]) => ({ ruta, ...val })).sort((a, b) => b.ingresos - a.ingresos)
})

const maxIngresoRuta = computed(() => Math.max(1, ...ingresosPorRuta.value.map(r => r.ingresos)))

const filtroAuditoria = ref({ rol: '', modulo: '', tipoCambio: '' })

const auditoriaFiltrada = computed(() => auditoria.value.filter((a: AuditoriaEntry) => {
  if (filtroAuditoria.value.rol    && a.rol    !== filtroAuditoria.value.rol)    return false
  if (filtroAuditoria.value.modulo && a.modulo !== filtroAuditoria.value.modulo) return false
  if (filtroAuditoria.value.tipoCambio && a.tipoCambio !== filtroAuditoria.value.tipoCambio) return false
  return true
}))

const totalAuditItems = computed(() => auditoriaFiltrada.value.length)
const totalAuditPages = computed(() => Math.ceil(totalAuditItems.value / itemsPerAuditPage))
const pagedAuditoria = computed(() => {
  const start = (currentAuditPage.value - 1) * itemsPerAuditPage
  return auditoriaFiltrada.value.slice(start, start + itemsPerAuditPage)
})

watch(filtroAuditoria, () => { currentAuditPage.value = 1 }, { deep: true })

const tiposCambio: TipoCambio[] = ['Normal', 'Estándar', 'Emergencia', 'Implementado']
const rolesAud   = computed(() => Array.from(new Set(auditoria.value.map((a: AuditoriaEntry) => a.rol))))
const modulosAud = computed(() => Array.from(new Set(auditoria.value.map((a: AuditoriaEntry) => a.modulo))))

const colorAccion = (accion: string) => {
  const map: Record<string, string> = {
    Crear: 'bg-emerald-100 text-emerald-700',
    Venta: 'bg-blue-100 text-blue-700',
    Modificar: 'bg-amber-100 text-amber-700',
    Validar: 'bg-sky-100 text-sky-700',
    Descuento: 'bg-violet-100 text-violet-700',
    Cancelar: 'bg-red-100 text-red-700',
    Desactivar: 'bg-red-100 text-red-700',
    Finalizar: 'bg-emerald-100 text-emerald-700',
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

const kpisAuditoria = computed(() => tiposCambio.map(tipo => ({ tipo, total: auditoriaFiltrada.value.filter((a: AuditoriaEntry) => a.tipoCambio === tipo).length })))

const exportarCSV = () => {
  const headers = ['ID', 'Fecha', 'Ruta', 'Cooperativa', 'Precio Base', 'Descuento', 'Precio Final', 'Categoría']
  const rows = boletosFiltrados.value.map(b => [b.id, b.fecha, b.ruta, b.cooperativa, b.precioBase, b.descuento, b.precioFinal, b.categoria].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `reporte-boletos-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
}

const exportarPDF = () => {
  uiStore.showAlert({ title: 'Próximamente', message: 'La exportación directa a PDF se integrará próximamente. Por ahora puedes usar la función Imprimir del navegador (Ctrl+P).', type: 'info' })
  window.print()
}

const limpiarFiltros = () => { filtros.value = { desde: '', hasta: '', cooperativa: '', ruta: '' } }

onMounted(() => { cargarBoletos(filtros.value) })
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="rounded-[2rem] bg-blue-700 text-white shadow-2xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <p class="text-xs font-black uppercase tracking-widest text-blue-200">Panel Administrativo</p>
        <h1 class="mt-1 text-3xl font-black">Inteligencia de Negocio</h1>
        <p class="mt-2 text-sm text-blue-100 font-medium opacity-80">Reportes de ventas, auditoría técnica y cumplimiento de descuentos.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button @click="exportarCSV" class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-bold text-sm backdrop-blur transition-all active:scale-95 border border-white/10">📥 CSV</button>
        <button @click="exportarPDF" class="px-5 py-3 rounded-2xl bg-white font-black text-blue-700 shadow-xl hover:bg-blue-50 transition-all active:scale-95">🖨️ PDF / IMPRIMIR</button>
      </div>
    </div>

    <div class="rounded-3xl bg-white p-6 shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
       <div v-for="(val, key) in filtros" :key="key" class="space-y-1">
          <label class="text-[10px] font-black uppercase text-slate-400 ml-1">{{ key }}</label>
          <input v-if="key === 'desde' || key === 'hasta'" type="date" v-model="filtros[key]" class="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
          <select v-else v-model="filtros[key]" class="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none">
             <option value="">Todas</option>
             <option v-for="opt in (key === 'cooperativa' ? cooperativas : rutas)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
       </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(val, label) in { 'Boletos': kpis.totalBoletos, 'Ingresos': '$'+kpis.ingresos.toFixed(2), 'Ahorro': kpis.ahorroPct+'%', 'Ocupación': kpis.ocupacion+'%' }" :key="label" class="rounded-3xl bg-white p-6 shadow-lg border border-slate-100">
         <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{{ label }}</p>
         <p class="text-3xl font-black text-slate-900">{{ val }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section class="rounded-3xl bg-white p-8 shadow-xl border border-slate-100 space-y-6">
        <h2 class="text-sm font-black uppercase tracking-widest text-slate-400">Distribución de Tarifas</h2>
        <div class="space-y-4">
          <div v-for="cat in totalesPorCategoria" :key="cat.key" class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div class="flex items-center justify-between mb-3">
               <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ cat.icon }}</span>
                  <span class="font-black text-slate-700 text-sm">{{ cat.label }}</span>
               </div>
               <span class="font-black text-slate-900">${{ cat.ingresos.toFixed(2) }}</span>
            </div>
            <div class="w-full h-2 bg-white rounded-full overflow-hidden">
               <div class="h-full rounded-full bg-blue-600 transition-all" :style="{ width: `${kpis.totalBoletos ? (cat.cantidad / kpis.totalBoletos) * 100 : 0}%` }"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl bg-white p-8 shadow-xl border border-slate-100 space-y-6">
        <h2 class="text-sm font-black uppercase tracking-widest text-slate-400">Ranking por Trayecto</h2>
        <div v-if="ingresosPorRuta.length === 0" class="py-20 text-center opacity-30 font-bold uppercase text-xs">Sin registros</div>
        <div v-else class="space-y-5">
           <div v-for="(r, i) in ingresosPorRuta.slice(0, 5)" :key="r.ruta" class="space-y-2">
              <div class="flex justify-between text-xs font-black">
                 <span class="text-slate-500 uppercase">{{ i + 1 }}. {{ r.ruta }}</span>
                 <span class="text-blue-600">${{ r.ingresos.toFixed(2) }}</span>
              </div>
              <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                 <div class="h-full bg-slate-900 rounded-full" :style="{ width: `${(r.ingresos / maxIngresoRuta) * 100}%` }"></div>
              </div>
           </div>
        </div>
      </section>
    </div>

    <div class="rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
      <div class="p-8 border-b border-slate-50 flex justify-between items-center">
        <h2 class="text-lg font-black text-slate-900">Detalle Operativo</h2>
        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px] uppercase">{{ totalBoletosItems }} Boletos</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th class="px-8 py-5 text-left">Boleto</th>
              <th class="px-8 py-5 text-left">Trayecto</th>
              <th class="px-8 py-5 text-left">Categoría</th>
              <th class="px-8 py-5 text-right">Monto Final</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 font-bold text-slate-600">
            <tr v-for="b in pagedBoletos" :key="b.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-8 py-4 font-mono text-[10px] text-blue-600">{{ b.id }}</td>
              <td class="px-8 py-4 text-slate-900">{{ b.ruta }}<br/><span class="text-[10px] opacity-40">{{ b.fecha }}</span></td>
              <td class="px-8 py-4">
                 <span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] uppercase">{{ b.categoria }}</span>
              </td>
              <td class="px-8 py-4 text-right text-slate-900 font-black">${{ b.precioFinal.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls
        v-if="totalBoletosItems > itemsPerBoletoPage"
        :current-page="currentBoletoPage" :total-pages="totalBoletoPages" :total-items="totalBoletosItems" :items-per-page="itemsPerBoletoPage"
        :has-prev-page="currentBoletoPage > 1" :has-next-page="currentBoletoPage < totalBoletoPages"
        @prev="() => currentBoletoPage--" @next="() => currentBoletoPage++" @set-page="(p) => currentBoletoPage = p"
      />
    </div>

    <div class="rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
      <div class="p-8 border-b border-white/5 flex justify-between items-center">
        <h2 class="text-lg font-black text-white">Log de Auditoría Técnica</h2>
        <div class="flex gap-4">
           <select v-model="filtroAuditoria.rol" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"><option value="">Rol</option><option v-for="r in rolesAud" :key="r">{{ r }}</option></select>
           <select v-model="filtroAuditoria.modulo" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"><option value="">Módulo</option><option v-for="m in modulosAud" :key="m">{{ m }}</option></select>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
            <tr>
              <th class="px-8 py-4 text-left">Timestamp</th>
              <th class="px-8 py-4 text-left">Ejecutor</th>
              <th class="px-8 py-4 text-left">Cambio</th>
              <th class="px-8 py-4 text-left">Detalle</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-400">
            <tr v-for="a in pagedAuditoria" :key="a.id" class="hover:bg-white/5 transition-colors">
              <td class="px-8 py-4 font-mono opacity-50">{{ a.fecha }}</td>
              <td class="px-8 py-4"><span class="font-black text-slate-200">{{ a.usuario }}</span><br/>{{ a.rol }}</td>
              <td class="px-8 py-4">
                 <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase" :class="colorTipoCambio(a.tipoCambio)">{{ a.tipoCambio }}</span>
              </td>
              <td class="px-8 py-4 font-medium italic opacity-80">{{ a.detalle }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls
        v-if="totalAuditItems > itemsPerAuditPage"
        :current-page="currentAuditPage" :total-pages="totalAuditPages" :total-items="totalAuditItems" :items-per-page="itemsPerAuditPage"
        :has-prev-page="currentAuditPage > 1" :has-next-page="currentAuditPage < totalAuditPages"
        @prev="() => currentAuditPage--" @next="() => currentAuditPage++" @set-page="(p) => currentAuditPage = p"
      />
    </div>
  </div>
</template>
