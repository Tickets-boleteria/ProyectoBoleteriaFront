import { EstadoRuta } from '../Constants/EstadosSistema'

export class Ruta {
  constructor(
    public frecuenciaId: number,
    public busId: number,
    public fecha: string,
    public estado: EstadoRuta = 'Programada',
    public id?: number,
    public choferId?: string,
    public horaSalida?: string | null,
    public horaLlegada?: string | null,
    public observacionChofer?: string | null,
    public createdAt?: Date,
    public hojaRutaId?: number | null,
    public esDirecta: boolean = true,
    public excepcionEmergencia: boolean = false
  ) {}
}