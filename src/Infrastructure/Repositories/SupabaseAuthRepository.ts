import { supabase } from '../Api/supabaseClient';
import { IAuthRepository, SignUpPayload } from '../../Domain/Repositories/IAuthRepository';
import { User } from '../../Domain/Entities/Usuarios';

// Extractor robusto para mapear atributos de la DB sin importar el casing (rol, Rol, ROL)
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

// Formateador estricto para asegurar que el rol siempre tenga el formato Capitalizado (ej. Administrador),
// previniendo que los botones de la interfaz se oculten por diferencias de mayúsculas/minúsculas.
const normalizeRole = (role: any): string => {
  if (!role || typeof role !== 'string') return 'Cliente';
  const r = role.trim().toLowerCase();
  if (r === 'administrador' || r === 'admin') return 'Administrador';
  if (r === 'oficinista') return 'Oficinista';
  if (r === 'chofer') return 'Chofer';
  return 'Cliente';
};

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
          rol: 'Cliente',
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

    const cleanEmail = (data.user.email || '').trim();
    
    let { data: dbUser, error: dbError } = await supabase
      .from('Usuarios')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1)
      .then(res => ({ data: res.data?.[0], error: res.error }));

    // Fallback de seguridad en caso de que la tabla exija el casing estricto "Email"
    if (!dbUser && dbError) {
      const res = await supabase.from('Usuarios').select('*').ilike('Email', cleanEmail).limit(1);
      dbUser = res.data?.[0];
    }

    return {
      id: data.user.id,
      cedula: getFieldValue(dbUser, 'cedula') ?? metadata?.cedula ?? '',
      nombres: getFieldValue(dbUser, 'nombres') ?? metadata?.nombres ?? metadata?.nombre ?? '',
      apellidos: getFieldValue(dbUser, 'apellidos') ?? metadata?.apellidos ?? '',
      email: data.user.email ?? '',
      rol: normalizeRole(getFieldValue(dbUser, 'rol') ?? metadata?.rol),
      activo: getFieldValue(dbUser, 'activo') ?? metadata?.activo ?? true,
      cooperativaId: getFieldValue(dbUser, 'cooperativaid') ?? metadata?.cooperativaId ?? null
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

    const cleanEmail = (session.user.email || '').trim();
    
    let { data: dbUser, error: dbError } = await supabase
      .from('Usuarios')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1)
      .then(res => ({ data: res.data?.[0], error: res.error }));

    if (!dbUser && dbError) {
      const res = await supabase.from('Usuarios').select('*').ilike('Email', cleanEmail).limit(1);
      dbUser = res.data?.[0];
    }

    return {
      id: session.user.id,
      cedula: getFieldValue(dbUser, 'cedula') ?? metadata?.cedula ?? '',
      nombres: getFieldValue(dbUser, 'nombres') ?? metadata?.nombres ?? metadata?.nombre ?? '',
      apellidos: getFieldValue(dbUser, 'apellidos') ?? metadata?.apellidos ?? '',
      email: session.user.email ?? '',
      rol: normalizeRole(getFieldValue(dbUser, 'rol') ?? metadata?.rol),
      activo: getFieldValue(dbUser, 'activo') ?? metadata?.activo ?? true,
      cooperativaId: getFieldValue(dbUser, 'cooperativaid') ?? metadata?.cooperativaId ?? null
    };
  }
}