import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'
import { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository'
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository'
import { calcularDescuentoBoleto } from '../../Domain/Constants/EstadosSistema'
import { sendEmail } from '../../utils/email'
import { supabase } from '../../Infrastructure/Api/supabaseClient'

export type ConfirmInput = {
  ruta: {
    id: number
    origen: string
    destino: string
    fecha?: string
    hora?: string
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
    if (!input.ruta) throw new Error('Ruta requerida')
    if (!input.asientos || !input.asientos.length) throw new Error('Debe seleccionar al menos un asiento')
    if (!input.cedula?.trim()) throw new Error('Cedula del pasajero requerida')
    if (!input.nombres?.trim()) throw new Error('Nombres del pasajero requeridos')
    if (!input.apellidos?.trim()) throw new Error('Apellidos del pasajero requeridos')
    if (!input.fechaNacimiento?.trim()) throw new Error('Fecha de nacimiento requerida')
    if (!input.metodoPago) throw new Error('Metodo de pago requerido')
    if (input.precioUnitario <= 0) throw new Error('El precio del asiento no es valido')

    if (input.metodoPago === 'Transferencia' && !input.capturaArchivo) {
      throw new Error('Debe adjuntar el comprobante de pago para Transferencia.')
    }

    for (const asientoId of input.asientos) {
      const disponible = await this.boletosRepo.verificarAsientoDisponible(input.ruta.id, asientoId)
      if (!disponible) {
        throw new Error('Uno de los asientos seleccionados ya no esta disponible. Vuelve a buscar la ruta.')
      }
    }

    let comprobanteUrl = 'PAGO_DIRECTO'
    let realMetodoPago: string = input.metodoPago

    if (input.metodoPago === 'Transferencia' && input.capturaArchivo) {
      const file = input.capturaArchivo
      const filePath = `${input.usuarioId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}`
      try {
        const uploadRes = await this.ventaRepo.uploadComprobante(filePath, file, {
          contentType: file.type,
        })
        comprobanteUrl = uploadRes.publicUrl
      } catch (e: any) {
        throw new Error('No se pudo subir el comprobante: ' + (e?.message || 'error desconocido'))
      }
    }

    if (input.metodoPago === 'Tarjeta') {
      realMetodoPago = 'Transferencia'
      comprobanteUrl = `STRIPE_ID:${input.stripeId || 'STRIPE_PAYMENT'}`
    }

    const descuento = calcularDescuentoBoleto(
      input.fechaNacimiento,
      !!input.tieneDiscapacidad,
      input.precioUnitario,
    )
    const total = Number((descuento.precioFinal * input.asientos.length).toFixed(2))

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

    const boletosInsert: BoletoPayload[] = input.asientos.map((asientoId) => {
      const unique = crypto.randomUUID()
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
        CodigoQr: `QR-${unique}`,
        CodigoBarras: `BC-${unique}`,
        Estado: 'Emitido',
        CreatedAt: new Date().toISOString(),
      }
    })

    let boletosRes: any[] = []
    try {
      boletosRes = await this.boletosRepo.insertarBoletos(boletosInsert)
    } catch (e: any) {
      throw new Error('No se pudieron generar los boletos: ' + (e?.message || ''))
    }

    if (this.auditRepo && input.usuarioId) {
      await this.auditRepo.logCambio({
        usuarioId: String(input.usuarioId),
        tipoCambio: 'estandar',
        descripcion: `Compra por ${input.metodoPago}. Venta ID: ${ventaId}`,
        referenciaId: ventaId,
      }).catch(console.warn)
    }

    // Notificación por Email
    try {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <h1 style="color: #2563eb;">¡Tu boleto está listo! 🎉</h1>
          <p>Hola <strong>${input.nombres}</strong>, gracias por confiar en nosotros.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
            <p><strong>Ruta:</strong> ${input.ruta.origen} → ${input.ruta.destino}</p>
            <p><strong>Fecha:</strong> ${input.ruta.fecha || 'N/D'} · ${input.ruta.hora || 'N/D'}</p>
            <p><strong>Asientos:</strong> ${input.asientos.length} reservados</p>
            <p><strong>Total:</strong> $${total.toFixed(2)}</p>
            <p><strong>Estado:</strong> ${estadoVenta.toUpperCase()}</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Este es un comprobante automático. Puedes descargar tu boleto QR desde la sección "Mis Boletos" en la aplicación.</p>
        </div>
      `;
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.email) {
        await sendEmail({
          to: userData.user.email,
          subject: `Confirmación de Viaje: ${input.ruta.origen} a ${input.ruta.destino}`,
          html: emailHtml
        });
      }
    } catch (emailErr) {
      console.error('Error enviando correo:', emailErr);
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
