import { Frecuencia, Parada } from '../Entities/Frecuencia';

export interface IFrecuenciaRepository {
  createFrecuencia(frecuencia: Omit<Frecuencia, 'id'>): Promise<Frecuencia>;
  getFrecuenciasActivas(): Promise<Frecuencia[]>;
  getFrecuenciaById(id: string): Promise<Frecuencia | null>;
  updateFrecuencia(id: string, frecuencia: Partial<Frecuencia>): Promise<void>;
  deleteFrecuencia(id: string): Promise<void>;
  addParadaToFrecuencia(frecuenciaId: string, parada: Omit<Parada, 'id'>): Promise<Parada>;
  getParadasByFrecuencia(frecuenciaId: string): Promise<Parada[]>;
  updateParada(id: string, parada: Partial<Parada>): Promise<void>;
  deleteParada(id: string): Promise<void>;
}