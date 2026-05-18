import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Frecuencia, ParadaIntermedia } from '../../Domain/Entities/Frecuencia';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export interface CrearFrecuenciaInput {
  cooperativaId: number;
  ciudadOrigen: string;
  ciudadDestino: string;
  horaSalida: string;
  esDirecto?: boolean;
  codigoAnt?: string;
  resolucionAnt?: string;
}

export class GestionarFrecuencias {
  constructor(private frecuenciaRepository: IFrecuenciaRepository) {}

  async crearFrecuencia(frecuencia: Frecuencia): Promise<Frecuencia> {
    if (!frecuencia.ciudadOrigen || !frecuencia.ciudadDestino) {
      throw new DomainException('Origen y destino son obligatorios');
    }

    return this.frecuenciaRepository.crear(frecuencia);
  }

  async obtenerFrecuenciasActivas(): Promise<Frecuencia[]> {
    return this.frecuenciaRepository.obtenerTodas();
  }

  async agregarParada(frecuenciaId: number, parada: ParadaIntermedia): Promise<ParadaIntermedia> {
    const frecuencia = await this.frecuenciaRepository.obtenerPorId(frecuenciaId);
    if (!frecuencia) {
      throw new DomainException('Frecuencia no encontrada');
    }

    if (frecuencia.esDirecto && parada.permiteVenta) {
      throw new DomainException('Frecuencias directas no permiten ventas en paradas');
    }

    return this.frecuenciaRepository.agregarParada(frecuenciaId, parada);
  }

  async obtenerParadasDeFrecuencia(frecuenciaId: number): Promise<ParadaIntermedia[]> {
    return this.frecuenciaRepository.obtenerParadasPorFrecuencia(frecuenciaId);
  }
}