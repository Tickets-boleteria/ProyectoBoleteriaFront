import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository'
import { DomainException } from '../../Domain/Exceptions/DomainException'

export interface PasajeroVentaInput {
  asientoId: number
  nombres: string
  apellidos: string
  cedula: string
  fechaNacimiento: string
  esMenor: boolean
  esDiscapacitado: boolean
  esTerceraEdad: boolean
  descuentoAplicado: number
  precioFinal: number
}

export interface VenderBoletoInput {
  usuarioVendedorId: string
  ruta: {
    id: number
    estado: string
    origen: string
    destinoFinal: string
    esDirecto: boolean
  }
  ciudadDestinoVenta: string
  paradaDestinoId?: number | null
  paradaPermiteVenta?: boolean
  metodoPago: string
  pasajeros: PasajeroVentaInput[]
}

export class VenderBoleto {
  constructor(
    private ventaRepo: IVentaRepository,
    private boletosRepo: IBoletosRepository
  ) {}

  async ejecutar(input: VenderBoletoInput) {
    if (!input.usuarioVendedorId) {
      throw new DomainException('No se encontró el usuario oficinista autenticado.')
    }

    if (!input.ruta?.id) {
      throw new DomainException('Debe seleccionar una ruta.')
    }

    const estadoRuta = String(input.ruta.estado || '').toLowerCase()

    if (estadoRuta.includes('cancel') || estadoRuta.includes('complet')) {
      throw new DomainException('No se puede vender en una ruta cancelada o completada.')
    }

    if (!input.pasajeros?.length) {
      throw new DomainException('Debe registrar al menos un pasajero.')
    }

    if (input.ruta.esDirecto && input.paradaDestinoId) {
      throw new DomainException('No se permiten paradas intermedias en una frecuencia directa.')
    }

    if (!input.ruta.esDirecto && input.paradaDestinoId && input.paradaPermiteVenta === false) {
      throw new DomainException('La parada seleccionada no permite venta de boletos.')
    }

    for (const pasajero of input.pasajeros) {
      if (!pasajero.asientoId) {
        throw new DomainException('Debe seleccionar un asiento.')
      }

      if (!pasajero.nombres?.trim() || !pasajero.apellidos?.trim()) {
        throw new DomainException('Debe ingresar nombres y apellidos del pasajero.')
      }

      if (!pasajero.cedula?.trim()) {
        throw new DomainException('Debe ingresar la cédula del pasajero.')
      }

      if (!pasajero.fechaNacimiento) {
        throw new DomainException('Debe ingresar la fecha de nacimiento del pasajero.')
      }

      const disponible = await this.boletosRepo.verificarAsientoDisponible(
        input.ruta.id,
        pasajero.asientoId
      )

      if (!disponible) {
        throw new DomainException(`El asiento ${pasajero.asientoId} ya fue vendido.`)
      }
    }

    const total = input.pasajeros.reduce(
      (acc, pasajero) => acc + Number(pasajero.precioFinal || 0),
      0
    )

    const ventaPayload: VentaPayload = {
      UsuarioVendedorId: input.usuarioVendedorId,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ciudadDestinoVenta,
      Total: total,
      Estado: 'AprobadaPago',
      MetodoPago: input.metodoPago,
      ComprobanteUrl: null,
      AprobadoPorId: input.usuarioVendedorId,
      FechaVenta: new Date().toISOString(),
    }

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload)

    const boletosPayload: BoletoPayload[] = input.pasajeros.map((pasajero) => {
      const unique = crypto.randomUUID()
      const codigoQr = `QR-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`
      const codigoBarras = `BC-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`

      return {
        VentaId: ventaId,
        AsientoId: pasajero.asientoId,
        NombresPasajero: pasajero.nombres.trim(),
        ApellidosPasajero: pasajero.apellidos.trim(),
        CedulaPasajero: pasajero.cedula.trim(),
        FechaNacimiento: pasajero.fechaNacimiento,
        EsMenor: pasajero.esMenor,
        EsDiscapacitado: pasajero.esDiscapacitado,
        EsTerceraEdad: pasajero.esTerceraEdad,
        DescuentoAplicado: pasajero.descuentoAplicado,
        PrecioFinal: pasajero.precioFinal,
        CodigoQr: codigoQr,
        CodigoBarras: codigoBarras,
        Estado: 'AprobadaPago',
        CreatedAt: new Date().toISOString(),
      }
    })

    const boletos = await this.boletosRepo.insertarBoletos(boletosPayload)

    return {
      ventaId,
      total,
      boletos,
    }
  }
}