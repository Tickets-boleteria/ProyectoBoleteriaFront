import { ref } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository'
import type { ResultadoValidacionBoleto } from '../../Domain/Repositories/IBoletosRepository'

const boletosRepository = new SupabaseBoletosRepository()

const getField = (obj: any, field: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase())
  return key ? obj[key] : undefined
}

export function useControlBoletos() {
  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  async function validarQrBoleto(
    codigo: string,
    rutaActual: any,
    usuarioValidadorId: string | number,
    dispositivo?: string
  ): Promise<ResultadoValidacionBoleto> {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const resultado = await boletosRepository.validarBoletoAbordaje({
        codigo,
        rutaActual,
        usuarioValidadorId,
        dispositivo,
      })

      if (resultado.ok) {
        success.value = resultado.mensaje
      } else {
        error.value = resultado.mensaje
      }

      return resultado
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
    return boletosRepository.buscarBoletoParaValidacion(codigo)
  }

  async function rechazarBoletosPagadosNoEscaneados(rutaId: number) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const boletos = await obtenerBoletosPorRuta(rutaId)

      const boletosPagados = boletos
        .filter((boleto: any) => String(getField(boleto, 'Estado')) === 'Emitido')
        .map((boleto: any) => Number(getField(boleto, 'Id')))
        .filter(Boolean)

      if (boletosPagados.length === 0) {
        success.value = 'No hay boletos pendientes de escaneo.'
        return
      }

      const { error: updateError } = await supabase
        .from('Boletos')
        .update({ Estado: 'Cancelado' })
        .in('Id', boletosPagados)

      if (updateError) throw updateError

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
    const { data, error: queryError } = await supabase
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

    if (queryError) throw queryError
    return data || []
  }

  async function obtenerResumenBoletosRuta(rutaId: number) {
    const boletos = await obtenerBoletosPorRuta(rutaId)

    return {
      total: boletos.length,
      pagados: boletos.filter((b: any) => String(getField(b, 'Estado')) === 'Emitido').length,
      enViaje: boletos.filter((b: any) => String(getField(b, 'Estado')) === 'Validado').length,
      finalizados: 0, // No distinguible en DB
      rechazados: boletos.filter((b: any) => String(getField(b, 'Estado')) === 'Cancelado').length,
      pendientes: boletos.filter((b: any) => String(getField(b, 'Estado')) === 'Pendiente').length,
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
