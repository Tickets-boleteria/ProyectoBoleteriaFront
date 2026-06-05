export interface IBoletosRepository {
  insertarBoletos(boletos: BoletoPayload[]): Promise<any>
}

export interface BoletoPayload {
  VentaId: number
  AsientoId: number
  NombresPasajero: string
  ApellidosPasajero: string
  CedulaPasajero: string
  PrecioFinal: number
  FechaNacimiento: string
  EsMenor: boolean
  EsDiscapacitado: boolean
  EsTerceraEdad: boolean
  DescuentoAplicado: number
  CodigoQr: string
  CodigoBarras: string
  Estado: string
  CreatedAt: string
}
