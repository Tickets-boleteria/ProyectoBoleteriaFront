import { supabase } from './Api/supabaseClient';
import { IAuditRepository } from '../Domain/Repositories/IAuditRepository';

export class SupabaseAuditRepository implements IAuditRepository {
  private readonly TABLA = 'auditoria_cambios';

  async logCambio(payload: { usuarioId?: string; tipoCambio: 'normal' | 'estandar' | 'emergencia'; descripcion?: string; referenciaId?: number }): Promise<void> {
    const record = {
      usuario_id: payload.usuarioId || null,
      tipo_cambio: payload.tipoCambio,
      descripcion: payload.descripcion || null,
      referencia_id: payload.referenciaId || null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from(this.TABLA).insert([record]);
    if (error) throw new Error(`Error al registrar auditoría: ${error.message}`);
  }

  async contarPorTipo(): Promise<{ normal: number; estandar: number; emergencia: number }> {
    const tipos = ['normal', 'estandar', 'emergencia'];
    const result: any = { normal: 0, estandar: 0, emergencia: 0 };
    for (const t of tipos) {
      const { count, error } = await supabase.from(this.TABLA).select('*', { count: 'exact', head: true }).eq('tipo_cambio', t);
      if (error) throw new Error(`Error contando auditoría: ${error.message}`);
      result[t] = count || 0;
    }
    return result;
  }
}
