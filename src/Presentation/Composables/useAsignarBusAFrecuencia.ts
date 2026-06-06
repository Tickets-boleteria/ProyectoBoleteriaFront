import { ref } from 'vue';
import { AsignarBusAFrecuencia } from '../../Application/UseCases/AsignarBusAFrecuencia';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';

const rutaRepo = new SupabaseRutaRepository();
const busRepo = new SupabaseBusRepository();
const frecuenciaRepo = new SupabaseFrecuenciaRepository();

const auditRepo = new SupabaseAuditRepository();
const asignarUseCase = new AsignarBusAFrecuencia(rutaRepo, busRepo, frecuenciaRepo, auditRepo);

export function useAsignarBusAFrecuencia() {
  const resultado = ref<any | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const asignar = async (input: { frecuenciaId: number; busId: number; fecha: string }) => {
    loading.value = true;
    error.value = null;
    resultado.value = null;
    try {
      resultado.value = await asignarUseCase.ejecutar(input as any);
      return resultado.value;
    } catch (err: any) {
      error.value = err.message || 'Error asignando bus a frecuencia';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const limpiar = () => {
    resultado.value = null;
    error.value = null;
    loading.value = false;
  };

  return { resultado, loading, error, asignar, limpiar };
}
