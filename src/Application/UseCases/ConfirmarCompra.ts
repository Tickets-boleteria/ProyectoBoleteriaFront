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
  capturaArchivo?: File | null
  metodoPago: 'Transferencia' | 'Tarjeta' | 'Efectivo'
  stripeId?: string
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

    let comprobanteUrl = 'PAGO_DIRECTO'
    let realMetodoPago = input.metodoPago

    // 1. Subir comprobante al bucket solo si es transferencia manual
    if (input.metodoPago === 'Transferencia' && input.capturaArchivo) {
      const extension = input.capturaArchivo.name.includes('.') 
        ? input.capturaArchivo.name.split('.').pop() 
        : 'png'
      const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${extension}`
      const uploadRes = await this.ventaRepo.uploadComprobante(filePath, input.capturaArchivo, { 
        contentType: input.capturaArchivo.type 
      })
      comprobanteUrl = uploadRes.publicUrl
    } 
    
    // Si es Tarjeta, usamos 'Transferencia' en la DB por compatibilidad con el ENUM,
    // pero guardamos el rastro en el ComprobanteUrl
    if (input.metodoPago === 'Tarjeta') {
      realMetodoPago = 'Transferencia' // Forzamos por ENUM de DB
      comprobanteUrl = `STRIPE_ID:${input.stripeId || 'STRIPE_PAYMENT'}`
    }

    // 2. Registrar la Venta
    const total = input.precioUnitario * input.asientos.length
    
    // Si ya pagó (Tarjeta o Efectivo), la venta nace como Confirmada.
    // Si es Transferencia, nace como Pendiente.
    const estadoVenta = (input.metodoPago === 'Tarjeta' || input.metodoPago === 'Efectivo') 
      ? 'Confirmada' 
      : 'Pendiente'
    
    const ventaPayload: VentaPayload = {
      UsuarioVendedorId: input.usuarioId ?? null,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ruta.destino,
      Total: total,
      Estado: estadoVenta, 
      MetodoPago: realMetodoPago,
      ComprobanteUrl: comprobanteUrl,
      AprobadoPorId: null,
      FechaVenta: new Date().toISOString(),
    }

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload)
    if (!ventaId) throw new Error('No se pudo crear el registro de venta')

    // 3. Generar los Boletos
    // En la DB el ENUM "EstadoBoleto" solo permite: Emitido, Validado, Cancelado.
    // Usamos 'Emitido' para todos los boletos nuevos.
    const estadoBoleto = 'Emitido'

    const boletosInsert: BoletoPayload[] = input.asientos.map((asientoId) => {
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
        Estado: estadoBoleto,
        CreatedAt: new Date().toISOString(),
      }
    })

    const boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert)

    // 4. Auditoría
    if (this.auditRepo && input.usuarioId) {
      try {
        await this.auditRepo.logCambio({ 
          usuarioId: String(input.usuarioId), 
          tipoCambio: 'estandar', 
          descripcion: `Compra por ${input.metodoPago}. Venta ID: ${ventaId}. Stripe: ${input.stripeId || 'N/A'}`, 
          referenciaId: ventaId 
        })
      } catch (e) { 
        console.warn('Omitiendo log de auditoría:', e) 
      }
    }

    return { 
      ventaId, 
      comprobanteUrl, 
      boletos: boletosRes 
    }
  }
}
