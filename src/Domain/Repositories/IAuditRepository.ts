export interface IAuditRepository {
  logCambio(payload: { usuarioId?: string; tipoCambio: 'normal' | 'estandar' | 'emergencia'; descripcion?: string; referenciaId?: number }): Promise<void>;
  contarPorTipo(): Promise<{ normal: number; estandar: number; emergencia: number }>;
}
