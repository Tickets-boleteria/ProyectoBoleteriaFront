/**
 * ValidarAsignacionAsiento.ts - Servicio de dominio para validar las paradas segun el tipo de ruta.
 */

export interface ValidarAsientoInput {
  rutaTipoDirecta: boolean;    // true si la frecuencia es directa
  paradaDestinoId: number;     // ID de la parada donde baja el pasajero
  terminalDestinoId: number;   // ID de la parada final real del bus (Terminal Principal)
}

export class ValidarAsignacionAsiento {
  /**
   * REGLA DE NEGOCIO: Si la ruta es Directa, el destino DEBE ser obligatoriamente la terminal final.
   * No se permiten paradas intermedias para bajar pasajeros en frecuencias directas.
   */
  public static esAsignacionValida(input: ValidarAsientoInput): boolean {
    if (input.rutaTipoDirecta) {
      if (input.paradaDestinoId !== input.terminalDestinoId) {
        return false; // Bloquea la asignación porque intenta bajar en una parada intermedia
      }
    }
    return true; // Es válida
  }
}
