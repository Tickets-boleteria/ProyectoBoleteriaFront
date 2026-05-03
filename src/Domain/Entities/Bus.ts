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