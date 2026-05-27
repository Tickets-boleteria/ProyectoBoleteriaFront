import { Bus, TipoEstructuraBus } from '../../Domain/Entities/Bus';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';

export interface CrearBusInput {
  cooperativaId: number;
  numero: string;
  placa: string;
  totalAsientos: number;
  estructura?: TipoEstructuraBus;
  asientosNormales?: number;
  asientosVip?: number;
  asientosEjecutivos?: number;
  marcaChasis?: string;
  marcaCarroceria?: string;
  anio?: number;
  fotoUrl?: string;
}

export class CrearBus {
  constructor(private busRepo: IBusRepository) {}

  async ejecutar(input: CrearBusInput): Promise<Bus> {
    const estructura = input.estructura ?? 'UnPiso';
    const normal = Number(input.asientosNormales ?? input.totalAsientos ?? 0);
    const vip = Number(input.asientosVip ?? 0);
    const ejecutivo = Number(input.asientosEjecutivos ?? 0);
    const totalAsientos = input.asientosNormales !== undefined || input.asientosVip !== undefined || input.asientosEjecutivos !== undefined
      ? normal + vip + ejecutivo
      : Number(input.totalAsientos);
    const nuevoBus = new Bus(input.cooperativaId, input.numero, input.placa, totalAsientos, 'Activo', estructura);

    if (!nuevoBus.esValido()) {
      throw new DomainException('Los datos del autobús no son válidos. Verifique el número, la placa y que la capacidad sea mayor a cero.');
    }

    if (estructura === 'UnPiso' && (vip > 0 || ejecutivo > 0)) {
      throw new DomainException('Un bus de un solo piso solo puede registrar asientos de tipo Normal.');
    }

    if (estructura === 'DosPisos' && normal <= 0) {
      throw new DomainException('Un bus de dos pisos debe incluir asientos normales.');
    }

    const busExistente = await this.busRepo.obtenerPorPlaca(placa);
    if (busExistente) {
      throw new DomainException(`Ya existe un autobús registrado con la placa ${placa}.`);
    }

    if (input.marcaChasis) nuevoBus.marcaChasis = input.marcaChasis;
    if (input.marcaCarroceria) nuevoBus.marcaCarroceria = input.marcaCarroceria;
    if (input.anio) nuevoBus.anio = input.anio;
    if (input.fotoUrl) nuevoBus.fotoUrl = input.fotoUrl;

    return this.busRepo.crear(nuevoBus);
  }
}
