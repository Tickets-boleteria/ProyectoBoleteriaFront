import { EstadoHojaRuta, HojaRuta } from '../Entities/HojaRuta';

export interface IHojaRutaRepository {
  crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta>;
  obtenerPorId(id: number): Promise<HojaRuta | null>;
  obtenerPorFecha(fechaSalida: string): Promise<HojaRuta[]>;
  obtenerPorFrecuenciaYFecha(frecuenciaId: number, fechaSalida: string): Promise<HojaRuta | null>;
  actualizarEstado(id: number, estado: EstadoHojaRuta): Promise<void>;
}
