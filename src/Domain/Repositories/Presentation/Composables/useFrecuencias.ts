import { ref } from 'vue';
import { GestionarFrecuencias } from '../../../../Application/UseCases/GestionarFrecuencias';
import { SupabaseFrecuenciaRepository } from '../../../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { Frecuencia, Parada } from '../../../../Domain/Entities/Frecuencia';

const frecuenciaRepository = new SupabaseFrecuenciaRepository();
const gestionarFrecuencias = new GestionarFrecuencias(frecuenciaRepository);

export function useFrecuencias() {
  const frecuencias = ref<Frecuencia[]>([]);
  const paradas = ref<Parada[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const cargarFrecuenciasActivas = async () => {
    loading.value = true;
    error.value = null;
    try {
      frecuencias.value = await gestionarFrecuencias.obtenerFrecuenciasActivas();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error desconocido';
    } finally {
      loading.value = false;
    }
  };

  const crearFrecuencia = async (frecuencia: Omit<Frecuencia, 'id'>) => {
    try {
      const nuevaFrecuencia = await gestionarFrecuencias.crearFrecuencia(frecuencia);
      frecuencias.value.push(nuevaFrecuencia);
      return nuevaFrecuencia;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando frecuencia';
      throw err;
    }
  };

  const cargarParadasDeFrecuencia = async (frecuenciaId: string) => {
    loading.value = true;
    error.value = null;
    try {
      paradas.value = await gestionarFrecuencias.obtenerParadasDeFrecuencia(frecuenciaId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando paradas';
    } finally {
      loading.value = false;
    }
  };

  const agregarParada = async (frecuenciaId: string, parada: Omit<Parada, 'id'>) => {
    try {
      const nuevaParada = await gestionarFrecuencias.agregarParada(frecuenciaId, parada);
      paradas.value.push(nuevaParada);
      return nuevaParada;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error agregando parada';
      throw err;
    }
  };

  return {
    frecuencias,
    paradas,
    loading,
    error,
    cargarFrecuenciasActivas,
    crearFrecuencia,
    cargarParadasDeFrecuencia,
    agregarParada,
  };
}