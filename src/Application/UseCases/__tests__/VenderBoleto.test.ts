import { describe, it, expect } from 'vitest';
import { VenderBoleto, VenderBoletoInput } from '../VenderBoleto';
import { DomainException } from '../../../Domain/Exceptions/DomainException';

describe('VenderBoleto (Caso de Uso)', () => {
  const useCase = new VenderBoleto();

  it('debe validar exitosamente una venta válida', async () => {
    const input: VenderBoletoInput = {
      frecuenciaId: 1,
      esDirecto: true,
      paradaDestinoId: 10,
      terminalDestinoId: 10,
      pasajeroCedula: '1234567890',
      pasajeroNombres: 'Juan',
      pasajeroApellidos: 'Perez',
      cantidadBoletos: 1
    };

    const resultado = await useCase.ejecutar(input);
    expect(resultado).toBe(true);
  });

  it('debe lanzar DomainException si la regla de negocio no se cumple', async () => {
    const input: VenderBoletoInput = {
      frecuenciaId: 1,
      esDirecto: true,
      paradaDestinoId: 5, // Parada intermedia en ruta directa
      terminalDestinoId: 10,
      pasajeroCedula: '1234567890',
      pasajeroNombres: 'Juan',
      pasajeroApellidos: 'Perez',
      cantidadBoletos: 1
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(useCase.ejecutar(input)).rejects.toThrow('No se permiten paradas intermedias en una frecuencia directa');
  });
});
