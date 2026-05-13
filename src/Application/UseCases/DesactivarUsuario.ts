import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class DesactivarUsuario {
  constructor(private usuarioRepo: IUsuarioRepository) {}
  async ejecutar(id: number) {
    await this.usuarioRepo.desactivar(id);
    return { mensaje: 'Usuario desactivado correctamente' };
  }
}
