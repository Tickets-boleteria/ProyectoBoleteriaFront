import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class ActualizarUsuario {
  constructor(private usuarioRepo: IUsuarioRepository) {}
  async ejecutar(id: number, datos: any) {
    return await this.usuarioRepo.actualizar(id, datos);
  }
}
