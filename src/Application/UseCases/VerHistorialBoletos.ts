import { ITicketRepository } from '../../Domain/Repositories/ITicketRepository';

export class VerHistorialBoletos {
  constructor(private ticketRepo: ITicketRepository) {}

  async ejecutar(usuarioId: number) {
    // Aquí podrías añadir lógica extra (reglas de negocio)
    return await this.ticketRepo.obtenerBoletosPorUsuario(usuarioId);
  }
}