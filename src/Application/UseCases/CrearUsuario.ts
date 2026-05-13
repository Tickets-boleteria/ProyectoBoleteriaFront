import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class CrearUsuario {
  constructor(private usuarioRepo: IUsuarioRepository) {}
  async ejecutar(datos: any) {
    if (!datos.cedula || !datos.email || !datos.rol) {
      throw new Error('Cédula, email y rol son obligatorios');
    }
    return await this.usuarioRepo.crear(datos);
  }
}
