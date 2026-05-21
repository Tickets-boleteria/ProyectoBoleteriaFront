import { DashboardContextDto, DashboardResumenDto } from '../../Application/Dtos/DashboardResumenDto'

export interface IDashboardRepository {
  obtenerResumen(contexto: DashboardContextDto): Promise<DashboardResumenDto>
}