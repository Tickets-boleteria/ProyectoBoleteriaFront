import { ref } from 'vue';
import { SupabaseTicketRepository } from '../../Infrastructure/Repositories/SupabaseTicketRepository';
import { VerHistorialBoletos } from '../../Application/UseCases/VerHistorialBoletos';

export function useTestConnection() {
  const data = ref<any[]>([]);
  const error = ref<string | null>(null);

  // Instanciamos la infraestructura y el caso de uso
  const repo = new SupabaseTicketRepository();
  const useCase = new VerHistorialBoletos(repo);

  const testFetch = async () => {
    try {
      // Intentamos traer datos (ajusta el ID según un usuario existente o cambia el método temporalmente)
      const result = await useCase.ejecutar(1); 
      data.value = result;
    } catch (err: any) {
      error.value = err.message;
    }
  };

  return { data, error, testFetch };
}