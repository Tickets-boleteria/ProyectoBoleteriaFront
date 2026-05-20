import { ref, onMounted } from 'vue';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { useAuthStore } from '../Store/authStore';

export function useFrecuencias() {
  const frecuencias = ref<any[]>([]);
  const loading = ref(false);
  const error = ref('');
  const success = ref('');

  const authStore = useAuthStore();

  const nuevaFrecuencia = ref({
    ciudadOrigen: '',
    ciudadDestino: '',
    codigoAnt: '',
    resolucionAnt: '',
    horaSalida: '',
    esDirecto: true
  });

  const repo = new SupabaseFrecuenciaRepository();

  const cargarDatos = async () => {
    loading.value = true;
    try {
      frecuencias.value = await repo.obtenerTodas();
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las frecuencias.';
    } finally {
      loading.value = false;
    }
  };

  const registrarFrecuencia = async () => {
    loading.value = true;
    error.value = '';
    success.value = '';
    try {
      // Obtenemos el ID de la cooperativa del usuario actual, o 1 por defecto
      const cooperativaId = authStore.user?.cooperativaId || 1;
      
      await repo.crear({ ...nuevaFrecuencia.value, cooperativaId });
      success.value = 'Trayecto (Frecuencia) registrado exitosamente.';
      
      // Limpiar formulario y recargar datos
      nuevaFrecuencia.value = { ciudadOrigen: '', ciudadDestino: '', codigoAnt: '', resolucionAnt: '', horaSalida: '', esDirecto: true };
      await cargarDatos();
    } catch (err: any) {
      error.value = err.message || 'Error al registrar la frecuencia.';
    } finally {
      loading.value = false;
    }
  };

  onMounted(cargarDatos);

  return { frecuencias, nuevaFrecuencia, loading, error, success, registrarFrecuencia };
}