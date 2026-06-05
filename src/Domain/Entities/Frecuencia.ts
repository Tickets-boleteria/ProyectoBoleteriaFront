export class Frecuencia {
  public id?: number;
  public codigoAnt?: string;
  public resolucionAnt?: string;
  public createdAt?: Date;
  public diasOperacion: string[] = [];

  constructor(
    public cooperativaId: number,
    public ciudadOrigen: string,
    public ciudadDestino: string,
    public horaSalida: string,
    public esDirecto: boolean = true,
    public activa: boolean = true
  ) {}
}

export interface ParadaIntermedia {
  id?: number;
  frecuenciaId: number;
  ciudad: string;
  orden: number;
  minutosDesdeOrigen: number;
  permiteVenta: boolean;
}