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
 
   /**
   * Valida si el tipo de asiento tiene datos válidos
   */
  esValido(): boolean {
    return (
      this.nombre.length >= 3 &&
      this.validarColorHex(this.colorHex) &&
      this.precioBase >= 0
    );
  }
 
  /**
   * Valida que el color sea un hexadecimal válido
   */
  private validarColorHex(color: string): boolean {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    return hexRegex.test(color);
  }

    actualizarPrecio(nuevoPrecio: number): void {
    if (nuevoPrecio < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    this.precioBase = nuevoPrecio;
    this.updatedAt = new Date();
  }
  
}