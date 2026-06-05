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
    
    if (error) {
      console.error('ERROR AL INSERTAR VENTA EN SUPABASE:', error);
      throw new Error(`Error en base de datos: ${error.message} (${error.hint || ''})`);
    }
    
    // Devolvemos el ID de forma robusta
    const id = data?.Id ?? data?.id ?? (data as any)?.ID;
    if (!id) throw new Error('Error al recuperar el ID de la venta creada');
    
    return Number(id)
  }
}
