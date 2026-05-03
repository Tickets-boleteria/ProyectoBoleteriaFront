/**
 * SeatType.ts - Entidad de Dominio
 * Representa los tipos de asientos disponibles (Normal, VIP, etc.)
 */
 
export class SeatType {
  id?: string;
  nombre: string;
  colorHex: string;
  precioBase: number;
  descripcion?: string;
  estado: boolean;
  createdAt?: Date;
  updatedAt?: Date;
 
  constructor(
    nombre: string,
    colorHex: string,
    precioBase: number,
    descripcion?: string,
    estado: boolean = true
  ) {
    this.nombre = nombre;
    this.colorHex = colorHex;
    this.precioBase = precioBase;
    this.descripcion = descripcion;
    this.estado = estado;
  }
 