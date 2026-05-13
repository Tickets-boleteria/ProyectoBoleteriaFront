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

  async generarAutomaticas(dto: GenerarHojasRutaAutomaticasDto): Promise<HojaRuta[]> {
    this.validarFecha(dto.fechaSalida);

    const frecuenciasActivas = await this.frecuenciaRepository.getFrecuenciasActivas();
    const hojasCreadas: HojaRuta[] = [];

    for (const frecuencia of frecuenciasActivas) {
      const existente = await this.hojaRutaRepository.obtenerPorFrecuenciaYFecha(
        frecuencia.id,
        dto.fechaSalida
      );

      if (existente) continue;

      const paradas = await this.obtenerNombresParadas(frecuencia);

      const hoja = await this.hojaRutaRepository.crear({
        frecuenciaId: frecuencia.id,
        busId: null,
        choferId: null,
        fechaSalida: dto.fechaSalida,
        horaSalida: frecuencia.hora,
        origen: frecuencia.origen,
        destino: frecuencia.destino,
        paradas,
        estado: 'PROGRAMADA',
        tipoGeneracion: 'AUTOMATICA',
        observaciones: 'Generada automáticamente desde frecuencia activa',
      });

      hojasCreadas.push(hoja);
    }

    return hojasCreadas;
  }

  async crearManual(dto: CrearHojaRutaManualDto): Promise<HojaRuta> {
    this.validarFecha(dto.fechaSalida);

    const frecuencia = await this.frecuenciaRepository.getFrecuenciaById(dto.frecuenciaId);
    if (!frecuencia) {
      throw new DomainException('No existe la frecuencia seleccionada');
    }

    if (!frecuencia.activa) {
      throw new DomainException('No se puede generar hoja de ruta para una frecuencia inactiva');
    }

    const existente = await this.hojaRutaRepository.obtenerPorFrecuenciaYFecha(
      dto.frecuenciaId,
      dto.fechaSalida
    );

    if (existente) {
      throw new DomainException('Ya existe una hoja de ruta para esa frecuencia y fecha');
    }

    const paradas = await this.obtenerNombresParadas(frecuencia);

    return this.hojaRutaRepository.crear({
      frecuenciaId: frecuencia.id,
      busId: dto.busId ?? null,
      choferId: dto.choferId ?? null,
      fechaSalida: dto.fechaSalida,
      horaSalida: dto.horaSalida || frecuencia.hora,
      origen: frecuencia.origen,
      destino: frecuencia.destino,
      paradas,
      estado: 'PROGRAMADA',
      tipoGeneracion: 'MANUAL',
      observaciones: dto.observaciones ?? null,
    });
  }

  async listarPorFecha(fechaSalida: string): Promise<HojaRuta[]> {
    this.validarFecha(fechaSalida);
    return this.hojaRutaRepository.obtenerPorFecha(fechaSalida);
  }

  async iniciarRuta(id: string): Promise<void> {
    await this.hojaRutaRepository.actualizarEstado(id, 'EN_CURSO');
  }

  async finalizarRuta(id: string): Promise<void> {
    await this.hojaRutaRepository.actualizarEstado(id, 'FINALIZADA');
  }

  async cancelarRuta(id: string): Promise<void> {
    await this.hojaRutaRepository.actualizarEstado(id, 'CANCELADA');
  }

  private validarFecha(fechaSalida: string): void {
    if (!fechaSalida || Number.isNaN(Date.parse(fechaSalida))) {
      throw new DomainException('La fecha de salida es obligatoria y debe ser válida');
    }
  }

  private async obtenerNombresParadas(frecuencia: Frecuencia): Promise<string[]> {
    if (frecuencia.tipo === 'directo') return [];

    const paradas = await this.frecuenciaRepository.getParadasByFrecuencia(frecuencia.id);
    return paradas
      .sort((a, b) => a.orden - b.orden)
      .map((parada) => parada.nombre);
  }
}
