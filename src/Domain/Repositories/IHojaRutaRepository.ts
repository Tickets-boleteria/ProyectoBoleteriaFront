import { EstadoHojaRuta, HojaRuta } from '../Entities/HojaRuta';

export interface IHojaRutaRepository {
  crear(hojaRuta: Omit<HojaRuta, 'id' | 'createdAt'>): Promise<HojaRuta>;
  obtenerPorId(id: number): Promise<HojaRuta | null>;
  obtenerPorFecha(fecha: string): Promise<HojaRuta[]>;
  actualizarEstado(id: number, estado: EstadoHojaRuta): Promise<void>;
}
