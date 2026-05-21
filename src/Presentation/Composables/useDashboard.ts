import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../Store/authStore'
import { SupabaseDashboardRepository } from '../../Infrastructure/Repositories/SupabaseDashboardRepository'
import { ObtenerDashboardResumen } from '../../Application/UseCases/ObtenerDashboardResumen'

const dashboardRepository = new SupabaseDashboardRepository()
const dashboardUseCase = new ObtenerDashboardResumen(dashboardRepository)

export function useDashboard() {
  const authStore = useAuthStore()
  const resumen = ref<any | null>(null)
  const loading = ref(false)
  const error = ref('')

  const contexto = computed(() => {
    const usuario: any = authStore.user
    return {
      userId: usuario?.id ?? '',
      rol: usuario?.rol || usuario?.role || usuario?.user_metadata?.rol || usuario?.user_metadata?.role || 'Cliente',
      nombres: usuario?.nombres || usuario?.user_metadata?.nombres || usuario?.user_metadata?.nombre || '',
      cedula: usuario?.cedula || usuario?.user_metadata?.cedula || '',
      cooperativaId: usuario?.cooperativaId ?? usuario?.user_metadata?.cooperativaId ?? null,
    }
  })

  const cargar = async () => {
    if (!contexto.value.userId) return
    loading.value = true
    error.value = ''
    try {
      resumen.value = await dashboardUseCase.ejecutar(contexto.value)
    } catch (err: any) {
      error.value = err.message || 'No fue posible cargar el dashboard.'
      resumen.value = null
    } finally {
      loading.value = false
    }
  }

  onMounted(cargar)
  watch(contexto, () => {
    void cargar()
  }, { deep: true })

  return {
    resumen,
    loading,
    error,
    recargar: cargar,
  }
}