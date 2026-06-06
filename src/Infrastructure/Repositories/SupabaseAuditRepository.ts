/**
 * SupabaseAuditRepository.ts - Implementación para registrar auditoría en la tabla Cambios.
 */

import { supabase } from '../Api/supabaseClient';
import { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class SupabaseAuditRepository implements IAuditRepository {
  private readonly TABLA = 'Cambios';

  async logCambio(payload: { 
    usuarioId?: string; 
    tipoCambio: 'normal' | 'estandar' | 'emergencia'; 
    descripcion?: string; 
    referenciaId?: number 
  }): Promise<void> {
    const record = {
      SolicitanteId: payload.usuarioId || null,
      TipoCambio: payload.tipoCambio.charAt(0).toUpperCase() + payload.tipoCambio.slice(1), // Capitalize to match enum
      Descripcion: payload.descripcion || `Cambio registrado para referencia ${payload.referenciaId}`,
      Titulo: `Auditoría: ${payload.tipoCambio}`,
      Estado: 'Implementado',
      FechaSolicitud: new Date().toISOString(),
      FechaImplementacion: new Date().toISOString(),
    };

    const { error } = await supabase.from(this.TABLA).insert([record]);
    if (error) {
      throw new DomainException(`Error al registrar auditoría en Cambios: ${error.message}`);
    }
  }

  async contarPorTipo(): Promise<{ normal: number; estandar: number; emergencia: number }> {
    const result = { normal: 0, estandar: 0, emergencia: 0 };
    
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('TipoCambio');

    if (error) {
      throw new DomainException(`Error contando auditoría: ${error.message}`);
    }

    if (data) {
      data.forEach((row: any) => {
        const type = String(row.TipoCambio).toLowerCase();
        if (type === 'normal') result.normal++;
        else if (type === 'estandar') result.estandar++;
        else if (type === 'emergencia') result.emergencia++;
      });
    }

    return result;
  }

  async listar(): Promise<any[]> {
    const { data, error } = await supabase
      .from(this.TABLA)
      .select('*')
      .order('FechaSolicitud', { ascending: false });

    if (error) {
      throw new DomainException(`Error al obtener registros de auditoría: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.Id,
      fecha: row.FechaSolicitud,
      usuario: row.Titulo || 'N/A',
      rol: row.Prioridad || 'N/A',
      accion: row.Estado || 'N/A',
      modulo: 'Gestión de Cambios',
      tipoCambio: row.TipoCambio,
      detalle: row.Descripcion,
    }));
  }
}
