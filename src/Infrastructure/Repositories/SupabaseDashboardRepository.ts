import { supabase } from '../Api/supabaseClient'
import { DomainException } from '../../Domain/Exceptions/DomainException'
import {
  DashboardChartPointDto,
  DashboardContextDto,
  DashboardQuickActionDto,
  DashboardResumenDto,
  DashboardRouteDto,
  DashboardTripDto,
} from '../../Application/Dtos/DashboardResumenDto'
import { IDashboardRepository } from '../../Domain/Repositories/IDashboardRepository'

type Row = Record<string, any>

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}

const getNested = (obj: any, path: string[]) => {
  let current = obj

  for (const segment of path) {
    if (!current) return undefined

    if (Array.isArray(current)) {
      current = current[0]
    }

    current =
      current[segment] ??
      current[segment.toLowerCase()] ??
      current[segment.toUpperCase()]
  }

  return current
}

const normalizeRole = (role: string) => {
  const r = (role || '').toLowerCase().trim()

  if (r === 'administrador') return 'admin'
  if (r === 'usuario final') return 'cliente'

  return r
}

const tipoPorRol = (role: string): 'cliente' | 'cooperativa' | 'chofer' => {
  const rol = normalizeRole(role)

  if (rol === 'chofer') return 'chofer'
  if (rol === 'admin' || rol === 'oficinista') return 'cooperativa'

  return 'cliente'
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

const startOfDayIso = (date: Date) => {
  const copy = new Date(date)
  copy.setUTCHours(0, 0, 0, 0)
  return copy.toISOString()
}

const endOfDayIso = (date: Date) => {
  const copy = new Date(date)
  copy.setUTCHours(23, 59, 59, 999)
  return copy.toISOString()
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setUTCMonth(copy.getUTCMonth() + months)
  return copy
}

const startOfCurrentWeek = () => {
  const today = new Date()
  const day = today.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = addDays(today, diffToMonday)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 0,
  }).format(value)

const formatPct = (value: number) => `${Math.round(value)}%`

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat('es-EC', { month: 'short' }).format(date).replace('.', '')

export class SupabaseDashboardRepository implements IDashboardRepository {
  async obtenerResumen(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    await this.rechazarBoletosVencidos()

    const tipo = tipoPorRol(contexto.rol)

    if (tipo === 'chofer') {
      return this.obtenerResumenChofer(contexto)
    }

    if (tipo === 'cliente') {
      return this.obtenerResumenCliente(contexto)
    }

    return this.obtenerResumenCooperativa(contexto)
  }

  private async rechazarBoletosVencidos() {
    const { data, error } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        Ventas!inner(
          Id,
          RutaId,
          Rutas!inner(
            Id,
            Fecha,
            Frecuencias!inner(
              Id,
              HoraSalida
            )
          )
        )
      `)
      .eq('Estado', 'Emitido')

    if (error) {
      return
    }

    const ahora = new Date()
    const boletosVencidos: number[] = []

    for (const boleto of data || []) {
      const boletoId = Number(getFieldValue(boleto, 'Id'))
      const fechaRuta = String(getNested(boleto, ['Ventas', 'Rutas', 'Fecha']) ?? '')
      const horaSalida = String(getNested(boleto, ['Ventas', 'Rutas', 'Frecuencias', 'HoraSalida']) ?? '00:00').slice(0, 5)

      if (!boletoId || !fechaRuta) continue

      const fechaHoraSalida = new Date(`${fechaRuta}T${horaSalida}:00`)
      const limite = new Date(fechaHoraSalida.getTime() + 30 * 60 * 1000)

      if (ahora > limite) {
        boletosVencidos.push(boletoId)
      }
    }

    if (boletosVencidos.length === 0) return

    await supabase
      .from('Boletos')
      .update({ Estado: 'Rechazado' })
      .in('Id', boletosVencidos)
  }

  private async obtenerResumenCliente(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    if (!contexto.cedula) {
      return {
        tipo: 'cliente',
        rolMensaje: 'Encuentra tu próximo viaje en pocos clics.',
        kpis: [
          { label: 'Boletos comprados', value: '0', hint: 'Histórico personal', icon: '🎟️' },
          { label: 'Total gastado', value: formatCurrency(0), hint: 'Suma de tus boletos', icon: '💵' },
          { label: 'Boletos activos', value: '0', hint: 'Pagados o en viaje', icon: '🧾' },
          { label: 'Rechazados', value: '0', hint: 'No abordados a tiempo', icon: '⚠️' },
        ],
        ventasSemana: [],
        rutasTop: [],
        gastosMeses: [],
        proximoViaje: null,
        accesosRapidos: this.accesosCliente(),
      }
    }

    const hoy = new Date()
    const todayKey = toDateKey(hoy)
    const inicioMeses = addMonths(hoy, -5)

    const { data, error } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        PrecioFinal,
        CreatedAt,
        CedulaPasajero,
        AsientoId,
        Asientos(
          NumeroAsiento,
          Fila,
          Columna
        ),
        Ventas!inner(
          Id,
          RutaId,
          Rutas!inner(
            Id,
            Fecha,
            Frecuencias!inner(
              Id,
              CiudadOrigen,
              CiudadDestino,
              HoraSalida,
              Cooperativas!inner(
                Id,
                Nombre
              )
            )
          )
        )
      `)
      .eq('CedulaPasajero', contexto.cedula)

    if (error) {
      throw new DomainException(`No se pudo cargar el dashboard del cliente: ${error.message}`)
    }

    const boletos = (data || []) as Row[]

    const totalBoletos = boletos.length

    const totalGastado = boletos
      .filter(boleto => ['Pagado', 'En Viaje', 'Finalizado'].includes(String(getFieldValue(boleto, 'Estado'))))
      .reduce((suma, boleto) => suma + Number(getFieldValue(boleto, 'PrecioFinal') ?? 0), 0)

    const activos = boletos.filter(boleto =>
      ['Pagado', 'En Viaje'].includes(String(getFieldValue(boleto, 'Estado')))
    ).length

    const rechazados = boletos.filter(boleto =>
      String(getFieldValue(boleto, 'Estado')) === 'Rechazado'
    ).length

    const gastosMeses = this.construirGastosMensuales(boletos, inicioMeses)

    const boletosOrdenados = [...boletos].sort((a, b) => {
      const fechaA = this.extraerFechaViaje(a) ?? ''
      const fechaB = this.extraerFechaViaje(b) ?? ''
      return fechaA.localeCompare(fechaB)
    })

    const proximoViaje = this.construirProximoViajeCliente(boletosOrdenados, todayKey)

    return {
      tipo: 'cliente',
      rolMensaje: 'Consulta tus boletos, tu gasto total y tu próximo viaje.',
      kpis: [
        {
          label: 'Boletos comprados',
          value: formatNumber(totalBoletos),
          hint: 'Histórico personal',
          icon: '🎟️',
        },
        {
          label: 'Total gastado',
          value: formatCurrency(totalGastado),
          hint: 'Boletos pagados, en viaje o finalizados',
          icon: '💵',
        },
        {
          label: 'Boletos activos',
          value: formatNumber(activos),
          hint: 'Pagados o en viaje',
          icon: '🧾',
        },
        {
          label: 'Rechazados',
          value: formatNumber(rechazados),
          hint: 'No escaneados a tiempo',
          icon: '⚠️',
        },
      ],
      ventasSemana: [],
      rutasTop: [],
      gastosMeses,
      proximoViaje,
      accesosRapidos: this.accesosCliente(),
    }
  }

  private async obtenerResumenCooperativa(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    const hoy = new Date()
    const todayKey = toDateKey(hoy)
    const inicioSemana = startOfCurrentWeek()
    const ayer = addDays(hoy, -1)
    const coopId = contexto.cooperativaId ?? null

    const [boletosSemanaRes, rutasHoyRes, busesRes, rutasAyerRes] = await Promise.all([
      supabase
        .from('Boletos')
        .select(`
          Id,
          Estado,
          PrecioFinal,
          CreatedAt,
          Ventas!inner(
            Id,
            RutaId,
            Rutas!inner(
              Id,
              Fecha,
              Frecuencias!inner(
                Id,
                CiudadOrigen,
                CiudadDestino,
                CooperativaId
              ),
              Buses!inner(
                Id,
                TotalAsientos,
                CooperativaId
              )
            )
          )
        `)
        .gte('CreatedAt', startOfDayIso(inicioSemana))
        .lte('CreatedAt', endOfDayIso(hoy)),

      supabase
        .from('Rutas')
        .select(`
          Id,
          Estado,
          Fecha,
          BusId,
          FrecuenciaId,
          Frecuencias!inner(
            Id,
            CiudadOrigen,
            CiudadDestino,
            HoraSalida,
            CooperativaId
          ),
          Buses!inner(
            Id,
            Numero,
            Placa,
            TotalAsientos,
            CooperativaId
          )
        `)
        .eq('Fecha', todayKey),

      supabase
        .from('Buses')
        .select('Id, Estado, CooperativaId, TotalAsientos'),

      supabase
        .from('Rutas')
        .select(`
          Id,
          Estado,
          Fecha,
          BusId,
          FrecuenciaId,
          Frecuencias!inner(
            Id,
            CooperativaId
          ),
          Buses!inner(
            Id,
            TotalAsientos,
            CooperativaId
          )
        `)
        .eq('Fecha', toDateKey(ayer)),
    ])

    if (boletosSemanaRes.error) {
      throw new DomainException(`No se pudo cargar boletos de la semana: ${boletosSemanaRes.error.message}`)
    }

    if (rutasHoyRes.error) {
      throw new DomainException(`No se pudo cargar rutas activas: ${rutasHoyRes.error.message}`)
    }

    if (busesRes.error) {
      throw new DomainException(`No se pudo cargar buses: ${busesRes.error.message}`)
    }

    const boletosSemana = ((boletosSemanaRes.data || []) as Row[])
      .filter(row => this.coincideCooperativa(row, coopId))

    const rutasHoy = ((rutasHoyRes.data || []) as Row[])
      .filter(row => this.coincideCooperativa(row, coopId))

    const rutasAyer = ((rutasAyerRes.data || []) as Row[])
      .filter(row => this.coincideCooperativa(row, coopId))

    const buses = ((busesRes.data || []) as Row[])
      .filter(bus => {
        if (!coopId) return true
        return Number(getFieldValue(bus, 'CooperativaId')) === Number(coopId)
      })

    const boletosVendidosSemana = boletosSemana
      .filter(boleto => ['Pagado', 'En Viaje', 'Finalizado'].includes(String(getFieldValue(boleto, 'Estado'))))
      .length

    const recaudacionSemana = boletosSemana
      .filter(boleto => ['Pagado', 'En Viaje', 'Finalizado'].includes(String(getFieldValue(boleto, 'Estado'))))
      .reduce((suma, boleto) => suma + Number(getFieldValue(boleto, 'PrecioFinal') ?? 0), 0)

    const rutasActivasHoy = rutasHoy
      .filter(ruta => ['Programada', 'En Curso', 'PROGRAMADA', 'EN_CURSO'].includes(String(getFieldValue(ruta, 'Estado'))))
      .length

    const busesActivos = buses
      .filter(bus => String(getFieldValue(bus, 'Estado') ?? 'Activo').toLowerCase() === 'activo')
      .length

    const boletosRechazados = boletosSemana
      .filter(boleto => String(getFieldValue(boleto, 'Estado')) === 'Rechazado')
      .length

    const asientosDisponiblesHoy = this.calcularAsientosTotales(rutasHoy)
    const ocupacion = asientosDisponiblesHoy > 0
      ? (boletosSemana.length / asientosDisponiblesHoy) * 100
      : 0

    return {
      tipo: 'cooperativa',
      rolMensaje: this.mensajePorRol(contexto.rol),
      kpis: [
        {
          label: 'Boletos semana',
          value: formatNumber(boletosVendidosSemana),
          hint: 'Vendidos desde el lunes',
          icon: '🎟️',
          delta: 0,
        },
        {
          label: 'Recaudación semana',
          value: formatCurrency(recaudacionSemana),
          hint: 'Total recaudado',
          icon: '💰',
          delta: 0,
        },
        {
          label: 'Rutas activas hoy',
          value: formatNumber(rutasActivasHoy),
          hint: `${formatNumber(rutasAyer.length)} rutas ayer`,
          icon: '🛣️',
          delta: this.calcularVariacion(rutasActivasHoy, rutasAyer.length),
        },
        {
          label: 'Buses activos',
          value: formatNumber(busesActivos),
          hint: 'Unidades disponibles',
          icon: '🚌',
          delta: 0,
        },
        {
          label: 'Ocupación',
          value: formatPct(ocupacion),
          hint: 'Según rutas de hoy',
          icon: '📈',
          delta: 0,
        },
        {
          label: 'Rechazados',
          value: formatNumber(boletosRechazados),
          hint: 'No abordados a tiempo',
          icon: '⚠️',
          delta: 0,
        },
      ],
      ventasSemana: this.construirSerieSemanal(boletosSemana, inicioSemana),
      rutasTop: this.construirTopRutas(boletosSemana),
      gastosMeses: [],
      proximoViaje: null,
      accesosRapidos: this.accesosCooperativa(contexto.rol),
    }
  }

  private async obtenerResumenChofer(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    const todayKey = toDateKey(new Date())
    const choferId = contexto.usuarioTablaId

    if (!choferId) {
      return this.dashboardChoferVacio('No se encontró el identificador interno del chofer.')
    }

    const { data: hojas, error } = await supabase
      .from('HojasRuta')
      .select(`
        Id,
        FrecuenciaId,
        BusId,
        ChoferId,
        FechaSalida,
        HoraSalida,
        Origen,
        Destino,
        Estado,
        Buses(
          Id,
          Numero,
          Placa,
          TotalAsientos
        )
      `)
      .eq('ChoferId', choferId)
      .gte('FechaSalida', todayKey)
      .order('FechaSalida', { ascending: true })
      .order('HoraSalida', { ascending: true })
      .limit(1)

    if (error) {
      return this.dashboardChoferVacio(`No se pudo consultar la hoja de ruta del chofer: ${error.message}`)
    }

    const hoja = (hojas || [])[0]

    if (!hoja) {
      return this.dashboardChoferVacio('No tienes viajes asignados para hoy o fechas próximas.')
    }

    const frecuenciaId = Number(getFieldValue(hoja, 'FrecuenciaId'))
    const fechaSalida = String(getFieldValue(hoja, 'FechaSalida') ?? todayKey)

    const { data: rutaData } = await supabase
      .from('Rutas')
      .select('Id, Fecha, Estado, FrecuenciaId, BusId')
      .eq('FrecuenciaId', frecuenciaId)
      .eq('Fecha', fechaSalida)
      .limit(1)

    const ruta = (rutaData || [])[0]
    const rutaId = Number(getFieldValue(ruta, 'Id') ?? 0)

    let boletos: Row[] = []

    if (rutaId) {
      const { data: boletosData } = await supabase
        .from('Boletos')
        .select(`
          Id,
          Estado,
          Ventas!inner(
            Id,
            RutaId
          )
        `)
        .eq('Ventas.RutaId', rutaId)

      boletos = (boletosData || []) as Row[]
    }

    const pasajerosEsperados = boletos
      .filter(boleto => ['Pagado', 'En Viaje'].includes(String(getFieldValue(boleto, 'Estado'))))
      .length

    const pasajerosEscaneados = boletos
      .filter(boleto => String(getFieldValue(boleto, 'Estado')) === 'En Viaje')
      .length

    const pasajerosPendientes = Math.max(0, pasajerosEsperados - pasajerosEscaneados)

    const bus = getFieldValue(hoja, 'Buses') ?? getFieldValue(hoja, 'buses') ?? {}

    const viaje: DashboardTripDto = {
      fecha: fechaSalida,
      hora: String(getFieldValue(hoja, 'HoraSalida') ?? '--:--').slice(0, 5),
      origen: String(getFieldValue(hoja, 'Origen') ?? 'Origen'),
      destino: String(getFieldValue(hoja, 'Destino') ?? 'Destino'),
      bus: String(getFieldValue(bus, 'Numero') ?? getFieldValue(hoja, 'BusId') ?? 'N/D'),
      placa: String(getFieldValue(bus, 'Placa') ?? 'Sin placa'),
      estado: String(getFieldValue(hoja, 'Estado') ?? 'PROGRAMADA'),
      pasajerosEsperados,
      pasajerosEscaneados,
      pasajerosPendientes,
    }

    return {
      tipo: 'chofer',
      rolMensaje: 'Consulta tu viaje asignado y controla el abordaje de pasajeros.',
      kpis: [
        {
          label: 'Pasajeros esperados',
          value: formatNumber(pasajerosEsperados),
          hint: 'Boletos pagados para este viaje',
          icon: '👥',
        },
        {
          label: 'Escaneados',
          value: formatNumber(pasajerosEscaneados),
          hint: 'Pasajeros ya abordados',
          icon: '✅',
        },
        {
          label: 'Pendientes',
          value: formatNumber(pasajerosPendientes),
          hint: 'Faltan por abordar',
          icon: '⏳',
        },
        {
          label: 'Estado del viaje',
          value: viaje.estado || 'Programado',
          hint: `${viaje.origen} → ${viaje.destino}`,
          icon: '🚌',
        },
      ],
      ventasSemana: [],
      rutasTop: [],
      gastosMeses: [],
      proximoViaje: viaje,
      accesosRapidos: this.accesosChofer(),
    }
  }

  private dashboardChoferVacio(mensaje: string): DashboardResumenDto {
    return {
      tipo: 'chofer',
      rolMensaje: mensaje,
      kpis: [
        { label: 'Pasajeros esperados', value: '0', hint: 'Sin viaje activo', icon: '👥' },
        { label: 'Escaneados', value: '0', hint: 'Sin validaciones', icon: '✅' },
        { label: 'Pendientes', value: '0', hint: 'Sin pasajeros pendientes', icon: '⏳' },
        { label: 'Estado del viaje', value: 'Sin asignación', hint: 'No hay viaje próximo', icon: '🚌' },
      ],
      ventasSemana: [],
      rutasTop: [],
      gastosMeses: [],
      proximoViaje: null,
      accesosRapidos: this.accesosChofer(),
    }
  }

  private coincideCooperativa(registro: Row, cooperativaId: number | null) {
    if (!cooperativaId) return true

    const frecuenciaCoop = Number(
      getNested(registro, ['Ventas', 'Rutas', 'Frecuencias', 'CooperativaId']) ??
      getNested(registro, ['Frecuencias', 'CooperativaId']) ??
      0
    )

    const busCoop = Number(
      getNested(registro, ['Ventas', 'Rutas', 'Buses', 'CooperativaId']) ??
      getNested(registro, ['Buses', 'CooperativaId']) ??
      0
    )

    return frecuenciaCoop === Number(cooperativaId) || busCoop === Number(cooperativaId)
  }

  private ticketEsDelDia(ticket: Row, fecha: string) {
    const createdAt = getFieldValue(ticket, 'CreatedAt')
    return createdAt ? toDateKey(new Date(createdAt)) === fecha : false
  }

  private calcularVariacion(actual: number, anterior: number) {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

  private calcularAsientosTotales(rutas: Row[]) {
    const buses = new Map<number, number>()

    for (const ruta of rutas) {
      const busId = Number(getFieldValue(ruta, 'BusId') ?? 0)
      const totalAsientos = Number(getNested(ruta, ['Buses', 'TotalAsientos']) ?? 0)

      if (busId && !buses.has(busId)) {
        buses.set(busId, totalAsientos)
      }
    }

    return Array.from(buses.values()).reduce((a, b) => a + b, 0)
  }

  private construirSerieSemanal(boletos: Row[], inicio: Date): DashboardChartPointDto[] {
    const dias = Array.from({ length: 7 }, (_, index) => addDays(inicio, index))

    return dias.map(dia => {
      const key = toDateKey(dia)
      const value = boletos.filter(boleto => this.ticketEsDelDia(boleto, key)).length

      return {
        label: new Intl.DateTimeFormat('es-EC', { weekday: 'short' }).format(dia).replace('.', ''),
        value,
      }
    })
  }

  private construirTopRutas(boletos: Row[]): DashboardRouteDto[] {
    const mapa = new Map<string, number>()

    for (const boleto of boletos) {
      const origen = String(getNested(boleto, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadOrigen']) ?? 'Origen')
      const destino = String(getNested(boleto, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadDestino']) ?? 'Destino')
      const ruta = `${origen} → ${destino}`

      mapa.set(ruta, (mapa.get(ruta) ?? 0) + 1)
    }

    return Array.from(mapa.entries())
      .map(([ruta, cantidad]) => ({ ruta, boletos: cantidad }))
      .sort((a, b) => b.boletos - a.boletos)
      .slice(0, 5)
  }

  private construirGastosMensuales(boletos: Row[], inicio: Date): DashboardChartPointDto[] {
    const meses = Array.from({ length: 6 }, (_, index) => addMonths(inicio, index))

    return meses.map(mes => {
      const prefix = `${mes.getUTCFullYear()}-${String(mes.getUTCMonth() + 1).padStart(2, '0')}`

      const value = boletos
        .filter(boleto => {
          const createdAt = getFieldValue(boleto, 'CreatedAt')
          return createdAt ? new Date(createdAt).toISOString().slice(0, 7) === prefix : false
        })
        .filter(boleto => ['Pagado', 'En Viaje', 'Finalizado'].includes(String(getFieldValue(boleto, 'Estado'))))
        .reduce((suma, boleto) => suma + Number(getFieldValue(boleto, 'PrecioFinal') ?? 0), 0)

      return {
        label: monthLabel(mes),
        value,
      }
    })
  }

  private construirProximoViajeCliente(boletos: Row[], todayKey: string): DashboardTripDto | null {
    const candidato = boletos.find(boleto => {
      const estado = String(getFieldValue(boleto, 'Estado'))
      const fechaViaje = this.extraerFechaViaje(boleto)

      return ['Pagado', 'En Viaje'].includes(estado) && fechaViaje && fechaViaje >= todayKey
    })

    if (!candidato) return null

    return {
      fecha: this.extraerFechaViaje(candidato) || 'Sin fecha',
      hora: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'HoraSalida']) ?? '--:--').slice(0, 5),
      origen: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadOrigen']) ?? 'Origen'),
      destino: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadDestino']) ?? 'Destino'),
      cooperativa: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'Cooperativas', 'Nombre']) ?? 'Cooperativa'),
      asiento: String(this.formatearAsiento(candidato)),
      estado: String(getFieldValue(candidato, 'Estado') ?? 'Pagado'),
    }
  }

  private extraerFechaViaje(boleto: Row) {
    return String(getNested(boleto, ['Ventas', 'Rutas', 'Fecha']) ?? '')
  }

  private formatearAsiento(boleto: Row) {
    const numero = getNested(boleto, ['Asientos', 'NumeroAsiento'])
    const fila = getNested(boleto, ['Asientos', 'Fila'])
    const columna = getNested(boleto, ['Asientos', 'Columna'])

    if (numero) return numero
    if (fila && columna) return `${fila}${columna}`

    return 'N/D'
  }

  private mensajePorRol(rol: string) {
    const normalized = normalizeRole(rol)

    if (normalized === 'admin') {
      return 'Panel general de administración de la cooperativa.'
    }

    if (normalized === 'oficinista') {
      return 'Panel operativo para ventas, rutas activas y abordaje.'
    }

    return 'Resumen general de operación.'
  }

  private accesosCliente(): DashboardQuickActionDto[] {
    return [
      { to: '/buscar', label: 'Buscar ruta', desc: 'Comprar nuevo boleto', icon: '🔎' },
      { to: '/venta', label: 'Comprar boleto', desc: 'Venta en línea', icon: '💳' },
      { to: '/mis-boletos', label: 'Mis boletos', desc: 'Ver QR y estado', icon: '🎟️' },
    ]
  }

  private accesosCooperativa(rol: string): DashboardQuickActionDto[] {
    const normalized = normalizeRole(rol)

    if (normalized === 'oficinista') {
      return [
        { to: '/venta', label: 'Venta', desc: 'Vender boleto', icon: '💳' },
        { to: '/abordaje', label: 'Abordaje', desc: 'Control de QR', icon: '📷' },
        { to: '/admin/rutas', label: 'Rutas', desc: 'Rutas activas', icon: '🛣️' },
        { to: '/reportes', label: 'Reportes', desc: 'Resumen operativo', icon: '📊' },
      ]
    }

    return [
      { to: '/admin/usuarios', label: 'Usuarios', desc: 'Gestionar roles', icon: '👥' },
      { to: '/admin/buses', label: 'Buses', desc: 'Unidades activas', icon: '🚌' },
      { to: '/admin/frecuencias', label: 'Frecuencias', desc: 'Horarios base', icon: '⏰' },
      { to: '/admin/rutas', label: 'Rutas', desc: 'Viajes diarios', icon: '🛣️' },
      { to: '/venta', label: 'Venta', desc: 'Emitir boleto', icon: '💳' },
      { to: '/reportes', label: 'Reportes', desc: 'Análisis general', icon: '📊' },
    ]
  }

  private accesosChofer(): DashboardQuickActionDto[] {
    return [
      { to: '/abordaje', label: 'Escanear QR', desc: 'Validar pasajero', icon: '📷' },
      { to: '/venta', label: 'Venta', desc: 'Venta en bus', icon: '💳' },
    ]
  }
}