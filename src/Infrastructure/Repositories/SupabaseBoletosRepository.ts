import { supabase } from '../Api/supabaseClient'
import {
  BoletoPayload,
  IBoletosRepository,
  RegistroValidacionBoletoPayload,
  ResultadoValidacionBoleto,
  ValidarBoletoAbordajeParams,
} from '../../Domain/Repositories/IBoletosRepository'
import { normalizarResultadoValidacion } from '../../Domain/Constants/EstadosSistema'

const hoyLocal = () => {
  const fecha = new Date()
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getField = (obj: any, field: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())
  return key ? obj[key] : undefined
}

const firstRelation = (value: any) => Array.isArray(value) ? value[0] : value

const normalizar = (value: any) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

const texto = (value: any, fallback = '') => String(value ?? fallback).trim()

export class SupabaseBoletosRepository implements IBoletosRepository {
  async insertarBoletos(boletos: BoletoPayload[]) {
    const { data, error } = await supabase
      .from('Boletos')
      .insert(boletos)
      .select()

    if (error) throw error
    return data
  }

    async actualizarEstadoPorVenta(ventaId: number, estado: string): Promise<void> {
    const boletos = await this.obtenerBoletosPorVenta(ventaId)

    if (!boletos.length) {
      throw new Error('La venta no tiene boletos asociados.')
    }

    if (estado === 'Emitido') {
      for (const boleto of boletos) {
        const boletoId = Number(getField(boleto, 'Id'))
        const asientoId = Number(getField(boleto, 'AsientoId'))
        const codigoQr = texto(getField(boleto, 'CodigoQr'))
        const codigoBarras = texto(getField(boleto, 'CodigoBarras'))

        if (!codigoQr || !codigoBarras) {
          const unique = crypto.randomUUID()
          const nuevoQr = codigoQr || `QR-V${ventaId}-B${boletoId}-A${asientoId}-${unique}`
          const nuevoBar = codigoBarras || `BC-V${ventaId}-B${boletoId}-A${asientoId}-${unique}`

          const { error } = await supabase
            .from('Boletos')
            .update({
              CodigoQr: nuevoQr,
              CodigoBarras: nuevoBar,
            })
            .eq('Id', boletoId)

          if (error) throw new Error(error.message)
        }
      }
    }

    const { error } = await supabase
      .from('Boletos')
      .update({ Estado: estado })
      .eq('VentaId', ventaId)

    if (error) throw new Error(error.message)
  }

  async obtenerBoletosPorVenta(ventaId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('Boletos')
      .select('*')
      .eq('VentaId', ventaId)

    if (error) throw new Error(error.message)

    return data || []
  }

  async verificarAsientoDisponible(rutaId: number, asientoId: number): Promise<boolean> {
  const { data: ventas, error: ventasError } = await supabase
    .from('Ventas')
    .select('Id')
    .eq('RutaId', rutaId)
    .in('Estado', ['Pendiente', 'AprobadaPago', 'Confirmada'])

  if (ventasError) throw new Error(ventasError.message)

  const ventaIds = (ventas || [])
    .map((venta: any) => Number(getField(venta, 'Id')))
    .filter(Boolean)

  if (!ventaIds.length) return true

  const { data: boleto, error: boletoError } = await supabase
    .from('Boletos')
    .select('Id')
    .in('VentaId', ventaIds)
    .eq('AsientoId', asientoId)
    .in('Estado', ['Emitido', 'Validado'])
    .maybeSingle()

  if (boletoError) throw new Error(boletoError.message)

  return !boleto
}

  async obtenerAsientosDisponiblesPorRuta(rutaId: number): Promise<any[]> {
    const { data: ruta, error: rutaError } = await supabase
      .from('Rutas')
      .select('Id, BusId')
      .eq('Id', rutaId)
      .maybeSingle()

    if (rutaError) throw new Error(rutaError.message)
    if (!ruta) throw new Error('Ruta no encontrada.')

    const busId = Number(getField(ruta, 'BusId'))

    const { data: asientos, error: asientosError } = await supabase
      .from('Asientos')
      .select(`
        Id,
        BusId,
        NumeroAsiento,
        Tipo,
        ConfiguracionesAsientos(
          PrecioBase,
          NombreTipo
        )
      `)
      .eq('BusId', busId)
      .order('NumeroAsiento', { ascending: true })

    if (asientosError) throw new Error(asientosError.message)

    const disponibles: any[] = []

    for (const asiento of asientos || []) {
      const asientoId = Number(getField(asiento, 'Id'))
      const disponible = await this.verificarAsientoDisponible(rutaId, asientoId)

      if (disponible) {
        disponibles.push(asiento)
      }
    }

    return disponibles
  }

  async buscarBoletoParaValidacion(codigo: string): Promise<any | null> {
    const codigoLimpio = codigo.trim()

    if (!codigoLimpio) {
      return null
    }

    const porQr = await this.buscarPorColumna('CodigoQr', codigoLimpio)
    if (porQr) return porQr

    return this.buscarPorColumna('CodigoBarras', codigoLimpio)
  }

  async validarBoletoAbordaje(
    params: ValidarBoletoAbordajeParams
  ): Promise<ResultadoValidacionBoleto> {
    const codigo = params.codigo.trim()

    if (!codigo) {
      return {
        ok: false,
        mensaje: 'Ingrese o escanee un código QR o código de barras.',
      }
    }

    if (!params.rutaActual?.Id) {
      return {
        ok: false,
        mensaje: 'No tienes una ruta asignada para hoy.',
      }
    }

    if (normalizar(params.rutaActual.Estado) !== 'encurso') {
      return {
        ok: false,
        mensaje: 'Primero debes iniciar la ruta.',
      }
    }

    const rutaFecha = texto(getField(params.rutaActual, 'Fecha')).slice(0, 10)
    if (rutaFecha !== hoyLocal()) {
      return {
        ok: false,
        mensaje: 'Este boleto no corresponde a la fecha de hoy.',
      }
    }

    const boleto = await this.buscarBoletoParaValidacion(codigo)

    if (!boleto) {
      return {
        ok: false,
        mensaje: 'El código no corresponde a ningún boleto.',
      }
    }

    const boletoId = Number(getField(boleto, 'Id'))
    const venta = firstRelation(getField(boleto, 'Ventas'))
    const ruta = firstRelation(getField(venta, 'Rutas'))
    const frecuencia = firstRelation(getField(ruta, 'Frecuencias'))
    const busRuta = firstRelation(getField(ruta, 'Buses'))
    const asiento = firstRelation(getField(boleto, 'Asientos'))

    const estadoBoleto = normalizar(getField(boleto, 'Estado'))
    const estadoVenta = normalizar(getField(venta, 'Estado'))
    const estadoRuta = normalizar(getField(ruta, 'Estado'))

    if (estadoBoleto === 'enviaje') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'YA_VALIDADO')
      return {
        ok: false,
        mensaje: 'Este boleto ya fue validado.',
        boleto,
      }
    }

    if (estadoBoleto === 'finalizado') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_FINALIZADO')
      return {
        ok: false,
        mensaje: 'Este boleto pertenece a un viaje ya finalizado.',
        boleto,
      }
    }

    if (estadoBoleto === 'rechazado') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_BOLETO')
      return {
        ok: false,
        mensaje: 'Este boleto fue rechazado.',
        boleto,
      }
    }

    if (estadoBoleto === 'pendiente') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_PENDIENTE')
      return {
        ok: false,
        mensaje: 'El boleto aún no ha sido aprobado o pagado.',
        boleto,
      }
    }

    if (estadoBoleto !== 'emitido') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_ESTADO_INVALIDO')
      return {
        ok: false,
        mensaje: `No se puede validar un boleto en estado ${texto(getField(boleto, 'Estado'), 'desconocido')}.`,
        boleto,
      }
    }

    if (['pendiente', 'rechazado', 'cancelado'].includes(estadoVenta)) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_VENTA')
      return {
        ok: false,
        mensaje: estadoVenta === 'pendiente'
          ? 'El boleto aún no ha sido aprobado o pagado.'
          : 'La venta asociada al boleto fue rechazada o cancelada.',
        boleto,
      }
    }

    const rutaIdBoleto = Number(getField(venta, 'RutaId') || getField(ruta, 'Id'))

    if (rutaIdBoleto !== Number(params.rutaActual.Id)) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_RUTA_INCORRECTA')
      return {
        ok: false,
        mensaje: 'Este boleto no pertenece a tu ruta actual.',
        boleto,
      }
    }

    if (estadoRuta !== 'encurso') {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_RUTA_NO_INICIADA')
      return {
        ok: false,
        mensaje: 'Primero debes iniciar la ruta.',
        boleto,
      }
    }

    const fechaRutaBoleto = texto(getField(ruta, 'Fecha')).slice(0, 10)
    if (fechaRutaBoleto !== hoyLocal()) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_FECHA')
      return {
        ok: false,
        mensaje: 'Este boleto no corresponde a la fecha de hoy.',
        boleto,
      }
    }

    const choferRutaBoleto = texto(getField(ruta, 'ChoferId'))
    const choferActual = texto(getField(params.rutaActual, 'ChoferId'))

    if (choferRutaBoleto && choferActual && choferRutaBoleto !== choferActual) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_CHOFER')
      return {
        ok: false,
        mensaje: 'Este boleto no pertenece a tu ruta actual.',
        boleto,
      }
    }

    const busIdBoleto = Number(getField(ruta, 'BusId'))
    const busIdActual = Number(getField(params.rutaActual, 'BusId'))

    if (busIdBoleto && busIdActual && busIdBoleto !== busIdActual) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'RECHAZADO_BUS')
      return {
        ok: false,
        mensaje: 'Este boleto no pertenece a tu ruta actual.',
        boleto,
      }
    }

    const boletoActualizado = await this.marcarBoletoEnViaje(boletoId)

    if (!boletoActualizado) {
      await this.registrarValidacionFallidaSiExiste(boletoId, params, 'YA_VALIDADO')
      return {
        ok: false,
        mensaje: 'Este boleto ya fue validado.',
        boleto,
      }
    }

    await this.registrarValidacionBoleto({
      BoletoId: boletoId,
      UsuarioValidadorId: params.usuarioValidadorId,
      FechaValidacion: new Date().toISOString(),
      Dispositivo: params.dispositivo || this.obtenerDispositivo(),
      Resultado: 'VALIDADO',
    })

    const nombreCompleto = [
      texto(getField(boleto, 'NombresPasajero')),
      texto(getField(boleto, 'ApellidosPasajero')),
    ].filter(Boolean).join(' ')

    const origen = texto(getField(frecuencia, 'CiudadOrigen'), 'Origen')
    const destino = texto(getField(frecuencia, 'CiudadDestino'), 'Destino')
    const numeroBus = texto(getField(busRuta, 'Numero') || getField(busRuta, 'Placa'), 'Bus asignado')
    const numeroAsiento = texto(getField(asiento, 'NumeroAsiento') || getField(asiento, 'Numero'), 'Sin asiento')

    return {
      ok: true,
      mensaje: 'Pasajero validado correctamente.',
      boleto: boletoActualizado,
      pasajero: {
        nombre: nombreCompleto || 'Pasajero',
        cedula: texto(getField(boleto, 'CedulaPasajero'), 'Sin cédula'),
        asiento: numeroAsiento,
        origen,
        destino,
        bus: numeroBus,
        ruta: `${origen} - ${destino}`,
      },
    }
  }

  async registrarValidacionBoleto(payload: RegistroValidacionBoletoPayload): Promise<void> {
    const payloadNormalizado = {
      ...payload,
      Resultado: normalizarResultadoValidacion(payload.Resultado)
    }

    const { error } = await supabase
      .from('ValidacionesBoleto')
      .insert(payloadNormalizado)

    if (!error) return

    const payloadMinimo = {
      BoletoId: payload.BoletoId,
      FechaValidacion: payload.FechaValidacion,
      Resultado: normalizarResultadoValidacion(payload.Resultado),
    }

    const { error: errorMinimo } = await supabase
      .from('ValidacionesBoleto')
      .insert(payloadMinimo)

    if (errorMinimo) {
      console.warn('No se pudo registrar la validación del boleto:', errorMinimo.message)
    }
  }

  private async buscarPorColumna(columna: 'CodigoQr' | 'CodigoBarras', codigo: string) {
    const { data, error } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        CodigoQr,
        CodigoBarras,
        CedulaPasajero,
        NombresPasajero,
        ApellidosPasajero,
        PrecioFinal,
        VentaId,
        AsientoId,
        Asientos(
          Id,
          NumeroAsiento,
          Buses(
            Id,
            Numero,
            Placa
          )
        ),
        Ventas!inner(
          Id,
          RutaId,
          Estado,
          FechaVenta,
          Rutas!inner(
            Id,
            Fecha,
            Estado,
            FrecuenciaId,
            BusId,
            ChoferId,
            Frecuencias!inner(
              Id,
              CiudadOrigen,
              CiudadDestino,
              HoraSalida,
              EsDirecto,
              Cooperativas(
                Id,
                Nombre
              )
            ),
            Buses!inner(
              Id,
              Numero,
              Placa,
              Estado
            )
          )
        )
      `)
      .eq(columna, codigo)
      .maybeSingle()

    if (error) throw error
    return data
  }

  private async marcarBoletoEnViaje(boletoId: number) {
    const actualizadoConFecha = await supabase
      .from('Boletos')
      .update({
        Estado: 'Validado',
        FechaValidacion: new Date().toISOString(),
      })
      .eq('Id', boletoId)
      .eq('Estado', 'Emitido')
      .select()
      .maybeSingle()

    if (!actualizadoConFecha.error) {
      return actualizadoConFecha.data
    }

    const actualizadoSimple = await supabase
      .from('Boletos')
      .update({ Estado: 'Validado' })
      .eq('Id', boletoId)
      .eq('Estado', 'Emitido')
      .select()
      .maybeSingle()

    if (actualizadoSimple.error) throw actualizadoSimple.error
    return actualizadoSimple.data
  }

  private async registrarValidacionFallidaSiExiste(
    boletoId: number,
    params: ValidarBoletoAbordajeParams,
    resultado: string
  ) {
    if (!boletoId) return

    await this.registrarValidacionBoleto({
      BoletoId: boletoId,
      UsuarioValidadorId: params.usuarioValidadorId,
      FechaValidacion: new Date().toISOString(),
      Dispositivo: params.dispositivo || this.obtenerDispositivo(),
      Resultado: resultado,
    })
  }

  private obtenerDispositivo() {
    if (typeof navigator === 'undefined') return 'Desconocido'
    return navigator.userAgent || 'Navegador'
  }
}