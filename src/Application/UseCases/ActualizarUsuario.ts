import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class ActualizarUsuario {
  constructor(private usuarioRepo: IUsuarioRepository) {}
  async ejecutar(id: string, datos: any) {
    if (!datos.nombres || !datos.apellidos || !datos.rol) {
      throw new Error('Nombres, apellidos y rol son obligatorios');
    }
    return await this.usuarioRepo.actualizar(id, datos);
  }
}
