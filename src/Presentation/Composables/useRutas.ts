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
import { HabilitarRutaDiaria } from '../../Application/UseCases/HabilitarRutaDiaria'
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository'
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository'
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository'

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
  HojaRutaId?: number | null
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
  DiasOperacion?: string[]
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
    hojaRutaId: '',
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
            es_directa
          ),
          Buses(
            Id,
            CooperativaId,
            Numero,
            Placa,
            TotalAsientos,
            Estado
          ),
          es_directa
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
          es_directa: Boolean(ruta.es_directa ?? ruta.Frecuencias?.es_directa ?? false),
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
      .select('Id, CooperativaId, CiudadOrigen, CiudadDestino, HoraSalida, EsDirecto, Activa, DiasOperacion')
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

  async function verificarBusDisponible(busId: number, fecha: string) {
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

    const { data, error: err } = await supabase
      .from('Rutas')
      .select('Id')
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .in('Estado', ['Programada', 'EnCurso'])
      .limit(1)

    if (err) throw err

    return !data || data.length === 0
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

      // Validación de días de operación
      const frecuencia = frecuencias.value.find(f => f.Id === Number(nuevaRuta.value.frecuenciaId))
      if (frecuencia && frecuencia.DiasOperacion && frecuencia.DiasOperacion.length > 0) {
        // Obtenemos el día de la semana para la fecha seleccionada.
        // Añadimos T12:00:00 para evitar que la zona horaria desplace la fecha al día anterior.
        const d = new Date(nuevaRuta.value.fecha + 'T12:00:00')
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const diaElegido = diasSemana[d.getDay()]

        const normalizeDay = (day: string) => day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const diaElegidoNorm = normalizeDay(diaElegido)

        const operaEsteDia = frecuencia.DiasOperacion.some((dia: string) => normalizeDay(dia) === diaElegidoNorm)

        if (!operaEsteDia) {
          throw new Error(`Esta frecuencia no opera los días ${diaElegido}. Días permitidos: ${frecuencia.DiasOperacion.join(', ')}.`)
        }
      }

      const busDisponible = await verificarBusDisponible(
        Number(nuevaRuta.value.busId),
        nuevaRuta.value.fecha
      )

      if (!busDisponible) {
        throw new Error('El bus seleccionado ya está asignado a una ruta activa en esa fecha.')
      }

      const choferDisponible = await verificarChoferDisponible(
        String(nuevaRuta.value.choferId),
        nuevaRuta.value.fecha
      )

      if (!choferDisponible) {
        throw new Error('El chofer seleccionado ya tiene una ruta activa en esa fecha.')
      }

      // 2. Usar el caso de uso para validar bus, frecuencia y DÍA DE LA SEMANA
      const rutaRepo = new SupabaseRutaRepository();
      const busRepo = new SupabaseBusRepository();
      const frecuenciaRepo = new SupabaseFrecuenciaRepository();
      const habilitarUC = new HabilitarRutaDiaria(rutaRepo, busRepo, frecuenciaRepo);

      await habilitarUC.ejecutar({
        frecuenciaId: Number(nuevaRuta.value.frecuenciaId),
        busId: Number(nuevaRuta.value.busId),
        fecha: nuevaRuta.value.fecha
      });

      // 3. Si el caso de uso pasó (ya creó la ruta base), actualizamos con Chofer y HojaRuta
      // Nota: habilitarUC.ejecutar ya insertó la ruta. Buscamos la última para completar datos.
      const { data: rutaCreada } = await supabase
        .from('Rutas')
        .select('Id')
        .eq('FrecuenciaId', Number(nuevaRuta.value.frecuenciaId))
        .eq('BusId', Number(nuevaRuta.value.busId))
        .eq('Fecha', nuevaRuta.value.fecha)
        .order('CreatedAt', { ascending: false })
        .limit(1)
        .single();

      if (rutaCreada) {
        const { error: updateErr } = await supabase
          .from('Rutas')
          .update({
            ChoferId: String(nuevaRuta.value.choferId),
            HojaRutaId: nuevaRuta.value.hojaRutaId ? Number(nuevaRuta.value.hojaRutaId) : null
          })
          .eq('Id', rutaCreada.Id);
        
        if (updateErr) throw updateErr;
      }

      success.value = 'Ruta programada correctamente con bus y chofer asignados.'

      nuevaRuta.value = {
        frecuenciaId: '',
        busId: '',
        choferId: '',
        fecha: '',
        hojaRutaId: '',
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

      // Validación obligatoria de Hoja de Ruta para habilitar la venta
      if (nuevoEstado === 'Habilitada' && !ruta.HojaRutaId) {
        const inputHoja = prompt('Ingrese el número o ID de la Hoja de Ruta (Obligatorio para habilitar):');
        if (!inputHoja || inputHoja.trim() === '') {
          throw new Error('Es obligatorio ingresar el número de Hoja de Ruta para habilitar el viaje.');
        }
        
        const hojaId = Number(inputHoja);
        if (isNaN(hojaId)) {
          throw new Error('El número de Hoja de Ruta debe ser un valor numérico.');
        }

        const { error: updateHojaErr } = await supabase
          .from('Rutas')
          .update({ HojaRutaId: hojaId })
          .eq('Id', ruta.Id);
        
        if (updateHojaErr) throw updateHojaErr;
        ruta.HojaRutaId = hojaId;
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

      if (nuevoEstado === 'Habilitada') {
        if (!ruta.HojaRutaId) {
          throw new Error('No se puede habilitar una ruta sin una Hoja de Ruta generada y asociada. Por favor genere la hoja de ruta primero.')
        }
      }

      const { error: err } = await supabase
        .from('Rutas')
        .update({ Estado: nuevoEstado })
        .eq('Id', ruta.Id)

      if (err) throw err

      success.value = `Ruta actualizada a estado ${nuevoEstado}.`

      await cargarTodo()
    } catch (err: any) {
      const msg = err.message || 'No se pudo cambiar el estado de la ruta.'
      error.value = msg
      alert(msg)
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

      const disponible = await verificarBusDisponible(nuevoBusId, ruta.Fecha)

      if (!disponible) {
        throw new Error('El nuevo bus ya está asignado a otra ruta activa en esa fecha.')
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