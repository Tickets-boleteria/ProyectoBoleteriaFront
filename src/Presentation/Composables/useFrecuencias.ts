import { ref, onMounted } from 'vue';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { useAuthStore } from '../Store/authStore';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
    esDirecto: true,
    diasOperacion: [...DIAS_SEMANA]
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
      const cooperativaId = authStore.user?.cooperativaId;
      if (!cooperativaId) {
        throw new Error('No se encontró la cooperativa del usuario autenticado.');
      }

      if (!nuevaFrecuencia.value.diasOperacion || nuevaFrecuencia.value.diasOperacion.length === 0) {
        throw new Error('Debe seleccionar al menos un día de operación.');
      }
      
      await repo.crear({ ...nuevaFrecuencia.value, cooperativaId });
      success.value = 'Trayecto (Frecuencia) registrado exitosamente.';
      
      // Limpiar formulario y recargar datos
      nuevaFrecuencia.value = { ciudadOrigen: '', ciudadDestino: '', codigoAnt: '', resolucionAnt: '', horaSalida: '', esDirecto: true, diasOperacion: [...DIAS_SEMANA] };
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