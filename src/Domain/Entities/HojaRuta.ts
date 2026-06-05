import { Ruta } from './Ruta';
import { EstadoHojaRuta, TipoGeneracionHoja } from '../Constants/EstadosSistema';

export interface HojaRuta {
  id?: number;
  usuarioCreadorId: string;
  fecha: string; // YYYY-MM-DD
  estado: EstadoHojaRuta;
  tipoGeneracion: TipoGeneracionHoja;
  observaciones?: string | null;
  createdAt?: string;
  rutas?: Ruta[];
}

export interface CrearHojaRutaManualDto {
  fecha: string;
  observaciones?: string;
}

export interface GenerarHojasRutaAutomaticasDto {
  fechaSalida: string;
}
