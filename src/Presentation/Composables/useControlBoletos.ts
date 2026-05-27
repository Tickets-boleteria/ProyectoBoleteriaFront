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

      if (estado === 'En Viaje') {
        return {
          ok: false,
          mensaje: 'Este boleto ya fue escaneado y está en viaje.',
          boleto,
        }
      }

      if (estado === 'Finalizado') {
        return {
          ok: false,
          mensaje: 'Este boleto ya fue finalizado.',
          boleto,
        }
      }

      if (estado === 'Rechazado') {
        return {
          ok: false,
          mensaje: 'Este boleto fue rechazado porque no fue escaneado a tiempo.',
          boleto,
        }
      }

      if (estado !== 'Pagado') {
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
        .update({ Estado: 'En Viaje' })
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
        .filter((boleto: any) => String(boleto.Estado) === 'Pagado')
        .map((boleto: any) => boleto.Id)

      if (boletosPagados.length === 0) {
        success.value = 'No hay boletos pagados pendientes de escaneo.'
        return
      }

      const { error: err } = await supabase
        .from('Boletos')
        .update({ Estado: 'Rechazado' })
        .in('Id', boletosPagados)

      if (err) throw err

      success.value = 'Boletos pagados no escaneados fueron rechazados.'
    } catch (err: any) {
      error.value = err.message || 'No se pudieron rechazar los boletos.'
    } finally {
      loading.value = false
    }
  }

  async function finalizarBoletosEnViaje(rutaId: number) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const boletos = await obtenerBoletosPorRuta(rutaId)

      const boletosEnViaje = boletos
        .filter((boleto: any) => String(boleto.Estado) === 'En Viaje')
        .map((boleto: any) => boleto.Id)

      if (boletosEnViaje.length === 0) {
        success.value = 'No hay boletos en viaje para finalizar.'
        return
      }

      const { error: err } = await supabase
        .from('Boletos')
        .update({ Estado: 'Finalizado' })
        .in('Id', boletosEnViaje)

      if (err) throw err

      success.value = 'Boletos en viaje finalizados correctamente.'
    } catch (err: any) {
      error.value = err.message || 'No se pudieron finalizar los boletos.'
    } finally {
      loading.value = false
    }
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
      pagados: boletos.filter((b: any) => String(b.Estado) === 'Pagado').length,
      enViaje: boletos.filter((b: any) => String(b.Estado) === 'En Viaje').length,
      finalizados: boletos.filter((b: any) => String(b.Estado) === 'Finalizado').length,
      rechazados: boletos.filter((b: any) => String(b.Estado) === 'Rechazado').length,
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