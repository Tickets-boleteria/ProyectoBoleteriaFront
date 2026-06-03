/**
 * SupabaseRutaRepository.ts - Implementación de IRutaRepository con Supabase
 * Gestiona las rutas diarias (asignación de bus a frecuencia en una fecha específica)
 */

import { supabase } from '../Api/supabaseClient';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { DomainException } from '../../Domain/Exceptions/DomainException';

// Extractor robusto para leer las columnas sin importar mayúsculas o minúsculas
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseRutaRepository implements IRutaRepository {
  private readonly tabla = 'Rutas'; // Ajustado al estándar de tu BD (PascalCase)

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
   * Verificar si un bus está disponible en una fecha específica y horario.
   * Si se provee frecuenciaId, verifica que el bus no esté asignado a otra ruta en ese mismo horario.
   * Si se provee rutaActualId, se excluye de la búsqueda para evitar choques con la ruta que se está editando.
   */
  async verificarBusDisponible(busId: number, fecha: string, frecuenciaId?: number, rutaActualId?: number): Promise<boolean> {
    const estadosActivos = ['Programada', 'Habilitada', 'EnCurso', 'En curso', 'En proceso'];

    if (!frecuenciaId) {
      // Comportamiento legado (verifica todo el día)
      let query = supabase
        .from(this.tabla)
        .select('*')
        .eq('BusId', busId)
        .eq('Fecha', fecha)
        .in('Estado', estadosActivos);
        
      if (rutaActualId) {
        query = query.neq('id', rutaActualId).neq('Id', rutaActualId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        throw new DomainException(`Error al verificar disponibilidad del bus: ${error.message}`);
      }

      return !data || data.length === 0;
    }

    // Comportamiento nuevo: Validar que el bus no tenga un viaje a la misma hora ese día
    
    // 1. Obtener la hora de la frecuencia que queremos asignar
    const { data: frecData, error: frecError } = await supabase
      .from('Frecuencias')
      .select('HoraSalida')
      .eq('Id', frecuenciaId)
      .single();
      
    if (frecError || !frecData) {
      throw new DomainException(`Error al obtener la frecuencia para validar horario: ${frecError?.message || 'No encontrada'}`);
    }

    const horaRequerida = getFieldValue(frecData, 'HoraSalida') || getFieldValue(frecData, 'horasalida');

    // 2. Obtener las rutas de ese bus ese día con sus respectivas horas de salida
    let query = supabase
      .from(this.tabla)
      .select(`
        Id,
        Frecuencias!inner(HoraSalida)
      `)
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .in('Estado', estadosActivos);

    if (rutaActualId) {
      query = query.neq('id', rutaActualId).neq('Id', rutaActualId);
    }

    const { data, error } = await query;

    if (error) {
      throw new DomainException(`Error al verificar disponibilidad del bus por horario: ${error.message}`);
    }

    // 3. Comprobar si hay choque de horarios
    if (data && data.length > 0) {
      for (const ruta of data) {
        const frecuenciasData = getFieldValue(ruta, 'Frecuencias') || getFieldValue(ruta, 'frecuencias');
        const horaAsignada = getFieldValue(frecuenciasData, 'HoraSalida') || getFieldValue(frecuenciasData, 'horasalida');
        
        if (horaAsignada === horaRequerida) {
          return false; // El bus ya está ocupado en ese mismo horario
        }
      }
    }

    return true;
  }

  /**
   * Actualizar el estado de una ruta diaria
   */
  async actualizarEstado(id: number, estado: string): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ Estado: estado })
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
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .order('CreatedAt', { ascending: true });

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
      .eq('FrecuenciaId', frecuenciaId)
      .eq('Fecha', fecha)
      .order('CreatedAt', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener rutas de la frecuencia: ${error.message}`);
    }

    return (data || []).map((item) => this.mapearRuta(item));
  }

  /**
   * Mapear datos de Supabase a entidad Ruta
   */
  private mapearRuta(data: any): Ruta {
    const createdAtVal = getFieldValue(data, 'createdat') ?? getFieldValue(data, 'created_at');
    return new Ruta(
      getFieldValue(data, 'frecuenciaid') ?? getFieldValue(data, 'frecuencia_id'),
      getFieldValue(data, 'busid') ?? getFieldValue(data, 'bus_id'),
      getFieldValue(data, 'fecha'),
      getFieldValue(data, 'estado') || 'Programada',
      getFieldValue(data, 'id'),
      createdAtVal ? new Date(createdAtVal) : undefined
    );
  }

  /**
   * Mapear entidad Ruta a formato de base de datos
   */
  private mapearRutaADatos(ruta: Ruta) {
    return {
      FrecuenciaId: ruta.frecuenciaId,
      BusId: ruta.busId,
      Fecha: ruta.fecha,
      Estado: ruta.estado || 'Programada',
    };
  }
}
