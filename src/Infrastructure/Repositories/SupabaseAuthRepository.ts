import { supabase } from '../Api/supabaseClient';
import { IAuthRepository, SignUpPayload } from '../../Domain/Repositories/IAuthRepository';
import { User } from '../../Domain/Entities/Usuarios';

export class SupabaseAuthRepository implements IAuthRepository {
  async signUp({
    email,
    password,
    nombres,
    apellidos,
    cedula
  }: SignUpPayload): Promise<void> {
    // Envía ambos formatos para cubrir versiones distintas del trigger SQL
    const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          cedula: cedula.trim(),
          nombre: nombreCompleto,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          rol: 'Usuario Final',
          activo: true
        }
      }
    });
    
    if (error) throw new Error(error.message);
  }

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No se pudo recuperar la información del usuario.');

    const metadata = data.user.user_metadata;

    return {
      id: data.user.id,
      cedula: metadata?.cedula ?? '',
      nombres: metadata?.nombres ?? metadata?.nombre ?? '',
      apellidos: metadata?.apellidos ?? '',
      email: data.user.email ?? '',
      rol: metadata?.rol ?? 'Cliente',
      activo: metadata?.activo ?? true,
      cooperativaId: metadata?.cooperativaId ?? null
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const metadata = session.user.user_metadata;

    return {
      id: session.user.id,
      cedula: metadata?.cedula ?? '',
      nombres: metadata?.nombres ?? metadata?.nombre ?? '',
      apellidos: metadata?.apellidos ?? '',
      email: session.user.email ?? '',
      rol: metadata?.rol ?? 'Cliente',
      activo: metadata?.activo ?? true,
      cooperativaId: metadata?.cooperativaId ?? null
    };
  }
}