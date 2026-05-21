export type TipoCambio = 'normal' | 'estandar' | 'emergencia';

export interface AsignarBusInput {
  frecuenciaId: number;
  busId: number;
  fecha: string; // YYYY-MM-DD
  usuarioId?: string;
  usuarioRole?: 'admin' | 'oficinista' | 'chofer' | 'user';
  tipoCambio?: TipoCambio;
  cambioId?: number;
}
