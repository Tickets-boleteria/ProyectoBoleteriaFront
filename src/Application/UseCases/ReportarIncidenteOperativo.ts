import { Bus } from '../../Domain/Entities/Bus';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import { ReportarIncidenteOperativoDto } from '../Dtos/ReportarIncidenteOperativoDto';
import { Ruta } from '../../Domain/Entities/Ruta';
import { sendEmail } from '../../utils/email';

export interface ReportarIncidenteOperativoResponse {
  success: boolean;
  incidenteId?: string;
  busActualizado: {
    id: number;
    numero: string;
    estado: string;
  };
  rutasAfectadas: number;
  acciones: {
    reemplazoPosible: boolean;
    busReemplazoSugerido?: { id: number; numero: string };
    nuevaRutaId?: number;
    requiereConfirmacion: boolean;
    mensaje: string;
  };
}

export class ReportarIncidenteOperativo {
  constructor(
    private busRepository: IBusRepository,
    private rutaRepository: IRutaRepository,
    private ventaRepository: IVentaRepository
  ) {}

  async ejecutar(input: ReportarIncidenteOperativoDto): Promise<ReportarIncidenteOperativoResponse> {
    const { busNumero, motivo, descripcion, replacementBusNumero, reportadoPor } = input;

    // 1. Obtener bus actual
    const busActual = await this.busRepository.obtenerPorNumero(busNumero.trim());
    if (!busActual) {
      throw new BusNoEncontradoException(String(busNumero));
    }

    // 2. Validar que el motivo sea válido
    const motivosValidos = ['AveriaMecanica', 'Accidente', 'ReparacionProgramada', 'Otro'];
    if (!motivosValidos.includes(motivo)) {
      throw new Error(`Motivo inválido: ${motivo}. Debe ser uno de: ${motivosValidos.join(', ')}`);
    }

    // 3. Validar bus de reemplazo si se proporciona
    let busReemplazo: Bus | null = null;
    if (replacementBusNumero && replacementBusNumero.trim()) {
      busReemplazo = await this.busRepository.obtenerPorNumero(replacementBusNumero.trim());
      if (!busReemplazo) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'Bus no encontrado');
      }
      if (busReemplazo.estado === 'EnMantenimiento' || busReemplazo.estado === 'Inactivo') {
        throw new BusReemplazoNoValidoException(replacementBusNumero, `El bus está en estado ${busReemplazo.estado}`);
      }
      if (busReemplazo.id === busActual.id) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'No puedes usar el mismo bus como reemplazo');
      }
    }

    // 4. Marcar bus como Fuera de Servicio
    await this.busRepository.marcarFueraDeServicio(
      Number(busActual.id),
      motivo,
      descripcion,
      busReemplazo?.id,
      reportadoPor
    );

    // 5. Gestión de Ruta "En Curso" (Transbordo)
    const rutaActiva = await this.rutaRepository.obtenerRutaActivaPorBus(Number(busActual.id));
    let nuevaRutaId: number | undefined;
    let mensajeExtra = '';

    if (rutaActiva) {
      // Marcar ruta original como incidente/cancelada
      await this.rutaRepository.actualizarEstado(rutaActiva.id!, 'Cancelada');
      
      const { supabase } = await import('../../Infrastructure/Api/supabaseClient');
      await supabase
        .from('Rutas')
        .update({ 
          ObservacionChofer: `🚨 INCIDENTE: ${motivo}. ${descripcion || ''}`.trim() 
        })
        .eq('Id', rutaActiva.id);
      
      // Si hay reemplazo, crear nueva ruta y migrar ventas
      if (busReemplazo) {
        const nuevaRuta = new Ruta(
          rutaActiva.frecuenciaId,
          busReemplazo.id!,
          rutaActiva.fecha,
          'EnCurso',
          undefined,
          rutaActiva.choferId,
          rutaActiva.horaSalida,
          null,
          `🔄 Transbordo desde unidad ${busActual.numero} por incidente.`,
          undefined,
          rutaActiva.hojaRutaId,
          rutaActiva.esDirecta,
          true
        );

        const rutaCreada = await this.rutaRepository.crearRuta(nuevaRuta);
        nuevaRutaId = rutaCreada.id;

        await this.ventaRepository.migrarVentasARuta(rutaActiva.id!, rutaCreada.id!);
        mensajeExtra = ` Se ha generado un transbordo automático a la unidad ${busReemplazo.numero} y se han migrado los pasajeros.`;
      } else {
        mensajeExtra = ` El viaje en curso ha sido cancelado.`;
      }
    }

    // 6. Obtener conteo de otras rutas afectadas
    const rutasAfectadas = await this.busRepository.obtenerRutasAfectadas(Number(busActual.id));

    const incidenteId = `INC-${busActual.id}-${Date.now()}`;

    // Enviar notificación de incidente por email
    try {
      await sendEmail({
        to: 'soporte@boleteria.com.ec',
        subject: `INCIDENTE OPERATIVO: Bus ${busActual.numero}`,
        html: `
          <div style="font-family: sans-serif; border: 2px solid #ef4444; border-radius: 16px; padding: 24px;">
            <h2 style="color: #ef4444;">🚨 Reporte de Incidente</h2>
            <p>Se ha reportado un incidente que pone al bus fuera de servicio.</p>
            <ul>
              <li><strong>Bus:</strong> ${busActual.numero} (Placa: ${busActual.placa})</li>
              <li><strong>Motivo:</strong> ${input.motivo}</li>
              <li><strong>Descripción:</strong> ${input.descripcion || 'Sin detalle'}</li>
              <li><strong>Reportado por:</strong> ${input.reportadoPor || 'Personal de bus'}</li>
              <li><strong>Acción tomada:</strong> En mantenimiento.</li>
            </ul>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Error enviando email de incidente:', emailErr);
    }

    return {
      success: true,
      incidenteId,
      busActualizado: {
        id: busActual.id!,
        numero: busActual.numero,
        estado: 'EnMantenimiento',
      },
      rutasAfectadas,
      acciones: {
        reemplazoPosible: Boolean(busReemplazo),
        busReemplazoSugerido: busReemplazo
          ? { id: busReemplazo.id!, numero: busReemplazo.numero }
          : undefined,
        nuevaRutaId,
        requiereConfirmacion: rutasAfectadas > 0,
        mensaje: `Bus ${busActual.numero} marcado como En mantenimiento.${mensajeExtra} ${rutasAfectadas} ruta(s) futuras requieren atención.`,
      },
    };
  }
}
