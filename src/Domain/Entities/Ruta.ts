export type TipoEstructuraBus = 'UnPiso' | 'DosPisos';

export const DURACION_MINIMA_DOS_PISOS_MINUTOS = 300;

export const puedeSeleccionarDosPisos = (duracionMinutos: number) => duracionMinutos >= DURACION_MINIMA_DOS_PISOS_MINUTOS;

export const opcionesEstructuraBus = (duracionMinutos: number): TipoEstructuraBus[] => {
  return puedeSeleccionarDosPisos(duracionMinutos) ? ['UnPiso', 'DosPisos'] : ['UnPiso'];
};

export class Ruta {
  constructor(
    public frecuenciaId: number,
    public busId: number,
    public fecha: string,
    public estado: string = 'Programada',
    public id?: number,
    public createdAt?: Date
  ) {}
}