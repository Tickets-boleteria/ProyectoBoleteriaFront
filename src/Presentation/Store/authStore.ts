import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository'
import type { User } from '@supabase/supabase-js'
import { loginUseCase } from '../../Application/UseCases/Login'
import { supabase } from '../../Infrastructure/Api/supabaseClient'

const authRepository = new SupabaseAuthRepository()

export interface AppUser extends User {
  usuarioTablaId?: number | null
  rol?: string
  nombres?: string
  apellidos?: string
  cedula?: string
  cooperativaId?: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AppUser | null>(null)
  const loading = ref(false)
  const error = ref('')
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.rol ?? null)

  const enrich = async (authUser: User | null): Promise<AppUser | null> => {
    if (!authUser) return null

    let merged: AppUser = { ...authUser }

    try {
      const { data, error: dbErr } = await supabase
        .from('Usuarios')
        .select('Id, Rol, Nombres, Apellidos, Cedula, CooperativaId')
        .eq('Email', authUser.email)
        .maybeSingle()

      if (!dbErr && data) {
        merged = {
          ...merged,
          usuarioTablaId: Number((data as any).Id ?? (data as any).id ?? null),
          rol: (data as any).Rol,
          nombres: (data as any).Nombres,
          apellidos: (data as any).Apellidos,
          cedula: (data as any).Cedula,
          cooperativaId: Number((data as any).CooperativaId ?? (data as any).cooperativaid ?? null),
        }
      }
    } catch {
      // No bloquear el login si falla la consulta de perfil
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

  const initializeAuth = async () => {
    try {
      const currentUser = await loginUseCase.getCurrentUser()
      user.value = await enrich(currentUser)
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

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