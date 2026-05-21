import { DashboardContextDto, DashboardResumenDto } from '../Dtos/DashboardResumenDto'
import { IDashboardRepository } from '../../Domain/Repositories/IDashboardRepository'

export class ObtenerDashboardResumen {
  constructor(private dashboardRepository: IDashboardRepository) {}

  async ejecutar(contexto: DashboardContextDto): Promise<DashboardResumenDto> {
    return this.dashboardRepository.obtenerResumen(contexto)
  }
}