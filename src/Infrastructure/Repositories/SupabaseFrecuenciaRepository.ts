import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { supabase } from '../Api/supabaseClient';

export class SupabaseFrecuenciaRepository implements IFrecuenciaRepository {
  async crear(frecuencia: Frecuencia): Promise<Frecuencia> {
    const { data, error } = await supabase
      .from('Frecuencias')
      .insert(frecuencia)
      .select()
      .single();
    if (error) throw new Error(`Error creando frecuencia: ${error.message}`);
    return data;
  }

  async obtenerTodas(): Promise<Frecuencia[]> {
    const { data, error } = await supabase
      .from('Frecuencias')
      .select('*')
      .eq('activa', true);
    if (error) throw new Error(`Error obteniendo frecuencias: ${error.message}`);
    return data || [];
  }

  async obtenerPorId(id: number): Promise<Frecuencia | null> {
    const { data, error } = await supabase
      .from('Frecuencias')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`Error obteniendo frecuencia: ${error.message}`);
    return data || null;
  }

  async actualizar(id: number, frecuencia: Partial<Frecuencia>): Promise<Frecuencia> {
    const { data, error } = await supabase
      .from('Frecuencias')
      .update(frecuencia)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Error actualizando frecuencia: ${error.message}`);
    return data;
  }

  async eliminarLogico(id: number): Promise<void> {
    const { error } = await supabase
      .from('Frecuencias')
      .update({ activa: false })
      .eq('id', id);
    if (error) throw new Error(`Error eliminando frecuencia: ${error.message}`);
  }

  async agregarParada(frecuenciaId: number, parada: ParadaIntermedia): Promise<ParadaIntermedia> {
    const paradaCompleta = { ...parada, frecuenciaId };
    const { data, error } = await supabase
      .from('ParadasIntermedia')
      .insert(paradaCompleta)
      .select()
      .single();
    if (error) throw new Error(`Error agregando parada: ${error.message}`);
    return data;
  }

  async obtenerParadasPorFrecuencia(frecuenciaId: number): Promise<ParadaIntermedia[]> {
    const { data, error } = await supabase
      .from('ParadasIntermedia')
      .select('*')
      .eq('frecuenciaId', frecuenciaId)
      .order('orden');
    if (error) throw new Error(`Error obteniendo paradas: ${error.message}`);
    return data || [];
  }

  async actualizarParada(id: number, parada: Partial<ParadaIntermedia>): Promise<ParadaIntermedia> {
    const { data, error } = await supabase
      .from('ParadasIntermedia')
      .update(parada)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Error actualizando parada: ${error.message}`);
    return data;
  }

  async eliminarParada(id: number): Promise<void> {
    const { error } = await supabase
      .from('ParadasIntermedia')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Error eliminando parada: ${error.message}`);
  }
}