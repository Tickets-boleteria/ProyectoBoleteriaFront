import { supabase } from '../Api/supabaseClient';
import { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';

export class SupabaseUsuarioRepository implements IUsuarioRepository {
  async obtenerTodos() {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('Id, Cedula, Nombres, Apellidos, Email, Telefono, Rol, Activo, CooperativaId')
      .eq('Activo', true);
    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerPorId(id: string) {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('Id, Cedula, Nombres, Apellidos, Email, Telefono, Rol, Activo')
      .eq('Id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerPorCedula(cedula: string) {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('Id, Cedula, Nombres, Apellidos, Email, Rol')
      .eq('Cedula', cedula)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerPorRol(rol: string) {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('Id, Cedula, Nombres, Apellidos, Email, Rol, Activo')
      .eq('Rol', rol)
      .eq('Activo', true);
    if (error) throw new Error(error.message);
    return data;
  }

  async crear(usuario: any) {
    const { data, error } = await supabase
      .from('Usuarios')
      .insert({
        Cedula:        usuario.cedula,
        Nombres:       usuario.nombres,
        Apellidos:     usuario.apellidos,
        Email:         usuario.email,
        PasswordHash:  usuario.password,
        Telefono:      usuario.telefono,
        Rol:           usuario.rol,
        Activo:        true,
        CooperativaId: usuario.cooperativaId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async actualizar(id: string, datos: any) {
    const { data, error } = await supabase
      .from('Usuarios')
      .update({
        Nombres:   datos.nombres,
        Apellidos: datos.apellidos,
        Telefono:  datos.telefono,
        Rol:       datos.rol,
      })
      .eq('Id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async desactivar(id: string) {
    const { error } = await supabase
      .from('Usuarios')
      .update({ Activo: false })
      .eq('Id', id);
    if (error) throw new Error(error.message);
  }
}
