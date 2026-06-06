import { supabase } from '../Api/supabaseClient';
import { ICambiosRepository } from '../../Domain/Repositories/ICambiosRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class SupabaseCambiosRepository implements ICambiosRepository {
  private readonly TABLA = 'Cambios';

  async marcarImplementado(id: number, fechaImplementacion?: Date, githubUrl?: string): Promise<void> {
    const payload: any = { Estado: 'Implementado' };
    if (fechaImplementacion) payload.FechaImplementacion = fechaImplementacion.toISOString();
    if (githubUrl) payload.GithubIssueUrl = githubUrl;

    const { error } = await supabase.from(this.TABLA).update(payload).eq('Id', id);
    if (error) throw new DomainException(`Error al marcar cambio como implementado: ${error.message}`);
  }

  async contarImplementadosPorTipo(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('TipoCambio')
      .eq('Estado', 'Implementado');

    if (error) throw new DomainException(`Error obteniendo conteo de cambios: ${error.message}`);

    const counts: Record<string, number> = { normal: 0, estandar: 0, emergencia: 0 };
    if (data && Array.isArray(data)) {
      for (const row of data) {
        const t = (row.TipoCambio || '').toString().toLowerCase();
        if (counts[t] !== undefined) counts[t] += 1;
        else counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }
}
