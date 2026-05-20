import { supabase } from '../Api/supabaseClient';
import { EstadoHojaRuta, HojaRuta } from '../../Domain/Entities/HojaRuta';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';

// Extractor robusto para leer las columnas sin importar mayúsculas o minúsculas
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseHojaRutaRepository implements IHojaRutaRepository {
  private readonly tabla = 'HojasRuta';

  async crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta> {
    const { data, error } = await supabase
      .from(this.tabla)
      .insert([this.toDatabase(hojaRuta)])
      .select()
      .single();

    if (error) throw new Error(`Error creando hoja de ruta: ${error.message}`);
    return this.fromDatabase(data);
  }

  async obtenerPorId(id: number): Promise<HojaRuta | null> {
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
      .eq('FechaSalida', fechaSalida)
      .order('HoraSalida', { ascending: true });

    if (error) throw new Error(`Error listando hojas de ruta: ${error.message}`);
    return (data || []).map((item) => this.fromDatabase(item));
  }

  async obtenerPorFrecuenciaYFecha(frecuenciaId: number, fechaSalida: string): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('FrecuenciaId', frecuenciaId)
      .eq('FechaSalida', fechaSalida)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error verificando hoja de ruta existente: ${error.message}`);
    }

    return data ? this.fromDatabase(data) : null;
  }

  async actualizarEstado(id: number, estado: EstadoHojaRuta): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ Estado: estado })
      .eq('id', id);

    if (error) throw new Error(`Error actualizando estado de hoja de ruta: ${error.message}`);
  }

  private fromDatabase(data: any): HojaRuta {
    return {
      id: getFieldValue(data, 'id'),
      frecuenciaId: getFieldValue(data, 'frecuenciaid') ?? getFieldValue(data, 'frecuencia_id'),
      busId: getFieldValue(data, 'busid') ?? getFieldValue(data, 'bus_id'),
      choferId: getFieldValue(data, 'choferid') ?? getFieldValue(data, 'chofer_id'),
      fechaSalida: getFieldValue(data, 'fechasalida') ?? getFieldValue(data, 'fecha_salida'),
      horaSalida: getFieldValue(data, 'horasalida') ?? getFieldValue(data, 'hora_salida'),
      origen: getFieldValue(data, 'origen'),
      destino: getFieldValue(data, 'destino'),
      paradas: getFieldValue(data, 'paradas') || [],
      estado: getFieldValue(data, 'estado'),
      tipoGeneracion: getFieldValue(data, 'tipogeneracion') ?? getFieldValue(data, 'tipo_generacion'),
      observaciones: getFieldValue(data, 'observaciones'),
      createdAt: getFieldValue(data, 'createdat') ?? getFieldValue(data, 'created_at'),
    };
  }

  private toDatabase(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>) {
    return {
      FrecuenciaId: hojaRuta.frecuenciaId,
      BusId: hojaRuta.busId,
      ChoferId: hojaRuta.choferId,
      FechaSalida: hojaRuta.fechaSalida,
      HoraSalida: hojaRuta.horaSalida,
      Origen: hojaRuta.origen,
      Destino: hojaRuta.destino,
      Paradas: hojaRuta.paradas,
      Estado: hojaRuta.estado,
      TipoGeneracion: hojaRuta.tipoGeneracion,
      Observaciones: hojaRuta.observaciones,
    };
  }
}
