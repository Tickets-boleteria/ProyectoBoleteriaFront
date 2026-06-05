export interface IBoletosRepository {
  insertarBoletos(boletos: BoletoPayload[]): Promise<any[]>
  actualizarEstadoPorVenta(ventaId: number, estado: string): Promise<void>
  obtenerBoletosPorVenta(ventaId: number): Promise<any[]>
  verificarAsientoDisponible(rutaId: number, asientoId: number): Promise<boolean>
  obtenerAsientosDisponiblesPorRuta(rutaId: number): Promise<any[]>

  buscarBoletoParaValidacion?(
    codigo: string
  ): Promise<any | null>

  validarBoletoAbordaje?(
    params: ValidarBoletoAbordajeParams
  ): Promise<ResultadoValidacionBoleto>

  registrarValidacionBoleto?(
    payload: RegistroValidacionBoletoPayload
  ): Promise<void>
}

export interface BoletoPayload {
  VentaId: number
  AsientoId: number
  NombresPasajero: string
  ApellidosPasajero: string
  CedulaPasajero: string
  FechaNacimiento: string
  EsMenor: boolean
  EsDiscapacitado: boolean
  EsTerceraEdad: boolean
  DescuentoAplicado: number
  PrecioFinal: number
  CodigoQr: string
  CodigoBarras: string
  Estado: string
  CreatedAt: string
}

export interface ValidarBoletoAbordajeParams {
  codigo: string
  rutaActual: any
  usuarioValidadorId: string | number
  dispositivo?: string
}

export interface ResultadoValidacionBoleto {
  ok: boolean
  mensaje: string
  boleto?: any
  pasajero?: {
    nombre: string
    cedula: string
    asiento: string
    origen: string
    destino: string
    bus: string
    ruta: string
  }
}

export interface RegistroValidacionBoletoPayload {
  BoletoId?: number | null
  UsuarioValidadorId?: string | number | null
  FechaValidacion: string
  Dispositivo?: string | null
  Resultado: string
}