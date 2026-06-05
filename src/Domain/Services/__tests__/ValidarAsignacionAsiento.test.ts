import { describe, it, expect } from 'vitest';
import { ValidarAsignacionAsiento, ValidarAsientoInput } from '../ValidarAsignacionAsiento';

describe('ValidarAsignacionAsiento (Regla de Dominio)', () => {
  it('debe permitir cualquier destino si la ruta NO es directa', () => {
    const input: ValidarAsientoInput = {
      rutaTipoDirecta: false,
      paradaDestinoId: 5, // Parada intermedia
      terminalDestinoId: 10 // Terminal final
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(true);
  });

  it('debe permitir el destino si es la terminal final en una ruta directa', () => {
    const input: ValidarAsientoInput = {
      rutaTipoDirecta: true,
      paradaDestinoId: 10,
      terminalDestinoId: 10
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(true);
  });

  it('debe RECHAZAR el destino si es una parada intermedia en una ruta directa', () => {
    const input: ValidarAsientoInput = {
      rutaTipoDirecta: true,
      paradaDestinoId: 5, // Intento de bajar antes
      terminalDestinoId: 10
    };
    expect(ValidarAsignacionAsiento.esAsignacionValida(input)).toBe(false);
  });
});
