import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import { loginUseCase } from '../../Application/UseCases/Login'


export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!user.value)

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = ''
    try {
      const { session } = await loginUseCase.execute(email, password)
      user.value = session?.user || null
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
    const currentUser = await loginUseCase.getCurrentUser()
    user.value = currentUser || null
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
