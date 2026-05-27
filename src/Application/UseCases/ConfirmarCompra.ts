import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository'
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository'

export type ConfirmInput = {
  ruta: any
  asientos: string[]
  precioUnitario: number
  capturaArchivo: File
  nombres: string
  apellidos: string
  fechaNacimiento: string
  usuarioId?: string | number
}

export class ConfirmarCompra {
  constructor(
    private ventaRepo: IVentaRepository,
    private boletosRepo: IBoletosRepository,
    private auditRepo?: IAuditRepository,
  ) {}

  async ejecutar(input: ConfirmInput) {
    if (!input.ruta) throw new Error('Ruta requerida')
    if (!input.asientos || !input.asientos.length) throw new Error('Asientos requeridos')

    // subir comprobante
    const extension = input.capturaArchivo.name.includes('.') ? input.capturaArchivo.name.split('.').pop() : 'png'
    const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const uploadRes = await this.ventaRepo.uploadComprobante(filePath, input.capturaArchivo, { contentType: input.capturaArchivo.type })

    const total = input.precioUnitario * input.asientos.length
    const ventaPayload: any = {
      UsuarioVendedorId: input.usuarioId ?? null,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ruta.destino,
      Total: total,
      Estado: 'Pendiente',
      MetodoPago: 'Transferencia',
      ComprobanteUrl: uploadRes.publicUrl,
      AprobadoPorId: null,
      FechaVenta: new Date().toISOString(),
    }

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload)
    if (!ventaId) throw new Error('No se pudo crear la venta')

    // mapear asientos: la lógica para resolver IDs queda en la capa de infraestructura en el repo de boletos
    // Aquí asumimos que quien llama ya proporcionó AsientoIds o que se resuelven antes.
    const boletosInsert = input.asientos.map((a, idx) => ({
      VentaId: ventaId,
      AsientoId: Number(a), // caller should pass asiento IDs (best practice)
      NombresPasajero: input.nombres,
      ApellidosPasajero: input.apellidos,
      PrecioFinal: input.precioUnitario,
      CedulaPasajero: '',
      FechaNacimiento: input.fechaNacimiento,
      EsMenor: false,
      EsDiscapacitado: false,
      EsTerceraEdad: false,
      DescuentoAplicado: 0,
      CodigoQr: `QR-${ventaId}-${idx}-${Date.now().toString(36)}`,
      CodigoBarras: `BC-${ventaId}-${idx}-${Date.now().toString(36)}`,
      CreatedAt: new Date().toISOString(),
    }))

    const boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert)

    // auditoría opcional
    if (this.auditRepo) {
      try {
        await this.auditRepo.logCambio({ usuarioId: String(input.usuarioId), tipoCambio: 'estandar', descripcion: `Venta pendiente ${ventaId}`, referenciaId: ventaId })
      } catch (e) { console.warn('No se pudo registrar auditoría:', e) }
    }

    return { ventaId, comprobanteUrl: uploadRes.publicUrl, boletos: boletosRes }
  }
}
