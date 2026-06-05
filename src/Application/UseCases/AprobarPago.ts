import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository'
import { DomainException } from '../../Domain/Exceptions/DomainException'

export class AprobarPago {
  constructor(
    private ventaRepo: IVentaRepository,
    private boletosRepo: IBoletosRepository
  ) {}

  async ejecutar(ventaId: number, aprobadoPorId: string): Promise<void> {
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
      throw new DomainException('Solo se pueden aprobar ventas pendientes.')
    }

    if (!venta.ComprobanteUrl) {
      throw new DomainException('No se puede aprobar una venta sin comprobante.')
    }

    const boletos = await this.boletosRepo.obtenerBoletosPorVenta(ventaId)

    if (!boletos.length) {
      throw new DomainException('No se puede aprobar una venta sin boletos asociados.')
    }

    await this.ventaRepo.aprobarVenta(ventaId, aprobadoPorId)
    await this.boletosRepo.actualizarEstadoPorVenta(ventaId, 'Emitido')
  }
}