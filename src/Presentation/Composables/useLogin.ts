import { ref } from 'vue'
import { useAuthStore } from '../Store/authStore'

export function useLogin() {
  const authStore = useAuthStore()
  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const rememberMe = ref(false)

  const handleLogin = async () => {
    try {
      await authStore.login(email.value, password.value)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value
  }

  return {
    email,
    password,
    showPassword,
    rememberMe,
    handleLogin,
    togglePasswordVisibility,
    loading: authStore.loading,
    error: authStore.error,
  }
}
