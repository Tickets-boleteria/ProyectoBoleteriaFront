import { ref } from 'vue';
import { HojaRuta, CrearHojaRutaManualDto } from '../../Domain/Entities/HojaRuta';
import { GestionarHojaRuta } from '../../Application/UseCases/GestionarHojaRuta';
import { SupabaseHojaRutaRepository } from '../../Infrastructure/Repositories/SupabaseHojaRutaRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';

const hojaRutaRepository = new SupabaseHojaRutaRepository();
const frecuenciaRepository = new SupabaseFrecuenciaRepository();
const gestionarHojaRuta = new GestionarHojaRuta(hojaRutaRepository, frecuenciaRepository);

export function useHojaRuta() {
  const hojasRuta = ref<HojaRuta[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const cargarPorFecha = async (fechaSalida: string) => {
    loading.value = true;
    error.value = null;
    try {
      hojasRuta.value = await gestionarHojaRuta.listarPorFecha(fechaSalida);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando hojas de ruta';
    } finally {
      loading.value = false;
    }
  };

  const generarAutomaticas = async (fechaSalida: string) => {
    loading.value = true;
    error.value = null;
    try {
      const creadas = await gestionarHojaRuta.generarAutomaticas({ fechaSalida });
      await cargarPorFecha(fechaSalida);
      return creadas;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error generando hojas de ruta';
      return [];
    } finally {
      loading.value = false;
    }
  };

  const crearManual = async (dto: CrearHojaRutaManualDto) => {
    loading.value = true;
    error.value = null;
    try {
      const creada = await gestionarHojaRuta.crearManual(dto);
      hojasRuta.value.push(creada);
      return creada;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando hoja de ruta manual';
      return null;
    } finally {
      loading.value = false;
    }
  };

  const iniciarRuta = async (id: string, fechaSalida: string) => {
    await gestionarHojaRuta.iniciarRuta(id);
    await cargarPorFecha(fechaSalida);
  };

  const finalizarRuta = async (id: string, fechaSalida: string) => {
    await gestionarHojaRuta.finalizarRuta(id);
    await cargarPorFecha(fechaSalida);
  };

  const cancelarRuta = async (id: string, fechaSalida: string) => {
    await gestionarHojaRuta.cancelarRuta(id);
    await cargarPorFecha(fechaSalida);
  };

  return {
    hojasRuta,
    loading,
    error,
    cargarPorFecha,
    generarAutomaticas,
    crearManual,
    iniciarRuta,
    finalizarRuta,
    cancelarRuta,
  };
}
