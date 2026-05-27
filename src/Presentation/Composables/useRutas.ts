import { ref, onMounted } from 'vue';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { supabase } from '../../Infrastructure/Api/supabaseClient';
import { Ruta } from '../../Domain/Entities/Ruta';

export function useRutas() {
  const loading = ref(false);
  const error = ref('');
  const success = ref('');

  const rutas = ref<any[]>([]);
  const buses = ref<any[]>([]);
  const frecuencias = ref<any[]>([]);

  const nuevaRuta = ref({
    frecuenciaId: '',
    busId: '',
    fecha: ''
  });

  const cargarDatos = async () => {
    loading.value = true;
    try {
      // 1. Cargar Buses Activos
      // (Tolerante a mayúsculas/minúsculas según la estructura que tengas en la BD)
      const { data: bData } = await supabase.from('Buses').select('*');
      buses.value = (bData || []).filter(b => (b.Estado || b.estado) === 'Activo');

      // 2. Cargar Frecuencias (Tolerante a diferentes formatos)
      const { data: fData } = await supabase.from('Frecuencias').select('*');
      frecuencias.value = (fData || []).filter(f => f.Activa === true || f.activa === true);

      // 3. Cargar Rutas Habilitadas y hacer un "Join" con las otras tablas
      const { data: rData } = await supabase
        .from('Rutas')
        .select(`*, Buses(*), Frecuencias(*)`)
        .order('CreatedAt', { ascending: false });
      
      rutas.value = rData || [];
    } catch (err: any) {
      error.value = 'Error al cargar los datos base del sistema.';
    } finally {
      loading.value = false;
    }
  };

  const registrarRuta = async () => {
    if (!nuevaRuta.value.frecuenciaId || !nuevaRuta.value.busId || !nuevaRuta.value.fecha) {
      error.value = 'Todos los campos son obligatorios.';
      return;
    }
    
    loading.value = true;
    error.value = '';
    success.value = '';
    
    try {
      const repo = new SupabaseRutaRepository();
      
      // Validar si el bus ya está ocupado usando el repositorio que reparamos anteriormente
      const disponible = await repo.verificarBusDisponible(Number(nuevaRuta.value.busId), nuevaRuta.value.fecha);
      if (!disponible) {
        throw new Error('El bus seleccionado ya está asignado a otra ruta en esa misma fecha.');
      }

      // Crear la entidad y enviarla a la BD
      const ruta = new Ruta(Number(nuevaRuta.value.frecuenciaId), Number(nuevaRuta.value.busId), nuevaRuta.value.fecha, 'Programada');
      await repo.crearRuta(ruta);
      
      success.value = 'Ruta diaria creada y habilitada con éxito.';
      nuevaRuta.value = { frecuenciaId: '', busId: '', fecha: '' }; // Limpiar formulario
      await cargarDatos(); // Refrescar la tabla
    } catch (err: any) {
      error.value = err.message || 'Error al crear la ruta.';
    } finally {
      loading.value = false;
    }
  };

  onMounted(cargarDatos);

  return { rutas, buses, frecuencias, nuevaRuta, loading, error, success, registrarRuta };
}