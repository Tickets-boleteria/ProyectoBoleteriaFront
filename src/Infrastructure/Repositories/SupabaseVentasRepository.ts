import { supabase } from '../Api/supabaseClient'
import { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository'

export class SupabaseVentasRepository implements IVentaRepository {
  private readonly BUCKET = 'comprobantes'

  async uploadComprobante(path: string, file: File, options: any = {}) {
    const { error } = await supabase.storage.from(this.BUCKET).upload(path, file, options)
    if (error) throw error
    const { data } = supabase.storage.from(this.BUCKET).getPublicUrl(path)
    return { publicUrl: data.publicUrl }
  }

  async crearVenta(payload: VentaPayload) {
    const { data, error } = await supabase
      .from('Ventas')
      .insert([payload])
      .select('Id')
      .single()
    
    if (error) throw error
    
    // Devolvemos el ID de forma robusta
    const id = Number(data?.Id ?? (data as any)?.id)
    if (!id) throw new Error('Error al recuperar el ID de la venta creada')
    
    return id
  }
}
