import { supabase } from '../Api/supabaseClient';
import { EstadoHojaRuta, HojaRuta } from '../../Domain/Entities/HojaRuta';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';

export class SupabaseHojaRutaRepository implements IHojaRutaRepository {
  private readonly tabla = 'hojas_ruta';

  async crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta> {
    const { data, error } = await supabase
      .from(this.tabla)
      .insert([this.toDatabase(hojaRuta)])
      .select()
      .single();

    if (error) throw new Error(`Error creando hoja de ruta: ${error.message}`);
    return this.fromDatabase(data);
  }

  async obtenerPorId(id: string): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error obteniendo hoja de ruta: ${error.message}`);
    }

    return data ? this.fromDatabase(data) : null;
  }

  async obtenerPorFecha(fechaSalida: string): Promise<HojaRuta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('fecha_salida', fechaSalida)
      .order('hora_salida', { ascending: true });

    if (error) throw new Error(`Error listando hojas de ruta: ${error.message}`);
    return (data || []).map((item) => this.fromDatabase(item));
  }

  async obtenerPorFrecuenciaYFecha(frecuenciaId: string, fechaSalida: string): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('frecuencia_id', frecuenciaId)
      .eq('fecha_salida', fechaSalida)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error verificando hoja de ruta existente: ${error.message}`);
    }

    return data ? this.fromDatabase(data) : null;
  }

  async actualizarEstado(id: string, estado: EstadoHojaRuta): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ estado })
      .eq('id', id);

    if (error) throw new Error(`Error actualizando estado de hoja de ruta: ${error.message}`);
  }

  private fromDatabase(data: any): HojaRuta {
    return {
      id: data.id,
      frecuenciaId: data.frecuencia_id,
      busId: data.bus_id,
      choferId: data.chofer_id,
      fechaSalida: data.fecha_salida,
      horaSalida: data.hora_salida,
      origen: data.origen,
      destino: data.destino,
      paradas: data.paradas || [],
      estado: data.estado,
      tipoGeneracion: data.tipo_generacion,
      observaciones: data.observaciones,
      createdAt: data.created_at,
    };
  }

  private toDatabase(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>) {
    return {
      frecuencia_id: hojaRuta.frecuenciaId,
      bus_id: hojaRuta.busId,
      chofer_id: hojaRuta.choferId,
      fecha_salida: hojaRuta.fechaSalida,
      hora_salida: hojaRuta.horaSalida,
      origen: hojaRuta.origen,
      destino: hojaRuta.destino,
      paradas: hojaRuta.paradas,
      estado: hojaRuta.estado,
      tipo_generacion: hojaRuta.tipoGeneracion,
      observaciones: hojaRuta.observaciones,
    };
  }
}
