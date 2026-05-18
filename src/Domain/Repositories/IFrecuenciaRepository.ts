import { Frecuencia, ParadaIntermedia } from '../Entities/Frecuencia';

export interface IFrecuenciaRepository {
  crear(frecuencia: Frecuencia): Promise<Frecuencia>;
  obtenerTodas(): Promise<Frecuencia[]>;
  obtenerPorId(id: number): Promise<Frecuencia | null>;
  actualizar(id: number, frecuencia: Partial<Frecuencia>): Promise<Frecuencia>;
  eliminarLogico(id: number): Promise<void>;
  
  agregarParada(frecuenciaId: number, parada: ParadaIntermedia): Promise<ParadaIntermedia>;
  obtenerParadasPorFrecuencia(frecuenciaId: number): Promise<ParadaIntermedia[]>;
  actualizarParada(id: number, parada: Partial<ParadaIntermedia>): Promise<ParadaIntermedia>;
  eliminarParada(id: number): Promise<void>;
}