import { ICambiosRepository } from '../../Domain/Repositories/ICambiosRepository';

export class ObtenerConteoCambios {
  constructor(private cambiosRepo: ICambiosRepository) {}

  async ejecutar() {
    return this.cambiosRepo.contarImplementadosPorTipo();
  }
}
