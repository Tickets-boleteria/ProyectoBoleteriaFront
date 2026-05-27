import { ref, onMounted, watch } from 'vue';
import { Bus } from '../../Domain/Entities/Bus';
import { CrearBus, CrearBusInput } from '../../Application/UseCases/CrearBus';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';

const crearBusVacio = (): CrearBusInput => ({
  cooperativaId: 1,
  numero: '',
  placa: '',
  estructura: 'UnPiso',
  asientosNormales: 40,
  asientosVip: 0,
  asientosEjecutivos: 0,
  totalAsientos: 40,
});

export function useBuses() {
  const buses = ref<Bus[]>([]);
  const loading = ref(false);
  const error = ref('');

  const busRepo = new SupabaseBusRepository();
  const crearBusUseCase = new CrearBus(busRepo);

  const nuevoBus = ref<CrearBusInput>(crearBusVacio());

  const recalcularTotalAsientos = () => {
    const normales = Number(nuevoBus.value.asientosNormales ?? 0);
    const vip = Number(nuevoBus.value.asientosVip ?? 0);
    const ejecutivos = Number(nuevoBus.value.asientosEjecutivos ?? 0);

    if (nuevoBus.value.estructura === 'UnPiso') {
      nuevoBus.value.asientosVip = 0;
      nuevoBus.value.asientosEjecutivos = 0;
      nuevoBus.value.totalAsientos = normales;
      return;
    }

    nuevoBus.value.totalAsientos = normales + vip + ejecutivos;
  };

  watch(
    () => [nuevoBus.value.estructura, nuevoBus.value.asientosNormales, nuevoBus.value.asientosVip, nuevoBus.value.asientosEjecutivos],
    () => recalcularTotalAsientos(),
    { immediate: true }
  );

  watch(
    () => nuevoBus.value.estructura,
    (estructura) => {
      if (estructura === 'UnPiso') {
        nuevoBus.value.asientosVip = 0;
        nuevoBus.value.asientosEjecutivos = 0;
      }
    }
  );

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
      nuevoBus.value = crearBusVacio();
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