/**
 * IBusRepository.ts - Contrato de repositorio para Buses
 */

import { Bus, BusAsiento } from '../Entities/Bus';

export interface IBusRepository {
  /**
   * Obtiene todos los buses
   */
  obtenerTodos(): Promise<Bus[]>;

  /**
   * Obtiene buses de una cooperativa específica
   */
  obtenerPorCooperativa(cooperativaId: string): Promise<Bus[]>;

  /**
   * Obtiene un bus por su ID
   */
  obtenerPorId(id: string): Promise<Bus | null>;

  /**
   * Obtiene un bus por su número
   */
  obtenerPorNumero(numero: number): Promise<Bus | null>;

  /**
   * Obtiene un bus por su placa
   */
  obtenerPorPlaca(placa: string): Promise<Bus | null>;

  /**
   * Crea un nuevo bus
   */
  crear(bus: Bus): Promise<Bus>;

  /**
   * Actualiza un bus existente
   */
  actualizar(bus: Bus): Promise<Bus>;

  /**
   * Elimina un bus (eliminación lógica)
   */
  eliminar(id: string): Promise<void>;

  /**
   * Obtiene los asientos de un bus
   */
  obtenerAsientos(busId: string): Promise<BusAsiento[]>;

  /**
   * Obtiene asientos disponibles de un tipo
   */
  obtenerAsientosDisponibles(
    busId: string,
    tipo: 'NORMAL' | 'VIP'
  ): Promise<BusAsiento[]>;

  /**
   * Actualiza el estado de un asiento
   */
  actualizarAsiento(asiento: BusAsiento): Promise<BusAsiento>;

  /**
   * Reserva asientos para un usuario
   */
  reservarAsientos(asientos: BusAsiento[]): Promise<void>;

  /**
   * Libera asientos reservados
   */
  liberarAsientos(asientos: BusAsiento[]): Promise<void>;

  /**
   * Busca buses disponibles en una ruta y fecha
   */
  buscarDisponibles(
    ciudadOrigen: string,
    ciudadDestino: string,
    fecha: Date,
    filtros?: BusFiltros
  ): Promise<Bus[]>;
}

/**
 * Filtros opcionales para búsqueda de buses
 */
export interface BusFiltros {
  cooperativaId?: string;
  tipoAsiento?: 'NORMAL' | 'VIP';
  precioMinimo?: number;
  precioMaximo?: number;
  ordenarPor?: 'precio' | 'salida' | 'cooperativa';
}