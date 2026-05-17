/**
 * IBusRepository.ts - Contrato de repositorio para Buses
 */

import { Bus, BusAsiento } from '../Entities/Bus';

export interface IBusRepository {
  obtenerTodos(): Promise<Bus[]>;
  obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]>;
  obtenerPorId(id: number): Promise<Bus | null>;
  obtenerPorPlaca(placa: string): Promise<Bus | null>;
  crear(bus: Bus): Promise<Bus>;
  actualizar(id: number, bus: Partial<Bus>): Promise<Bus>;
  eliminarLogico(id: number): Promise<void>;
  obtenerAsientos(busId: number): Promise<BusAsiento[]>;
}