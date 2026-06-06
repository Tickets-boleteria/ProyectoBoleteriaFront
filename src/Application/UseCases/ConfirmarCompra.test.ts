import { describe, it, expect, vi } from 'vitest'
import { ConfirmarCompra, ConfirmInput } from './ConfirmarCompra'
import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository'

describe('ConfirmarCompra Use Case', () => {
  const mockVentaRepo: IVentaRepository = {
    uploadComprobante: vi.fn().mockResolvedValue({ publicUrl: 'http://example.com/captura.png' }),
    crearVenta: vi.fn().mockResolvedValue(123),
  }

  const mockBoletosRepo: IBoletosRepository = {
    insertarBoletos: vi.fn().mockResolvedValue([{ id: 1 }]),
    verificarAsientoDisponible: vi.fn().mockResolvedValue(true),
  }

  const useCase = new ConfirmarCompra(mockVentaRepo, mockBoletosRepo)

  it('debe registrar una venta y boletos correctamente con cédula y estado pendiente', async () => {
    const input: ConfirmInput = {
      ruta: { id: 1, origen: 'Ambato', destino: 'Quito' },
      asientos: [10, 11],
      precioUnitario: 10,
      capturaArchivo: new File([''], 'comprobante.png', { type: 'image/png' }),
      nombres: 'Juan',
      apellidos: 'Perez',
      cedula: '1850000000',
      fechaNacimiento: '1990-01-01',
      usuarioId: 'user-123',
      metodoPago: 'Transferencia'
    }

    const result = await useCase.ejecutar(input)

    // Verificar subida
    expect(mockVentaRepo.uploadComprobante).toHaveBeenCalled()
    
    // Verificar creación de venta (Estado Pendiente)
    expect(mockVentaRepo.crearVenta).toHaveBeenCalledWith(expect.objectContaining({
      Estado: 'Pendiente',
      Total: 20
    }))

    // Verificar inserción de boletos (Cédula y Estado Emitido)
    expect(mockBoletosRepo.insertarBoletos).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        CedulaPasajero: '1850000000',
        Estado: 'Emitido',
        VentaId: 123
      })
    ]))

    expect(result.ventaId).toBe(123)
  })

  it('debe lanzar error si no se proporciona la cédula', async () => {
    const input: any = {
      ruta: { id: 1 },
      asientos: [10],
      capturaArchivo: new File([''], 'x.png')
    }

    await expect(useCase.ejecutar(input)).rejects.toThrow('Cedula del pasajero requerida')
  })
})
