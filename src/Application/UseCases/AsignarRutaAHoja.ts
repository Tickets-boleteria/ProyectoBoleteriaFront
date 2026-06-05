import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';

export interface AsignarRutaInput {
  busId: number;
  frecuenciaId: number;
  fecha: string;
  usuarioCreadorId: string;
}

export class AsignarRutaAHoja {
  constructor(
    private hojaRutaRepo: IHojaRutaRepository,
    private rutaRepo: IRutaRepository,
    private frecuenciaRepo: IFrecuenciaRepository
  ) {}

  async ejecutar(input: AsignarRutaInput): Promise<{ success: boolean; error?: string }> {
    const { busId, frecuenciaId, fecha, usuarioCreadorId } = input;

    // 1. Obtener la frecuencia
    const frecuencia = await this.frecuenciaRepo.obtenerPorId(frecuenciaId);
    if (!frecuencia) {
      return { success: false, error: 'Frecuencia no encontrada' };
    }

    // 2. Obtener o crear la hoja de ruta global para el día
    const hojas = await this.hojaRutaRepo.obtenerPorFecha(fecha);
    let hojaRuta = hojas.length > 0 ? hojas[0] : null;
    
    if (!hojaRuta) {
      hojaRuta = await this.hojaRutaRepo.crear({
        fecha: fecha,
        usuarioCreadorId: usuarioCreadorId,
        estado: 'Borrador',
        tipoGeneracion: 'Manual',
        rutas: []
      });
    }


    // 3. Validar solapamiento PER BUS
    // Buscamos solo las rutas del bus específico en esta hoja de ruta
    const DURACION_ESTIMADA_MS = 3 * 60 * 60 * 1000; 
    
    const nuevaHoraInicio = this.parseHora(frecuencia.horaSalida);
    const nuevaHoraFin = nuevaHoraInicio + DURACION_ESTIMADA_MS;

    if (hojaRuta.rutas) {
      const rutasDelBus = hojaRuta.rutas.filter(r => r.busId === busId);
      
      for (const rutaExistente of rutasDelBus) {
        if (!rutaExistente.horaSalida) continue;

        const existenteInicio = this.parseHora(rutaExistente.horaSalida);
        const existenteFin = rutaExistente.horaLlegada 
          ? this.parseHora(rutaExistente.horaLlegada) 
          : existenteInicio + DURACION_ESTIMADA_MS;

        // Verificar solapamiento
        if (
          (nuevaHoraInicio >= existenteInicio && nuevaHoraInicio < existenteFin) ||
          (nuevaHoraFin > existenteInicio && nuevaHoraFin <= existenteFin) ||
          (nuevaHoraInicio <= existenteInicio && nuevaHoraFin >= existenteFin)
        ) {
          return { success: false, error: `El bus ${busId} ya tiene un trayecto que se solapa con este horario.` };
        }
      }
    }

    // 4. Crear la nueva ruta
    const nuevaRuta = new Ruta(
      frecuenciaId,
      busId,
      fecha,
      'Programada',
      undefined,
      undefined,
      frecuencia.horaSalida,
      null,
      null,
      undefined,
      hojaRuta.id,
      frecuencia.esDirecto
    );

    await this.rutaRepo.crearRuta(nuevaRuta);

    return { success: true };
  }

  private parseHora(horaStr: string): number {
    const [horas, minutos] = horaStr.split(':').map(Number);
    return horas * 60 * 60 * 1000 + minutos * 60 * 1000;
  }
}
