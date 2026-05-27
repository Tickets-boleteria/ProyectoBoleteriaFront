import { supabase } from '../Api/supabaseClient'
import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository'

export class SupabaseVentasRepository implements IVentaRepository {
  private readonly BUCKET = 'comprobantes'

  async uploadComprobante(path: string, file: File, options: any = {}) {
    const { error } = await supabase.storage.from(this.BUCKET).upload(path, file, options)
    if (error) throw error
    const { data } = supabase.storage.from(this.BUCKET).getPublicUrl(path)
    return { publicUrl: data.publicUrl }
  }

  async crearVenta(payload: any) {
    const { data, error } = await supabase.from('Ventas').insert([payload]).select('Id').single()
    if (error) throw error
    return Number((data as any)?.Id ?? (data as any)?.id)
  }
}
