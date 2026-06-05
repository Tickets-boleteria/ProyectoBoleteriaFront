import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository'
import { DomainException } from '../../Domain/Exceptions/DomainException'

export class RechazarPago {
  constructor(
    private ventaRepo: IVentaRepository,
    private boletosRepo: IBoletosRepository
  ) {}

  async ejecutar(
    ventaId: number,
    aprobadoPorId: string,
    observacion?: string
  ): Promise<void> {
    if (!ventaId) {
      throw new DomainException('Debe seleccionar una venta.')
    }

    if (!aprobadoPorId) {
      throw new DomainException('No se encontró el usuario oficinista autenticado.')
    }

    const venta = await this.ventaRepo.obtenerVentaPorId(ventaId)

    if (!venta) {
      throw new DomainException('La venta no existe.')
    }

    if (venta.Estado !== 'Pendiente') {
      throw new DomainException('Solo se pueden rechazar ventas pendientes.')
    }

    await this.ventaRepo.rechazarVenta(ventaId, aprobadoPorId, observacion)
    await this.boletosRepo.actualizarEstadoPorVenta(ventaId, 'Cancelado')
  }
}