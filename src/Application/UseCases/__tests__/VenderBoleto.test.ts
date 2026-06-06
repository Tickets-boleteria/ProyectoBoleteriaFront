import { describe, it, expect } from 'vitest';
import { VenderBoleto, VenderBoletoInput } from '../VenderBoleto';
import { DomainException } from '../../../Domain/Exceptions/DomainException';

describe('VenderBoleto (Caso de Uso)', () => {
  const mockVentaRepo = {
    crearVenta: vi.fn().mockResolvedValue(123)
  } as any;

  const mockBoletosRepo = {
    verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
    insertarBoletos: vi.fn().mockResolvedValue([])
  } as any;

  const useCase = new VenderBoleto(mockVentaRepo, mockBoletosRepo);

  it('debe validar exitosamente una venta válida', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'user-123',
      ruta: { id: 100, estado: 'Habilitada', origen: 'Quito', destinoFinal: 'Guayaquil', esDirecto: true },
      ciudadDestinoVenta: 'Guayaquil',
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          cedula: '1234567890',
          nombres: 'Juan',
          apellidos: 'Perez',
          asientoId: 1,
          precioFinal: 10,
          fechaNacimiento: '1990-01-01',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0
        }
      ]
    };

    const resultado = await useCase.ejecutar(input);
    expect(resultado.ventaId).toBe(123);
  });

  it('debe lanzar DomainException si la regla de negocio no se cumple', async () => {
    const input: VenderBoletoInput = {
      usuarioVendedorId: 'user-123',
      ruta: { id: 100, estado: 'Habilitada', origen: 'Quito', destinoFinal: 'Guayaquil', esDirecto: true },
      ciudadDestinoVenta: 'Latacunga',
      paradaDestinoId: 5, // Parada intermedia en ruta directa
      metodoPago: 'Efectivo',
      pasajeros: [
        {
          cedula: '1234567890',
          nombres: 'Juan',
          apellidos: 'Perez',
          asientoId: 1,
          precioFinal: 10,
          fechaNacimiento: '1990-01-01',
          esMenor: false,
          esDiscapacitado: false,
          esTerceraEdad: false,
          descuentoAplicado: 0
        }
      ]
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(useCase.ejecutar(input)).rejects.toThrow('No se permiten paradas intermedias en una frecuencia directa');
  });
});
