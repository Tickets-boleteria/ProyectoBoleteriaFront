/**
 * SupabaseAuditoriaRepository.ts - Implementación para gestionar los logs de auditoría.
 */

import { supabase } from '../Api/supabaseClient';
import { AuditoriaEntry } from '../../Domain/Entities/Auditoria';
import { IAuditoriaRepository } from '../../Domain/Repositories/IAuditoriaRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class SupabaseAuditoriaRepository implements IAuditoriaRepository {
  private readonly tabla = 'auditoria_cambios';

  async listar(): Promise<AuditoriaEntry[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      throw new DomainException(`Error al obtener registros de auditoría: ${error.message}`);
    }

    return (data || []).map(this.mapearAuditoria);
  }

  private mapearAuditoria(data: any): AuditoriaEntry {
    return {
      id: data.id,
      fecha: data.fecha,
      usuario: data.usuario_nombre, // Asumiendo que guardas el nombre para reportes
      rol: data.usuario_rol,
      accion: data.accion,
      modulo: data.modulo,
      tipoCambio: data.tipo_cambio,
      detalle: data.detalle,
    };
  }
}