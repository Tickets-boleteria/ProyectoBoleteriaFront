export type DashboardTipo = 'cliente' | 'cooperativa' | 'chofer'

export interface DashboardContextDto {
  userId: string
  usuarioTablaId?: number | null
  rol: string
  nombres?: string | null
  cedula?: string | null
  cooperativaId?: number | null
}

export interface DashboardKpiDto {
  label: string
  value: string
  hint?: string
  icon: string
  delta?: number
}

export interface DashboardChartPointDto {
  label: string
  value: number
}

export interface DashboardRouteDto {
  ruta: string
  boletos: number
}

export interface DashboardTripDto {
  fecha: string
  hora?: string
  origen: string
  destino: string
  cooperativa?: string
  asiento?: string
  bus?: string
  placa?: string
  estado?: string
  pasajerosEsperados?: number
  pasajerosEscaneados?: number
  pasajerosPendientes?: number
}

export interface DashboardQuickActionDto {
  to: string
  label: string
  desc: string
  icon: string
}

export interface DashboardResumenDto {
  tipo: DashboardTipo
  rolMensaje: string
  kpis: DashboardKpiDto[]
  ventasSemana: DashboardChartPointDto[]
  rutasTop: DashboardRouteDto[]
  gastosMeses: DashboardChartPointDto[]
  proximoViaje: DashboardTripDto | null
  accesosRapidos: DashboardQuickActionDto[]
}