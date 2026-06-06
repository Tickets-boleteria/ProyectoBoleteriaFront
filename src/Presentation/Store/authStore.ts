import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginUseCase } from '../../Application/UseCases/Login'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import type { User as DomainUser } from '../../Domain/Entities/Usuarios'

export type AppUser = DomainUser

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AppUser | null>(null)
  const loading = ref(false)
  const error = ref('')
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.rol ?? null)

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = ''

    try {
      user.value = await loginUseCase.execute(email, password)
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
      await loginUseCase.logout()
      user.value = null
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const initializeAuth = async () => {
    try {
      user.value = await loginUseCase.getCurrentUser()
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  const subscribeToAuthChanges = () => {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        user.value = await loginUseCase.getCurrentUser()
      } else {
        user.value = null
      }
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