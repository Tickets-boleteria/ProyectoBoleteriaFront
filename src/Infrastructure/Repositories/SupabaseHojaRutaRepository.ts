import { supabase } from '../Api/supabaseClient';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { Ruta } from '../../Domain/Entities/Ruta';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import { 
  normalizarEstadoRuta, 
  normalizarEstadoHojaRuta, 
  normalizarTipoGeneracionHoja,
  EstadoHojaRuta
} from '../../Domain/Constants/EstadosSistema';

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseHojaRutaRepository implements IHojaRutaRepository {
  private readonly tabla = 'HojasRuta';

  async crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta> {
    const datosInsert = {
      Fecha: hojaRuta.fecha,
      Estado: hojaRuta.estado,
      TipoGeneracion: hojaRuta.tipoGeneracion,
      UsuarioCreadorId: hojaRuta.usuarioCreadorId,
    };

    const { data, error } = await supabase
      .from(this.tabla)
      .insert([datosInsert])
      .select()
      .single();

    if (error) throw new Error(`Error creando hoja de ruta: ${error.message}`);
    return this.fromDatabase(data);
  }

  async obtenerPorId(id: number): Promise<HojaRuta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*, Rutas(*)')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error obteniendo hoja de ruta: ${error.message}`);
    }

    return data ? this.fromDatabase(data) : null;
  }

  async obtenerPorFecha(fecha: string): Promise<HojaRuta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*, Rutas(*)')
      .eq('Fecha', fecha)
      .order('Id', { ascending: true });

    if (error) throw new Error(`Error listando hojas de ruta: ${error.message}`);
    return (data || []).map((item) => this.fromDatabase(item));
  }

  async actualizarEstado(id: number, estado: EstadoHojaRuta): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ Estado: estado })
      .eq('Id', id);

    if (error) throw new Error(`Error actualizando estado de hoja de ruta: ${error.message}`);
  }

  private fromDatabase(data: any): HojaRuta {
    const rutasRaw = getFieldValue(data, 'Rutas') || [];
    
    return {
      id: getFieldValue(data, 'id') || getFieldValue(data, 'Id'),
      usuarioCreadorId: getFieldValue(data, 'UsuarioCreadorId'),
      fecha: getFieldValue(data, 'fecha') || getFieldValue(data, 'Fecha'),
      estado: normalizarEstadoHojaRuta(getFieldValue(data, 'Estado')),
      tipoGeneracion: normalizarTipoGeneracionHoja(getFieldValue(data, 'TipoGeneracion')),
      createdAt: getFieldValue(data, 'createdat') || getFieldValue(data, 'CreatedAt'),
      rutas: rutasRaw.map((r: any) => this.mapearRuta(r))
    };
  }

  private mapearRuta(data: any): Ruta {
    const createdAtVal = getFieldValue(data, 'CreatedAt');

    return new Ruta(
      Number(getFieldValue(data, 'FrecuenciaId') || 0),
      Number(getFieldValue(data, 'BusId') || 0),
      String(getFieldValue(data, 'Fecha') || ''),
      normalizarEstadoRuta(String(getFieldValue(data, 'Estado') || 'Programada')),
      Number(getFieldValue(data, 'Id')),
      getFieldValue(data, 'ChoferId'),
      getFieldValue(data, 'HoraSalida'),
      getFieldValue(data, 'HoraLlegada'),
      getFieldValue(data, 'ObservacionChofer'),
      createdAtVal ? new Date(createdAtVal) : undefined,
      getFieldValue(data, 'HojaRutaId'),
      getFieldValue(data, 'es_directa') ?? true
    );
  }
}
