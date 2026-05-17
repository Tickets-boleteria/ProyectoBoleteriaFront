import { Ruta } from '../Entities/Ruta';

export interface IRutaRepository {
  crearRuta(ruta: Ruta): Promise<Ruta>;
  buscarPorId(id: number): Promise<Ruta | null>;
  verificarBusDisponible(busId: number, fecha: string): Promise<boolean>;
  actualizarEstado(id: number, estado: string): Promise<void>;
}