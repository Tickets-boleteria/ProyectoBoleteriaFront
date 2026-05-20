import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../../Domain/Entities/Usuarios'
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository'

const authRepository = new SupabaseAuthRepository()

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!user.value)

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = ''
    try {
      user.value = await authRepository.signIn(email, password)
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
    const currentUser = await authRepository.getCurrentUser()
    user.value = currentUser
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    initializeAuth,
  }
})
