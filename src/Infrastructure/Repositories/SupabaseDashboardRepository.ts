import { supabase } from '../Api/supabaseClient'
import { DomainException } from '../../Domain/Exceptions/DomainException'
import { DashboardContextDto, DashboardResumenDto, DashboardQuickActionDto, DashboardChartPointDto, DashboardRouteDto, DashboardTripDto } from '../../Application/Dtos/DashboardResumenDto'
import { IDashboardRepository } from '../../Domain/Repositories/IDashboardRepository'

type TicketRow = Record<string, any>
type RouteRow = Record<string, any>

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}

const normalizeRole = (role: string) => {
  const r = (role || '').toLowerCase().trim()
  if (r === 'administrador' || r === 'admin' || r === 'oficinista' || r === 'chofer') {
    return 'cooperativa'
  }
  return 'cliente'
}

const toDateKey = (value: Date) => value.toISOString().slice(0, 10)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(value)

const formatPct = (value: number) => `${Math.round(value)}%`

const getNested = (obj: any, path: string[]) => {
  let current = obj
  for (const segment of path) {
    if (!current) return undefined
    current = current[segment] ?? current[segment.toLowerCase()] ?? current[segment.toUpperCase()]
  }
  return current
}

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

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat('es-EC', { month: 'short' }).format(date).replace('.', '')

export class SupabaseDashboardRepository implements IDashboardRepository {
  async obtenerResumen(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    const tipo = normalizeRole(contexto.rol)
    return tipo === 'cliente'
      ? this.obtenerResumenCliente(contexto)
      : this.obtenerResumenCooperativa(contexto)
  }

  private async obtenerResumenCooperativa(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    const hoy = new Date()
    const todayKey = toDateKey(hoy)
    const yesterday = addDays(hoy, -1)
    const weekStart = addDays(hoy, -6)
    const monthStart = addMonths(hoy, -1)
    const coopId = contexto.cooperativaId ?? null

    const [ticketsResultado, rutasResultado] = await Promise.all([
      supabase
        .from('Boletos')
        .select(`
          Id, PrecioFinal, CreatedAt, CedulaPasajero, VentaId, AsientoId,
          Asientos(NumeroAsiento, Fila, Columna),
          Ventas!inner(
            Id, RutaId,
            Rutas!inner(
              Id, Fecha, FrecuenciaId, BusId,
              Frecuencias!inner(Id, CiudadOrigen, CiudadDestino, CooperativaId, Cooperativas!inner(Id, Nombre)),
              Buses!inner(Id, TotalAsientos, CooperativaId)
            )
          )
        `)
        .gte('CreatedAt', startOfDayIso(monthStart))
        .lte('CreatedAt', endOfDayIso(hoy)),
      supabase
        .from('Rutas')
        .select(`
          Id, Fecha, Estado, BusId, FrecuenciaId,
          Frecuencias!inner(Id, CiudadOrigen, CiudadDestino, CooperativaId, Cooperativas!inner(Id, Nombre)),
          Buses!inner(Id, TotalAsientos, CooperativaId)
        `)
        .eq('Fecha', todayKey)
    ])

    if (ticketsResultado.error) {
      throw new DomainException(`No se pudo cargar el dashboard: ${ticketsResultado.error.message}`)
    }

    if (rutasResultado.error) {
      throw new DomainException(`No se pudo cargar las rutas del dashboard: ${rutasResultado.error.message}`)
    }

    const tickets = (ticketsResultado.data || []) as TicketRow[]
    const rutasHoy = (rutasResultado.data || []) as RouteRow[]

    const ticketsFiltrados = tickets.filter(ticket => this.coincideCooperativa(ticket, coopId))
    const ticketsHoy = ticketsFiltrados.filter(ticket => this.ticketEsDelDia(ticket, todayKey))
    const ticketsAyer = ticketsFiltrados.filter(ticket => this.ticketEsDelDia(ticket, toDateKey(yesterday)))
    const boletosSemana = ticketsFiltrados.filter(ticket => this.ticketEsDesde(ticket, weekStart))

    const rutasFiltradas = rutasHoy.filter(ruta => this.coincideCooperativa(ruta, coopId))
    const rutasAyerResultado = await supabase
      .from('Rutas')
      .select(`
        Id, Fecha, Estado, BusId, FrecuenciaId,
        Frecuencias!inner(Id, CiudadOrigen, CiudadDestino, CooperativaId),
        Buses!inner(Id, TotalAsientos, CooperativaId)
      `)
      .eq('Fecha', toDateKey(yesterday))

    if (rutasAyerResultado.error) {
      throw new DomainException(`No se pudo calcular la comparación del dashboard: ${rutasAyerResultado.error.message}`)
    }

    const rutasAyer = (rutasAyerResultado.data || []).filter((ruta: RouteRow) => this.coincideCooperativa(ruta, coopId))

    const busesUnicosHoy = new Map<number, number>()
    for (const ruta of rutasFiltradas) {
      const busId = Number(getFieldValue(ruta, 'BusId') ?? getFieldValue(ruta, 'busid'))
      const totalAsientos = Number(getNested(ruta, ['Buses', 'TotalAsientos']) ?? 0)
      if (busId && !busesUnicosHoy.has(busId)) {
        busesUnicosHoy.set(busId, totalAsientos)
      }
    }

    const boletosHoyCount = ticketsHoy.length
    const boletosAyerCount = ticketsAyer.length
    const boletosSemanaCount = boletosSemana.length
    const recaudacionHoy = ticketsHoy.reduce((suma, ticket) => suma + Number(getFieldValue(ticket, 'PrecioFinal') ?? 0), 0)
    const recaudacionAyer = ticketsAyer.reduce((suma, ticket) => suma + Number(getFieldValue(ticket, 'PrecioFinal') ?? 0), 0)
    const ocupacionHoy = this.calcularOcupacion(ticketsHoyCount, Array.from(busesUnicosHoy.values()).reduce((a, b) => a + b, 0))
    const ocupacionAyer = this.calcularOcupacion(boletosAyerCount, this.calcularAsientosTotales(rutasAyer))

    const ventasSemana = this.construirSerieSemanal(boletosSemana, weekStart)
    const rutasTop = this.construirTopRutas(boletosSemana, coopId)

    return {
      tipo: 'cooperativa',
      rolMensaje: this.mensajePorRol(contexto.rol),
      kpis: [
        {
          label: 'Boletos hoy',
          value: formatNumber(boletosHoyCount),
          delta: this.calcularVariacion(boletosHoyCount, boletosAyerCount),
          icon: '🎟️',
        },
        {
          label: 'Recaudación',
          value: formatCurrency(recaudacionHoy),
          delta: this.calcularVariacion(recaudacionHoy, recaudacionAyer),
          icon: '💰',
        },
        {
          label: 'Buses en ruta',
          value: formatNumber(rutasFiltradas.length),
          delta: this.calcularVariacion(rutasFiltradas.length, rutasAyer.length),
          icon: '🚌',
        },
        {
          label: 'Ocupación media',
          value: formatPct(ocupacionHoy),
          delta: Math.round(ocupacionHoy - ocupacionAyer),
          icon: '📈',
        },
      ],
      ventasSemana,
      rutasTop,
      gastosMeses: [],
      proximoViaje: null,
      accesosRapidos: this.accesosCooperativa(),
    }
  }

  private async obtenerResumenCliente(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    if (!contexto.cedula) {
      return {
        tipo: 'cliente',
        rolMensaje: 'Encuentra tu próximo viaje en pocos clics.',
        kpis: [
          { label: 'Viajes hechos', value: '0', hint: 'Histórico total', icon: '🗺️' },
          { label: 'Gasto total', value: formatCurrency(0), hint: 'En 12 meses', icon: '💵' },
          { label: 'Próximo viaje', value: 'Sin datos', hint: 'Aún no hay reservas', icon: '⏳' },
          { label: 'Cooperativa fav', value: 'N/D', hint: 'Sin viajes registrados', icon: '⭐' },
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
    const monthStart = addMonths(hoy, -5)

    const { data, error } = await supabase
      .from('Boletos')
      .select(`
        Id, PrecioFinal, CreatedAt, CedulaPasajero, AsientoId,
        Asientos(NumeroAsiento, Fila, Columna),
        Ventas!inner(
          Id, RutaId,
          Rutas!inner(
            Id, Fecha, FrecuenciaId, BusId,
            Frecuencias!inner(Id, CiudadOrigen, CiudadDestino, CooperativaId, Cooperativas!inner(Id, Nombre)),
            Buses!inner(Id, TotalAsientos, CooperativaId)
          )
        )
      `)
      .eq('CedulaPasajero', contexto.cedula)
      .gte('CreatedAt', startOfDayIso(monthStart))
      .lte('CreatedAt', endOfDayIso(hoy))

    if (error) {
      throw new DomainException(`No se pudo cargar el panel del cliente: ${error.message}`)
    }

    const tickets = (data || []) as TicketRow[]
    const ticketsOrdenados = [...tickets].sort((a, b) => {
      const fechaA = this.extraerFechaViaje(a) ?? ''
      const fechaB = this.extraerFechaViaje(b) ?? ''
      return fechaA.localeCompare(fechaB)
    })

    const viajesHechos = tickets.length
    const gastoTotal = tickets.reduce((suma, ticket) => suma + Number(getFieldValue(ticket, 'PrecioFinal') ?? 0), 0)
    const gastosMeses = this.construirGastosMensuales(tickets, monthStart)
    const proximoViaje = this.construirProximoViaje(ticketsOrdenados, todayKey)
    const cooperativaFav = this.construirCooperativaFavorita(tickets)

    return {
      tipo: 'cliente',
      rolMensaje: this.mensajePorRol(contexto.rol),
      kpis: [
        { label: 'Viajes hechos', value: formatNumber(viajesHechos), hint: 'Histórico total', icon: '🗺️' },
        { label: 'Gasto total', value: formatCurrency(gastoTotal), hint: 'Últimos 6 meses', icon: '💵' },
        {
          label: 'Próximo viaje',
          value: proximoViaje ? this.formatearDiasRestantes(proximoViaje.fecha) : 'Sin datos',
          hint: proximoViaje ? `${proximoViaje.origen} → ${proximoViaje.destino}` : 'Aún no hay reservas',
          icon: '⏳',
        },
        { label: 'Cooperativa fav', value: cooperativaFav.nombre, hint: cooperativaFav.viajes, icon: '⭐' },
      ],
      ventasSemana: [],
      rutasTop: [],
      gastosMeses,
      proximoViaje,
      accesosRapidos: this.accesosCliente(),
    }
  }

  private coincideCooperativa(registro: any, cooperativaId: number | null) {
    if (!cooperativaId) return true
    const idFrecuencia = Number(
      getNested(registro, ['Ventas', 'Rutas', 'Frecuencias', 'CooperativaId']) ??
      getNested(registro, ['Frecuencias', 'CooperativaId']) ??
      getNested(registro, ['Ventas', 'Rutas', 'Frecuencias', 'cooperativaid']) ??
      getNested(registro, ['Frecuencias', 'cooperativaid']) ??
      0
    )
    const idBus = Number(
      getNested(registro, ['Ventas', 'Rutas', 'Buses', 'CooperativaId']) ??
      getNested(registro, ['Buses', 'CooperativaId']) ??
      getNested(registro, ['Ventas', 'Rutas', 'Buses', 'cooperativaid']) ??
      getNested(registro, ['Buses', 'cooperativaid']) ??
      0
    )
    return idFrecuencia === cooperativaId || idBus === cooperativaId
  }

  private ticketEsDelDia(ticket: TicketRow, fecha: string) {
    const createdAt = getFieldValue(ticket, 'CreatedAt') ?? getFieldValue(ticket, 'createdat')
    return createdAt ? toDateKey(new Date(createdAt)) === fecha : false
  }

  private ticketEsDesde(ticket: TicketRow, fecha: Date) {
    const createdAt = getFieldValue(ticket, 'CreatedAt') ?? getFieldValue(ticket, 'createdat')
    return createdAt ? new Date(createdAt) >= fecha : false
  }

  private calcularVariacion(actual: number, anterior: number) {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

  private calcularOcupacion(boletos: number, asientos: number) {
    if (asientos <= 0) return 0
    return Math.min(100, Math.round((boletos / asientos) * 100))
  }

  private calcularAsientosTotales(rutas: RouteRow[]) {
    const buses = new Map<number, number>()
    for (const ruta of rutas) {
      const busId = Number(getFieldValue(ruta, 'BusId') ?? getFieldValue(ruta, 'busid'))
      const totalAsientos = Number(getNested(ruta, ['Buses', 'TotalAsientos']) ?? 0)
      if (busId && !buses.has(busId)) {
        buses.set(busId, totalAsientos)
      }
    }
    return Array.from(buses.values()).reduce((a, b) => a + b, 0)
  }

  private construirSerieSemanal(tickets: TicketRow[], inicio: Date): DashboardChartPointDto[] {
    const dias = Array.from({ length: 7 }, (_, index) => addDays(inicio, index))
    return dias.map(dia => {
      const key = toDateKey(dia)
      const value = tickets.filter(ticket => this.ticketEsDelDia(ticket, key)).length
      return {
        label: new Intl.DateTimeFormat('es-EC', { weekday: 'short' }).format(dia).replace('.', ''),
        value,
      }
    })
  }

  private construirTopRutas(tickets: TicketRow[], cooperativaId: number | null): DashboardRouteDto[] {
    const mapa = new Map<string, number>()
    for (const ticket of tickets) {
      if (!this.coincideCooperativa(ticket, cooperativaId)) continue
      const ruta = this.formatearRuta(ticket)
      mapa.set(ruta, (mapa.get(ruta) ?? 0) + 1)
    }
    return Array.from(mapa.entries())
      .map(([ruta, boletos]) => ({ ruta, boletos }))
      .sort((a, b) => b.boletos - a.boletos)
      .slice(0, 5)
  }

  private construirGastosMensuales(tickets: TicketRow[], inicio: Date): DashboardChartPointDto[] {
    const meses = Array.from({ length: 6 }, (_, index) => addMonths(inicio, index))
    return meses.map(mes => {
      const prefix = `${mes.getUTCFullYear()}-${String(mes.getUTCMonth() + 1).padStart(2, '0')}`
      const value = tickets
        .filter(ticket => {
          const createdAt = getFieldValue(ticket, 'CreatedAt') ?? getFieldValue(ticket, 'createdat')
          return createdAt ? new Date(createdAt).toISOString().slice(0, 7) === prefix : false
        })
        .reduce((suma, ticket) => suma + Number(getFieldValue(ticket, 'PrecioFinal') ?? 0), 0)
      return {
        label: monthLabel(mes),
        value,
      }
    })
  }

  private construirProximoViaje(tickets: TicketRow[], todayKey: string): DashboardTripDto | null {
    const candidato = tickets.find(ticket => {
      const fechaViaje = this.extraerFechaViaje(ticket)
      return fechaViaje ? fechaViaje >= todayKey : false
    })

    if (!candidato) return null

    return {
      fecha: this.formatearFechaViaje(candidato),
      origen: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadOrigen']) ?? 'Origen'),
      destino: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadDestino']) ?? 'Destino'),
      cooperativa: String(getNested(candidato, ['Ventas', 'Rutas', 'Frecuencias', 'Cooperativas', 'Nombre']) ?? 'Cooperativa'),
      asiento: String(this.formatearAsiento(candidato)),
    }
  }

  private construirCooperativaFavorita(tickets: TicketRow[]) {
    const mapa = new Map<string, number>()
    for (const ticket of tickets) {
      const nombre = String(getNested(ticket, ['Ventas', 'Rutas', 'Frecuencias', 'Cooperativas', 'Nombre']) ?? 'Sin nombre')
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1)
    }

    const [nombre = 'Sin viajes registrados', viajes = 0] = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1])[0] ?? []
    return {
      nombre,
      viajes: viajes > 0 ? `${formatNumber(viajes)} viajes` : 'Sin viajes registrados',
    }
  }

  private formatearRuta(ticket: TicketRow) {
    const origen = String(getNested(ticket, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadOrigen']) ?? 'Origen')
    const destino = String(getNested(ticket, ['Ventas', 'Rutas', 'Frecuencias', 'CiudadDestino']) ?? 'Destino')
    return `${origen} – ${destino}`
  }

  private extraerFechaViaje(ticket: TicketRow) {
    return getNested(ticket, ['Ventas', 'Rutas', 'Fecha'])
  }

  private formatearFechaViaje(ticket: TicketRow) {
    const fecha = this.extraerFechaViaje(ticket)
    if (!fecha) return 'Sin fecha'
    const parsed = new Date(`${fecha}T00:00:00Z`)
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(parsed)
  }

  private formatearAsiento(ticket: TicketRow) {
    const numero = getNested(ticket, ['Asientos', 'NumeroAsiento']) ?? getNested(ticket, ['Asientos', 'numeroasiento'])
    const fila = getNested(ticket, ['Asientos', 'Fila']) ?? getNested(ticket, ['Asientos', 'fila'])
    const columna = getNested(ticket, ['Asientos', 'Columna']) ?? getNested(ticket, ['Asientos', 'columna'])
    if (numero) return numero
    if (fila && columna) return `${fila}${columna}`
    return 'N/D'
  }

  private formatearDiasRestantes(fechaViaje: string) {
    const fecha = new Date(`${fechaViaje}T00:00:00Z`)
    const diff = Math.max(0, Math.ceil((fecha.getTime() - new Date().setUTCHours(0, 0, 0, 0)) / 86400000))
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    return `${diff} días`
  }

  private mensajePorRol(rol: string) {
    const normalized = (rol || '').toLowerCase().trim()
    if (normalized === 'administrador' || normalized === 'admin') {
      return 'Aquí tienes el pulso de la cooperativa en un vistazo.'
    }
    if (normalized === 'oficinista') {
      return 'Listo para registrar nuevas ventas con rapidez y precisión.'
    }
    if (normalized === 'chofer') {
      return 'Tus rutas asignadas para hoy te esperan.'
    }
    return 'Encuentra tu próximo viaje en pocos clics.'
  }

  private accesosCooperativa(): DashboardQuickActionDto[] {
    return [
      { to: '/venta', label: 'Nueva venta', desc: 'Atender pasajero', icon: '💳' },
      { to: '/admin/hoja-ruta', label: 'Hojas de ruta', desc: 'Programar y revisar', icon: '📋' },
      { to: '/admin/frecuencias', label: 'Frecuencias', desc: 'Horarios autorizados', icon: '⏰' },
      { to: '/reportes', label: 'Reportes', desc: 'Auditoría y totales', icon: '📊' },
    ]
  }

  private accesosCliente(): DashboardQuickActionDto[] {
    return [
      { to: '/buscar', label: 'Buscar rutas', desc: 'Origen y destino', icon: '🔎' },
      { to: '/mis-boletos', label: 'Mis boletos', desc: 'QR y comprobantes', icon: '🎟️' },
    ]
  }
}