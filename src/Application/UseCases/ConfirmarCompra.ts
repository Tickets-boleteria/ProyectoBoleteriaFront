import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository'
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository'
import { calcularDescuentoBoleto } from '../../Domain/Constants/EstadosSistema'

export type ConfirmInput = {
  ruta: {
    id: number
    origen: string
    destino: string
  }
  asientos: number[] // IDs de los asientos
  precioUnitario: number
  capturaArchivo?: File | null
  // En la UI el cliente puede elegir Tarjeta (Stripe). En la base se mapea a un
  // valor valido del ENUM (Transferencia) guardando el rastro en ComprobanteUrl.
  metodoPago: 'Transferencia' | 'Tarjeta' | 'Efectivo'
  stripeId?: string
  nombres: string
  apellidos: string
  cedula: string
  fechaNacimiento: string
  tieneDiscapacidad?: boolean
  usuarioId?: string | number | null
}

export class ConfirmarCompra {
  constructor(
    private ventaRepo: IVentaRepository,
    private boletosRepo: IBoletosRepository,
    private auditRepo?: IAuditRepository,
  ) {}

  async ejecutar(input: ConfirmInput) {
    // ---- Validaciones de negocio ----
    if (!input.ruta) throw new Error('Ruta requerida')
    if (!input.asientos || !input.asientos.length) throw new Error('Debe seleccionar al menos un asiento')
    if (!input.cedula?.trim()) throw new Error('Cedula del pasajero requerida')
    if (!input.nombres?.trim()) throw new Error('Nombres del pasajero requeridos')
    if (!input.apellidos?.trim()) throw new Error('Apellidos del pasajero requeridos')
    if (!input.fechaNacimiento?.trim()) throw new Error('Fecha de nacimiento requerida')
    if (!input.metodoPago) throw new Error('Metodo de pago requerido')
    if (input.precioUnitario <= 0) throw new Error('El precio del asiento no es valido')

    // El comprobante (captura) es obligatorio solo para Transferencia manual.
    if (input.metodoPago === 'Transferencia' && !input.capturaArchivo) {
      throw new Error('Debe adjuntar el comprobante de pago para Transferencia.')
    }

    // ---- Verificar disponibilidad de cada asiento JUSTO antes de insertar ----
    // (evita doble venta si alguien compro el mismo asiento mientras tanto)
    for (const asientoId of input.asientos) {
      const disponible = await this.boletosRepo.verificarAsientoDisponible(input.ruta.id, asientoId)
      if (!disponible) {
        throw new Error('Uno de los asientos seleccionados ya no esta disponible. Vuelve a buscar la ruta.')
      }
    }

    // ---- 1. Resolver comprobante / metodo segun la forma de pago ----
    let comprobanteUrl = 'PAGO_DIRECTO'
    let realMetodoPago: string = input.metodoPago

    if (input.metodoPago === 'Transferencia' && input.capturaArchivo) {
      const file = input.capturaArchivo
      const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
      if (file.type && !tiposPermitidos.includes(file.type)) {
        throw new Error('El comprobante debe ser una imagen (PNG/JPG/WEBP) o un PDF.')
      }
      const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
      if (file.size > MAX_BYTES) {
        throw new Error('El comprobante supera el tamano maximo permitido (5 MB).')
      }

      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'png'
      const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${extension}`
      try {
        const uploadRes = await this.ventaRepo.uploadComprobante(filePath, file, {
          contentType: file.type,
        })
        comprobanteUrl = uploadRes.publicUrl
      } catch (e: any) {
        throw new Error('No se pudo subir el comprobante: ' + (e?.message || 'error desconocido'))
      }
    }

    // Tarjeta (Stripe): el ENUM de la DB no tiene "Tarjeta", se fuerza a
    // 'Transferencia' y se guarda el rastro del pago en ComprobanteUrl.
    if (input.metodoPago === 'Tarjeta') {
      realMetodoPago = 'Transferencia'
      comprobanteUrl = `STRIPE_ID:${input.stripeId || 'STRIPE_PAYMENT'}`
    }

    // ---- 2. Calcular descuento (regla unica) y total ----
    const descuento = calcularDescuentoBoleto(
      input.fechaNacimiento,
      !!input.tieneDiscapacidad,
      input.precioUnitario,
    )
    const total = Number((descuento.precioFinal * input.asientos.length).toFixed(2))

    // ---- 3. Crear la Venta ----
    // Si ya pago (Tarjeta o Efectivo), la venta nace Confirmada.
    // Si es Transferencia, nace Pendiente (la valida el oficinista).
    const estadoVenta =
      input.metodoPago === 'Tarjeta' || input.metodoPago === 'Efectivo'
        ? 'Confirmada'
        : 'Pendiente'

    const ventaPayload: VentaPayload = {
      UsuarioVendedorId: input.usuarioId != null ? String(input.usuarioId) : null,
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

    // ---- 4. Generar los Boletos (Estado 'Emitido' - unico valido al crear) ----
    const boletosInsert: BoletoPayload[] = input.asientos.map((asientoId) => {
      const unique = crypto.randomUUID()
      const qrCode = `QR-R${input.ruta.id}-V${ventaId}-A${asientoId}-${unique}`
      const barcode = `BC-R${input.ruta.id}-V${ventaId}-A${asientoId}-${unique}`

      return {
        VentaId: ventaId,
        AsientoId: asientoId,
        NombresPasajero: input.nombres.trim(),
        ApellidosPasajero: input.apellidos.trim(),
        CedulaPasajero: input.cedula.trim(),
        FechaNacimiento: input.fechaNacimiento,
        EsMenor: descuento.esMenor,
        EsDiscapacitado: descuento.esDiscapacitado,
        EsTerceraEdad: descuento.esTerceraEdad,
        DescuentoAplicado: descuento.descuentoAplicado,
        PrecioFinal: descuento.precioFinal,
        CodigoQr: qrCode,
        CodigoBarras: barcode,
        Estado: 'Emitido',
        CreatedAt: new Date().toISOString(),
      }
    })

    let boletosRes: any[] = []
    try {
      boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert)
    } catch (e: any) {
      // ---- Rollback logico: si fallan los boletos, cancelar la venta ----
      try {
        if (typeof (this.ventaRepo as any).cancelarVenta === 'function') {
          await (this.ventaRepo as any).cancelarVenta(ventaId)
        }
      } catch {
        /* no romper el flujo del rollback */
      }
      throw new Error('No se pudieron generar los boletos. La compra fue revertida: ' + (e?.message || ''))
    }

    // ---- 5. Auditoria (opcional, no bloqueante) ----
    if (this.auditRepo && input.usuarioId) {
      try {
        await this.auditRepo.logCambio({
          usuarioId: String(input.usuarioId),
          tipoCambio: 'estandar',
          descripcion: `Compra por ${input.metodoPago}. Venta ID: ${ventaId}. Stripe: ${input.stripeId || 'N/A'}`,
          referenciaId: ventaId,
        })
      } catch (e) {
        console.warn('Omitiendo log de auditoria:', e)
      }
    }

    return {
      ventaId,
      comprobanteUrl,
      total,
      descuento,
      boletos: boletosRes,
    }
  }
}