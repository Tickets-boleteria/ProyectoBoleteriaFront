import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Frecuencia, Parada } from '../../Domain/Entities/Frecuencia';
import { supabase } from '../Api/supabaseClient';

export class SupabaseFrecuenciaRepository implements IFrecuenciaRepository {
  async createFrecuencia(frecuencia: Omit<Frecuencia, 'id'>): Promise<Frecuencia> {
    const { data, error } = await supabase
      .from('frecuencias')
      .insert(frecuencia)
      .select()
      .single();
    if (error) throw new Error(`Error creando frecuencia: ${error.message}`);
    return data;
  }

  async getFrecuenciasActivas(): Promise<Frecuencia[]> {
    const { data, error } = await supabase
      .from('frecuencias')
      .select('*')
      .eq('activa', true);
    if (error) throw new Error(`Error obteniendo frecuencias: ${error.message}`);
    return data || [];
  }

  async getFrecuenciaById(id: string): Promise<Frecuencia | null> {
    const { data, error } = await supabase
      .from('frecuencias')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`Error obteniendo frecuencia: ${error.message}`);
    return data || null;
  }

  async updateFrecuencia(id: string, frecuencia: Partial<Frecuencia>): Promise<void> {
    const { error } = await supabase
      .from('frecuencias')
      .update(frecuencia)
      .eq('id', id);
    if (error) throw new Error(`Error actualizando frecuencia: ${error.message}`);
  }

  async deleteFrecuencia(id: string): Promise<void> {
    const { error } = await supabase
      .from('frecuencias')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Error eliminando frecuencia: ${error.message}`);
  }

  async addParadaToFrecuencia(frecuenciaId: string, parada: Omit<Parada, 'id'>): Promise<Parada> {
    const paradaCompleta = { ...parada, frecuenciaId };
    const { data, error } = await supabase
      .from('paradas')
      .insert(paradaCompleta)
      .select()
      .single();
    if (error) throw new Error(`Error agregando parada: ${error.message}`);
    return data;
  }

  async getParadasByFrecuencia(frecuenciaId: string): Promise<Parada[]> {
    const { data, error } = await supabase
      .from('paradas')
      .select('*')
      .eq('frecuenciaId', frecuenciaId)
      .order('orden');
    if (error) throw new Error(`Error obteniendo paradas: ${error.message}`);
    return data || [];
  }

  async updateParada(id: string, parada: Partial<Parada>): Promise<void> {
    const { error } = await supabase
      .from('paradas')
      .update(parada)
      .eq('id', id);
    if (error) throw new Error(`Error actualizando parada: ${error.message}`);
  }

  async deleteParada(id: string): Promise<void> {
    const { error } = await supabase
      .from('paradas')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Error eliminando parada: ${error.message}`);
  }
}