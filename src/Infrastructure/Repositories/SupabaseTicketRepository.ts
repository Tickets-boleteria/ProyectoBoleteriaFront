import { supabase } from '../Api/supabaseClient';
import { ITicketRepository } from '../../Domain/Repositories/ITicketRepository';

export class SupabaseTicketRepository implements ITicketRepository {
  /**
   * Implementación base para validación de flujo de datos entre capas (Walking Skeleton).
   * Consulta inicial a la tabla Cooperativas para verificar conexión.
   */
  async obtenerBoletosPorUsuario(usuarioId: number) {
    const { data, error } = await supabase
      .from('Cooperativas')
      .select('*');
    
    if (error) throw new Error(error.message);
    return data;
  }
}