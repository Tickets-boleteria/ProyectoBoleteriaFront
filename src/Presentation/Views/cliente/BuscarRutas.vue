<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabase } from '../../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../../Store/authStore'

interface RutaDisponible {
  id: number
  frecuenciaId: number
  busId: number
  origen: string
  destino: string
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

  const configuracion = configuracionSeleccionadaPorBus(rutaSeleccionada.value.busId, tipoServicioSeleccionado.value)
  const cantidadBase = configuracion?.cantidad ?? rutaSeleccionada.value.totalAsientos
  if (!cantidadBase || cantidadBase <= 0) return []

  return Array.from({ length: Math.max(cantidadBase, 0) }, (_, index) => {
    const numero = String(index + 1).padStart(2, '0')
    return {
      numero,
      ocupado: false,
    }
  })
})

const precioSeleccionado = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return 0
  return precioPorTipoYBus(rutaSeleccionada.value.busId, tipoServicioSeleccionado.value)
})

const asientosLibresDelTipoSeleccionado = computed(() => {
  if (!rutaSeleccionada.value || !tipoServicioSeleccionado.value) return 0

  const configuracion = configuracionSeleccionadaPorBus(rutaSeleccionada.value.busId, tipoServicioSeleccionado.value)
  const cantidadBase = configuracion?.cantidad ?? rutaSeleccionada.value.totalAsientos
  if (!cantidadBase || cantidadBase <= 0) return 0

  const ocupados = asientosOcupadosPorTipo[tipoServicioSeleccionado.value].length
  return Math.max(cantidadBase - ocupados, 0)
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
        ? supabase.from('Frecuencias').select('Id, CiudadOrigen, CiudadDestino, HoraSalida, CooperativaId').in('Id', frecuenciaIds)
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
const captura = ref<string | null>(null)
const referenciaPago = ref('')
const mostrarPago = ref(false)

function onCapturaUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { captura.value = ev.target?.result as string }
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
}>(null)

const authStore = useAuthStore()

async function confirmarCompra() {
  if (!rutaSeleccionada.value || asientosSeleccionados.value.length === 0) return
  if (!tipoServicioSeleccionado.value) {
    error.value = 'Selecciona un tipo de asiento antes de confirmar la compra.'
    return
  }
  if (precioSeleccionado.value <= 0) {
    error.value = 'El tipo de asiento seleccionado no tiene un precio configurado.'
    return
  }
  if (!captura.value) {
    alert('Por favor adjunta la captura del pago para continuar.')
    return
  }

  try {
    // 1) Crear registro de Venta (estado PENDIENTE)
    const ventaPayload: any = {
      RutaId: rutaSeleccionada.value.id,
      FechaVenta: new Date().toISOString(),
      Estado: 'PENDIENTE',
    }

    const { data: ventaData, error: ventaError } = await supabase
      .from('Ventas')
      .insert([ventaPayload])
      .select()
      .single()

    if (ventaError) throw new Error(ventaError.message)
    const ventaId = Number(getFieldValue(ventaData, 'Id') ?? getFieldValue(ventaData, 'id'))
    if (!ventaId) throw new Error('No se pudo crear la venta.')

    // 2) Obtener Asientos del bus para mapear número -> Id
    const { data: asientosRows, error: asientosError } = await supabase
      .from('Asientos')
      .select('Id, NumeroAsiento, BusId')
      .eq('BusId', rutaSeleccionada.value.busId)

    if (asientosError) throw new Error(asientosError.message)

    const filas = asientosRows || []
    const asientoMap = new Map<string, number>()
    for (const f of filas) {
      const num = String(getFieldValue(f, 'NumeroAsiento') ?? getFieldValue(f, 'numeroasiento') ?? '')
      const id = Number(getFieldValue(f, 'Id') ?? getFieldValue(f, 'id') ?? 0)
      if (num && id) asientoMap.set(num.toString().padStart(2, '0'), id)
      if (num && id) asientoMap.set(String(Number(num)), id)
    }

    // 3) Preparar inserts para Boletos
    const cedulaPasajero = String(authStore.user?.cedula ?? '')
    const precio = precioSeleccionado.value
    const boletosInsert: any[] = []
    for (const asientoNumero of asientosSeleccionados.value) {
      const key = asientoNumero.toString().padStart(2, '0')
      const asientoId = asientoMap.get(key) ?? asientoMap.get(String(Number(asientoNumero)))
      if (!asientoId) throw new Error(`No se encontró el asiento ${asientoNumero} en la configuración del bus.`)
      boletosInsert.push({
        VentaId: ventaId,
        AsientoId: asientoId,
        PrecioFinal: precio,
        CedulaPasajero: cedulaPasajero,
        Estado: 'PENDIENTE',
      })
    }

    if (boletosInsert.length === 0) throw new Error('No hay boletos para insertar.')

    const { data: boletosData, error: boletosError } = await supabase
      .from('Boletos')
      .insert(boletosInsert)
      .select()

    if (boletosError) throw new Error(boletosError.message)

    // 4) Actualizar UI y estado local
    compraConfirmada.value = {
      codigo: null,
      ruta: rutaSeleccionada.value,
      asientos: [...asientosSeleccionados.value],
      total: precio * asientosSeleccionados.value.length,
      captura: captura.value,
      referencia: referenciaPago.value,
    }

    // Limpiar formulario de pago
    mostrarPago.value = false
    asientosSeleccionados.value = []
    asientosOcupados.value = []
    captura.value = null
    referenciaPago.value = ''

  } catch (err: any) {
    error.value = err.message || 'No fue posible registrar la compra.'
  }
}

function nuevaBusqueda() {
  compraConfirmada.value = null
  rutaSeleccionada.value = null
  asientosSeleccionados.value = []
  asientosOcupados.value = []
  asientosOcupadosPorTipo.NORMAL = []
  asientosOcupadosPorTipo.VIP = []
  asientosOcupadosPorTipo.EXECUTIVO = []
  asientosDelBus.value = []
  tipoServicioSeleccionado.value = ''
  captura.value = null
  referenciaPago.value = ''
  mostrarPago.value = false
}

const formatoDuracion = (min: number) => {
  const h = Math.floor(min / 60); const m = min % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

const seleccionarRuta = async (ruta: RutaDisponible, tipoServicio: TipoServicio | '') => {
  if (!tipoServicio) {
    error.value = 'Selecciona un tipo de asiento para continuar.'
    return
  }

  const tiposDisponibles = tiposDisponiblesPorBus(ruta.busId)
  if (!tiposDisponibles.some(tipo => tipo.tipo === tipoServicio)) {
    error.value = 'El tipo de asiento seleccionado no está disponible para este bus.'
    return
  }

  if (asientosLibresPorRutaYTipo(ruta, tipoServicio) <= 0) {
    error.value = 'El tipo de asiento seleccionado ya no tiene asientos disponibles.'
    return
  }

  error.value = ''
  rutaSeleccionada.value = ruta
  tipoServicioSeleccionado.value = tipoServicio
  asientosSeleccionados.value = []
  asientosOcupados.value = []
  asientosDelBus.value = []
  await cargarAsientosDelBus(ruta.busId)
  await cargarAsientosOcupados(ruta.id)
}

const volverABuscar = () => {
  compraConfirmada.value = null
  rutaSeleccionada.value = null
  asientosSeleccionados.value = []
  asientosOcupados.value = []
  asientosDelBus.value = []
  tipoServicioSeleccionado.value = ''
  captura.value = null
  referenciaPago.value = ''
  mostrarPago.value = false
}

onMounted(() => {
  void cargarRutas()
})

watch(() => filtros.fecha, () => {
  rutaSeleccionada.value = null
  asientosSeleccionados.value = []
  asientosOcupados.value = []
  asientosOcupadosPorTipo.NORMAL = []
  asientosOcupadosPorTipo.VIP = []
  asientosOcupadosPorTipo.EXECUTIVO = []
  asientosDelBus.value = []
  tipoServicioSeleccionado.value = ''
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
          <p class="text-emerald-100 text-sm font-bold uppercase tracking-wider">Compra recibida</p>
          <h2 class="text-2xl font-black">Tu reserva está pendiente de verificación</h2>
        </div>
      </div>
      <article class="rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <p class="font-bold text-slate-700">Código: <span class="font-mono text-blue-700">Pendiente de registro</span></p>
        <p class="text-sm text-slate-500 mt-1">El oficinista validará el comprobante y tu boleto con QR aparecerá en
          <router-link to="/mis-boletos" class="font-bold text-blue-700 underline">Mis boletos</router-link>.</p>
        <dl class="grid grid-cols-2 gap-3 text-sm mt-4">
          <dt class="font-bold text-slate-500">Ruta</dt> <dd>{{ compraConfirmada.ruta.origen }} → {{ compraConfirmada.ruta.destino }}</dd>
          <dt class="font-bold text-slate-500">Fecha</dt><dd>{{ compraConfirmada.ruta.fecha }} · {{ compraConfirmada.ruta.hora }}</dd>
          <dt class="font-bold text-slate-500">Asientos</dt><dd>{{ compraConfirmada.asientos.join(', ') }}</dd>
          <dt class="font-bold text-slate-500">Total pagado</dt><dd class="font-black text-blue-700">${{ compraConfirmada.total.toFixed(2) }}</dd>
        </dl>
      </article>
      <button @click="nuevaBusqueda" class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
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

      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Cargando rutas reales desde la base de datos...
      </div>

      <!-- ===== Filtros ===== -->
      <section v-if="!rutaSeleccionada" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Origen</label>
            <input v-model="filtros.origen" minlength="3" placeholder="Ej. Quito"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            <p v-if="filtros.origen.trim() && filtros.origen.trim().length < 3" class="mt-1 text-xs font-medium text-amber-600">
              Escribe al menos 3 caracteres para filtrar por origen.
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Destino</label>
            <input v-model="filtros.destino" minlength="3" placeholder="Ej. Guayaquil"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            <p v-if="filtros.destino.trim() && filtros.destino.trim().length < 3" class="mt-1 text-xs font-medium text-amber-600">
              Escribe al menos 3 caracteres para filtrar por destino.
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-3">
            <label class="text-xs font-bold text-slate-700">Fecha</label>
            <input v-model="filtros.fecha" type="date" :min="fechaMinima"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            <p class="mt-1 text-xs font-medium text-slate-500">
              Solo se permiten rutas desde hoy en adelante.
            </p>
          </div>
        </div>
      </section>

      <div v-if="errorFiltros" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
        {{ errorFiltros }}
      </div>

      <!-- ===== Resultados ===== -->
      <section v-if="!rutaSeleccionada" class="grid gap-3">
        <article v-for="r in resultados" :key="r.id"
          class="rounded-2xl bg-white p-5 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ r.cooperativa }}</p>
              <p class="text-xl font-black text-slate-900">{{ r.origen }} → {{ r.destino }}</p>
              <p class="text-sm text-slate-500">{{ r.fecha }} · Sale {{ r.hora }} · Bus {{ r.busPlaca }}</p>
            </div>
            <div class="min-w-[220px] text-right">
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Tipo de asiento</label>
              <select
                v-model="tipoSeleccionadoPorRuta[r.id]"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                :disabled="tiposDisponiblesParaRuta(r).length === 0"
              >
                <option value="">Selecciona una opción</option>
                <option v-for="tipo in tiposDisponiblesParaRuta(r)" :key="tipo.tipo" :value="tipo.tipo">
                  {{ tipo.nombre }} · ${{ tipo.precioBase.toFixed(2) }}
                </option>
              </select>
              <p v-if="tipoSeleccionadoPorRuta[r.id]" class="text-2xl font-black text-blue-700 mt-2">
                ${{ precioPorTipoYBus(r.busId, tipoSeleccionadoPorRuta[r.id]).toFixed(2) }}
              </p>
              <p v-else class="text-xs font-medium text-slate-500 mt-2">
                Selecciona un tipo para ver el costo
              </p>
              <p v-if="tipoSeleccionadoPorRuta[r.id]" class="text-xs font-bold mt-2" :class="asientosLibresPorRutaYTipo(r, tipoSeleccionadoPorRuta[r.id]) > 0 ? 'text-emerald-600' : 'text-red-600'">
                {{ asientosLibresPorRutaYTipo(r, tipoSeleccionadoPorRuta[r.id]) > 0 ? asientosLibresPorRutaYTipo(r, tipoSeleccionadoPorRuta[r.id]) + ' asientos libres para este tipo' : 'No hay asientos disponibles para este tipo' }}
              </p>
              <p v-if="tiposDisponiblesPorBus(r.busId).length === 0" class="text-xs font-medium text-amber-600 mt-2">
                Este bus aún no tiene tipos de asiento configurados.
              </p>
              <p v-else-if="tiposDisponiblesParaRuta(r).length === 0" class="text-xs font-medium text-rose-600 mt-2">
                Los tipos de este bus están agotados para esta ruta.
              </p>
              <p class="text-xs font-bold" :class="r.asientosLibres > 10 ? 'text-emerald-600' : r.asientosLibres > 0 ? 'text-amber-600' : 'text-red-600'">
                {{ r.asientosLibres > 0 ? r.asientosLibres + ' asientos libres' : 'Lleno' }}
              </p>
            </div>
            <button :disabled="!tipoSeleccionadoPorRuta[r.id] || r.asientosLibres === 0 || asientosLibresPorRutaYTipo(r, tipoSeleccionadoPorRuta[r.id]) === 0 || loadingAsientos" @click="seleccionarRuta(r, tipoSeleccionadoPorRuta[r.id])"
              class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
              Elegir asientos
            </button>
          </div>
        </article>
        <div v-if="resultados.length === 0" class="rounded-2xl bg-white p-8 text-center text-slate-500 border border-slate-100">
          No hay rutas con esos filtros. Ajusta la búsqueda.
        </div>
      </section>

      <!-- ===== Selección de asientos y pago ===== -->
      <section v-else class="space-y-6">
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase text-blue-600 tracking-wider">Ruta elegida</p>
            <p class="font-black text-slate-900">{{ rutaSeleccionada.origen }} → {{ rutaSeleccionada.destino }} · {{ rutaSeleccionada.fecha }} · {{ rutaSeleccionada.hora }}</p>
            <p class="text-sm font-bold text-slate-600 mt-1">
              Tipo: {{ etiquetaTipoServicio(tipoServicioSeleccionado) }} · ${{ precioSeleccionado.toFixed(2) }}
            </p>
            <p class="text-sm font-bold text-slate-600 mt-1">
              Asientos libres para este tipo: {{ asientosLibresDelTipoSeleccionado }}
            </p>
          </div>
          <button @click="volverABuscar" class="text-sm font-bold text-blue-700 underline underline-offset-4">Cambiar ruta</button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
            <h3 class="text-lg font-black text-slate-900 mb-4">Selecciona tus asientos</h3>
            <p v-if="!tipoServicioSeleccionado" class="mb-3 text-sm font-medium text-amber-600">
              Debes seleccionar un tipo de asiento antes de escoger un lugar.
            </p>
            <p v-else-if="asientosLayout.length === 0" class="mb-3 text-sm font-medium text-amber-600">
              No hay asientos disponibles para este tipo en el bus seleccionado.
            </p>
            <p v-if="loadingAsientos" class="mb-3 text-sm text-slate-500">Cargando asientos reales ocupados...</p>
            <div class="flex items-center gap-4 text-xs mb-4">
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-white border-2 border-slate-300"></span>Libre</div>
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-blue-600"></span>Elegido</div>
              <div class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-slate-300"></span>Ocupado</div>
            </div>
            <div class="rounded-xl bg-slate-100 p-4 max-w-md mx-auto">
              <div class="text-center text-xs text-slate-500 mb-3 pb-2 border-b border-slate-200">⬆ Frente del bus</div>
              <div class="grid grid-cols-5 gap-2">
                <template v-for="(a, idx) in asientosLayout" :key="a.numero">
                  <button @click="toggleAsiento(a)" :disabled="a.ocupado"
                    class="aspect-square rounded-lg text-xs font-bold transition-all"
                    :class="a.ocupado
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : asientosSeleccionados.includes(a.numero)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border-2 border-slate-300 hover:border-blue-500'">
                    {{ a.numero }}
                  </button>
                  <div v-if="idx % 4 === 1" class="aspect-square"></div>
                </template>
              </div>
            </div>
          </div>

          <aside class="space-y-4">
            <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
              <h3 class="font-black text-slate-900 mb-3">Resumen</h3>
              <p class="text-sm text-slate-600 mb-1">Tipo: <strong>{{ etiquetaTipoServicio(tipoServicioSeleccionado) }}</strong></p>
              <p class="text-sm text-slate-600 mb-1">Precio unitario: <strong>${{ precioSeleccionado.toFixed(2) }}</strong></p>
              <p class="text-sm text-slate-600 mb-1">Asientos libres para este tipo: <strong>{{ asientosLibresDelTipoSeleccionado }}</strong></p>
              <p class="text-sm text-slate-600 mb-1">Asientos: <strong>{{ asientosSeleccionados.join(', ') || '—' }}</strong></p>
              <p class="text-sm text-slate-600 mb-3">Cantidad: <strong>{{ asientosSeleccionados.length }}</strong></p>
              <div class="border-t border-slate-200 pt-3">
                <div class="flex justify-between text-sm"><span>Subtotal</span><span class="font-bold">${{ (precioSeleccionado * asientosSeleccionados.length).toFixed(2) }}</span></div>
                <div class="flex justify-between text-lg mt-1"><span class="font-bold">Total</span><span class="font-black text-blue-700">${{ (precioSeleccionado * asientosSeleccionados.length).toFixed(2) }}</span></div>
              </div>
              <button :disabled="asientosSeleccionados.length === 0 || !tipoServicioSeleccionado || precioSeleccionado <= 0" @click="mostrarPago = true"
                class="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">
                Ir a pagar
              </button>
            </div>

            <div class="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
              <h4 class="font-bold text-slate-900 mb-2 text-sm">Datos para transferencia</h4>
              <p class="text-xs text-slate-600">Adjunta únicamente el comprobante oficial de la venta.</p>
            </div>
          </aside>
        </div>

        <!-- ===== Pago ===== -->
        <section v-if="mostrarPago" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
          <h3 class="text-lg font-black text-slate-900 mb-4">Adjunta tu comprobante de pago</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Referencia / número de transacción</label>
              <input v-model="referenciaPago" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1"/>
            </div>
            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Captura del pago (imagen)</label>
              <input type="file" accept="image/*" @change="onCapturaUpload" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 text-sm"/>
            </div>
          </div>
          <div v-if="captura" class="mt-4">
            <p class="text-xs font-bold text-slate-700 mb-2">Vista previa:</p>
            <img :src="captura" alt="Captura pago" class="rounded-xl border border-slate-200 max-h-64"/>
          </div>
          <button @click="confirmarCompra"
            class="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700">
            Confirmar compra
          </button>
        </section>
      </section>
    </template>
  </div>
</template>
