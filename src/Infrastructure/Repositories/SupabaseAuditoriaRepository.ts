/**
 * SupabaseAuditoriaRepository.ts - Implementación para gestionar los logs de auditoría.
 */

import { supabase } from '../Api/supabaseClient';
import { AuditoriaEntry } from '../../Domain/Entities/Auditoria';
import { IAuditoriaRepository } from '../../Domain/Repositories/IAuditoriaRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class SupabaseAuditoriaRepository implements IAuditoriaRepository {
  private readonly tabla = 'Cambios';

  async listar(): Promise<AuditoriaEntry[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .order('FechaSolicitud', { ascending: false });

    if (error) {
      throw new DomainException(`Error al obtener registros de auditoría: ${error.message}`);
    }

    return (data || []).map(this.mapearAuditoria);
  }

  private mapearAuditoria(data: any): AuditoriaEntry {
    return {
      id: data.Id,
      fecha: data.FechaSolicitud,
      usuario: data.Titulo, // Mapeo temporal según estructura de Cambios
      rol: data.Prioridad,
      accion: data.Estado,
      modulo: 'Gestión de Cambios',
      tipoCambio: data.TipoCambio,
      detalle: data.Descripcion,
    };
  }
}