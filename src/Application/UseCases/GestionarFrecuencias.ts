import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Frecuencia, Parada } from '../../Domain/Entities/Frecuencia';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class GestionarFrecuencias {
  constructor(private frecuenciaRepository: IFrecuenciaRepository) {}

  async crearFrecuencia(frecuencia: Omit<Frecuencia, 'id'>): Promise<Frecuencia> {
    if (!frecuencia.origen || !frecuencia.destino) {
      throw new DomainException('Origen y destino son obligatorios');
    }
    return await this.frecuenciaRepository.createFrecuencia(frecuencia);
  }

  async obtenerFrecuenciasActivas(): Promise<Frecuencia[]> {
    return await this.frecuenciaRepository.getFrecuenciasActivas();
  }

  async agregarParada(frecuenciaId: string, parada: Omit<Parada, 'id'>): Promise<Parada> {
    const frecuencia = await this.frecuenciaRepository.getFrecuenciaById(frecuenciaId);
    if (!frecuencia) {
      throw new DomainException('Frecuencia no encontrada');
    }
    if (frecuencia.tipo === 'directo' && parada.permiteVenta) {
      throw new DomainException('Frecuencias directas no permiten ventas en paradas');
    }
    return await this.frecuenciaRepository.addParadaToFrecuencia(frecuenciaId, parada);
  }

  async obtenerParadasDeFrecuencia(frecuenciaId: string): Promise<Parada[]> {
    return await this.frecuenciaRepository.getParadasByFrecuencia(frecuenciaId);
  }
}