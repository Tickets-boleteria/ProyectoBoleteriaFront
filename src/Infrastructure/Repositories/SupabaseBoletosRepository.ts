import { supabase } from '../Api/supabaseClient'
import { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository'

export class SupabaseBoletosRepository implements IBoletosRepository {
  async insertarBoletos(boletos: any[]) {
    const { data, error } = await supabase.from('Boletos').insert(boletos).select()
    if (error) throw error
    return data
  }
}
