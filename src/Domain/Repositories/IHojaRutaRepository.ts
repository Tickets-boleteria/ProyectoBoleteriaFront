import { EstadoHojaRuta, HojaRuta } from '../Entities/HojaRuta';

export interface IHojaRutaRepository {
  crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta>;
  obtenerPorId(id: string): Promise<HojaRuta | null>;
  obtenerPorFecha(fechaSalida: string): Promise<HojaRuta[]>;
  obtenerPorFrecuenciaYFecha(frecuenciaId: string, fechaSalida: string): Promise<HojaRuta | null>;
  actualizarEstado(id: string, estado: EstadoHojaRuta): Promise<void>;
}
