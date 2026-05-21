import { supabase } from '../Api/supabaseClient';

// Extractor robusto para leer columnas sin importar el formato (mayúsculas/minúsculas)
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseFrecuenciaRepository {
  private readonly tabla = 'Frecuencias';

  async obtenerTodas(): Promise<any[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .order('HoraSalida', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener frecuencias: ${error.message}`);
    }

    return data || [];
  }

  async crear(frecuencia: any): Promise<any> {
    const { data, error } = await supabase
      .from(this.tabla)
      .insert({
        CiudadOrigen: frecuencia.ciudadOrigen,
        CiudadDestino: frecuencia.ciudadDestino,
        CodigoAnt: frecuencia.codigoAnt || null,
        ResolucionAnt: frecuencia.resolucionAnt || null,
        HoraSalida: frecuencia.horaSalida,
        EsDirecto: frecuencia.esDirecto,
        Activa: true,
        CooperativaId: frecuencia.cooperativaId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear la frecuencia: ${error.message}`);
    }

    return data;
  }
}