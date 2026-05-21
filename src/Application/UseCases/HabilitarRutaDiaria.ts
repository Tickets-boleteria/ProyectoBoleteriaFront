import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export interface HabilitarRutaInput {
  frecuenciaId: number;
  busId: number;
  fecha: string;
}

export class  HabilitarRutaDiaria {
  constructor(
    private rutaRepo: IRutaRepository,
    private busRepo: IBusRepository,
    private frecuenciaRepo: IFrecuenciaRepository
  ) {}

  async ejecutar(input: HabilitarRutaInput): Promise<Ruta> {
    const { frecuenciaId, busId, fecha } = input;

    if (!fecha || isNaN(Date.parse(fecha))) {
      throw new DomainException('La fecha proporcionada para la ruta diaria no es válida.');
    }

    const frecuenciaExistente = await this.frecuenciaRepo.obtenerPorId(frecuenciaId);
    if (!frecuenciaExistente || !frecuenciaExistente.activa) {
      throw new DomainException(`La frecuencia con ID ${frecuenciaId} no existe o no se encuentra activa.`);
    }

    const busExistente = await this.busRepo.obtenerPorId(busId);
    if (!busExistente || busExistente.estado !== 'Activo') {
      throw new DomainException(`El bus con ID ${busId} no existe o no está en estado Activo.`);
    }

    const esBusDisponible = await this.rutaRepo.verificarBusDisponible(busId, fecha);
    if (!esBusDisponible) {
      throw new DomainException(`El bus con ID ${busId} ya se encuentra asignado a una ruta activa para la fecha ${fecha}.`);
    }

    const nuevaRuta = new Ruta(
      frecuenciaId,
      busId,
      fecha,
      'Programada'
    );

    return await this.rutaRepo.crearRuta(nuevaRuta);
  }
}