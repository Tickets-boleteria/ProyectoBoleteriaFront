import { supabase } from '../Api/supabaseClient';

export interface AppConfig {
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  redesSociales: { facebook: string; twitter: string; instagram: string };
  soporteEmail: string;
  soporteTelefono: string;
}

export interface ResolucionANT {
  id?: number;
  numeroResolucion: string;
  fechaEmision: string;
  descripcion: string;
}

export class SupabaseConfigRepository {
  private readonly TABLA_CONFIG = 'ConfiguracionApp';
  private readonly TABLA_RESOLUCIONES = 'ResolucionesANT';

  async obtenerConfig(): Promise<AppConfig | null> {
    const { data, error } = await supabase.from(this.TABLA_CONFIG).select('*').eq('Id', 1).single();
    if (error) return null;
    return {
      logoUrl: data.LogoUrl,
      colorPrimario: data.ColorPrimario,
      colorSecundario: data.ColorSecundario,
      redesSociales: data.RedesSociales,
      soporteEmail: data.SoporteEmail,
      soporteTelefono: data.SoporteTelefono,
    };
  }

  async guardarConfig(config: AppConfig): Promise<void> {
    const { error } = await supabase.from(this.TABLA_CONFIG).update({
      LogoUrl: config.logoUrl,
      ColorPrimario: config.colorPrimario,
      ColorSecundario: config.colorSecundario,
      RedesSociales: config.redesSociales,
      SoporteEmail: config.soporteEmail,
      SoporteTelefono: config.soporteTelefono,
      UpdatedAt: new Date().toISOString()
    }).eq('Id', 1);
    if (error) throw new Error(error.message);
  }

  async listarResoluciones(): Promise<ResolucionANT[]> {
    const { data, error } = await supabase.from(this.TABLA_RESOLUCIONES).select('*').order('CreatedAt', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      id: r.Id,
      numeroResolucion: r.NumeroResolucion,
      fechaEmision: r.FechaEmision,
      descripcion: r.Descripcion
    }));
  }

  async crearResolucion(res: ResolucionANT): Promise<void> {
    const { error } = await supabase.from(this.TABLA_RESOLUCIONES).insert([{
      NumeroResolucion: res.numeroResolucion,
      FechaEmision: res.fechaEmision,
      Descripcion: res.descripcion
    }]);
    if (error) throw new Error(error.message);
  }
}
