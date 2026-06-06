/**
 * useHabilitarRutaDiaria.ts - Composable para habilitar rutas diarias
 * Permite asignar un bus a una frecuencia en una fecha específica
 */

import { ref } from 'vue';
import { HabilitarRutaDiaria, HabilitarRutaInput } from '../../Application/UseCases/HabilitarRutaDiaria';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';

// Instanciar repositorios una sola vez
const rutaRepository = new SupabaseRutaRepository();
const busRepository = new SupabaseBusRepository();
const frecuenciaRepository = new SupabaseFrecuenciaRepository();

// Crear instancia del caso de uso
const habilitarRutaDiaria = new HabilitarRutaDiaria(
  rutaRepository,
  busRepository,
  frecuenciaRepository
);

export function useHabilitarRutaDiaria() {
  const rutaCreada = ref<Ruta | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Habilitar una ruta diaria (asignar bus a frecuencia en una fecha)
   */
  const habilitar = async (input: HabilitarRutaInput) => {
    loading.value = true;
    error.value = null;
    rutaCreada.value = null;

    try {
      rutaCreada.value = await habilitarRutaDiaria.ejecutar(input);
      return rutaCreada.value;
    } catch (err: any) {
      error.value = err.message || 'Error habilitando ruta diaria';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Limpiar el estado
   */
  const limpiar = () => {
    rutaCreada.value = null;
    error.value = null;
    loading.value = false;
  };

  return {
    rutaCreada,
    loading,
    error,
    habilitar,
    limpiar,
  };
}
