export interface IVentaRepository {
  uploadComprobante(path: string, file: File, options?: any): Promise<{ publicUrl: string }>
  crearVenta(payload: VentaPayload): Promise<number>
}

export interface VentaPayload {
  UsuarioVendedorId: string | number | null
  RutaId: number
  CiudadOrigenVenta: string
  CiudadDestinoVenta: string
  Total: number
  Estado: string
  MetodoPago: string
  ComprobanteUrl: string
  AprobadoPorId: string | null
  FechaVenta: string
}
