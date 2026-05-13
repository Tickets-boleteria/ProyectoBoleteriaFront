import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class GetUsuarios {
  constructor(private usuarioRepo: IUsuarioRepository) {}
  async ejecutar() {
    return await this.usuarioRepo.obtenerTodos();
  }
}
