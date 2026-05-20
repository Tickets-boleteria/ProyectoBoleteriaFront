import { ref, onMounted } from 'vue';
import { SupabaseAuditoriaRepository } from '../../Infrastructure/Repositories/SupabaseAuditoriaRepository';
// Asumimos que crearemos un SupabaseBoletoRepository similar
// import { SupabaseBoletoRepository } from '../../Infrastructure/Repositories/SupabaseBoletoRepository';

export function useReportes() {
  const boletos = ref<any[]>([]);
  const auditoria = ref<any[]>([]);
  const loading = ref({
    boletos: false,
    auditoria: false,
  });
  const error = ref({
    boletos: '',
    auditoria: '',
  });

  const auditoriaRepo = new SupabaseAuditoriaRepository();
  // const boletoRepo = new SupabaseBoletoRepository();

  async function cargarAuditoria() {
    try {
      loading.value.auditoria = true;
      error.value.auditoria = '';
      auditoria.value = await auditoriaRepo.listar();
    } catch (err: any) {
      error.value.auditoria = err.message || 'Error al cargar la auditoría.';
    } finally {
      loading.value.auditoria = false;
    }
  }

  // NOTA: La carga de boletos está pendiente hasta que el repositorio esté listo.
  // Por ahora, mantendremos los mocks para esa parte para no romper la UI.
  async function cargarBoletos(filtros: any) {
    // try {
    //   loading.value.boletos = true;
    //   error.value.boletos = '';
    //   boletos.value = await boletoRepo.listarPorRango(filtros.desde, filtros.hasta);
    // } catch (err: any) {
    //   error.value.boletos = err.message || 'Error al cargar los boletos.';
    // } finally {
    //   loading.value.boletos = false;
    // }
  }

  onMounted(() => {
    cargarAuditoria();
  });

  return { boletos, auditoria, loading, error, cargarAuditoria, cargarBoletos };
}