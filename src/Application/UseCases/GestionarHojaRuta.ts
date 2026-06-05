import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { CrearHojaRutaManualDto, GenerarHojasRutaAutomaticasDto, HojaRuta } from '../../Domain/Entities/HojaRuta';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { IHojaRutaRepository } from '../../Domain/Repositories/IHojaRutaRepository';

export class GestionarHojaRuta {
  constructor(
    private hojaRutaRepository: IHojaRutaRepository,
    private frecuenciaRepository: IFrecuenciaRepository
  ) {}

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
