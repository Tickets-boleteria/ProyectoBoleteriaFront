import { ref } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { EstadoBoleto } from '../../Domain/Constants/EstadosSistema'

type ResultadoValidacionBoleto = {
  ok: boolean
  mensaje: string
  boleto?: any
}

export function useControlBoletos() {
  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  async function validarQrBoleto(codigo: string, rutaId: number): Promise<ResultadoValidacionBoleto> {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      if (!codigo.trim()) {
        throw new Error('El código QR o código de barras es obligatorio.')
      }

      if (!rutaId) {
        throw new Error('No se recibió la ruta actual del chofer.')
      }

      const boleto = await buscarBoletoPorCodigo(codigo.trim())

      if (!boleto) {
        return {
          ok: false,
          mensaje: 'Boleto no encontrado.',
        }
      }

      const boletoRutaId = Number(boleto.Ventas?.RutaId || boleto.Ventas?.[0]?.RutaId || 0)

      if (boletoRutaId !== Number(rutaId)) {
        return {
          ok: false,
          mensaje: 'Este boleto no pertenece a la ruta actual.',
          boleto,
        }
      }

      const estado = String(boleto.Estado) as EstadoBoleto

      if (estado === 'Validado') {
        return {
          ok: false,
          mensaje: 'Este boleto ya fue escaneado o ya fue utilizado.',
          boleto,
        }
      }

      if (estado === 'Cancelado') {
        return {
          ok: false,
          mensaje: 'Este boleto fue cancelado o rechazado.',
          boleto,
        }
      }

      if (estado !== 'Emitido') {
        return {
          ok: false,
          mensaje: `No se puede abordar un boleto en estado ${estado}.`,
          boleto,
        }
      }

      const rutaValida = await verificarRutaEnCurso(rutaId)

      if (!rutaValida) {
        return {
          ok: false,
          mensaje: 'La ruta no está en curso. Primero se debe iniciar el viaje.',
          boleto,
        }
      }

      const { data, error: updateError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Validado' })
        .eq('Id', boleto.Id)
        .select()
        .single()

      if (updateError) throw updateError

      await registrarValidacionBoleto(boleto.Id, rutaId)

      success.value = 'Boleto validado correctamente. El pasajero está en viaje.'

      return {
        ok: true,
        mensaje: 'Boleto validado correctamente.',
        boleto: data,
      }
    } catch (err: any) {
      error.value = err.message || 'No se pudo validar el boleto.'

      return {
        ok: false,
        mensaje: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function buscarBoletoPorCodigo(codigo: string) {
    const { data, error: err } = await supabase
      .from('Boletos')
      .select(`
        Id,
        Estado,
        CodigoQr,
        CodigoBarras,
        CedulaPasajero,
        NombrePasajero,
        PrecioFinal,
        VentaId,
        Ventas!inner(
          Id,
          RutaId,
          Rutas!inner(
            Id,
            Fecha,
            Estado,
            FrecuenciaId,
            BusId
          )
        )
      `)
      .or(`CodigoQr.eq.${codigo},CodigoBarras.eq.${codigo}`)
      .maybeSingle()

    if (err) throw err

    return data
  }

  async function verificarRutaEnCurso(rutaId: number) {
    const { data, error: err } = await supabase
      .from('Rutas')
      .select('Id, Estado')
      .eq('Id', rutaId)
      .maybeSingle()

    if (err) throw err

    return String(data?.Estado) === 'EnCurso'
  }

  async function registrarValidacionBoleto(boletoId: number, rutaId: number) {
    const { error: err } = await supabase
      .from('ValidacionesBoleto')
      .insert({
        BoletoId: boletoId,
        RutaId: rutaId,
        FechaValidacion: new Date().toISOString(),
        Resultado: 'VALIDADO',
      })

    if (err) {
      console.warn('No se pudo registrar la validación del boleto:', err.message)
    }
  }

  async function rechazarBoletosPagadosNoEscaneados(rutaId: number) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const boletos = await obtenerBoletosPorRuta(rutaId)

      const boletosPagados = boletos
        .filter((boleto: any) => String(boleto.Estado) === 'Emitido')
        .map((boleto: any) => boleto.Id)

      if (boletosPagados.length === 0) {
        success.value = 'No hay boletos pendientes de escaneo.'
        return
      }

      const { error: err } = await supabase
        .from('Boletos')
        .update({ Estado: 'Cancelado' })
        .in('Id', boletosPagados)

      if (err) throw err

      success.value = 'Boletos no escaneados fueron cancelados.'
    } catch (err: any) {
      error.value = err.message || 'No se pudieron rechazar los boletos.'
    } finally {
      loading.value = false
    }
  }

  async function finalizarBoletosEnViaje(rutaId: number) {
    // NOTA: En la base de datos actual, 'Validado' es el estado final.
    // No existe un estado 'Finalizado' separado.
    success.value = 'Los boletos validados se consideran completados al finalizar la ruta.'
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

  async function obtenerResumenBoletosRuta(rutaId: number) {
    const boletos = await obtenerBoletosPorRuta(rutaId)

    return {
      total: boletos.length,
      pagados: boletos.filter((b: any) => String(b.Estado) === 'Emitido').length,
      enViaje: boletos.filter((b: any) => String(b.Estado) === 'Validado').length,
      finalizados: 0, // No distinguible en DB
      rechazados: boletos.filter((b: any) => String(b.Estado) === 'Cancelado').length,
    }
  }

  return {
    loading,
    error,
    success,
    validarQrBoleto,
    buscarBoletoPorCodigo,
    rechazarBoletosPagadosNoEscaneados,
    finalizarBoletosEnViaje,
    obtenerBoletosPorRuta,
    obtenerResumenBoletosRuta,
  }
}