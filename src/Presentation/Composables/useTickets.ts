import { ref } from 'vue';
import { VerHistorialBoletos } from '../../Application/UseCases/VerHistorialBoletos';
import { SupabaseTicketRepository } from '../../Infrastructure/Repositories/SupabaseTicketRepository';

export function useTickets() {
  const boletos = ref<any[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  /**
   * Implementación base para validación de flujo de datos entre capas.
   */
  const cargarHistorial = async (usuarioId: number) => {
    isLoading.value = true;
    errorMessage.value = null;
    
    try {
      const ticketRepo = new SupabaseTicketRepository();
      const casoDeUso = new VerHistorialBoletos(ticketRepo);
      
      boletos.value = await casoDeUso.ejecutar(usuarioId);
    } catch (error: any) {
      errorMessage.value = error.message;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    boletos,
    isLoading,
    errorMessage,
    cargarHistorial
  };
}