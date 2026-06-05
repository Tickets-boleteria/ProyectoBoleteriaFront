import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository'
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository'

export type ConfirmInput = {
  ruta: {
    id: number
    origen: string
    destino: string
  }
  asientos: number[] // IDs de los asientos
  precioUnitario: number
  capturaArchivo: File
  nombres: string
  apellidos: string
  cedula: string
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
    if (!input.cedula) throw new Error('Cédula del pasajero requerida')

    // 1. Subir comprobante al bucket
    const extension = input.capturaArchivo.name.includes('.') 
      ? input.capturaArchivo.name.split('.').pop() 
      : 'png'
    const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const uploadRes = await this.ventaRepo.uploadComprobante(filePath, input.capturaArchivo, { 
      contentType: input.capturaArchivo.type 
    })

    // 2. Registrar la Venta (Estado inicial: Pendiente)
    const total = input.precioUnitario * input.asientos.length
    const ventaPayload: VentaPayload = {
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
    if (!ventaId) throw new Error('No se pudo crear el registro de venta')

    // 3. Generar los Boletos (Estado inicial: Pendiente)
    const boletosInsert: BoletoPayload[] = input.asientos.map((asientoId, idx) => {
      // Formato de QR oficial: QR-R{RutaId}-V{VentaId}-A{AsientoId}-{Unique}
      const uniqueSuffix = Math.random().toString(36).substring(2, 7)
      const qrCode = `QR-R${input.ruta.id}-V${ventaId}-A${asientoId}-${uniqueSuffix}`
      const barcode = `BC-R${input.ruta.id}-V${ventaId}-A${asientoId}-${uniqueSuffix}`

      return {
        VentaId: ventaId,
        AsientoId: asientoId,
        NombresPasajero: input.nombres,
        ApellidosPasajero: input.apellidos,
        CedulaPasajero: input.cedula,
        PrecioFinal: input.precioUnitario,
        FechaNacimiento: input.fechaNacimiento,
        EsMenor: false,
        EsDiscapacitado: false,
        EsTerceraEdad: false,
        DescuentoAplicado: 0,
        CodigoQr: qrCode,
        CodigoBarras: barcode,
        Estado: 'Emitido',
        CreatedAt: new Date().toISOString(),
      }
    })

    const boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert)

    // 4. Auditoría (Opcional)
    if (this.auditRepo && input.usuarioId) {
      try {
        await this.auditRepo.logCambio({ 
          usuarioId: String(input.usuarioId), 
          tipoCambio: 'estandar', 
          descripcion: `Nueva compra pendiente por transferencia. Venta ID: ${ventaId}`, 
          referenciaId: ventaId 
        })
      } catch (e) { 
        console.warn('Omitiendo log de auditoría:', e) 
      }
    }

    return { 
      ventaId, 
      comprobanteUrl: uploadRes.publicUrl, 
      boletos: boletosRes 
    }
  }
}
