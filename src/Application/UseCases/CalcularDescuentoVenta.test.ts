import { describe, expect, it } from 'vitest';
import { CalcularDescuentoVenta } from './CalcularDescuentoVenta';
import { InvalidCedulaException } from '../../Domain/Exceptions/InvalidCedulaException';

describe('CalcularDescuentoVenta', () => {
  it('no aplica descuento cuando el pasajero no es menor ni adulto mayor', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 30,
      tieneDiscapacidad: false,
      precioBase: 10,
    });

    expect(resultado.categoria).toBe('SIN_DESCUENTO');
    expect(resultado.porcentajeDescuento).toBe(0);
    expect(resultado.montoDescuento).toBe(0);
    expect(resultado.precioFinal).toBe(10);
  });

  it('aplica descuento a menores de edad', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 17,
      tieneDiscapacidad: false,
      precioBase: 20,
    });

    expect(resultado.categoria).toBe('MENOR');
    expect(resultado.porcentajeDescuento).toBe(0.3);
    expect(resultado.montoDescuento).toBe(6);
    expect(resultado.precioFinal).toBe(14);
  });

  it('aplica descuento de tercera edad', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 65,
      tieneDiscapacidad: false,
      precioBase: 40,
    });

    expect(resultado.categoria).toBe('TERCERA_EDAD');
    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(20);
    expect(resultado.precioFinal).toBe(20);
  });

  it('aplica descuento por discapacidad', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 40,
      tieneDiscapacidad: true,
      precioBase: 30,
    });

    expect(resultado.categoria).toBe('DISCAPACIDAD');
    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(15);
    expect(resultado.precioFinal).toBe(15);
  });

  it('cuando existe tercera edad y discapacidad aplica solo el mayor sin acumular', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    const resultado = casoDeUso.ejecutar({
      numeroCedula: '1710000009',
      edad: 70,
      tieneDiscapacidad: true,
      precioBase: 50,
    });

    expect(resultado.porcentajeDescuento).toBe(0.5);
    expect(resultado.montoDescuento).toBe(25);
    expect(resultado.precioFinal).toBe(25);
    expect(['DISCAPACIDAD', 'TERCERA_EDAD']).toContain(resultado.categoria);
  });

  it('rechaza una cédula inválida', () => {
    const casoDeUso = new CalcularDescuentoVenta();

    expect(() =>
      casoDeUso.ejecutar({
        numeroCedula: '1710000008',
        edad: 30,
        tieneDiscapacidad: false,
        precioBase: 10,
      })
    ).toThrow(InvalidCedulaException);
  });
});