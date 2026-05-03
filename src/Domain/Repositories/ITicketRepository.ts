export interface ITicketRepository {
  obtenerBoletosPorUsuario(usuarioId: number): Promise<any[]>;
}