/**
 * SupabaseRutaRepository.ts - Implementación de IRutaRepository con Supabase
 * Gestiona las rutas diarias (asignación de bus a frecuencia en una fecha específica)
 */

import { supabase } from '../Api/supabaseClient';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class SupabaseRutaRepository implements IRutaRepository {
  private readonly tabla = 'rutas_diarias';

  /**
   * Crear una nueva ruta diaria (asignar bus a frecuencia en una fecha)
   */
  async crearRuta(ruta: Ruta): Promise<Ruta> {
    const datosInsert = this.mapearRutaADatos(ruta);

    const { data, error } = await supabase
      .from(this.tabla)
      .insert([datosInsert])
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al crear ruta diaria: ${error.message}`);
    }

    return this.mapearRuta(data);
  }

  /**
   * Obtener una ruta diaria por su ID
   */
  async buscarPorId(id: number): Promise<Ruta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new DomainException(`Error al obtener ruta diaria: ${error.message}`);
    }

    return data ? this.mapearRuta(data) : null;
  }

  /**
   * Verificar si un bus está disponible en una fecha específica
   * Un bus está disponible si no tiene otra ruta activa/programada para esa fecha
   */
  async verificarBusDisponible(busId: number, fecha: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('id')
      .eq('bus_id', busId)
      .eq('fecha', fecha)
      .in('estado', ['Programada', 'En curso', 'En proceso'])
      .limit(1);

    if (error) {
      throw new DomainException(`Error al verificar disponibilidad del bus: ${error.message}`);
    }

    // Si no hay registros, el bus está disponible
    return !data || data.length === 0;
  }

  /**
   * Actualizar el estado de una ruta diaria
   */
  async actualizarEstado(id: number, estado: string): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ estado })
      .eq('id', id);

    if (error) {
      throw new DomainException(`Error al actualizar estado de ruta diaria: ${error.message}`);
    }
  }

  /**
   * Obtener todas las rutas de un bus en una fecha específica (no requerido en contrato, pero útil)
   */
  async obtenerRutasPorBusYFecha(busId: number, fecha: string): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('bus_id', busId)
      .eq('fecha', fecha)
      .order('created_at', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener rutas del bus: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearRuta(item));
  }

  /**
   * Obtener todas las rutas de una frecuencia en una fecha (no requerido en contrato, pero útil)
   */
  async obtenerRutasPorFrecuenciaYFecha(frecuenciaId: number, fecha: string): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('frecuencia_id', frecuenciaId)
      .eq('fecha', fecha)
      .order('created_at', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener rutas de la frecuencia: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearRuta(item));
  }

  /**
   * Mapear datos de Supabase a entidad Ruta
   */
  private mapearRuta(data: any): Ruta {
    return new Ruta(
      data.frecuencia_id,
      data.bus_id,
      data.fecha,
      data.estado || 'Programada',
      data.id,
      data.created_at ? new Date(data.created_at) : undefined
    );
  }

  /**
   * Mapear entidad Ruta a formato de base de datos
   */
  private mapearRutaADatos(ruta: Ruta) {
    return {
      frecuencia_id: ruta.frecuenciaId,
      bus_id: ruta.busId,
      fecha: ruta.fecha,
      estado: ruta.estado || 'Programada',
    };
  }
}
