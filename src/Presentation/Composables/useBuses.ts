import { ref, onMounted } from 'vue';
import { Bus } from '../../Domain/Entities/Bus';
import { CrearBus, CrearBusInput } from '../../Application/UseCases/CrearBus';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';

export function useBuses() {
  const buses = ref<Bus[]>([]);
  const loading = ref(false);
  const error = ref('');

  const busRepo = new SupabaseBusRepository();
  const crearBusUseCase = new CrearBus(busRepo);

  const nuevoBus = ref<CrearBusInput>({
    cooperativaId: 1, // Asumimos ID 1 para la única cooperativa
    numero: '',
    placa: '',
    totalAsientos: 40,
  });

  async function cargarBuses() {
    try {
      loading.value = true;
      error.value = '';
      // Usamos obtenerTodos que asumimos existe en el repo
      buses.value = await busRepo.obtenerTodos();
    } catch (err: any) {
      error.value = err.message || 'Error al cargar los buses.';
    } finally {
      loading.value = false;
    }
  }

  async function registrarBus() {
    try {
      loading.value = true;
      error.value = '';
      await crearBusUseCase.ejecutar(nuevoBus.value);
      // Limpiar formulario y recargar lista
      nuevoBus.value.numero = '';
      nuevoBus.value.placa = '';
      await cargarBuses();
    } catch (err: any) {
      error.value = err.message || 'Error al registrar el bus.';
    } finally {
      loading.value = false;
    }
  }

  onMounted(cargarBuses);

  return {
    buses,
    nuevoBus,
    loading,
    error,
    registrarBus,
  };
}