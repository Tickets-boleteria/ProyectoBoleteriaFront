import { supabase } from '../Api/supabaseClient'
import { ITicketRepository } from '../../Domain/Repositories/ITicketRepository'

export class SupabaseTicketRepository implements ITicketRepository {
  /**
   * Devuelve los boletos reales del usuario relacionados con sus ventas.
   * Consulta: Boletos -> Ventas -> Rutas -> Frecuencias, y Asientos -> Buses.
   * NO consulta la tabla Cooperativas.
   */
  async obtenerBoletosPorUsuario(cedula: string): Promise<any[]> {
    const cedulaLimpia = String(cedula ?? '').trim()
    if (!cedulaLimpia) return []

    const { data, error } = await supabase
      .from('Boletos')
      .select(`
        Id,
        VentaId,
        AsientoId,
        NombresPasajero,
        ApellidosPasajero,
        CedulaPasajero,
        FechaNacimiento,
        DescuentoAplicado,
        PrecioFinal,
        CodigoQr,
        CodigoBarras,
        Estado,
        CreatedAt,
        FechaValidacion,
        Asientos(
          Id,
          NumeroAsiento,
          Tipo,
          Buses( Id, Numero, Placa )
        ),
        Ventas(
          Id,
          Estado,
          MetodoPago,
          ComprobanteUrl,
          CiudadOrigenVenta,
          CiudadDestinoVenta,
          FechaVenta,
          Total,
          Rutas(
            Id,
            Fecha,
            Estado,
            BusId,
            Frecuencias( CiudadOrigen, CiudadDestino, HoraSalida )
          )
        )
      `)
      .eq('CedulaPasajero', cedulaLimpia)
      .order('CreatedAt', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  }
}