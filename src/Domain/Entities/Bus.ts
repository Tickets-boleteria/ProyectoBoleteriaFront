/**
 * Bus.ts - Entidad de Dominio
 * Representa un vehículo de transporte interprovincial
 */
 
export class Bus {
  id?: string;
  numero: number;
  placa: string;
  chasis: string;
  carroceria: string;
  cooperativaId: string;
  fotografiaUrl?: string;
  capacidadNormal: number;
  capacidadVip: number;
  estado: boolean;
  asientosNormales?: BusAsiento[];
  asientosVip?: BusAsiento[];
  createdAt?: Date;
  updatedAt?: Date;
 
  constructor(
    numero: number,
    placa: string,
    chasis: string,
    carroceria: string,
    cooperativaId: string,
    capacidadNormal: number = 40,
    capacidadVip: number = 10,
    fotografiaUrl?: string,
    estado: boolean = true
  ) {
    this.numero = numero;
    this.placa = placa;
    this.chasis = chasis;
    this.carroceria = carroceria;
    this.cooperativaId = cooperativaId;
    this.capacidadNormal = capacidadNormal;
    this.capacidadVip = capacidadVip;
    this.fotografiaUrl = fotografiaUrl;
    this.estado = estado;
    this.asientosNormales = [];
    this.asientosVip = [];
  }

    /**
   * Valida si el bus tiene datos válidos
   */
  esValido(): boolean {
    return (
      this.numero > 0 &&
      this.placa.length >= 6 &&
      this.chasis.length > 0 &&
      this.carroceria.length > 0 &&
      this.cooperativaId.length > 0 &&
      this.capacidadNormal > 0 &&
      this.capacidadVip >= 0
    );
  }
 
  /**
   * Calcula la capacidad total del bus
   */
  obtenerCapacidadTotal(): number {
    return this.capacidadNormal + this.capacidadVip;
  }

 
  /**
   * Obtiene los asientos disponibles
   */
  obtenerAsientosDisponibles(): number {
    const normalDisponibles = this.asientosNormales?.filter((a) => a.disponible).length || 0;
    const vipDisponibles = this.asientosVip?.filter((a) => a.disponible).length || 0;
    return normalDisponibles + vipDisponibles;
  }
 
  /**
   * Valida si hay capacidad para un tipo específico de asiento
   */
  tieneCapacidadDisponible(tipoAsiento: 'NORMAL' | 'VIP'): boolean {
    if (tipoAsiento === 'NORMAL') {
      const ocupados = this.asientosNormales?.filter((a) => !a.disponible).length || 0;
      return ocupados < this.capacidadNormal;
    } else {
      const ocupados = this.asientosVip?.filter((a) => !a.disponible).length || 0;
      return ocupados < this.capacidadVip;
    }
  }

  /**
   * Desactiva el bus (eliminación lógica)
   */
  desactivar(): void {
    this.estado = false;
    this.updatedAt = new Date();
  }
 
  /**
   * Activa el bus
   */
  activar(): void {
    this.estado = true;
    this.updatedAt = new Date();
  }
}
 
/**
 * Representa un asiento dentro de un bus
 */
export class BusAsiento {
  id?: string;
  busId: string;
  numeroAsiento: string;
  tipoAsientoId: string;
  tipo: 'NORMAL' | 'VIP';
  disponible: boolean;
  pasajeroId?: string;
  createdAt?: Date;
  updatedAt?: Date;
 
  constructor(
    busId: string,
    numeroAsiento: string,
    tipoAsientoId: string,
    tipo: 'NORMAL' | 'VIP',
    disponible: boolean = true
  ) {
    this.busId = busId;
    this.numeroAsiento = numeroAsiento;
    this.tipoAsientoId = tipoAsientoId;
    this.tipo = tipo;
    this.disponible = disponible;
  }
 
  /**
   * Marca el asiento como ocupado
   */
  ocupar(pasajeroId: string): void {
    this.disponible = false;
    this.pasajeroId = pasajeroId;
    this.updatedAt = new Date();
  }
 
  /**
   * Marca el asiento como disponible
   */
  liberar(): void {
    this.disponible = true;
    this.pasajeroId = undefined;
    this.updatedAt = new Date();
  }
 
  /**
   * Verifica si el asiento está disponible
   */
  estaDisponible(): boolean {
    return this.disponible;
  }
}