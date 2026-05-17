/**
 * Casos de uso para gestión de Tipos de Asientos
 */

import { SeatType } from '../../Domain/Entities/SeatType';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import {
  SeatTypeInvalidoException,
  NombreSeatTypeDuplicadoException,
  PrecioNegativoException,
} from '../../Domain/Exceptions/SeatTypeException';

/**
 * Caso de uso: Crear un nuevo tipo de asiento
 */
export class CrearTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(
    nombre: string,
    colorHex: string,
    precioBase: number,
    descripcion?: string
  ): Promise<SeatType> {
    // Validar nombre único
    const existente = await this.seatTypeRepository.obtenerPorNombre(nombre);
    if (existente) {
      throw new NombreSeatTypeDuplicadoException(nombre);
    }

    // Validar precio
    if (precioBase < 0) {
      throw new PrecioNegativoException();
    }

    const seatType = new SeatType(nombre, colorHex, precioBase, descripcion);

    if (!seatType.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    return this.seatTypeRepository.crear(seatType);
  }
}

/**
 * Caso de uso: Obtener todos los tipos de asientos
 */
export class ObtenerTodosTiposAsientos {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(): Promise<SeatType[]> {
    return this.seatTypeRepository.obtenerTodos();
  }
}

/**
 * Caso de uso: Obtener tipos de asientos activos
 */
export class ObtenerTiposAsientosActivos {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(): Promise<SeatType[]> {
    return this.seatTypeRepository.obtenerActivos();
  }
}

/**
 * Caso de uso: Obtener un tipo de asiento por ID
 */
export class ObtenerTipoAsientoPorId {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string): Promise<SeatType | null> {
    return this.seatTypeRepository.obtenerPorId(id);
  }
}

/**
 * Caso de uso: Actualizar un tipo de asiento
 */
export class ActualizarTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(seatType: SeatType): Promise<SeatType> {
    if (!seatType.esValido()) {
      throw new SeatTypeInvalidoException();
    }

    if (seatType.precioBase < 0) {
      throw new PrecioNegativoException();
    }

    return this.seatTypeRepository.actualizar(seatType);
  }
}

/**
 * Caso de uso: Eliminar un tipo de asiento
 */
export class EliminarTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string): Promise<void> {
    return this.seatTypeRepository.eliminar(id);
  }
}

/**
 * Caso de uso: Actualizar precio de un tipo de asiento
 */
export class ActualizarPrecioTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string, nuevoPrecio: number): Promise<SeatType> {
    if (nuevoPrecio < 0) {
      throw new PrecioNegativoException();
    }

    const seatType = await this.seatTypeRepository.obtenerPorId(id);
    if (!seatType) {
      throw new Error(`Tipo de asiento ${id} no encontrado`);
    }

    seatType.actualizarPrecio(nuevoPrecio);
    return this.seatTypeRepository.actualizar(seatType);
  }
}

/**
 * Caso de uso: Actualizar color de un tipo de asiento
 */
export class ActualizarColorTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string, nuevoColor: string): Promise<SeatType> {
    const seatType = await this.seatTypeRepository.obtenerPorId(id);
    if (!seatType) {
      throw new Error(`Tipo de asiento ${id} no encontrado`);
    }

    seatType.actualizarColor(nuevoColor);
    return this.seatTypeRepository.actualizar(seatType);
  }
}

/**
 * Caso de uso: Desactivar un tipo de asiento
 */
export class DesactivarTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string): Promise<SeatType> {
    const seatType = await this.seatTypeRepository.obtenerPorId(id);
    if (!seatType) {
      throw new Error(`Tipo de asiento ${id} no encontrado`);
    }

    seatType.desactivar();
    return this.seatTypeRepository.actualizar(seatType);
  }
}

/**
 * Caso de uso: Activar un tipo de asiento
 */
export class ActivarTipoAsiento {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(id: string): Promise<SeatType> {
    const seatType = await this.seatTypeRepository.obtenerPorId(id);
    if (!seatType) {
      throw new Error(`Tipo de asiento ${id} no encontrado`);
    }

    seatType.activar();
    return this.seatTypeRepository.actualizar(seatType);
  }
}

/**
 * Caso de uso: Obtener tipos de asientos más usados
 */
export class ObtenerTiposAsientosMasUsados {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(limit: number = 5): Promise<SeatType[]> {
    return this.seatTypeRepository.obtenerMasUsados(limit);
  }
}

/**
 * Caso de uso: Crear tipos de asientos estándar por defecto
 */
export class CrearTiposAsientosEstandar {
  constructor(private seatTypeRepository: ISeatTypeRepository) {}

  async ejecutar(): Promise<SeatType[]> {
    const tiposExistentes = await this.seatTypeRepository.obtenerTodos();
    if (tiposExistentes.length > 0) {
      return tiposExistentes;
    }

    const tiposEstandar = [
      new SeatType('Normal', '#3498db', 10.0, 'Asiento estándar para pasajeros'),
      new SeatType('VIP', '#e74c3c', 20.0, 'Asiento de lujo con mayor comodidad'),
      new SeatType('Executivo', '#f39c12', 15.0, 'Asiento ejecutivo semi-premium'),
    ];

    const creados: SeatType[] = [];
    for (const tipo of tiposEstandar) {
      try {
        const creado = await this.seatTypeRepository.crear(tipo);
        creados.push(creado);
      } catch (error) {
        console.error(`Error creando tipo de asiento ${tipo.nombre}:`, error);
      }
    }

    return creados;
  }
}