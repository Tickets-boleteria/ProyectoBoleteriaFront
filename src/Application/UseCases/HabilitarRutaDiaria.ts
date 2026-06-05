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

    // Validar día de la semana
    this.validarDiaSemana(fecha, frecuenciaExistente.diasOperacion);

    const busExistente = await this.busRepo.obtenerPorId(busId);
    if (!busExistente || busExistente.estado !== 'Activo') {
      throw new DomainException(`El bus con ID ${busId} no existe o no está en estado Activo.`);
    }

    const esBusDisponible = await this.rutaRepo.verificarBusDisponible(busId, fecha, frecuenciaId);
    if (!esBusDisponible) {
      throw new DomainException(`El bus con ID ${busId} ya se encuentra asignado a una ruta activa en el mismo horario para la fecha ${fecha}.`);
    }

    const nuevaRuta = new Ruta(
      frecuenciaId,
      busId,
      fecha,
      'Programada'
    );

    return await this.rutaRepo.crearRuta(nuevaRuta);
  }

  private validarDiaSemana(fechaStr: string, diasOperacion: string[]): void {
    if (!diasOperacion || diasOperacion.length === 0) return;

    const fecha = new Date(fechaStr + 'T00:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = diasSemana[fecha.getDay()];

    const coincide = diasOperacion.some(d => 
      d.toLowerCase().trim() === nombreDia.toLowerCase().trim()
    );

    if (!coincide) {
      throw new DomainException(`Esta frecuencia no opera los días ${nombreDia}. Días permitidos: ${diasOperacion.join(', ')}`);
    }
  }
}