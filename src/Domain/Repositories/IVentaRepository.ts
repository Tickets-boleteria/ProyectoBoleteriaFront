export interface IVentaRepository {
  uploadComprobante(path: string, file: File, options?: any): Promise<{ publicUrl: string }>
  crearVenta(payload: VentaPayload): Promise<number>
  obtenerVentaPorId(ventaId: number): Promise<any | null>
  obtenerVentasPendientes(): Promise<any[]>
  aprobarVenta(ventaId: number, aprobadoPorId: string): Promise<void>
  rechazarVenta(ventaId: number, aprobadoPorId: string, observacion?: string): Promise<void>
}

export interface VentaPayload {
  UsuarioVendedorId: string | null
  RutaId: number
  CiudadOrigenVenta: string
  CiudadDestinoVenta: string
  Total: number
  Estado: string
  MetodoPago: string
  ComprobanteUrl: string | null
  AprobadoPorId: string | null
  FechaVenta: string
}