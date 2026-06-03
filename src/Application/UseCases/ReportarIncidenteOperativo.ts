import { Bus } from '../../Domain/Entities/Bus';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { ReportarIncidenteOperativoDto } from '../Dtos/ReportarIncidenteOperativoDto';

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
    requiereConfirmacion: boolean;
    mensaje: string;
  };
}

export class ReportarIncidenteOperativo {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(input: ReportarIncidenteOperativoDto): Promise<ReportarIncidenteOperativoResponse> {
    const { busNumero, motivo, descripcion, replacementBusNumero, reportadoPor } = input;

    // Obtener bus actual
    const busActual = await this.busRepository.obtenerPorNumero(busNumero.trim());
    if (!busActual) {
      throw new BusNoEncontradoException(String(busNumero));
    }

    // Validar que el motivo sea válido (catálogo)
    const motivosValidos = ['AveriaMecanica', 'Accidente', 'ReparacionProgramada', 'Otro'];
    if (!motivosValidos.includes(motivo)) {
      throw new Error(`Motivo inválido: ${motivo}. Debe ser uno de: ${motivosValidos.join(', ')}`);
    }

    // Si se proporciona replacement, validar que sea válido y diferente
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

    // Marcar bus como Fuera de Servicio
    const busActualizado = await this.busRepository.marcarFueraDeServicio(
      Number(busActual.id),
      motivo,
      descripcion,
      busReemplazo?.id,
      reportadoPor
    );

    // Obtener rutas afectadas (programadas y futuras)
    const rutasAfectadas = await this.busRepository.obtenerRutasAfectadas(Number(busActual.id));

    // Generar ID único para el incidente (puede ser timestamp + busId para auditoría)
    const incidenteId = `INC-${busActual.id}-${Date.now()}`;

    return {
      success: true,
      incidenteId,
      busActualizado: {
        id: busActual.id,
        numero: busActual.numero,
        estado: 'EnMantenimiento',
      },
      rutasAfectadas,
      acciones: {
        reemplazoPosible: Boolean(busReemplazo),
        busReemplazoSugerido: busReemplazo
          ? { id: busReemplazo.id ?? 0, numero: busReemplazo.numero }
          : undefined,
        requiereConfirmacion: rutasAfectadas > 0,
        mensaje: `Bus ${busActual.numero} marcado como En mantenimiento. Motivo: ${motivo}. Operaciones ha sido notificada. ${rutasAfectadas} ruta(s) requieren atención.`,
      },
    };
  }
}
