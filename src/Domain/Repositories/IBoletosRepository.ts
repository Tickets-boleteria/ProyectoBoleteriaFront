export interface IBoletosRepository {
  insertarBoletos(boletos: any[]): Promise<any>
}
