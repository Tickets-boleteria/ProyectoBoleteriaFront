import { HabilitarRutaDiaria, HabilitarRutaInput } from './HabilitarRutaDiaria';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { AsignarBusInput } from '../Dtos/AsignarBusAFrecuenciaDto';
import { ICambiosRepository } from '../../Domain/Repositories/ICambiosRepository';

export class AsignarBusAFrecuencia {
  private habilitarUseCase: HabilitarRutaDiaria;
  private auditRepo?: IAuditRepository;

  constructor(
    rutaRepo: IRutaRepository,
    busRepo: IBusRepository,
    frecuenciaRepo: IFrecuenciaRepository,
    auditRepo?: IAuditRepository,
    private cambiosRepo?: ICambiosRepository
  ) {
    this.habilitarUseCase = new HabilitarRutaDiaria(rutaRepo, busRepo, frecuenciaRepo);
    this.auditRepo = auditRepo;
  }

  async ejecutar(input: AsignarBusInput) {
    // Validar formato de fecha YYYY-MM-DD
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.fecha)) {
      throw new Error('Formato de fecha inválido, use YYYY-MM-DD');
    }

    // Validar permisos: sólo admin puede asignar manualmente
    if (input.usuarioRole && input.usuarioRole !== 'admin') {
      throw new Error('Permiso denegado: se requiere rol admin');
    }

    // Validar existencia y estado de frecuencia y bus usando el use case subyacente
    // Primero verificar que la frecuencia exista y esté activa
    const frecuencia = await this.habilitarUseCase['frecuenciaRepo'].obtenerPorId(input.frecuenciaId as number).catch(() => null);
    if (!frecuencia || (frecuencia as any).activa === false) {
      throw new Error('Frecuencia no existe o no está activa');
    }

    // Verificar bus
    const bus = await this.habilitarUseCase['busRepo'].obtenerPorId(input.busId as number).catch(() => null);
    if (!bus || (bus as any).estado !== 'Activo') {
      throw new Error('Bus no existe o no está activo');
    }

    // Delegar a HabilitarRutaDiaria
    const habilitarInput: HabilitarRutaInput = {
      frecuenciaId: input.frecuenciaId,
      busId: input.busId,
      fecha: input.fecha,
    };

    const resultado = await this.habilitarUseCase.ejecutar(habilitarInput);

    // Registrar auditoría si está disponible
    if (this.auditRepo) {
      await this.auditRepo.logCambio({
        usuarioId: input.usuarioId,
        tipoCambio: input.tipoCambio || 'normal',
        descripcion: `Asignación manual bus ${input.busId} -> frecuencia ${input.frecuenciaId}`,
        referenciaId: (resultado as any)?.id,
      });
    }

    // Marcar cambio como implementado si se proporcionó cambioId y existe cambiosRepo
    if (input.cambioId && this.cambiosRepo) {
      await this.cambiosRepo.marcarImplementado(input.cambioId, new Date(), (resultado as any)?.id ? `ruta/${(resultado as any).id}` : undefined);
    }

    return resultado;
  }
}
