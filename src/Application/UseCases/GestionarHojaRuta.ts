import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { HojaRuta, GenerarHojasRutaAutomaticasDto } from '../../Domain/Entities/HojaRuta';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';

export interface ReporteGeneracion {
  rutasCreadas: number;
  frecuenciasSinBus: number;
  busesDeParada: number;
}

export class GestionarHojaRuta {
  constructor(
    private hojaRutaRepository: IHojaRutaRepository,
    private frecuenciaRepository: IFrecuenciaRepository,
    private busRepository: IBusRepository,
    private rutaRepository: IRutaRepository
  ) {}

  async generarAutomaticamente(
    dto: GenerarHojasRutaAutomaticasDto, 
    cooperativaId: number, 
    usuarioId: string
  ): Promise<{ hoja: HojaRuta; reporte: ReporteGeneracion }> {
    this.validarFecha(dto.fechaSalida);

    // 1. Obtener frecuencias activas de la cooperativa
    const todasFrecuencias = await this.frecuenciaRepository.obtenerTodas();
    const frecuenciasActivas = todasFrecuencias
      .filter(f => f.cooperativaId === cooperativaId && f.activo)
      .sort((a, b) => a.horaSalida.localeCompare(b.horaSalida));

    if (frecuenciasActivas.length === 0) {
      throw new DomainException('No hay frecuencias activas para generar la hoja de ruta.');
    }

    // 2. Obtener buses activos de la cooperativa
    const todosBuses = await this.busRepository.obtenerPorCooperativa(cooperativaId);
    const busesDisponibles = [];

    for (const bus of todosBuses) {
      if (bus.estado === 'Activo') {
        const disponible = await this.rutaRepository.verificarBusDisponible(bus.id!, dto.fechaSalida);
        if (disponible) {
          busesDisponibles.push(bus);
        }
      }
    }

    // 3. Crear la Hoja de Ruta
    const hoja = await this.hojaRutaRepository.crear({
      fecha: dto.fechaSalida,
      usuarioCreadorId: usuarioId,
      estado: 'Publicada',
      tipoGeneracion: 'Automatica',
      rutas: []
    });

    // 4. Algoritmo de asignación (Secuencial)
    let rutasCreadas = 0;
    const numAsignaciones = Math.min(frecuenciasActivas.length, busesDisponibles.length);

    for (let i = 0; i < numAsignaciones; i++) {
      const frecuencia = frecuenciasActivas[i];
      const bus = busesDisponibles[i];

      await this.rutaRepository.crearRuta({
        frecuenciaId: frecuencia.id,
        busId: bus.id!,
        fecha: dto.fechaSalida,
        estado: 'Habilitada',
        hojaRutaId: hoja.id,
        esDirecta: frecuencia.esDirecto
      } as any);
      rutasCreadas++;
    }

    return {
      hoja,
      reporte: {
        rutasCreadas,
        frecuenciasSinBus: Math.max(0, frecuenciasActivas.length - busesDisponibles.length),
        busesDeParada: Math.max(0, busesDisponibles.length - frecuenciasActivas.length)
      }
    };
  }

  async listarPorFecha(fecha: string): Promise<HojaRuta[]> {
    this.validarFecha(fecha);
    return this.hojaRutaRepository.obtenerPorFecha(fecha);
  }

  async crearHojaDia(fecha: string, usuarioCreadorId: string): Promise<HojaRuta> {
    this.validarFecha(fecha);
    const existentes = await this.hojaRutaRepository.obtenerPorFecha(fecha);
    if (existentes.length > 0) return existentes[0];

    return this.hojaRutaRepository.crear({
      fecha,
      usuarioCreadorId,
      estado: 'Borrador',
      tipoGeneracion: 'Manual',
      rutas: []
    });
    }

    async iniciarRuta(id: number): Promise<void> {
    await this.hojaRutaRepository.actualizarEstado(id, 'Publicada');
    }

    async finalizarRuta(id: number): Promise<void> {
    // 1. Actualizar estado de la hoja
    await this.hojaRutaRepository.actualizarEstado(id, 'Cerrada');

    // 2. Opcional: Podríamos actualizar todas las rutas asociadas aquí, 
    // pero usualmente las rutas se van completando una a una.
    // Por integridad, forzamos el cierre de las rutas de esta hoja que sigan abiertas.
    const hoja = await this.hojaRutaRepository.obtenerPorId(id);
    if (hoja && hoja.rutas) {
      const { supabase } = await import('../../Infrastructure/Api/supabaseClient');
      await supabase
        .from('Rutas')
        .update({ Estado: 'Completada' })
        .eq('HojaRutaId', id)
        .in('Estado', ['Programada', 'Habilitada', 'EnCurso']);
    }
    }

    async cancelarRuta(id: number): Promise<void> {
    await this.hojaRutaRepository.actualizarEstado(id, 'Cerrada');

    
    const hoja = await this.hojaRutaRepository.obtenerPorId(id);
    if (hoja && hoja.rutas) {
      const { supabase } = await import('../../Infrastructure/Api/supabaseClient');
      await supabase
        .from('Rutas')
        .update({ Estado: 'Cancelada' })
        .eq('HojaRutaId', id)
        .neq('Estado', 'Completada');
    }
  }

  private validarFecha(fechaSalida: string): void {
    if (!fechaSalida || Number.isNaN(Date.parse(fechaSalida))) {
      throw new DomainException('La fecha de salida es obligatoria y debe ser válida');
    }
  }

  private async obtenerNombresParadas(frecuencia: Frecuencia): Promise<string[]> {
    if (frecuencia.esDirecto) return [];

    const paradas = await this.frecuenciaRepository.obtenerParadasPorFrecuencia(frecuencia.id);
    return paradas
      .sort((a, b) => a.orden - b.orden)
      .map((parada) => parada.ciudad);
  }
}
