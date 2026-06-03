import { computed, onMounted, ref } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../Store/authStore'
import {
  ESTADOS_RUTA,
  EstadoRuta,
  normalizarEstadoRuta,
  normalizarEstadoBus,
  obtenerSiguienteEstadoRuta,
  puedeCambiarEstadoRuta,
} from '../../Domain/Constants/EstadosSistema'

type RutaRow = {
  Id: number
  FrecuenciaId: number
  BusId: number
  ChoferId?: string | null
  Fecha: string
  Estado: EstadoRuta
  HoraSalida?: string | null
  HoraLlegada?: string | null
  ObservacionChofer?: string | null
  FechaObservacion?: string | null
  ExcepcionEmergencia?: boolean | null
  CreatedAt?: string
  Frecuencias?: any
  Buses?: any
  Usuarios?: any
}

type BusRow = {
  Id: number
  CooperativaId?: number
  Numero: string
  Placa: string
  MarcaChasis?: string
  MarcaCarroceria?: string
  Anio?: number
  FotoUrl?: string
  TotalAsientos: number
  Estado: string
  Estructura?: string
}

type FrecuenciaRow = {
  Id: number
  CooperativaId?: number
  CiudadOrigen: string
  CiudadDestino: string
  HoraSalida: string
  EsDirecto?: boolean
  Activa?: boolean
}

type ChoferRow = {
  Id: number
  Cedula?: string
  Nombres: string
  Apellidos?: string
  Email?: string
  Rol: string
  Estado?: string
  Activo?: boolean
  CooperativaId?: number
}

const getField = (obj: any, field: string) => {
  if (!obj) return undefined

  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())

  return key ? obj[key] : undefined
}

const obtenerHoraActual = () => {
  const ahora = new Date()
  const horas = String(ahora.getHours()).padStart(2, '0')
  const minutos = String(ahora.getMinutes()).padStart(2, '0')
  const segundos = String(ahora.getSeconds()).padStart(2, '0')

  return `${horas}:${minutos}:${segundos}`
}

export function useRutas() {
  const authStore = useAuthStore()

  const rutas = ref<RutaRow[]>([])
  const buses = ref<BusRow[]>([])
  const busesDisponibles = ref<BusRow[]>([])
  const frecuencias = ref<FrecuenciaRow[]>([])
  const choferes = ref<ChoferRow[]>([])

  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  const filtroEstado = ref<'Todas' | EstadoRuta>('Todas')
  const filtroFecha = ref('')
  const filtroTexto = ref('')

  const nuevaRuta = ref({
    frecuenciaId: '',
    busId: '',
    choferId: '',
    fecha: '',
  })

  const usuarioActual = computed(() => authStore.user as any)

  const cooperativaIdUsuario = computed<number | null>(() => {
    const usuario = usuarioActual.value

    const valor =
      usuario?.CooperativaId ??
      usuario?.cooperativaId ??
      usuario?.user_metadata?.CooperativaId ??
      usuario?.user_metadata?.cooperativaId ??
      null

    return valor ? Number(valor) : null
  })

  const rolUsuario = computed(() => {
    const usuario = usuarioActual.value

    return String(
      usuario?.Rol ??
      usuario?.rol ??
      usuario?.user_metadata?.Rol ??
      usuario?.user_metadata?.rol ??
      ''
    )
      .toLowerCase()
      .trim()
  })

  const puedeCrearRuta = computed(() => {
    return ['admin', 'administrador', 'oficinista'].includes(rolUsuario.value)
  })

  const rutasFiltradas = computed(() => {
    const texto = filtroTexto.value.toLowerCase().trim()

    return rutas.value.filter(ruta => {
      const estado = normalizarEstadoRuta(String(ruta.Estado))
      const frecuencia = ruta.Frecuencias || {}
      const bus = ruta.Buses || {}
      const chofer = ruta.Usuarios || {}

      const origen = String(getField(frecuencia, 'CiudadOrigen') || '').toLowerCase()
      const destino = String(getField(frecuencia, 'CiudadDestino') || '').toLowerCase()
      const busNumero = String(getField(bus, 'Numero') || '').toLowerCase()
      const placa = String(getField(bus, 'Placa') || '').toLowerCase()
      const choferNombre = `${getField(chofer, 'Nombres') || ''} ${getField(chofer, 'Apellidos') || ''}`.toLowerCase()

      const coincideEstado =
        filtroEstado.value === 'Todas' || estado === filtroEstado.value

      const coincideFecha =
        !filtroFecha.value || ruta.Fecha === filtroFecha.value

      const coincideTexto =
        !texto ||
        origen.includes(texto) ||
        destino.includes(texto) ||
        busNumero.includes(texto) ||
        placa.includes(texto) ||
        choferNombre.includes(texto)

      return coincideEstado && coincideFecha && coincideTexto
    })
  })

  const resumenEstados = computed(() => {
    return ESTADOS_RUTA.map(estado => ({
      estado,
      total: rutas.value.filter(ruta => normalizarEstadoRuta(String(ruta.Estado)) === estado).length,
    }))
  })

  async function cargarRutas() {
    loading.value = true
    error.value = ''

    try {
      let query = supabase
        .from('Rutas')
        .select(`
          Id,
          FrecuenciaId,
          BusId,
          ChoferId,
          Fecha,
          Estado,
          HoraSalida,
          HoraLlegada,
          ObservacionChofer,
          FechaObservacion,
          ExcepcionEmergencia,
          CreatedAt,
          Frecuencias(
            Id,
            CooperativaId,
            CiudadOrigen,
            CiudadDestino,
            HoraSalida,
            EsDirecto
          ),
          Buses(
            Id,
            CooperativaId,
            Numero,
            Placa,
            TotalAsientos,
            Estado
          )
        `)
        .order('Fecha', { ascending: false })

      const { data, error: err } = await query

      if (err) throw err

      const coopId = cooperativaIdUsuario.value

      rutas.value = (data || [])
        .filter((ruta: any) => {
          if (!coopId) return true

          const coopFrecuencia = Number(getField(ruta.Frecuencias, 'CooperativaId') || 0)
          const coopBus = Number(getField(ruta.Buses, 'CooperativaId') || 0)

          return coopFrecuencia === coopId || coopBus === coopId
        })
        .map((ruta: any) => ({
          ...ruta,
          Estado: normalizarEstadoRuta(String(ruta.Estado || 'Programada')),
        }))
    } catch (err: any) {
      error.value = err.message || 'No se pudieron cargar las rutas.'
    } finally {
      loading.value = false
    }
  }

  async function cargarFrecuencias() {
    let query = supabase
      .from('Frecuencias')
      .select('Id, CooperativaId, CiudadOrigen, CiudadDestino, HoraSalida, EsDirecto, Activa')
      .eq('Activa', true)
      .order('CiudadOrigen', { ascending: true })

    if (cooperativaIdUsuario.value) {
      query = query.eq('CooperativaId', cooperativaIdUsuario.value)
    }

    const { data, error: err } = await query

    if (err) {
      error.value = err.message
      return
    }

    frecuencias.value = data || []
  }

  async function cargarBuses() {
    let query = supabase
      .from('Buses')
      .select('Id, CooperativaId, Numero, Placa, TotalAsientos, Estado')
      .order('Numero', { ascending: true })

    if (cooperativaIdUsuario.value) {
      query = query.eq('CooperativaId', cooperativaIdUsuario.value)
    }

    const { data, error: err } = await query

    if (err) {
      error.value = err.message
      return
    }

    buses.value = data || []
  }

  async function cargarChoferes() {
  let query = supabase
    .from('Usuarios')
    .select('Cedula, Nombres, Apellidos, Email, Rol, Estado, Activo, CooperativaId')
    .ilike('Rol', 'chofer')
    .order('Nombres', { ascending: true })

  if (cooperativaIdUsuario.value) {
    query = query.eq('CooperativaId', cooperativaIdUsuario.value)
  }

  const { data, error: err } = await query

  if (err) {
    error.value = err.message
    return
  }

  choferes.value = (data || []).filter((chofer: any) => {
    if (typeof chofer.Activo === 'boolean') {
      return chofer.Activo
    }

    if (chofer.Estado) {
      return String(chofer.Estado).toLowerCase() !== 'inactivo'
    }

    return true
  })
}

  async function cargarBusesDisponibles(fecha: string, rutaActualId?: number) {
    busesDisponibles.value = []

    const busesActivos = buses.value.filter(bus => {
      return normalizarEstadoBus(String(bus.Estado || 'Activo')) === 'Activo'
    })

    if (!fecha) {
      busesDisponibles.value = busesActivos
      return
    }

    const { data: rutasOcupadas, error: err } = await supabase
      .from('Rutas')
      .select('Id, BusId, Estado, Fecha')
      .eq('Fecha', fecha)
      .in('Estado', ['Programada', 'EnCurso'])

    if (err) {
      error.value = err.message
      return
    }

    const busesOcupados = new Set(
      (rutasOcupadas || [])
        .filter((ruta: any) => Number(ruta.Id) !== Number(rutaActualId || 0))
        .map((ruta: any) => Number(ruta.BusId))
    )

    busesDisponibles.value = busesActivos.filter(bus => {
      return !busesOcupados.has(Number(bus.Id))
    })
  }

  async function verificarBusDisponible(busId: number, fecha: string, frecuenciaId?: number, rutaActualId?: number) {
    const { data: busData, error: busError } = await supabase
      .from('Buses')
      .select('Id, Estado, CooperativaId')
      .eq('Id', busId)
      .maybeSingle()

    if (busError) throw busError

    if (!busData) {
      throw new Error('El bus seleccionado no existe.')
    }

    if (cooperativaIdUsuario.value && Number(busData.CooperativaId) !== cooperativaIdUsuario.value) {
      throw new Error('El bus seleccionado no pertenece a su cooperativa.')
    }

    if (normalizarEstadoBus(String(busData.Estado || 'Activo')) !== 'Activo') {
      throw new Error('El bus seleccionado no está activo.')
    }

    const estadosActivos = ['Programada', 'Habilitada', 'EnCurso', 'En curso', 'En proceso']

    if (!frecuenciaId) {
      // Comportamiento legado si no hay frecuencia
      let query = supabase
        .from('Rutas')
        .select('Id')
        .eq('BusId', busId)
        .eq('Fecha', fecha)
        .in('Estado', estadosActivos)

      if (rutaActualId) {
        query = query.neq('Id', rutaActualId)
      }

      const { data, error: err } = await query.limit(1)

      if (err) throw err
      return !data || data.length === 0
    }

    // Validar por horario específico
    const { data: frecData, error: frecError } = await supabase
      .from('Frecuencias')
      .select('HoraSalida')
      .eq('Id', frecuenciaId)
      .single()

    if (frecError || !frecData) {
      throw new Error('No se pudo obtener el horario de la frecuencia.')
    }

    const horaRequerida = getField(frecData, 'HoraSalida')

    let query = supabase
      .from('Rutas')
      .select('Id, Frecuencias!inner(HoraSalida)')
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .in('Estado', estadosActivos)

    if (rutaActualId) {
      query = query.neq('Id', rutaActualId)
    }

    const { data, error: err } = await query

    if (err) throw err

    if (data && data.length > 0) {
      for (const ruta of data) {
        const fData = getField(ruta, 'Frecuencias')
        const horaAsignada = getField(fData, 'HoraSalida')
        if (horaAsignada === horaRequerida) {
          return false
        }
      }
    }

    return true
  }

  async function verificarChoferDisponible(choferCedula: string, fecha: string) {
  const { data: choferData, error: choferError } = await supabase
    .from('Usuarios')
    .select('Cedula, Rol, CooperativaId, Activo, Estado')
    .eq('Cedula', choferCedula)
    .maybeSingle()

  if (choferError) throw choferError

  if (!choferData) {
    throw new Error('El chofer seleccionado no existe.')
  }

  if (String(choferData.Rol || '').toLowerCase() !== 'chofer') {
    throw new Error('El usuario seleccionado no es chofer.')
  }

  if (cooperativaIdUsuario.value && Number(choferData.CooperativaId) !== cooperativaIdUsuario.value) {
    throw new Error('El chofer seleccionado no pertenece a su cooperativa.')
  }

  if (typeof choferData.Activo === 'boolean' && !choferData.Activo) {
    throw new Error('El chofer seleccionado no está activo.')
  }

  if (choferData.Estado && String(choferData.Estado).toLowerCase() === 'inactivo') {
    throw new Error('El chofer seleccionado está inactivo.')
  }

  const { data, error: err } = await supabase
    .from('Rutas')
    .select('Id')
    .eq('ChoferId', choferCedula)
    .eq('Fecha', fecha)
    .in('Estado', ['Programada', 'EnCurso'])
    .limit(1)

  if (err) throw err

  return !data || data.length === 0
}

  async function registrarRuta() {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      if (!puedeCrearRuta.value) {
        throw new Error('No tiene permisos para crear rutas.')
      }

      if (!nuevaRuta.value.frecuenciaId) {
        throw new Error('Seleccione una frecuencia.')
      }

      if (!nuevaRuta.value.busId) {
        throw new Error('Seleccione un bus.')
      }

      if (!nuevaRuta.value.choferId) {
        throw new Error('Seleccione un chofer.')
      }

      if (!nuevaRuta.value.fecha) {
        throw new Error('Seleccione una fecha.')
      }

      const busDisponible = await verificarBusDisponible(
        Number(nuevaRuta.value.busId),
        nuevaRuta.value.fecha,
        Number(nuevaRuta.value.frecuenciaId)
      )

      if (!busDisponible) {
        throw new Error('El bus seleccionado ya está asignado a una ruta activa en ese mismo horario y fecha.')
      }

      const choferDisponible = await verificarChoferDisponible(
        String(nuevaRuta.value.choferId),
        nuevaRuta.value.fecha
      )

      if (!choferDisponible) {
        throw new Error('El chofer seleccionado ya tiene una ruta activa en esa fecha.')
      }

      const payload = {
        FrecuenciaId: Number(nuevaRuta.value.frecuenciaId),
        BusId: Number(nuevaRuta.value.busId),
        ChoferId: String(nuevaRuta.value.choferId),
        Fecha: nuevaRuta.value.fecha,
        Estado: 'Programada' as EstadoRuta,
        HoraSalida: null,
        HoraLlegada: null,
        ObservacionChofer: null,
        FechaObservacion: null,
      }

      const { error: err } = await supabase
        .from('Rutas')
        .insert(payload)

      if (err) throw err

      success.value = 'Ruta programada correctamente con bus y chofer asignados.'

      nuevaRuta.value = {
        frecuenciaId: '',
        busId: '',
        choferId: '',
        fecha: '',
      }

      await cargarTodo()
    } catch (err: any) {
      error.value = err.message || 'No se pudo registrar la ruta.'
    } finally {
      loading.value = false
    }
  }

  async function cambiarEstadoRuta(ruta: RutaRow, nuevoEstado: EstadoRuta) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const estadoActual = normalizarEstadoRuta(String(ruta.Estado))

      if (!puedeCambiarEstadoRuta(estadoActual, nuevoEstado)) {
        throw new Error(`No se puede cambiar una ruta de ${estadoActual} a ${nuevoEstado}.`)
      }

      if (nuevoEstado === 'EnCurso') {
        await iniciarRuta(ruta)
        return
      }

      if (nuevoEstado === 'Completada') {
        await finalizarRuta(ruta)
        return
      }

      if (nuevoEstado === 'Cancelada') {
        await cancelarRuta(ruta)
        return
      }

      const { error: err } = await supabase
        .from('Rutas')
        .update({ Estado: nuevoEstado })
        .eq('Id', ruta.Id)

      if (err) throw err

      success.value = `Ruta actualizada a estado ${nuevoEstado}.`

      await cargarTodo()
    } catch (err: any) {
      error.value = err.message || 'No se pudo cambiar el estado de la ruta.'
    } finally {
      loading.value = false
    }
  }

  async function avanzarEstadoRuta(ruta: RutaRow) {
    const estadoActual = normalizarEstadoRuta(String(ruta.Estado))
    const siguiente = obtenerSiguienteEstadoRuta(estadoActual)

    if (!siguiente) {
      error.value = 'La ruta ya se encuentra completada o cancelada.'
      return
    }

    await cambiarEstadoRuta(ruta, siguiente)
  }

  async function iniciarRuta(ruta: RutaRow) {
    const estadoActual = normalizarEstadoRuta(String(ruta.Estado))

    if (estadoActual !== 'Programada') {
      throw new Error('Solo se puede iniciar una ruta en estado Programada.')
    }

    if (!ruta.ChoferId) {
      throw new Error('No se puede iniciar una ruta sin chofer asignado.')
    }

    const { error: rutaError } = await supabase
      .from('Rutas')
      .update({
        Estado: 'EnCurso',
        HoraSalida: ruta.HoraSalida || obtenerHoraActual(),
        HoraLlegada: null,
      })
      .eq('Id', ruta.Id)

    if (rutaError) throw rutaError

    const { error: busError } = await supabase
      .from('Buses')
      .update({ Estado: 'Viajando' })
      .eq('Id', ruta.BusId)

    if (busError) throw busError

    success.value = 'La ruta inició correctamente. El bus quedó en estado Viajando.'

    await cargarTodo()
  }

  async function finalizarRuta(ruta: RutaRow) {
    const estadoActual = normalizarEstadoRuta(String(ruta.Estado))

    if (estadoActual !== 'EnCurso') {
      throw new Error('Solo se puede completar una ruta en estado EnCurso.')
    }

    const confirmar = confirm(
      '¿Confirmas que el viaje ya terminó? Esta acción completará la ruta, finalizará los boletos escaneados, rechazará los boletos pagados no escaneados y liberará el bus.'
    )

    if (!confirmar) return

    await actualizarBoletosAlFinalizar(ruta.Id)

    const { error: rutaError } = await supabase
      .from('Rutas')
      .update({
        Estado: 'Completada',
        HoraLlegada: obtenerHoraActual(),
      })
      .eq('Id', ruta.Id)

    if (rutaError) throw rutaError

    const { error: busError } = await supabase
      .from('Buses')
      .update({ Estado: 'Activo' })
      .eq('Id', ruta.BusId)

    if (busError) throw busError

    success.value = 'Ruta completada correctamente. Boletos actualizados y bus liberado.'

    await cargarTodo()
  }

  async function cancelarRuta(ruta: RutaRow) {
    const estadoActual = normalizarEstadoRuta(String(ruta.Estado))

    if (estadoActual === 'Completada') {
      throw new Error('No se puede cancelar una ruta completada.')
    }

    const confirmar = confirm('¿Confirmas que deseas cancelar esta ruta?')

    if (!confirmar) return

    const { error: rutaError } = await supabase
      .from('Rutas')
      .update({
        Estado: 'Cancelada',
      })
      .eq('Id', ruta.Id)

    if (rutaError) throw rutaError

    const { error: busError } = await supabase
      .from('Buses')
      .update({ Estado: 'Activo' })
      .eq('Id', ruta.BusId)

    if (busError) throw busError

    success.value = 'Ruta cancelada correctamente. El bus quedó disponible.'

    await cargarTodo()
  }

  async function obtenerBoletosPorRuta(rutaId: number) {
    const { data, error: err } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        VentaId,
        Ventas!inner(
          Id,
          RutaId
        )
      `)
      .eq('Ventas.RutaId', rutaId)

    if (err) throw err

    return data || []
  }

  async function actualizarBoletosAlFinalizar(rutaId: number) {
    const boletos = await obtenerBoletosPorRuta(rutaId)

    const boletosEnViaje = boletos
      .filter((boleto: any) => String(boleto.Estado) === 'En Viaje')
      .map((boleto: any) => boleto.Id)

    const boletosPagadosNoEscaneados = boletos
      .filter((boleto: any) => String(boleto.Estado) === 'Pagado')
      .map((boleto: any) => boleto.Id)

    if (boletosEnViaje.length > 0) {
      const { error: boletosFinalizadosError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Finalizado' })
        .in('Id', boletosEnViaje)

      if (boletosFinalizadosError) throw boletosFinalizadosError
    }

    if (boletosPagadosNoEscaneados.length > 0) {
      const { error: boletosRechazadosError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Rechazado' })
        .in('Id', boletosPagadosNoEscaneados)

      if (boletosRechazadosError) throw boletosRechazadosError
    }
  }

  async function cambiarBusRuta(ruta: RutaRow, nuevoBusId: number) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const estadoActual = normalizarEstadoRuta(String(ruta.Estado))

      if (estadoActual === 'Completada') {
        throw new Error('No se puede cambiar el bus de una ruta completada.')
      }

      if (estadoActual === 'EnCurso') {
        throw new Error('No se puede cambiar el bus de una ruta en curso desde este módulo.')
      }

      if (estadoActual === 'Cancelada') {
        throw new Error('No se puede cambiar el bus de una ruta cancelada.')
      }

      const disponible = await verificarBusDisponible(nuevoBusId, ruta.Fecha, ruta.FrecuenciaId, ruta.Id)

      if (!disponible) {
        throw new Error('El nuevo bus ya está asignado a otra ruta activa en ese mismo horario y fecha.')
      }

      const { error: err } = await supabase
        .from('Rutas')
        .update({ BusId: nuevoBusId })
        .eq('Id', ruta.Id)

      if (err) throw err

      success.value = 'Bus de la ruta actualizado correctamente.'

      await cargarTodo()
    } catch (err: any) {
      error.value = err.message || 'No se pudo cambiar el bus de la ruta.'
    } finally {
      loading.value = false
    }
  }

  async function cargarTodo() {
    await Promise.all([
      cargarRutas(),
      cargarBuses(),
      cargarFrecuencias(),
      cargarChoferes(),
    ])

    if (nuevaRuta.value.fecha) {
      await cargarBusesDisponibles(nuevaRuta.value.fecha)
    } else {
      busesDisponibles.value = buses.value.filter(bus => {
        return normalizarEstadoBus(String(bus.Estado || 'Activo')) === 'Activo'
      })
    }
  }

  onMounted(cargarTodo)

  return {
    ESTADOS_RUTA,
    rutas,
    rutasFiltradas,
    resumenEstados,
    buses,
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
    puedeCrearRuta,
    cargarTodo,
    cargarRutas,
    cargarBuses,
    cargarBusesDisponibles,
    cargarChoferes,
    cargarFrecuencias,
    registrarRuta,
    verificarBusDisponible,
    verificarChoferDisponible,
    cambiarEstadoRuta,
    avanzarEstadoRuta,
    iniciarRuta,
    finalizarRuta,
    cancelarRuta,
    cambiarBusRuta,
  }
}