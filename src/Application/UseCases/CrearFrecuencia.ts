import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';

export interface CrearFrecuenciaInput {
  cooperativaId: number;
  ciudadOrigen: string;
  ciudadDestino: string;
  horaSalida: string;
  esDirecto?: boolean;
  codigoAnt?: string;
  resolucionAnt?: string;
}

export class CrearFrecuencia {
  constructor(private frecuenciaRepo: IFrecuenciaRepository) {}

  async ejecutar(input: CrearFrecuenciaInput): Promise<Frecuencia> {
    const { cooperativaId, ciudadOrigen, ciudadDestino, horaSalida } = input;

    if (ciudadOrigen.toLowerCase() === ciudadDestino.toLowerCase()) {
      throw new DomainException('La ciudad de origen no puede ser igual a la ciudad de destino.');
    }

    if (!horaSalida || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(horaSalida)) {
      throw new DomainException('El formato de la hora de salida no es válido. Utilice HH:MM o HH:MM:SS.');
    }

    const nuevaFrecuencia = new Frecuencia(
      cooperativaId,
      ciudadOrigen,
      ciudadDestino,
      horaSalida,
      input.esDirecto ?? true
    );

    if (input.codigoAnt) nuevaFrecuencia.codigoAnt = input.codigoAnt;
    if (input.resolucionAnt) nuevaFrecuencia.resolucionAnt = input.resolucionAnt;

    return this.frecuenciaRepo.crear(nuevaFrecuencia);
  }
}
