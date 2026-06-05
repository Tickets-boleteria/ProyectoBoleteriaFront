import { supabase } from '../Api/supabaseClient'
import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'

export class SupabaseVentasRepository implements IVentaRepository {
  private readonly BUCKET = 'comprobantes'

  async uploadComprobante(path: string, file: File, options: any = {}) {
    const { error } = await supabase.storage
      .from(this.BUCKET)
      .upload(path, file, options)

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(path)

    return { publicUrl: data.publicUrl }
  }

  async crearVenta(payload: VentaPayload): Promise<number> {
    const { data, error } = await supabase
      .from('Ventas')
      .insert([payload])
      .select('Id')
      .single()
if (error) {
  console.error('ERROR AL INSERTAR VENTA EN SUPABASE:', error);
  throw new Error(`Error en base de datos: ${error.message} (${error.hint || ''})`);
}

// Devolvemos el ID de forma robusta
const id = Number(data?.Id ?? data?.id ?? (data as any)?.ID)

if (!id || isNaN(id)) {
  throw new Error('No se pudo recuperar el ID de la venta creada.')
}

return id
  }

  // Rollback logico de una venta: marca la Venta como Cancelada y sus boletos
  // como Cancelado. Lo usa ConfirmarCompra si fallan los boletos tras crear la venta.
  async cancelarVenta(ventaId: number): Promise<void> {
    const { error: ventaError } = await supabase
      .from('Ventas')
      .update({ Estado: 'Cancelada' })
      .eq('Id', ventaId)

    if (ventaError) {
      console.error('No se pudo cancelar la venta en rollback:', ventaError)
    }

    const { error: boletosError } = await supabase
      .from('Boletos')
      .update({ Estado: 'Cancelado' })
      .eq('VentaId', ventaId)

    if (boletosError) {
      console.error('No se pudieron cancelar los boletos en rollback:', boletosError)
    }
  }

  async obtenerVentaPorId(ventaId: number): Promise<any | null> {
    const { data, error } = await supabase
      .from('Ventas')
      .select(`
        Id,
        UsuarioVendedorId,
        RutaId,
        CiudadOrigenVenta,
        CiudadDestinoVenta,
        Total,
        Estado,
        MetodoPago,
        ComprobanteUrl,
        AprobadoPorId,
        FechaVenta
      `)
      .eq('Id', ventaId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    return data
  }

  async obtenerVentasPendientes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('Ventas')
      .select(`
        Id,
        UsuarioVendedorId,
        RutaId,
        CiudadOrigenVenta,
        CiudadDestinoVenta,
        Total,
        Estado,
        MetodoPago,
        ComprobanteUrl,
        AprobadoPorId,
        FechaVenta,
        Boletos(
          Id,
          CedulaPasajero,
          NombresPasajero,
          ApellidosPasajero,
          Estado,
          CodigoQr,
          CodigoBarras,
          PrecioFinal
        ),
        Rutas(
          Id,
          Fecha,
          Estado,
          Frecuencias(
            Id,
            CiudadOrigen,
            CiudadDestino,
            HoraSalida
          )
        )
      `)
      .eq('Estado', 'Pendiente')
      .not('ComprobanteUrl', 'is', null)
      .order('FechaVenta', { ascending: false })

    if (error) throw new Error(error.message)

    return data || []
  }

  async aprobarVenta(ventaId: number, aprobadoPorId: string): Promise<void> {
    const { data, error } = await supabase
      .from('Ventas')
      .update({
        Estado: 'AprobadaPago',
        AprobadoPorId: aprobadoPorId,
      })
      .eq('Id', ventaId)
      .eq('Estado', 'Pendiente')
      .select('Id')
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!data) {
      throw new Error('La venta no existe o ya no está pendiente.')
    }
  }

  async rechazarVenta(
    ventaId: number,
    aprobadoPorId: string,
    _observacion?: string
  ): Promise<void> {
    const { data, error } = await supabase
      .from('Ventas')
      .update({
        Estado: 'Cancelada',
        AprobadoPorId: aprobadoPorId,
      })
      .eq('Id', ventaId)
      .eq('Estado', 'Pendiente')
      .select('Id')
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!data) {
      throw new Error('La venta no existe o ya no está pendiente.')
    }
  }

  async migrarVentasARuta(oldRutaId: number, newRutaId: number): Promise<void> {
    const { error } = await supabase
      .from('Ventas')
      .update({ RutaId: newRutaId })
      .eq('RutaId', oldRutaId);

    if (error) {
      throw new Error(`Error al migrar ventas a la nueva ruta: ${error.message}`);
    }
  }
}