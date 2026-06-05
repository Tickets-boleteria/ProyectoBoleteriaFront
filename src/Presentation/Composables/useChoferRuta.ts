import { computed, ref } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { useAuthStore } from '../Store/authStore'
import {
  EstadoRuta,
  EstadoBoleto,
  normalizarEstadoRuta,
  normalizarEstadoBus,
} from '../../Domain/Constants/EstadosSistema'

type ResultadoOperacion = {
  ok: boolean
  mensaje: string
  requiereObservacion?: boolean
}

type RutaChofer = {
  Id: number
  FrecuenciaId: number
  BusId: number
  ChoferId: string
  Fecha: string
  Estado: EstadoRuta
  HoraSalida?: string | null
  HoraLlegada?: string | null
  ObservacionChofer?: string | null
  FechaObservacion?: string | null
  ExcepcionEmergencia?: boolean | null
  Frecuencias?: any
  Buses?: any
}

type ResumenPasajeros = {
  total: number
  pagados: number
  enViaje: number
  finalizados: number
  rechazados: number
  pendientes: number
}

type HistorialEscaneo = {
  codigo: string
  hora: string
  resultado: string
}

const getField = (obj: any, field: string) => {
  if (!obj) return undefined

  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())

  return key ? obj[key] : undefined
}

const hoy = () => {
  return new Date().toISOString().slice(0, 10)
}

const obtenerHoraActual = () => {
  const ahora = new Date()
  const horas = String(ahora.getHours()).padStart(2, '0')
  const minutos = String(ahora.getMinutes()).padStart(2, '0')
  const segundos = String(ahora.getSeconds()).padStart(2, '0')

  return `${horas}:${minutos}:${segundos}`
}

const calcularDiferenciaMinutos = (horaSalida: string, horaLlegada: string) => {
  const [salidaH, salidaM, salidaS = '0'] = horaSalida.split(':')
  const [llegadaH, llegadaM, llegadaS = '0'] = horaLlegada.split(':')

  const salida = new Date()
  salida.setHours(Number(salidaH), Number(salidaM), Number(salidaS), 0)

  const llegada = new Date()
  llegada.setHours(Number(llegadaH), Number(llegadaM), Number(llegadaS), 0)

  let diferencia = llegada.getTime() - salida.getTime()

  if (diferencia < 0) {
    diferencia += 24 * 60 * 60 * 1000
  }

  return Math.floor(diferencia / 60000)
}

export function useChoferRuta() {
  const authStore = useAuthStore()

  const rutaActual = ref<RutaChofer | null>(null)
  const loading = ref(false)
  const error = ref('')
  const success = ref('')
  const resultado = ref('')

  const pasajeros = ref<ResumenPasajeros>({
    total: 0,
    pagados: 0,
    enViaje: 0,
    finalizados: 0,
    rechazados: 0,
    pendientes: 0,
  })

  const historial = ref<HistorialEscaneo[]>([])

  const rutaProgramada = computed(() => rutaActual.value?.Estado === 'Programada')
  // ValidarQR.vue usa rutaHabilitada para mostrar el boton "Iniciar ruta".
  // Una ruta lista para iniciar puede estar Habilitada o Programada.
  const rutaHabilitada = computed(
    () => rutaActual.value?.Estado === 'Habilitada' || rutaActual.value?.Estado === 'Programada',
  )
  const rutaEnCurso = computed(() => rutaActual.value?.Estado === 'EnCurso')
  const rutaCompletada = computed(() => rutaActual.value?.Estado === 'Completada')
  const rutaCancelada = computed(() => rutaActual.value?.Estado === 'Cancelada')

  const minutosDesdeSalida = computed(() => {
    if (!rutaActual.value?.HoraSalida) return 0

    return calcularDiferenciaMinutos(
      rutaActual.value.HoraSalida,
      obtenerHoraActual()
    )
  })

  const requiereObservacionPorTiempo = computed(() => {
    return rutaEnCurso.value && minutosDesdeSalida.value >= 30
  })

  async function obtenerChoferCedula() {
  const usuario: any = authStore.user

  if (!usuario) {
    throw new Error('No hay sesión activa.')
  }

  if (usuario.Cedula) return String(usuario.Cedula)
  if (usuario.cedula) return String(usuario.cedula)
  if (usuario.user_metadata?.Cedula) return String(usuario.user_metadata.Cedula)
  if (usuario.user_metadata?.cedula) return String(usuario.user_metadata.cedula)

  const email = usuario.email

  if (!email) {
    throw new Error('No se pudo obtener el correo del usuario.')
  }

  const { data, error: usuarioError } = await supabase
    .from('Usuarios')
    .select('Cedula, Email, Rol')
    .eq('Email', email)
    .maybeSingle()

  if (usuarioError) {
    throw usuarioError
  }

  if (!data?.Cedula) {
    throw new Error('No se encontró la cédula del chofer en la tabla Usuarios.')
  }

  return String(data.Cedula)
}

  async function cargarRutaChofer() {
    loading.value = true
    error.value = ''
    success.value = ''
    resultado.value = ''

    try {
      const choferCedula = await obtenerChoferCedula()

      const { data, error: rutaError } = await supabase
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
          Frecuencias(
            Id,
            CiudadOrigen,
            CiudadDestino,
            HoraSalida,
            EsDirecto
          ),
          Buses(
            Id,
            Numero,
            Placa,
            TotalAsientos,
            Estado
          )
        `)
        .eq('ChoferId', choferCedula)
        .gte('Fecha', hoy())
        .in('Estado', ['Programada', 'Habilitada', 'EnCurso'])
        .order('Fecha', { ascending: true })
        .limit(1)

      if (rutaError) {
        throw rutaError
      }

      rutaActual.value = data?.[0]
        ? {
            ...data[0],
            Estado: normalizarEstadoRuta(String(data[0].Estado || 'Programada')),
          } as RutaChofer
        : null

      if (rutaActual.value) {
        await cargarResumenPasajeros(rutaActual.value.Id)
      } else {
        pasajeros.value = {
          total: 0,
          pagados: 0,
          enViaje: 0,
          finalizados: 0,
          rechazados: 0,
          pendientes: 0,
        }
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo cargar la ruta asignada al chofer.'
    } finally {
      loading.value = false
    }
  }

  async function cargarResumenPasajeros(rutaId: number) {
    const boletos = await obtenerBoletosPorRuta(rutaId)

    const pagados = boletos.filter((boleto: any) => String(boleto.Estado) === 'Emitido').length
    const enViaje = boletos.filter((boleto: any) => String(boleto.Estado) === 'Validado').length
    const finalizados = 0 // No distinguible en DB
    const rechazados = boletos.filter((boleto: any) => String(boleto.Estado) === 'Cancelado').length

    pasajeros.value = {
      total: boletos.length,
      pagados,
      enViaje,
      finalizados,
      rechazados,
      pendientes: pagados,
    }
  }

  async function iniciarViaje(): Promise<ResultadoOperacion> {
    loading.value = true
    error.value = ''
    success.value = ''
    resultado.value = ''

    try {
      if (!rutaActual.value) {
        throw new Error('No hay una ruta asignada.')
      }

      if (rutaActual.value.Estado !== 'Programada' && rutaActual.value.Estado !== 'Habilitada') {
        throw new Error('Solo se puede iniciar una ruta programada o habilitada.')
      }

      const busEstado = normalizarEstadoBus(String(getField(rutaActual.value.Buses, 'Estado') || 'Activo'))

      if (busEstado !== 'Activo') {
        throw new Error('El bus asignado no está activo.')
      }

      const horaSalida = obtenerHoraActual()

      const { error: rutaError } = await supabase
        .from('Rutas')
        .update({
          Estado: 'EnCurso',
          HoraSalida: horaSalida,
          HoraLlegada: null,
          ObservacionChofer: null,
          FechaObservacion: null,
        })
        .eq('Id', rutaActual.value.Id)

      if (rutaError) {
        throw rutaError
      }

      const { error: busError } = await supabase
        .from('Buses')
        .update({ Estado: 'Viajando' })
        .eq('Id', rutaActual.value.BusId)

      if (busError) {
        throw busError
      }

      success.value = 'Viaje iniciado correctamente. El bus quedó en estado Viajando.'
      resultado.value = success.value

      await cargarRutaChofer()

      return {
        ok: true,
        mensaje: success.value,
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo iniciar el viaje.'
      resultado.value = error.value

      return {
        ok: false,
        mensaje: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function intentarFinalizarViaje(): Promise<ResultadoOperacion> {
    if (!rutaActual.value) {
      return {
        ok: false,
        mensaje: 'No hay ruta asignada.',
      }
    }

    if (rutaActual.value.Estado !== 'EnCurso') {
      return {
        ok: false,
        mensaje: 'Solo se puede finalizar una ruta en curso.',
      }
    }

    if (!rutaActual.value.HoraSalida) {
      return {
        ok: false,
        mensaje: 'La ruta no tiene hora de salida registrada.',
      }
    }

    const horaLlegada = obtenerHoraActual()

    const diferencia = calcularDiferenciaMinutos(
      rutaActual.value.HoraSalida,
      horaLlegada
    )

    if (diferencia >= 30) {
      return {
        ok: false,
        mensaje: 'El viaje superó los 30 minutos. Debe ingresar una observación.',
        requiereObservacion: true,
      }
    }

    return finalizarViaje('')
  }

  async function finalizarViaje(observacion: string = ''): Promise<ResultadoOperacion> {
    loading.value = true
    error.value = ''
    success.value = ''
    resultado.value = ''

    try {
      if (!rutaActual.value) {
        throw new Error('No hay ruta asignada.')
      }

      if (rutaActual.value.Estado !== 'EnCurso') {
        throw new Error('Solo se puede finalizar una ruta en curso.')
      }

      if (!rutaActual.value.HoraSalida) {
        throw new Error('No existe hora de salida para calcular el tiempo.')
      }

      const horaLlegada = obtenerHoraActual()

      const diferencia = calcularDiferenciaMinutos(
        rutaActual.value.HoraSalida,
        horaLlegada
      )

      const requiereObservacion = diferencia >= 30

      if (requiereObservacion && !observacion.trim()) {
        return {
          ok: false,
          mensaje: 'Debe ingresar una observación para finalizar el viaje.',
          requiereObservacion: true,
        }
      }

      await actualizarBoletosAlFinalizar(rutaActual.value.Id)

      const payload: any = {
        Estado: 'Completada',
        HoraLlegada: horaLlegada,
      }

      if (requiereObservacion) {
        payload.ObservacionChofer = observacion.trim()
        payload.FechaObservacion = new Date().toISOString()
      }

      const { error: rutaError } = await supabase
        .from('Rutas')
        .update(payload)
        .eq('Id', rutaActual.value.Id)

      if (rutaError) {
        throw rutaError
      }

      const { error: busError } = await supabase
        .from('Buses')
        .update({ Estado: 'Activo' })
        .eq('Id', rutaActual.value.BusId)

      if (busError) {
        throw busError
      }

      success.value = 'Viaje finalizado correctamente. El bus quedó activo.'
      resultado.value = success.value

      rutaActual.value = null

      return {
        ok: true,
        mensaje: 'Viaje finalizado correctamente. Boletos actualizados y bus liberado.',
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo finalizar el viaje.'
      resultado.value = error.value

      return {
        ok: false,
        mensaje: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function marcarEmergencia(observacion: string): Promise<ResultadoOperacion> {
    loading.value = true
    error.value = ''
    success.value = ''
    resultado.value = ''

    try {
      if (!rutaActual.value) {
        throw new Error('No hay ruta asignada.')
      }

      if (!['Programada', 'EnCurso'].includes(rutaActual.value.Estado)) {
        throw new Error('Solo se puede marcar emergencia en una ruta programada o en curso.')
      }

      if (!observacion.trim()) {
        throw new Error('Debe ingresar una observación de emergencia.')
      }

      const { error: emergenciaError } = await supabase
        .from('Rutas')
        .update({
          ExcepcionEmergencia: true,
          ObservacionChofer: observacion.trim(),
          FechaObservacion: new Date().toISOString(),
        })
        .eq('Id', rutaActual.value.Id)

      if (emergenciaError) {
        throw emergenciaError
      }

      success.value = 'Emergencia registrada correctamente.'
      resultado.value = success.value

      await cargarRutaChofer()

      return {
        ok: true,
        mensaje: success.value,
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo registrar la emergencia.'
      resultado.value = error.value

      return {
        ok: false,
        mensaje: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function validarQrBoleto(codigo: string): Promise<ResultadoOperacion> {
    loading.value = true
    error.value = ''
    success.value = ''
    resultado.value = ''

    const codigoLimpio = codigo.trim()

    try {
      if (!rutaActual.value) {
        throw new Error('No hay ruta asignada.')
      }

      if (rutaActual.value.Estado !== 'EnCurso') {
        throw new Error('La ruta debe estar en curso para validar boletos.')
      }

      if (!codigoLimpio) {
        throw new Error('Ingrese o escanee un código QR o código de barras.')
      }

      const boleto = await buscarBoletoPorCodigo(codigoLimpio)

      if (!boleto) {
        throw new Error('Boleto no encontrado.')
      }

      const venta = getField(boleto, 'Ventas')
      const rutaIdBoleto = Number(getField(venta, 'RutaId'))

      if (rutaIdBoleto !== Number(rutaActual.value.Id)) {
        throw new Error('Este boleto no corresponde a esta ruta.')
      }

      const estadoBoleto = String(getField(boleto, 'Estado')) as EstadoBoleto

      if (estadoBoleto === 'Validado') {
        throw new Error('Este boleto ya fue escaneado.')
      }

      if (estadoBoleto === 'Cancelado') {
        throw new Error('Este boleto fue cancelado.')
      }

      if (estadoBoleto !== 'Emitido') {
        throw new Error(`Estado de boleto no válido para abordar: ${estadoBoleto}`)
      }

      // El pago debe estar confirmado: Venta AprobadaPago (transferencia aprobada
      // por oficinista) o Confirmada (tarjeta/efectivo). Una venta Pendiente no aborda.
      const estadoVenta = String(getField(venta, 'Estado') || '')
      if (estadoVenta !== 'AprobadaPago' && estadoVenta !== 'Confirmada') {
        throw new Error('El pago de este boleto aún no ha sido confirmado.')
      }

      const { error: updateError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Validado' })
        .eq('Id', getField(boleto, 'Id'))

      if (updateError) {
        throw updateError
      }

      await registrarValidacionBoleto(getField(boleto, 'Id'))

      historial.value.unshift({
        codigo: codigoLimpio,
        hora: obtenerHoraActual(),
        resultado: 'Validado',
      })

      await cargarResumenPasajeros(rutaActual.value.Id)

      success.value = 'Boleto validado correctamente.'
      resultado.value = success.value

      return {
        ok: true,
        mensaje: success.value,
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo validar el boleto.'
      resultado.value = error.value

      if (codigoLimpio) {
        historial.value.unshift({
          codigo: codigoLimpio,
          hora: obtenerHoraActual(),
          resultado: error.value,
        })
      }

      return {
        ok: false,
        mensaje: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function buscarBoletoPorCodigo(codigo: string) {
    const { data, error: boletoError } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        CodigoQr,
        CodigoBarras,
        CedulaPasajero,
        NombresPasajero,
        ApellidosPasajero,
        VentaId,
        Ventas!inner(
          Id,
          RutaId,
          Estado
        )
      `)
      .or(`CodigoQr.eq.${codigo},CodigoBarras.eq.${codigo}`)
      .maybeSingle()

    if (boletoError) {
      throw boletoError
    }

    return data
  }

  async function obtenerBoletosPorRuta(rutaId: number) {
    const { data, error: boletosError } = await supabase
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

    if (boletosError) {
      throw boletosError
    }

    return data || []
  }

  async function actualizarBoletosAlFinalizar(rutaId: number) {
    const boletos = await obtenerBoletosPorRuta(rutaId)

    const boletosPendientes = boletos
      .filter((boleto: any) => String(boleto.Estado) === 'Emitido')
      .map((boleto: any) => boleto.Id)

    if (boletosPendientes.length > 0) {
      const { error: rechazadosError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Cancelado' })
        .in('Id', boletosPendientes)

      if (rechazadosError) {
        throw rechazadosError
      }
    }
  }

  async function registrarValidacionBoleto(boletoId: number) {
    const { error: validacionError } = await supabase
      .from('ValidacionesBoleto')
      .insert({
        BoletoId: boletoId,
        FechaValidacion: new Date().toISOString(),
        Resultado: 'VALIDADO',
      })

    if (validacionError) {
      console.warn('No se pudo registrar la validación:', validacionError.message)
    }
  }

  return {
    rutaActual,
    pasajeros,
    historial,
    loading,
    error,
    success,
    resultado,

    rutaProgramada,
    rutaHabilitada,
    rutaEnCurso,
    rutaCompletada,
    rutaCancelada,
    minutosDesdeSalida,
    requiereObservacionPorTiempo,

    cargarRutaChofer,
    cargarResumenPasajeros,
    iniciarViaje,
    intentarFinalizarViaje,
    finalizarViaje,
    marcarEmergencia,
    validarQrBoleto,
  }
}