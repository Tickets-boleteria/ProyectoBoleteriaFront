/**
 * Casos de uso para gestión de Buses
 */

import { Bus, BusAsiento } from '../../Domain/Entities/Bus';
import { IBusRepository, BusFiltros } from '../../Domain/Repositories/IBusRepository';
import { BusInvalidoException } from '../../Domain/Exceptions/BusExceptions';

/**
 * Caso de uso: Crear un nuevo bus
 */
export class CrearBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(
    numero: number,
    placa: string,
    chasis: string,
    carroceria: string,
    cooperativaId: string,
    capacidadNormal: number = 40,
    capacidadVip: number = 10,
    fotografiaUrl?: string
  ): Promise<Bus> {
    const bus = new Bus(
      numero,
      placa,
      chasis,
      carroceria,
      cooperativaId,
      capacidadNormal,
      capacidadVip,
      fotografiaUrl
    );

    return this.busRepository.crear(bus);
  }
}

/**
 * Caso de uso: Obtener todos los buses
 */
export class ObtenerTodosBuses {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(): Promise<Bus[]> {
    return this.busRepository.obtenerTodos();
  }
}

/**
 * Caso de uso: Obtener buses de una cooperativa
 */
export class ObtenerBusesPorCooperativa {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(cooperativaId: string): Promise<Bus[]> {
    return this.busRepository.obtenerPorCooperativa(cooperativaId);
  }
}

/**
 * Caso de uso: Obtener un bus por ID
 */
export class ObtenerBusPorId {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(id: string): Promise<Bus | null> {
    return this.busRepository.obtenerPorId(id);
  }
}

/**
 * Caso de uso: Actualizar un bus
 */
export class ActualizarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(bus: Bus): Promise<Bus> {
    if (!bus.esValido()) {
      throw new BusInvalidoException();
    }
    return this.busRepository.actualizar(bus);
  }
}

/**
 * Caso de uso: Eliminar un bus
 */
export class EliminarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(id: string): Promise<void> {
    return this.busRepository.eliminar(id);
  }
}

/**
 * Caso de uso: Obtener asientos disponibles de un bus
 */
export class ObtenerAsientosDisponibles {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: string, tipo: 'NORMAL' | 'VIP'): Promise<BusAsiento[]> {
    return this.busRepository.obtenerAsientosDisponibles(busId, tipo);
  }
}

/**
 * Caso de uso: Reservar asientos
 */
export class ReservarAsientos {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(
    asientos: BusAsiento[],
    pasajeroId: string
  ): Promise<void> {
    // Marcar asientos con el pasajero
    asientos.forEach((a) => {
      a.ocupar(pasajeroId);
    });

    return this.busRepository.reservarAsientos(asientos);
  }
}

/**
 * Caso de uso: Liberar asientos
 */
export class LiberarAsientos {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(asientos: BusAsiento[]): Promise<void> {
    asientos.forEach((a) => {
      a.liberar();
    });

    return this.busRepository.liberarAsientos(asientos);
  }
}

/**
 * Caso de uso: Buscar buses disponibles
 */
export class BuscarBusesDisponibles {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(
    ciudadOrigen: string,
    ciudadDestino: string,
    fecha: Date,
    filtros?: BusFiltros
  ): Promise<Bus[]> {
    return this.busRepository.buscarDisponibles(
      ciudadOrigen,
      ciudadDestino,
      fecha,
      filtros
    );
  }
}

/**
 * Caso de uso: Obtener asientos de un bus
 */
export class ObtenerAsientosBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: string): Promise<BusAsiento[]> {
    return this.busRepository.obtenerAsientos(busId);
  }
}

/**
 * Caso de uso: Actualizar configuración de capacidad de un bus
 */
export class ActualizarCapacidadBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(
    busId: string,
    capacidadNormal: number,
    capacidadVip: number
  ): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new Error(`Bus ${busId} no encontrado`);
    }

    bus.capacidadNormal = capacidadNormal;
    bus.capacidadVip = capacidadVip;

    return this.busRepository.actualizar(bus);
  }
}

/**
 * Caso de uso: Desactivar un bus
 */
export class DesactivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: string): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new Error(`Bus ${busId} no encontrado`);
    }

    bus.desactivar();
    return this.busRepository.actualizar(bus);
  }
}

/**
 * Caso de uso: Activar un bus
 */
export class ActivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: string): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new Error(`Bus ${busId} no encontrado`);
    }

    bus.activar();
    return this.busRepository.actualizar(bus);
  }
}