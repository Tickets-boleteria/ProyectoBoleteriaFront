/**
 * SupabaseSeatTypeRepository.ts - Implementación de ISeatTypeRepository con Supabase
 */

import { supabase } from './Api/supabaseClient';
import { SeatType } from '../Domain/Entities/SeatType';
import { ISeatTypeRepository } from '../Domain/Repositories/ISeatTypeRepository';
import {
  SeatTypeNoEncontradoException,
  SeatTypeInvalidoException,
  ColorHexInvalidoException,
  NombreSeatTypeDuplicadoException,
  PrecioNegativoException,
} from '../Domain/Exceptions/SeatTypeException';

export class SupabaseSeatTypeRepository implements ISeatTypeRepository {
  private readonly TABLA = 'tipos_asientos';

  /**
   * Obtiene todos los tipos de asientos
   */
  async obtenerTodos(): Promise<SeatType[]> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .order('nombre', { ascending: true });

    if (error)
      throw new Error(
        `Error al obtener tipos de asientos: ${error.message}`
      );
    return this.mapearTiposAsientos(data || []);
  }

  /**
   * Obtiene tipos de asientos activos
   */
  async obtenerActivos(): Promise<SeatType[]> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .eq('estado', true)
      .order('nombre', { ascending: true });

    if (error)
      throw new Error(
        `Error al obtener tipos de asientos activos: ${error.message}`
      );
    return this.mapearTiposAsientos(data || []);
  }

  /**
   * Obtiene un tipo de asiento por su ID
   */
  async obtenerPorId(id: number): Promise<SeatType | null> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener tipo de asiento: ${error.message}`);
    }

    if (!data) return null;
    return this.mapearTipoAsiento(data);
  }

  /**
   * Obtiene un tipo de asiento por su nombre
   */
  async obtenerPorNombre(nombre: string): Promise<SeatType | null> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .eq('nombre', nombre)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(
        `Error al obtener tipo de asiento por nombre: ${error.message}`
      );
    }

    if (!data) return null;
    return this.mapearTipoAsiento(data);
  }

  /**
   * Crea un nuevo tipo de asiento
   */
  async crear(seatType: SeatType): Promise<SeatType> {
    // Validaciones
    if (!seatType.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    // Verificar nombre duplicado
    const existente = await this.obtenerPorNombre(seatType.nombre);
    if (existente) {
      throw new NombreSeatTypeDuplicadoException(seatType.nombre);
    }

    // Validar precio
    if (seatType.precioBase < 0) {
      throw new PrecioNegativoException();
    }

    const datosInsert = this.mapearTipoAsientoADatos(seatType);

    const { data, error } = await supabase
      .from(this.TABLA)
      .insert([datosInsert])
      .select()
      .single();

    if (error)
      throw new Error(`Error al crear tipo de asiento: ${error.message}`);

    return this.mapearTipoAsiento(data);
  }

  /**
   * Actualiza un tipo de asiento existente
   */
  async actualizar(seatType: SeatType): Promise<SeatType> {
    if (!seatType.id) {
      throw new Error('El tipo de asiento debe tener un ID para actualizar');
    }

    if (!seatType.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    // Validar precio
    if (seatType.precioBase < 0) {
      throw new PrecioNegativoException();
    }

    const datosUpdate = this.mapearTipoAsientoADatos(seatType);

    const { data, error } = await supabase
      .from(this.TABLA)
      .update(datosUpdate)
      .eq('id', seatType.id)
      .select()
      .single();

    if (error)
      throw new Error(`Error al actualizar tipo de asiento: ${error.message}`);
    if (!data) throw new SeatTypeNoEncontradoException(seatType.id);

    return this.mapearTipoAsiento(data);
  }

  /**
   * Elimina un tipo de asiento (eliminación lógica)
   */
  async eliminar(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA)
      .update({ estado: false })
      .eq('id', id);

    if (error)
      throw new Error(`Error al eliminar tipo de asiento: ${error.message}`);
  }

  /**
   * Verifica si existe un nombre duplicado
   */
  async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from(this.TABLA)
      .select('id', { count: 'exact' })
      .eq('nombre', nombre);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error)
      throw new Error(`Error al verificar nombre duplicado: ${error.message}`);
    return (count || 0) > 0;
  }

  /**
   * Obtiene los tipos de asientos más usados
   */
  async obtenerMasUsados(limit: number = 5): Promise<SeatType[]> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .eq('estado', true)
      .order('nombre', { ascending: true })
      .limit(limit);

    if (error)
      throw new Error(
        `Error al obtener tipos más usados: ${error.message}`
      );
    return this.mapearTiposAsientos(data || []);
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Mapea un registro de BD a la entidad SeatType
   */
  private mapearTipoAsiento(data: any): SeatType {
    const seatType = new SeatType(
      data.nombre,
      data.color_hex,
      data.precio_base,
      data.descripcion,
      data.estado
    );
    seatType.id = data.id;
    seatType.createdAt = new Date(data.created_at);
    seatType.updatedAt = new Date(data.updated_at);
    return seatType;
  }

  /**
   * Mapea múltiples registros de BD
   */
  private mapearTiposAsientos(data: any[]): SeatType[] {
    return data.map((item) => this.mapearTipoAsiento(item));
  }

  /**
   * Mapea la entidad SeatType a datos para BD
   */
  private mapearTipoAsientoADatos(seatType: SeatType) {
    return {
      nombre: seatType.nombre,
      color_hex: seatType.colorHex,
      precio_base: seatType.precioBase,
      descripcion: seatType.descripcion,
      estado: seatType.estado,
      updated_at: new Date().toISOString(),
    };
  }
}