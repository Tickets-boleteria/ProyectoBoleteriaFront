import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository'

const authRepository = new SupabaseAuthRepository()
import type { User } from '@supabase/supabase-js'
import { loginUseCase } from '../../Application/UseCases/Login'
import { supabase } from '../../Infrastructure/Api/supabaseClient'

/**
 * Tipo de usuario "enriquecido": el User de Supabase Auth + los campos
 * de tu tabla `usuarios` (rol, nombres, apellidos, cedula) fusionados arriba.
 */
export interface AppUser extends User {
  rol?: string
  nombres?: string
  apellidos?: string
  cedula?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AppUser | null>(null)
  const loading = ref(false)
  const error = ref('')

  /**
   * `ready` indica que YA terminó el primer intento de rehidratar la sesión.
   * El guard del router y el layout deben esperar a que sea true antes de
   * decidir qué mostrar; así no se "pierden" los botones al recargar.
   */
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.rol ?? null)

  /**
   * Trae los datos de perfil (rol, nombres...) y los fusiona sobre el User
   * de Auth. Primero intenta user_metadata; si no hay rol ahí, consulta la
   * tabla `usuarios`. Ajusta el nombre de la tabla/columnas a tu esquema.
   */
  const enrich = async (authUser: User | null): Promise<AppUser | null> => {
    if (!authUser) return null

    let merged: AppUser = { ...authUser }

    // La tabla `Usuarios` es la fuente de verdad del rol. Siempre se consulta.
    try {
      const { data, error: dbErr } = await supabase
        .from('Usuarios')
        .select('Rol, Nombres, Apellidos, Cedula')
        .eq('Email', authUser.email)
        .maybeSingle()
      if (!dbErr && data) {
        merged = {
          ...merged,
          rol: (data as any).Rol,
          nombres: (data as any).Nombres,
          apellidos: (data as any).Apellidos,
          cedula: (data as any).Cedula,
        }
      }
      console.log('enrich query →', { email: authUser.email, data, dbErr })
    } catch {
      /* silencioso */
    }

    return merged
  }
  

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = ''
    try {
      const { session } = await loginUseCase.execute(email, password)
      user.value = await enrich(session?.user ?? null)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await authRepository.signOut()
      user.value = null
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Rehidrata la sesión al cargar la app. Marca `ready = true` SIEMPRE al
   * final (haya sesión o no) para que el guard pueda continuar.
   */
 const initializeAuth = async () => {
    try {
      const currentUser = await loginUseCase.getCurrentUser()
      user.value = await enrich(currentUser)
    } catch (e) {
      console.log('initializeAuth ERROR', e)
      user.value = null
    } finally {
      ready.value = true   // ← debe ejecutarse siempre
    }
  }

  /**
   * Mantiene el store sincronizado con cambios de sesión de Supabase
   * (refresco de token, login/logout en otra pestaña, etc.). Llamar UNA vez.
   */
  const subscribeToAuthChanges = () => {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = await enrich(session?.user ?? null)
      ready.value = true
    })
  }

  return {
    user,
    loading,
    error,
    ready,
    isAuthenticated,
    role,
    login,
    logout,
    initializeAuth,
    subscribeToAuthChanges,
  }
})