export interface IVentaRepository {
  uploadComprobante(path: string, file: File, options?: any): Promise<{ publicUrl: string }>
  crearVenta(payload: any): Promise<number>
}
