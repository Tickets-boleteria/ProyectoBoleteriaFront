/**
 * ISeatTypeRepository.ts - Contrato de repositorio para Tipos de Asientos
 */

import { SeatType } from '../Entities/SeatType';

export interface ISeatTypeRepository {
  /**
   * Obtiene todos los tipos de asientos
   */
  obtenerTodos(): Promise<SeatType[]>;

  /**
   * Obtiene tipos de asientos activos
   */
  obtenerActivos(): Promise<SeatType[]>;

  /**
   * Obtiene un tipo de asiento por su ID
   */
  obtenerPorId(id: string): Promise<SeatType | null>;

  /**
   * Obtiene un tipo de asiento por su nombre
   */
  obtenerPorNombre(nombre: string): Promise<SeatType | null>;

  /**
   * Crea un nuevo tipo de asiento
   */
  crear(seatType: SeatType): Promise<SeatType>;

  /**
   * Actualiza un tipo de asiento existente
   */
  actualizar(seatType: SeatType): Promise<SeatType>;

  /**
   * Elimina un tipo de asiento (eliminación lógica)
   */
  eliminar(id: string): Promise<void>;

  /**
   * Verifica si existe un nombre duplicado
   */
  existeNombre(nombre: string, excludeId?: string): Promise<boolean>;

  /**
   * Obtiene los tipos de asientos más usados
   */
  obtenerMasUsados(limit?: number): Promise<SeatType[]>;
}