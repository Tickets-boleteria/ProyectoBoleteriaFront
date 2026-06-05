<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../../Store/authStore'
import { SupabaseVentasRepository } from '../../../Infrastructure/Repositories/SupabaseVentasRepository'
import { SupabaseBoletosRepository } from '../../../Infrastructure/Repositories/SupabaseBoletosRepository'
import { ConfirmarCompra } from '../../../Application/UseCases/ConfirmarCompra'
import { SupabasePaymentRepository } from '../../../Infrastructure/Repositories/SupabasePaymentRepository'
import { PrepararPagoStripe } from '../../../Application/UseCases/PrepararPagoStripe'
import StripePaymentForm from '../../Components/StripePaymentForm.vue'
import { calcularDescuentoBoleto } from '../../../Domain/Constants/EstadosSistema'

interface RutaDisponible {
  id: number
  frecuenciaId: number
  busId: number
  origen: string
  destino: string
  esDirecto: boolean
  hora: string
  fecha: string
  cooperativa: string
  precioBase: number
  asientosLibres: number
  totalAsientos: number
  busPlaca: string
}

type TipoServicio = 'NORMAL' | 'VIP' | 'EXECUTIVO'

interface ConfiguracionAsientoDisponible {
  tipo: TipoServicio
  nombre: string
  precioBase: number
  cantidad: number
}

interface AsientoBusDisponible {
  id: number
  numero: string
  tipo: TipoServicio
}

const TIPOS_SERVICIO: Array<{ value: TipoServicio; label: string }> = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'VIP', label: 'VIP' },
  { value: 'EXECUTIVO', label: 'Ejecutivo' },
]

type DbRow = Record<string, any>

const getFieldValue = (obj: DbRow | null | undefined, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}

const isValidText = (value: any) => typeof value === 'string' && value.trim().length > 0

const normalizarTipoServicio = (value: any): TipoServicio | '' => {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'normal') return 'NORMAL'
  if (normalized === 'vip') return 'VIP'
  if (normalized === 'ejecutivo' || normalized === 'executivo') return 'EXECUTIVO'
  return ''
}

const compactarTexto = (value: any) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

const coincideTipo = (valor: any, tipo: TipoServicio) => {
  const compactado = compactarTexto(valor)
  const buscado = compactarTexto(tipo)
  return compactado === buscado || compactado.includes(buscado) || buscado.includes(compactado)
}

const etiquetaTipoServicio = (tipo: TipoServicio | '') => {
  const encontrado = TIPOS_SERVICIO.find(t => t.value === tipo)
  return encontrado?.label ?? 'Sin tipo'
}

const obtenerFechaLocalISO = () => {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fechaMinima = obtenerFechaLocalISO()

const rutas = ref<RutaDisponible[]>([])
const loading = ref(false)
const loadingAsientos = ref(false)
const error = ref('')
const configuracionesPorBus = ref<Record<number, ConfiguracionAsientoDisponible[]>>({})
const asientosDelBus = ref<AsientoBusDisponible[]>([])
const asientosOcupadosPorTipo = reactive<Record<TipoServicio, string[]>>({
  NORMAL: [],
  VIP: [],
  EXECUTIVO: [],
})
const asientosVendidosPorRutaYTipo = ref<Record<number, Record<TipoServicio, number>>>({})
const tipoSeleccionadoPorRuta = reactive<Record<number, TipoServicio | ''>>({})

const filtros = reactive({
  origen: '', destino: '', fecha: fechaMinima,
})

const normalizarTexto = (value: string) => value.toLowerCase().trim()

const errorFiltros = computed(() => {
  const origen = filtros.origen.trim()
  const destino = filtros.destino.trim()

  if (origen && origen.length < 3) return 'El origen debe tener al menos 3 caracteres.'
  if (destino && destino.length < 3) return 'El destino debe tener al menos 3 caracteres.'
  if (filtros.fecha < fechaMinima) return 'Solo puedes buscar rutas desde hoy en adelante.'

  return ''
})

const resultados = computed(() => {
  if (errorFiltros.value) return []

  const origenFiltro = normalizarTexto(filtros.origen)
  const destinoFiltro = normalizarTexto(filtros.destino)

  return rutas.value.filter(r =>
    (!origenFiltro || normalizarTexto(r.origen).includes(origenFiltro)) &&
    (!destinoFiltro || normalizarTexto(r.destino).includes(destinoFiltro)) &&
    (!filtros.fecha || r.fecha >= filtros.fecha)
  )
})

const tiposDisponiblesPorBus = (busId: number) => configuracionesPorBus.value[busId] ?? []

const vendidosPorRutaTipo = (rutaId: number, tipo: TipoServicio) => {
  const vendidosRuta = asientosVendidosPorRutaYTipo.value[rutaId]
  if (!vendidosRuta) return 0
  return Number(vendidosRuta[tipo] ?? 0)
}

const asientosLibresPorRutaYTipo = (ruta: RutaDisponible, tipo: TipoServicio | '') => {
  if (!tipo) return 0
  const configuracion = configuracionSeleccionadaPorBus(ruta.busId, tipo)
  const cantidadBase = Number(configuracion?.cantidad ?? 0)
  if (!cantidadBase || cantidadBase <= 0) return 0

  const vendidos = vendidosPorRutaTipo(ruta.id, tipo)
  return Math.max(cantidadBase - vendidos, 0)
}

const tiposDisponiblesParaRuta = (ruta: RutaDisponible) => {
  return tiposDisponiblesPorBus(ruta.busId).filter((tipo) => asientosLibresPorRutaYTipo(ruta, tipo.tipo) > 0)
}

const configuracionSeleccionadaPorBus = (busId: number, tipo: TipoServicio | '') => {
  if (!tipo) return null
  const configuraciones = tiposDisponiblesPorBus(busId)
  return configuraciones.find(item => item.tipo === tipo || coincideTipo(item.nombre, tipo))
    ?? configuraciones.find(item => coincideTipo(item.tipo, tipo))
    ?? null
}

const precioPorTipoYBus = (busId: number, tipo: TipoServicio | '' ) => {
  const config = configuracionSeleccionadaPorBus(busId, tipo)
  return Number(config?.precioBase ?? 0)
}

const asientosPorTipoSeleccionado = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return []

  return asientosDelBus.value.filter((asiento) => asiento.tipo === tipoServicioSeleccionado.value)
})

const asientosPorTipoEnBus = computed(() => {
  const agrupados: Record<TipoServicio, AsientoBusDisponible[]> = {
    NORMAL: [],
    VIP: [],
    EXECUTIVO: [],
  }

  for (const asiento of asientosDelBus.value) {
    agrupados[asiento.tipo].push(asiento)
  }

  return agrupados
})

const precioSeleccionado = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return 0
  return precioPorTipoYBus(rutaSeleccionada.value.busId, tipoServicioSeleccionado.value)
})

const asientosLibresDelTipoSeleccionado = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return 0

  const asientosDelTipo = asientosPorTipoSeleccionado.value
  if (!asientosDelTipo.length) return 0

  const ocupados = seatsAlreadyUsedByType(tipoServicioSeleccionado.value)
  return asientosDelTipo.filter((asiento) => !ocupados.has(asiento.numero.toString().padStart(2, '0'))).length
})

const tipoServicioSeleccionado = ref<TipoServicio | ''>('')

const cargarPrecioBasePorBus = async (busIds: number[]) => {
  const precios = new Map<number, number>()
  if (!busIds.length) return precios

  const { data, error: preciosError } = await supabase
    .from('ConfiguracionesAsientos')
    .select('BusId, PrecioBase')
    .in('BusId', busIds)

  if (preciosError) {
    throw new Error(preciosError.message)
  }

  for (const fila of data || []) {
    const busId = Number(getFieldValue(fila, 'BusId') ?? getFieldValue(fila, 'busid'))
    const precio = Number(getFieldValue(fila, 'PrecioBase') ?? getFieldValue(fila, 'preciobase') ?? 0)
    if (!precios.has(busId) || precio < (precios.get(busId) ?? precio)) {
      precios.set(busId, precio)
    }
  }

  return precios
}

const cargarAsientosLibresPorRuta = async (rutaIds: number[]) => {
  const libres = new Map<number, number>()
  if (!rutaIds.length) return libres

  const { data: ventas, error: ventasError } = await supabase
    .from('Ventas')
    .select('Id, RutaId')
    .in('RutaId', rutaIds)

  if (ventasError) {
    throw new Error(ventasError.message)
  }

  const ventasPorRuta = new Map<number, number[]>()
  for (const venta of ventas || []) {
    const rutaId = Number(getFieldValue(venta, 'RutaId') ?? getFieldValue(venta, 'rutaid'))
    const ventaId = Number(getFieldValue(venta, 'Id') ?? getFieldValue(venta, 'id'))
    const lista = ventasPorRuta.get(rutaId) ?? []
    lista.push(ventaId)
    ventasPorRuta.set(rutaId, lista)
  }

  const ventaIds = Array.from(ventasPorRuta.values()).flat()
  if (!ventaIds.length) {
    rutaIds.forEach(id => libres.set(id, 0))
    return libres
  }

  const { data: boletos, error: boletosError } = await supabase
    .from('Boletos')
    .select('VentaId')
    .in('VentaId', ventaIds)

  if (boletosError) {
    throw new Error(boletosError.message)
  }

  const boletosPorVenta = new Map<number, number>()
  for (const boleto of boletos || []) {
    const ventaId = Number(getFieldValue(boleto, 'VentaId') ?? getFieldValue(boleto, 'ventaid'))
    boletosPorVenta.set(ventaId, (boletosPorVenta.get(ventaId) ?? 0) + 1)
  }

  for (const rutaId of rutaIds) {
    const ventasDeLaRuta = ventasPorRuta.get(rutaId) ?? []
    const vendidos = ventasDeLaRuta.reduce((total, ventaId) => total + (boletosPorVenta.get(ventaId) ?? 0), 0)
    libres.set(rutaId, vendidos)
  }

  return libres
}

const cargarAsientosVendidosPorTipoEnRutas = async (rutaIds: number[]) => {
  const vendidos: Record<number, Record<TipoServicio, number>> = {}
  if (!rutaIds.length) return vendidos

  const { data: ventas, error: ventasError } = await supabase
    .from('Ventas')
    .select('Id, RutaId')
    .in('RutaId', rutaIds)

  if (ventasError) {
    throw new Error(ventasError.message)
  }

  const ventaRutaMap = new Map<number, number>()
  for (const venta of ventas || []) {
    const ventaId = Number(getFieldValue(venta, 'Id') ?? getFieldValue(venta, 'id'))
    const rutaId = Number(getFieldValue(venta, 'RutaId') ?? getFieldValue(venta, 'rutaid'))
    if (ventaId && rutaId) {
      ventaRutaMap.set(ventaId, rutaId)
      vendidos[rutaId] = vendidos[rutaId] ?? { NORMAL: 0, VIP: 0, EXECUTIVO: 0 }
    }
  }

  const ventaIds = Array.from(ventaRutaMap.keys())
  if (!ventaIds.length) return vendidos

  const { data: boletos, error: boletosError } = await supabase
    .from('Boletos')
    .select('VentaId, AsientoId')
    .in('VentaId', ventaIds)

  if (boletosError) {
    throw new Error(boletosError.message)
  }

  const asientoIds = [...new Set((boletos || [])
    .map((boleto: DbRow) => Number(getFieldValue(boleto, 'AsientoId') ?? getFieldValue(boleto, 'asientoid')))
    .filter(Boolean))]

  if (!asientoIds.length) return vendidos

  const { data: asientos, error: asientosError } = await supabase
    .from('Asientos')
    .select('Id, Tipo')
    .in('Id', asientoIds)

  if (asientosError) {
    throw new Error(asientosError.message)
  }

  const tipoPorAsientoId = new Map<number, TipoServicio>()
  for (const asiento of asientos || []) {
    const asientoId = Number(getFieldValue(asiento, 'Id') ?? getFieldValue(asiento, 'id'))
    const tipo = normalizarTipoServicio(getFieldValue(asiento, 'Tipo') ?? getFieldValue(asiento, 'tipo'))
    if (asientoId && tipo) {
      tipoPorAsientoId.set(asientoId, tipo as TipoServicio)
    }
  }

  for (const boleto of boletos || []) {
    const ventaId = Number(getFieldValue(boleto, 'VentaId') ?? getFieldValue(boleto, 'ventaid'))
    const asientoId = Number(getFieldValue(boleto, 'AsientoId') ?? getFieldValue(boleto, 'asientoid'))
    const rutaId = ventaRutaMap.get(ventaId)
    const tipo = tipoPorAsientoId.get(asientoId)

    if (!rutaId || !tipo) continue
    vendidos[rutaId] = vendidos[rutaId] ?? { NORMAL: 0, VIP: 0, EXECUTIVO: 0 }
    vendidos[rutaId][tipo] = (vendidos[rutaId][tipo] ?? 0) + 1
  }

  return vendidos
}

const cargarRutas = async () => {
  loading.value = true
  error.value = ''

  try {
    if (filtros.fecha < fechaMinima) {
      throw new Error('Solo puedes buscar rutas desde hoy en adelante.')
    }

    const { data: rutasData, error: rutasError } = await supabase
      .from('Rutas')
      .select('Id, FrecuenciaId, BusId, Fecha')
      .gte('Fecha', filtros.fecha)
      .order('Id', { ascending: true })

    if (rutasError) {
      throw new Error(rutasError.message)
    }

    const rutasBase = rutasData || []
    const frecuenciaIds = [...new Set(rutasBase.map((fila: DbRow) => Number(getFieldValue(fila, 'FrecuenciaId') ?? getFieldValue(fila, 'frecuenciaid'))))].filter(Boolean)
    const busIds = [...new Set(rutasBase.map((fila: DbRow) => Number(getFieldValue(fila, 'BusId') ?? getFieldValue(fila, 'busid'))))].filter(Boolean)

    const [frecuenciasResp, busesResp, cooperativasResp, configuracionesResp, preciosBaseResp, libresResp, vendidosPorTipoResp] = await Promise.all([
      frecuenciaIds.length
        ? supabase.from('Frecuencias').select('Id, CiudadOrigen, CiudadDestino, HoraSalida, EsDirecto, CooperativaId').in('Id', frecuenciaIds)
        : Promise.resolve({ data: [], error: null } as any),
      busIds.length
        ? supabase.from('Buses').select('Id, Placa, TotalAsientos').in('Id', busIds)
        : Promise.resolve({ data: [], error: null } as any),
      Promise.resolve(null),
      busIds.length
        ? supabase.from('ConfiguracionesAsientos').select('BusId, NombreTipo, Tipo, Cantidad, PrecioBase').in('BusId', busIds)
        : Promise.resolve({ data: [], error: null } as any),
      cargarPrecioBasePorBus(busIds),
      cargarAsientosLibresPorRuta(rutasBase.map((fila: DbRow) => Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id')))).catch(err => { throw err }),
      cargarAsientosVendidosPorTipoEnRutas(rutasBase.map((fila: DbRow) => Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id')))).catch(err => { throw err })
    ])

    const frecuenciasData = frecuenciasResp.data || []
    const busesData = busesResp.data || []
    const configuracionesData = configuracionesResp.data || []
    const coopIds = [...new Set(frecuenciasData.map((fila: DbRow) => Number(getFieldValue(fila, 'CooperativaId') ?? getFieldValue(fila, 'cooperativaid'))))].filter(Boolean)

    const cooperativasQuery = coopIds.length
      ? await supabase.from('Cooperativas').select('Id, Nombre').in('Id', coopIds)
      : { data: [], error: null }

    if ((frecuenciasResp as any).error) throw new Error((frecuenciasResp as any).error.message)
    if ((busesResp as any).error) throw new Error((busesResp as any).error.message)
    if ((cooperativasQuery as any).error) throw new Error((cooperativasQuery as any).error.message)

    const frecuenciasPorId = new Map<number, DbRow>()
    for (const fila of frecuenciasData) {
      const id = Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id'))
      frecuenciasPorId.set(id, fila)
    }

    const busesPorId = new Map<number, DbRow>()
    for (const fila of busesData) {
      const id = Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id'))
      busesPorId.set(id, fila)
    }

    const configuracionesAgrupadas = configuracionesData.reduce((acc: Record<number, ConfiguracionAsientoDisponible[]>, fila: DbRow) => {
      const busId = Number(getFieldValue(fila, 'BusId') ?? getFieldValue(fila, 'busid'))
      const tipo = normalizarTipoServicio(getFieldValue(fila, 'Tipo') ?? getFieldValue(fila, 'tipo') ?? getFieldValue(fila, 'NombreTipo'))
      if (!busId || !tipo) return acc

      const lista = acc[busId] ?? []
      lista.push({
        tipo,
        nombre: String(getFieldValue(fila, 'NombreTipo') ?? etiquetaTipoServicio(tipo)),
        precioBase: Number(getFieldValue(fila, 'PrecioBase') ?? getFieldValue(fila, 'preciobase') ?? 0),
        cantidad: Number(getFieldValue(fila, 'Cantidad') ?? getFieldValue(fila, 'cantidad') ?? 0),
      })
      acc[busId] = lista
      return acc
    }, {})

    configuracionesPorBus.value = configuracionesAgrupadas
    asientosVendidosPorRutaYTipo.value = vendidosPorTipoResp

    const cooperativasPorId = new Map<number, DbRow>()
    for (const fila of (cooperativasQuery as any).data || []) {
      const id = Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id'))
      cooperativasPorId.set(id, fila)
    }

    rutas.value = rutasBase.map((fila: DbRow) => {
      const id = Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id'))
      const frecuenciaId = Number(getFieldValue(fila, 'FrecuenciaId') ?? getFieldValue(fila, 'frecuenciaid'))
      const busId = Number(getFieldValue(fila, 'BusId') ?? getFieldValue(fila, 'busid'))
      const frecuencia = frecuenciasPorId.get(frecuenciaId) || null
      const bus = busesPorId.get(busId) || null
      const cooperativaId = Number(getFieldValue(frecuencia, 'CooperativaId') ?? getFieldValue(frecuencia, 'cooperativaid') ?? 0)
      const cooperativa = cooperativasPorId.get(cooperativaId) || null
      const totalAsientosConfigurados = (configuracionesAgrupadas[busId] ?? []).reduce((suma, config) => suma + Number(config.cantidad ?? 0), 0)
      const totalAsientos = totalAsientosConfigurados > 0
        ? totalAsientosConfigurados
        : Number(getFieldValue(bus, 'TotalAsientos') ?? getFieldValue(bus, 'totalasientos') ?? 0)
      const vendidos = libresResp.get(id) ?? 0
      const precioBase = (configuracionesPorBus.value[busId] ?? []).reduce((min, config) => {
        if (!min) return config.precioBase
        return config.precioBase > 0 && config.precioBase < min ? config.precioBase : min
      }, 0)

      return {
        id,
        frecuenciaId,
        busId,
        origen: String(getFieldValue(frecuencia, 'CiudadOrigen') ?? ''),
        destino: String(getFieldValue(frecuencia, 'CiudadDestino') ?? ''),
        esDirecto: Boolean(getFieldValue(frecuencia, 'EsDirecto') ?? getFieldValue(frecuencia, 'es_directa') ?? false),
        hora: String(getFieldValue(frecuencia, 'HoraSalida') ?? '').slice(0, 5),
        fecha: String(getFieldValue(fila, 'Fecha') ?? ''),
        cooperativa: String(getFieldValue(cooperativa, 'Nombre') ?? 'N/D'),
        precioBase: preciosBaseResp.get(busId) ?? precioBase,
        asientosLibres: Math.max(totalAsientos - vendidos, 0),
        totalAsientos,
        busPlaca: String(getFieldValue(bus, 'Placa') ?? 'N/D'),
      }
    }).filter((ruta) =>
      ruta.id > 0 &&
      ruta.frecuenciaId > 0 &&
      ruta.busId > 0 &&
      isValidText(ruta.origen) &&
      isValidText(ruta.destino) &&
      isValidText(ruta.hora) &&
      isValidText(ruta.fecha) &&
      ruta.totalAsientos > 0
    )
  } catch (err: any) {
    error.value = err?.message || 'No fue posible cargar las rutas.'
    rutas.value = []
  } finally {
    loading.value = false
  }
}

// Paso 2: selección
const rutaSeleccionada = ref<RutaDisponible | null>(null)
const asientosSeleccionados = ref<string[]>([])
const asientosOcupados = ref<string[]>([])

const cargarAsientosDelBus = async (busId: number) => {
  const { data: asientos, error: asientosError } = await supabase
    .from('Asientos')
    .select('Id, NumeroAsiento, Tipo')
    .eq('BusId', busId)

  if (asientosError) throw new Error(asientosError.message)

  asientosDelBus.value = (asientos || [])
    .map((fila: DbRow) => ({
      id: Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id')),
      numero: String(getFieldValue(fila, 'NumeroAsiento') ?? getFieldValue(fila, 'numeroasiento') ?? ''),
      tipo: normalizarTipoServicio(getFieldValue(fila, 'Tipo') ?? getFieldValue(fila, 'tipo')) as TipoServicio,
    }))
    .filter((asiento) => asiento.id > 0 && isValidText(asiento.numero) && isValidText(asiento.tipo))
}

const cargarAsientosOcupados = async (rutaId: number) => {
  loadingAsientos.value = true
  try {
    asientosOcupadosPorTipo.NORMAL = []
    asientosOcupadosPorTipo.VIP = []
    asientosOcupadosPorTipo.EXECUTIVO = []

    const { data: ventas, error: ventasError } = await supabase
      .from('Ventas')
      .select('Id')
      .eq('RutaId', rutaId)

    if (ventasError) throw new Error(ventasError.message)

    const ventaIds = (ventas || []).map((fila: DbRow) => Number(getFieldValue(fila, 'Id') ?? getFieldValue(fila, 'id')))
    if (!ventaIds.length) {
      asientosOcupados.value = []
      return
    }

    const { data: boletos, error: boletosError } = await supabase
      .from('Boletos')
      .select('AsientoId')
      .in('VentaId', ventaIds)

    if (boletosError) throw new Error(boletosError.message)

    const asientoIds = [...new Set((boletos || []).map((fila: DbRow) => Number(getFieldValue(fila, 'AsientoId') ?? getFieldValue(fila, 'asientoid'))))].filter(Boolean)
    if (!asientoIds.length) {
      asientosOcupados.value = []
      return
    }

    const { data: asientos, error: asientosError } = await supabase
      .from('Asientos')
      .select('Id, NumeroAsiento, Tipo')
      .in('Id', asientoIds)

    if (asientosError) throw new Error(asientosError.message)

    const ocupados = (asientos || []).map((fila: DbRow) => ({
      numero: String(getFieldValue(fila, 'NumeroAsiento') ?? getFieldValue(fila, 'numeroasiento') ?? '').trim(),
      tipo: normalizarTipoServicio(getFieldValue(fila, 'Tipo') ?? getFieldValue(fila, 'tipo')),
    })).filter(item => isValidText(item.numero) && item.tipo)

    asientosOcupados.value = [...new Set(ocupados.map(item => item.numero))]
    for (const item of ocupados) {
      const tipo = item.tipo as TipoServicio
      if (!asientosOcupadosPorTipo[tipo].includes(item.numero)) {
        asientosOcupadosPorTipo[tipo].push(item.numero)
      }
    }
  } finally {
    loadingAsientos.value = false
  }
}

const seatsAlreadyUsedByType = (tipo: TipoServicio | '') => {
  if (!tipo) return new Set<string>()
  return new Set(asientosOcupadosPorTipo[tipo].map(n => n.toString().padStart(2, '0')))
}

// Map real de asientos según capacidad del bus y boletos emitidos
const asientosLayout = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return []
  const ocupados = seatsAlreadyUsedByType(tipoServicioSeleccionado.value)
  return asientosPorTipoSeleccionado.value.map((asiento) => ({
    numero: asiento.numero.toString().padStart(2, '0'),
    ocupado: ocupados.has(asiento.numero.toString().padStart(2, '0')),
  }))
})

function toggleAsiento(a: { numero: string; ocupado: boolean }) {
  if (a.ocupado) return
  if (asientosSeleccionados.value.includes(a.numero)) {
    asientosSeleccionados.value = asientosSeleccionados.value.filter(n => n !== a.numero)
  } else {
    asientosSeleccionados.value.push(a.numero)
  }
}

// Paso 3: pago
const metodoPago = ref<'Transferencia' | 'Tarjeta'>('Transferencia')
const clientSecret = ref('')
const stripeLoading = ref(false)
const capture = ref<string | null>(null)
const capturaArchivo = ref<File | null>(null)
const referenciaPago = ref('')
const fechaNacimientoPasajero = ref('')
const tieneDiscapacidad = ref(false)
const mostrarPago = ref(false)

// Total con descuento (regla unica). Es la MISMA funcion que usa ConfirmarCompra,
// asi el monto que cobra Stripe coincide con el Total que se guarda en la Venta.
const totalConDescuento = computed(() => {
  const n = asientosSeleccionados.value.length
  if (n === 0 || precioSeleccionado.value <= 0) return 0
  const fecha = fechaNacimientoPasajero.value.trim()
  if (!fecha) return Number((precioSeleccionado.value * n).toFixed(2)) // sin fecha aun -> precio lleno
  const d = calcularDescuentoBoleto(fecha, tieneDiscapacidad.value, precioSeleccionado.value)
  return Number((d.precioFinal * n).toFixed(2))
})

const paymentRepo = new SupabasePaymentRepository()
const prepararPagoStripe = new PrepararPagoStripe(paymentRepo)

async function iniciarPagoTarjeta() {
  if (!rutaSeleccionada.value || asientosSeleccionados.value.length === 0) return
  // La fecha de nacimiento debe estar antes de cobrar, para aplicar el descuento
  // correcto y que el cobro de Stripe coincida con el Total guardado.
  if (!fechaNacimientoPasajero.value.trim()) {
    error.value = 'Ingresa la fecha de nacimiento del pasajero antes de pagar con tarjeta.'
    return
  }
  stripeLoading.value = true
  try {
    const total = totalConDescuento.value
    const res = await prepararPagoStripe.ejecutar(total)
    clientSecret.value = res.clientSecret
    metodoPago.value = 'Tarjeta'
  } catch (err: any) {
    error.value = 'No se pudo iniciar la pasarela de pagos: ' + err.message
  } finally {
    stripeLoading.value = false
  }
}

function onCapturaUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  capturaArchivo.value = file
  const reader = new FileReader()
  reader.onload = ev => { capture.value = ev.target?.result as string }
  reader.readAsDataURL(file)
}

// Paso 4: confirmación
const compraConfirmada = ref<null | {
  codigo: string | null
  ruta: RutaDisponible
  asientos: string[]
  total: number
  captura: string | null
  referencia: string
  metodoPago: string
}>(null)

const authStore = useAuthStore()

async function completarCompra(stripePaymentIntent?: any) {
  if (!rutaSeleccionada.value || asientosSeleccionados.value.length === 0) return

  const nombres = String(authStore.user?.nombres ?? '').trim()
  const apellidos = String(authStore.user?.apellidos ?? '').trim()
  const cedula = String(authStore.user?.cedula ?? '').trim()
  const fechaNacimiento = fechaNacimientoPasajero.value.trim()

  if (!cedula || !nombres || !apellidos) {
    error.value = 'Tu perfil no tiene cédula/nombres/apellidos. Complétalos para poder comprar.'
    return
  }

  if (!fechaNacimiento) {
    error.value = 'Ingresa la fecha de nacimiento del pasajero.'
    return
  }

  try {
    const { data: asientosRows } = await supabase
      .from('Asientos')
      .select('Id, NumeroAsiento, BusId')
      .eq('BusId', rutaSeleccionada.value!.busId)

    const asientoMap = new Map<string, number>()
    for (const f of asientosRows || []) {
      const num = String(getFieldValue(f, 'NumeroAsiento') ?? getFieldValue(f, 'numeroasiento') ?? '')
      const id = Number(getFieldValue(f, 'Id') ?? getFieldValue(f, 'id') ?? 0)
      if (num && id) asientoMap.set(num.toString().padStart(2, '0'), id)
    }

    const asientoIds = asientosSeleccionados.value.map(num => asientoMap.get(num.toString().padStart(2, '0'))!)

    const ventaRepo = new SupabaseVentasRepository()
    const boletosRepo = new SupabaseBoletosRepository()
    const confirmar = new ConfirmarCompra(ventaRepo, boletosRepo)

    const result = await confirmar.ejecutar({
      ruta: rutaSeleccionada.value!,
      asientos: asientoIds,
      precioUnitario: precioSeleccionado.value,
      capturaArchivo: metodoPago.value === 'Transferencia' ? capturaArchivo.value : null,
      metodoPago: metodoPago.value,
      stripeId: stripePaymentIntent?.id,
      nombres,
      apellidos,
      cedula,
      fechaNacimiento,
      tieneDiscapacidad: tieneDiscapacidad.value,
      usuarioId: authStore.user?.id ?? null,
    })

    compraConfirmada.value = {
      codigo: null,
      ruta: rutaSeleccionada.value!,
      asientos: [...asientosSeleccionados.value],
      total: result.total,
      captura: result.comprobanteUrl,
      referencia: stripePaymentIntent?.id || referenciaPago.value,
      metodoPago: metodoPago.value
    }

    mostrarPago.value = false
    resetUI()
  } catch (err: any) {
    console.error('ERROR COMPLETO EN COMPLETAR_COMPRA:', err)
    error.value = err.message || 'No fue posible registrar la compra.'
  }
}

function resetUI() {
  asientosSeleccionados.value = []
  asientosOcupados.value = []
  capture.value = null
  capturaArchivo.value = null
  referenciaPago.value = ''
  fechaNacimientoPasajero.value = ''
  tieneDiscapacidad.value = false
  metodoPago.value = 'Transferencia'
  clientSecret.value = ''
}

function nuevaBusqueda() {
  compraConfirmada.value = null
  rutaSeleccionada.value = null
  resetUI()
  mostrarPago.value = false
}

const seleccionarRuta = async (ruta: RutaDisponible, tipoServicio: TipoServicio | '') => {
  if (!tipoServicio) {
    error.value = 'Selecciona un tipo de asiento para continuar.'
    return
  }
  error.value = ''
  rutaSeleccionada.value = ruta
  tipoServicioSeleccionado.value = tipoServicio
  asientosSeleccionados.value = []
  await cargarAsientosDelBus(ruta.busId)
  await cargarAsientosOcupados(ruta.id)
}

const volverABuscar = () => {
  rutaSeleccionada.value = null
  resetUI()
}

onMounted(() => {
  void cargarRutas()
})

watch(() => filtros.fecha, () => {
  rutaSeleccionada.value = null
  void cargarRutas()
})
</script>

<template>
  <div class="space-y-6">
    <!-- ===== CONFIRMACIÓN ===== -->
    <div v-if="compraConfirmada" class="space-y-6">
      <div class="rounded-2xl bg-emerald-600 text-white p-6 shadow-2xl flex items-center gap-4">
        <span class="text-4xl">🎉</span>
        <div>
          <p class="text-emerald-100 text-sm font-bold uppercase tracking-wider">Compra exitosa</p>
          <h2 class="text-2xl font-black">
            {{ compraConfirmada.metodoPago === 'Tarjeta' ? 'Tu pago ha sido procesado' : 'Tu reserva está pendiente de verificación' }}
          </h2>
        </div>
      </div>
      <article class="rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <p class="font-bold text-slate-700">Estado: <span class="text-blue-700">{{ compraConfirmada.metodoPago === 'Tarjeta' ? 'PAGADO' : 'PENDIENTE' }}</span></p>
        <dl class="grid grid-cols-2 gap-3 text-sm mt-4">
          <dt class="font-bold text-slate-500">Ruta</dt> <dd>{{ compraConfirmada.ruta.origen }} → {{ compraConfirmada.ruta.destino }}</dd>
          <dt class="font-bold text-slate-500">Fecha</dt><dd>{{ compraConfirmada.ruta.fecha }} · {{ compraConfirmada.ruta.hora }}</dd>
          <dt class="font-bold text-slate-500">Asientos</dt><dd>{{ compraConfirmada.asientos.join(', ') }}</dd>
          <dt class="font-bold text-slate-500">Total pagado</dt><dd class="font-black text-blue-700">${{ compraConfirmada.total.toFixed(2) }}</dd>
          <dt class="font-bold text-slate-500">Método</dt><dd>{{ compraConfirmada.metodoPago }}</dd>
        </dl>
      </article>
      <button @click="nuevaBusqueda" class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl hover:bg-blue-700">
        Buscar otra ruta
      </button>
    </div>

    <template v-else>
      <div>
        <h2 class="text-2xl font-black text-slate-900">Buscar rutas</h2>
        <p class="text-slate-500 text-sm">Encuentra tu viaje y reserva tus asientos en línea.</p>
      </div>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        {{ error }}
      </div>

      <!-- ===== Filtros ===== -->
      <section v-if="!rutaSeleccionada" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Origen</label>
            <input v-model="filtros.origen" placeholder="Ej. Quito" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
          </div>
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Destino</label>
            <input v-model="filtros.destino" placeholder="Ej. Guayaquil" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
          </div>
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Fecha</label>
            <input v-model="filtros.fecha" type="date" :min="fechaMinima" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
          </div>
        </div>
      </section>

      <!-- ===== Resultados ===== -->
      <section v-if="!rutaSeleccionada" class="grid gap-3">
        <article v-for="r in resultados" :key="r.id"
          class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[200px]">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ r.cooperativa }}</p>
            <p class="text-xl font-black text-slate-900">{{ r.origen }} → {{ r.destino }}</p>
            <p class="text-sm text-slate-500">{{ r.fecha }} · {{ r.hora }}</p>
          </div>
          <div class="min-w-[220px]">
            <select v-model="tipoSeleccionadoPorRuta[r.id]" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Selecciona tipo de asiento</option>
              <option v-for="tipo in tiposDisponiblesParaRuta(r)" :key="tipo.tipo" :value="tipo.tipo">
                {{ tipo.nombre }} · ${{ tipo.precioBase.toFixed(2) }}
              </option>
            </select>
          </div>
          <button :disabled="!tipoSeleccionadoPorRuta[r.id] || r.asientosLibres === 0" @click="seleccionarRuta(r, tipoSeleccionadoPorRuta[r.id])"
            class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl hover:bg-blue-700 disabled:opacity-50">
            Elegir asientos
          </button>
        </article>
      </section>

      <!-- ===== Selección de asientos ===== -->
      <section v-else class="space-y-6">
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex justify-between items-center">
          <div>
            <p class="text-xs font-bold uppercase text-blue-600">Ruta elegida</p>
            <p class="font-black text-slate-900">{{ rutaSeleccionada.origen }} → {{ rutaSeleccionada.destino }}</p>
          </div>
          <button @click="volverABuscar" class="text-sm font-bold text-blue-700 underline">Cambiar ruta</button>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-w-md mx-auto">
          <h3 class="font-black text-center mb-4">Selecciona tus asientos</h3>
          <div class="grid grid-cols-5 gap-3">
            <template v-for="(a, idx) in asientosLayout" :key="a.numero">
              <button @click="toggleAsiento(a)" :disabled="a.ocupado"
                class="aspect-square rounded-lg text-xs font-bold transition-all"
                :class="a.ocupado ? 'bg-slate-300 text-slate-500' : asientosSeleccionados.includes(a.numero) ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-200'">
                {{ a.numero }}
              </button>
              <div v-if="idx % 4 === 1" class="aspect-square"></div>
            </template>
          </div>
          <button :disabled="asientosSeleccionados.length === 0" @click="mostrarPago = true"
            class="w-full mt-6 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl hover:bg-blue-700">
            Siguiente: Pago (${{ totalConDescuento.toFixed(2) }})
          </button>
        </div>

        <!-- ===== Modal de Pago ===== -->
        <div v-if="mostrarPago" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="mostrarPago = false"></div>
          <div class="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-8 border-b flex justify-between items-center">
              <h3 class="text-2xl font-black">Finalizar compra</h3>
              <button @click="mostrarPago = false" class="text-slate-400 text-2xl">×</button>
            </div>
            
            <div class="p-8 overflow-y-auto space-y-6">
              <nav class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button @click="metodoPago = 'Transferencia'" :class="metodoPago === 'Transferencia' ? 'bg-white shadow-sm' : ''" class="py-3 rounded-xl font-bold transition-all">Transferencia</button>
                <button @click="iniciarPagoTarjeta" :class="metodoPago === 'Tarjeta' ? 'bg-white shadow-sm text-blue-600' : ''" class="py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <span v-if="stripeLoading" class="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></span>
                  Tarjeta
                </button>
              </nav>

              <!-- Datos del pasajero desde sesión -->
              <div class="space-y-4">
                <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p class="text-xs font-black uppercase tracking-wider text-blue-700">
                    Boleto a nombre de
                  </p>
                  <p class="mt-2 text-lg font-black text-slate-900">
                    {{ authStore.user?.nombres || 'Sin nombres' }}
                    {{ authStore.user?.apellidos || 'Sin apellidos' }}
                  </p>
                  <p class="mt-1 text-sm font-bold text-slate-600">
                    Cédula:
                    <span class="text-slate-900">
                      {{ authStore.user?.cedula || 'Sin cédula registrada' }}
                    </span>
                  </p>
                  <p class="mt-2 text-xs font-semibold text-slate-500">
                    Estos datos se toman de tu perfil y no pueden editarse durante la compra.
                  </p>
                </div>

                <div class="bg-slate-50 p-3 rounded-2xl">
                  <label class="text-xs font-black text-slate-500 uppercase tracking-wider">Fecha Nacimiento *</label>
                  <input v-model="fechaNacimientoPasajero" type="date" class="w-full bg-transparent font-bold outline-none pt-1"/>
                </div>
              </div>

              <!-- Descuento por discapacidad + resumen del total -->
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                <label class="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" v-model="tieneDiscapacidad" class="h-4 w-4 rounded border-slate-300"/>
                  El pasajero tiene discapacidad
                </label>
                <p class="text-sm font-bold text-slate-600">
                  Total a pagar:
                  <span class="text-lg font-black text-emerald-700">${{ totalConDescuento.toFixed(2) }}</span>
                </p>
              </div>
              <p class="-mt-3 text-xs text-slate-500">
                El descuento (menor 30%, discapacidad/tercera edad 50%) se calcula con la fecha de nacimiento. No se acumulan: se aplica el mayor.
              </p>

              <!-- Vista Transferencia -->
              <div v-if="metodoPago === 'Transferencia'" class="space-y-4">
                <div class="p-6 border-2 border-dashed border-blue-200 rounded-3xl text-center">
                  <input type="file" accept="image/*" @change="onCapturaUpload" class="hidden" id="upload"/>
                  <label for="upload" class="cursor-pointer">
                    <p class="text-3xl mb-2">📸</p>
                    <p class="font-bold text-blue-700">Sube tu comprobante</p>
                    <p class="text-xs text-slate-500 mt-1">Formatos permitidos: JPG, PNG</p>
                  </label>
                  <img v-if="capture" :src="capture" class="mt-4 rounded-xl max-h-48 mx-auto border"/>
                </div>
                <button @click="completarCompra()" :disabled="!capturaArchivo" class="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 disabled:opacity-50">Confirmar Reserva</button>
              </div>

              <!-- Vista Tarjeta (Stripe) -->
              <div v-else-if="clientSecret">
                <StripePaymentForm 
                  :client-secret="clientSecret" 
                  :amount="totalConDescuento" 
                  @success="completarCompra"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>