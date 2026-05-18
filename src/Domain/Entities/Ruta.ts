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