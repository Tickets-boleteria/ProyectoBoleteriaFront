import { supabase } from '../Api/supabaseClient';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { DomainException } from '../../Domain/Exceptions/DomainException';

// Extractor robusto para leer columnas sin importar el formato (mayúsculas/minúsculas)
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseFrecuenciaRepository implements IFrecuenciaRepository {
  private readonly tabla = 'Frecuencias';

  async obtenerTodas(): Promise<Frecuencia[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .order('HoraSalida', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener frecuencias: ${error.message}`);
    }

    return (data || []).map(d => this.mapearAFrecuencia(d));
  }

  async obtenerPorId(id: number): Promise<Frecuencia | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new DomainException(`Error al obtener frecuencia ${id}: ${error.message}`);
    }

    return data ? this.mapearAFrecuencia(data) : null;
  }

  async crear(frecuencia: Frecuencia): Promise<Frecuencia> {
    const { data, error } = await supabase
      .from(this.tabla)
      .insert({
        CooperativaId: frecuencia.cooperativaId,
        CiudadOrigen: frecuencia.ciudadOrigen,
        CiudadDestino: frecuencia.ciudadDestino,
        HoraSalida: frecuencia.horaSalida,
        EsDirecto: frecuencia.esDirecto,
        Activa: true,
        CooperativaId: frecuencia.cooperativaId,
        DiasOperacion: frecuencia.diasOperacion
      })
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al crear la frecuencia: ${error.message}`);
    }

    return this.mapearAFrecuencia(data);
  }

  async actualizar(id: number, frecuencia: Partial<Frecuencia>): Promise<Frecuencia> {
    const datosUpdate: any = {};
    if (frecuencia.ciudadOrigen) datosUpdate.CiudadOrigen = frecuencia.ciudadOrigen;
    if (frecuencia.ciudadDestino) datosUpdate.CiudadDestino = frecuencia.ciudadDestino;
    if (frecuencia.horaSalida) datosUpdate.HoraSalida = frecuencia.horaSalida;
    if (frecuencia.esDirecto !== undefined) datosUpdate.EsDirecto = frecuencia.esDirecto;
    if (frecuencia.activa !== undefined) datosUpdate.Activa = frecuencia.activa;
    if (frecuencia.diasOperacion) datosUpdate.DiasOperacion = frecuencia.diasOperacion;

    const { data, error } = await supabase
      .from(this.tabla)
      .update(datosUpdate)
      .eq('Id', id)
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al actualizar frecuencia: ${error.message}`);
    }

    return this.mapearAFrecuencia(data);
  }

  async eliminarLogico(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ Activa: false })
      .eq('Id', id);

    if (error) {
      throw new DomainException(`Error al eliminar frecuencia: ${error.message}`);
    }
  }

  async obtenerParadasPorFrecuencia(frecuenciaId: number): Promise<ParadaIntermedia[]> {
    const { data, error } = await supabase
      .from('ParadasIntermedias')
      .select('*')
      .eq('FrecuenciaId', frecuenciaId)
      .order('Orden', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener paradas: ${error.message}`);
    }

    return data || [];
  }

  async agregarParada(frecuenciaId: number, parada: ParadaIntermedia): Promise<ParadaIntermedia> {
    const { data, error } = await supabase
      .from('ParadasIntermedias')
      .insert({ ...parada, FrecuenciaId: frecuenciaId })
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al agregar parada: ${error.message}`);
    }

    return data;
  }

  async actualizarParada(id: number, parada: Partial<ParadaIntermedia>): Promise<ParadaIntermedia> {
    const { data, error } = await supabase
      .from('ParadasIntermedias')
      .update(parada)
      .eq('Id', id)
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al actualizar parada: ${error.message}`);
    }

    return data;
  }

  async eliminarParada(id: number): Promise<void> {
    const { error } = await supabase
      .from('ParadasIntermedias')
      .delete()
      .eq('Id', id);

    if (error) {
      throw new DomainException(`Error al eliminar parada: ${error.message}`);
    }
  }

  private mapearAFrecuencia(data: any): Frecuencia {
    const f = new Frecuencia(
      getFieldValue(data, 'cooperativaid'),
      getFieldValue(data, 'ciudadorigen'),
      getFieldValue(data, 'ciudaddestino'),
      getFieldValue(data, 'horasalida'),
      getFieldValue(data, 'esdirecto'),
      getFieldValue(data, 'activa')
    );
    f.id = getFieldValue(data, 'id');
    f.codigoAnt = getFieldValue(data, 'codigoant');
    f.resolucionAnt = getFieldValue(data, 'resolucionant');
    f.createdAt = getFieldValue(data, 'createdat') ? new Date(getFieldValue(data, 'createdat')) : undefined;
    f.diasOperacion = getFieldValue(data, 'diasoperacion') || [];
    return f;
  }
}
