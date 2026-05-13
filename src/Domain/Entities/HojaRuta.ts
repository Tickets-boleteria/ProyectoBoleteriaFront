export type EstadoHojaRuta = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type TipoGeneracionHojaRuta = 'AUTOMATICA' | 'MANUAL';

export interface HojaRuta {
  id?: string;
  frecuenciaId: string;
  busId?: string | null;
  choferId?: string | null;
  fechaSalida: string; // YYYY-MM-DD
  horaSalida: string; // HH:mm
  origen: string;
  destino: string;
  paradas: string[];
  estado: EstadoHojaRuta;
  tipoGeneracion: TipoGeneracionHojaRuta;
  observaciones?: string | null;
  createdAt?: string;
}

export interface CrearHojaRutaManualDto {
  frecuenciaId: string;
  busId?: string;
  choferId?: string;
  fechaSalida: string;
  horaSalida?: string;
  observaciones?: string;
}

export interface GenerarHojasRutaAutomaticasDto {
  fechaSalida: string;
}
