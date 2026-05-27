export type EstadoHojaRuta = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type TipoGeneracionHojaRuta = 'AUTOMATICA' | 'MANUAL';

export interface HojaRuta {
  id?: number;
  frecuenciaId: number;
  busId?: number | null;
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
  frecuenciaId: number;
  busId?: number;
  choferId?: string;
  fechaSalida: string;
  horaSalida?: string;
  observaciones?: string;
}

export interface GenerarHojasRutaAutomaticasDto {
  fechaSalida: string;
}
