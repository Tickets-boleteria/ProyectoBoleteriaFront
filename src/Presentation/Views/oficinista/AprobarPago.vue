<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SupabaseVentasRepository } from '../../../Infrastructure/Repositories/SupabaseVentasRepository'
import { SupabaseBoletosRepository } from '../../../Infrastructure/Repositories/SupabaseBoletosRepository'
import { AprobarPago } from '../../../Application/UseCases/AprobarPago'
import { RechazarPago } from '../../../Application/UseCases/RechazarPago'
import { useAuthStore } from '../../Store/authStore'

const authStore = useAuthStore()

const ventasRepo = new SupabaseVentasRepository()
const boletosRepo = new SupabaseBoletosRepository()

const aprobarPagoUseCase = new AprobarPago(ventasRepo, boletosRepo)
const rechazarPagoUseCase = new RechazarPago(ventasRepo, boletosRepo)

const ventas = ref<any[]>([])
const loading = ref(false)
const procesandoId = ref<number | null>(null)
const error = ref('')
const success = ref('')

const filtros = reactive({
  texto: '',
  fecha: '',
})

function getField(obj: any, field: string) {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())
  return key ? obj[key] : undefined
}

function estadoVentaLabel(estado: string) {
  const value = String(estado || '')

  if (value === 'Pendiente') return 'Pendiente de aprobación'
  if (value === 'AprobadaPago') return 'Pago aprobado'
  if (value === 'Confirmada') return 'Confirmada'
  if (value === 'Cancelada') return 'Cancelada / Rechazada'

  return value
}

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function usuarioActualId() {
  const tablaId = (authStore.user as any)?.usuarioTablaId

  if (tablaId && String(tablaId) !== 'NaN') {
    return String(tablaId)
  }

  return String(authStore.user?.id || '')
}

async function cargarVentasPendientes() {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    ventas.value = await ventasRepo.obtenerVentasPendientes()
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar las ventas pendientes.'
    ventas.value = []
  } finally {
    loading.value = false
  }
}

const ventasFiltradas = computed(() => {
  const texto = filtros.texto.trim().toLowerCase()

  return ventas.value.filter((venta) => {
    const boleto = relation(getField(venta, 'Boletos'))
    const ruta = relation(getField(venta, 'Rutas'))
    const frecuencia = relation(getField(ruta, 'Frecuencias'))

    const fechaVenta = String(getField(venta, 'FechaVenta') || '').slice(0, 10)

    const contenido = [
      getField(venta, 'Id'),
      getField(boleto, 'CedulaPasajero'),
      getField(boleto, 'NombresPasajero'),
      getField(boleto, 'ApellidosPasajero'),
      getField(frecuencia, 'CiudadOrigen'),
      getField(frecuencia, 'CiudadDestino'),
      getField(venta, 'CiudadOrigenVenta'),
      getField(venta, 'CiudadDestinoVenta'),
    ].join(' ').toLowerCase()

    const coincideTexto = !texto || contenido.includes(texto)
    const coincideFecha = !filtros.fecha || fechaVenta === filtros.fecha

    return coincideTexto && coincideFecha
  })
})

function abrirComprobante(url: string | null | undefined) {
  if (!url) {
    error.value = 'Esta venta no tiene comprobante.'
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

async function aprobar(ventaId: number) {
  error.value = ''
  success.value = ''
  procesandoId.value = ventaId

  try {
    await aprobarPagoUseCase.ejecutar(ventaId, usuarioActualId())
    success.value = `Venta #${ventaId} aprobada correctamente.`
    ventas.value = ventas.value.filter(v => Number(getField(v, 'Id')) !== ventaId)
  } catch (err: any) {
    error.value = err.message || 'No se pudo aprobar la venta.'
  } finally {
    procesandoId.value = null
  }
}

async function rechazar(ventaId: number) {
  const observacion = window.prompt('Motivo del rechazo (opcional):') || ''

  error.value = ''
  success.value = ''
  procesandoId.value = ventaId

  try {
    await rechazarPagoUseCase.ejecutar(ventaId, usuarioActualId(), observacion)
    success.value = `Venta #${ventaId} rechazada correctamente.`
    ventas.value = ventas.value.filter(v => Number(getField(v, 'Id')) !== ventaId)
  } catch (err: any) {
    error.value = err.message || 'No se pudo rechazar la venta.'
  } finally {
    procesandoId.value = null
  }
}

onMounted(cargarVentasPendientes)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-black text-slate-900">Aprobación de pagos online</h1>
      <p class="text-sm text-slate-500">
        Revisa comprobantes enviados por clientes y cambia los boletos a Pagado o Rechazado.
      </p>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
      {{ error }}
    </div>

    <div v-if="success" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
      {{ success }}
    </div>

    <section class="rounded-2xl bg-white p-5 shadow border">
      <div class="grid gap-3 sm:grid-cols-3">
        <input
          v-model="filtros.texto"
          placeholder="Buscar por venta, cédula, pasajero, ruta..."
          class="rounded-xl border p-3 sm:col-span-2"
        />

        <input
          v-model="filtros.fecha"
          type="date"
          class="rounded-xl border p-3"
        />
      </div>

      <div class="mt-4 flex gap-3">
        <button @click="cargarVentasPendientes" class="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
          Actualizar
        </button>
      </div>
    </section>

    <p v-if="loading" class="text-sm text-slate-500">Cargando ventas pendientes...</p>

    <section class="grid gap-4">
      <article
        v-for="venta in ventasFiltradas"
        :key="getField(venta, 'Id')"
        class="rounded-2xl bg-white p-5 shadow border"
      >
        <div class="flex flex-wrap justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase text-blue-600">
              Venta #{{ getField(venta, 'Id') }}
            </p>

            <h2 class="text-xl font-black text-slate-900">
              {{
                getField(relation(getField(venta, 'Boletos')), 'NombresPasajero')
              }}
              {{
                getField(relation(getField(venta, 'Boletos')), 'ApellidosPasajero')
              }}
            </h2>

            <p class="text-sm text-slate-500">
              Cédula:
              {{ getField(relation(getField(venta, 'Boletos')), 'CedulaPasajero') || 'No registrada' }}
            </p>
          </div>

          <div class="text-right">
            <p class="text-2xl font-black text-blue-700">
              ${{ Number(getField(venta, 'Total') || 0).toFixed(2) }}
            </p>
            <p class="text-xs font-bold text-amber-600">
              {{ estadoVentaLabel(getField(venta, 'Estado')) }}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <strong>Fecha venta:</strong>
            {{ String(getField(venta, 'FechaVenta') || '').slice(0, 10) }}
          </p>

          <p>
            <strong>Método:</strong>
            {{ getField(venta, 'MetodoPago') }}
          </p>

          <p>
            <strong>Origen/Destino venta:</strong>
            {{ getField(venta, 'CiudadOrigenVenta') }} →
            {{ getField(venta, 'CiudadDestinoVenta') }}
          </p>

          <p>
            <strong>Fecha ruta:</strong>
            {{ getField(relation(getField(venta, 'Rutas')), 'Fecha') }}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            @click="abrirComprobante(getField(venta, 'ComprobanteUrl'))"
            class="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700"
          >
            Ver comprobante
          </button>

          <button
            @click="aprobar(Number(getField(venta, 'Id')))"
            :disabled="procesandoId === Number(getField(venta, 'Id'))"
            class="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            Aprobar pago
          </button>

          <button
            @click="rechazar(Number(getField(venta, 'Id')))"
            :disabled="procesandoId === Number(getField(venta, 'Id'))"
            class="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            Rechazar pago
          </button>
        </div>
      </article>

      <div v-if="!loading && ventasFiltradas.length === 0" class="rounded-2xl bg-white p-8 text-center text-slate-500 border">
        No hay ventas pendientes con comprobante.
      </div>
    </section>
  </div>
</template>