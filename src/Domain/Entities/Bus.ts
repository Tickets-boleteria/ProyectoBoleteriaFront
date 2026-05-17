export class Bus {
  public id?: number;
  public marcaChasis?: string;
  public marcaCarroceria?: string;
  public anio?: number;
  public fotoUrl?: string;
  public createdAt?: Date;

  constructor(
    public cooperativaId: number,
    public numero: string,
    public placa: string,
    public totalAsientos: number,
    public estado: string = 'Activo'
  ) {}

  esValido(): boolean {
    return (
      this.numero.length > 0 &&
      this.placa.length >= 6 &&
      this.cooperativaId > 0 &&
      this.totalAsientos > 0
    );
  }
}
 
export class BusAsiento {
  public id?: number;
  public fila?: string;
  public columna?: string;

  constructor(
    public busId: number,
    public configuracionId: number,
    public numeroAsiento: string,
    public tipo: string
  ) {}
}