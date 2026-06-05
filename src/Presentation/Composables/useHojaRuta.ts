import { ref } from 'vue';
import { HojaRuta } from '../../Domain/Entities/HojaRuta';
import { GestionarHojaRuta } from '../../Application/UseCases/GestionarHojaRuta';
import { AsignarRutaAHoja } from '../../Application/UseCases/AsignarRutaAHoja';
import { SupabaseHojaRutaRepository } from '../../Infrastructure/Repositories/SupabaseHojaRutaRepository';
import { SupabaseFrecuenciaRepository } from '../../Infrastructure/Repositories/SupabaseFrecuenciaRepository';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { supabase } from '../../Infrastructure/Api/supabaseClient';

import { useAuthStore } from '../Store/authStore';

const hojaRutaRepository = new SupabaseHojaRutaRepository();
const frecuenciaRepository = new SupabaseFrecuenciaRepository();
const rutaRepository = new SupabaseRutaRepository();

const gestionarHojaRuta = new GestionarHojaRuta(hojaRutaRepository, frecuenciaRepository);
const asignarRutaAHoja = new AsignarRutaAHoja(hojaRutaRepository, rutaRepository, frecuenciaRepository);

export function useHojaRuta() {
  const authStore = useAuthStore();
  const hojasRuta = ref<HojaRuta[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const cargarPorFecha = async (fecha: string) => {
    loading.value = true;
    error.value = null;
    try {
      hojasRuta.value = await gestionarHojaRuta.listarPorFecha(fecha);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando hojas de ruta';
    } finally {
      loading.value = false;
    }
  };

  const agregarTrayecto = async (busId: number, frecuenciaId: number, fecha: string) => {
    loading.value = true;
    error.value = null;
    try {
      const usuarioId = authStore.user?.usuarioTablaId || authStore.user?.id;
      
      if (!usuarioId) {
        throw new Error('No se pudo identificar al usuario creador.');
      }

      const result = await asignarRutaAHoja.ejecutar({ 
        busId, 
        frecuenciaId, 
        fecha, 
        usuarioCreadorId: String(usuarioId) 
      });
      if (!result.success) {
        error.value = result.error || 'Error desconocido';
        return false;
      }
      await cargarPorFecha(fecha);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error asignando trayecto';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const iniciarHoja = async (id: number, fecha: string) => {
    await gestionarHojaRuta.iniciarRuta(id);
    await cargarPorFecha(fecha);
  };

  const toggleTipoRuta = async (ruta: any, fecha: string) => {
    loading.value = true;
    try {
      const nuevoValor = !ruta.esDirecta;
      const { error: err } = await supabase
        .from('Rutas')
        .update({ es_directa: nuevoValor })
        .eq('Id', ruta.id);

      if (err) throw err;
      await cargarPorFecha(fecha);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error actualizando tipo de ruta';
    } finally {
      loading.value = false;
    }
  };

  const finalizarRuta = async (id: number, fechaSalida: string) => {
    await gestionarHojaRuta.finalizarRuta(id);
    await cargarPorFecha(fechaSalida);
  };

  const cancelarRuta = async (id: number, fechaSalida: string) => {
    await gestionarHojaRuta.cancelarRuta(id);
    await cargarPorFecha(fechaSalida);
  };

  return {
    hojasRuta,
    loading,
    error,
    cargarPorFecha,
    agregarTrayecto,
    iniciarRuta,
    finalizarRuta,
    cancelarRuta,
    toggleTipoRuta,
  };
}
