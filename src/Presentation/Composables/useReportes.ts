import { ref, onMounted } from 'vue';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';
import { supabase } from '../../Infrastructure/Api/supabaseClient';

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

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

  const auditoriaRepo = new SupabaseAuditRepository();

  const mapearBoleto = (row: any) => {
    const ventas = row.Ventas ?? row.ventas ?? {};
    const rutas = ventas.Rutas ?? ventas.rutas ?? {};
    const frecuencias = rutas.Frecuencias ?? rutas.frecuencias ?? {};
    const cooperativas = frecuencias.Cooperativas ?? frecuencias.cooperativas ?? {};

    return {
      id: String(getFieldValue(row, 'Id') ?? getFieldValue(row, 'id') ?? ''),
      fecha: String(getFieldValue(ventas, 'FechaVenta') ?? getFieldValue(ventas, 'fechaventa') ?? getFieldValue(row, 'CreatedAt') ?? getFieldValue(row, 'createdat') ?? '').slice(0, 10),
      ruta: `${String(getFieldValue(frecuencias, 'CiudadOrigen') ?? 'Origen')} → ${String(getFieldValue(frecuencias, 'CiudadDestino') ?? 'Destino')}`,
      cooperativa: String(getFieldValue(cooperativas, 'Nombre') ?? 'Cooperativa'),
      precioBase: Number(getFieldValue(row, 'PrecioFinal') ?? getFieldValue(row, 'preciofinal') ?? 0) + Number(getFieldValue(row, 'DescuentoAplicado') ?? getFieldValue(row, 'descuentoaplicado') ?? 0),
      precioFinal: Number(getFieldValue(row, 'PrecioFinal') ?? getFieldValue(row, 'preciofinal') ?? 0),
      descuento: Number(getFieldValue(row, 'DescuentoAplicado') ?? getFieldValue(row, 'descuentoaplicado') ?? 0),
      categoria: getFieldValue(row, 'EsMenor') ? 'nino' : getFieldValue(row, 'EsDiscapacitado') ? 'discapacidad' : getFieldValue(row, 'EsTerceraEdad') ? 'tercera_edad' : 'ninguno',
    };
  };

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

  async function cargarBoletos(filtros: any) {
    try {
      loading.value.boletos = true;
      error.value.boletos = '';

      let query = supabase
        .from('Boletos')
        .select(`
          Id,
          PrecioFinal,
          DescuentoAplicado,
          EsMenor,
          EsDiscapacitado,
          EsTerceraEdad,
          CreatedAt,
          Ventas!inner(
            Id,
            FechaVenta,
            Rutas!inner(
              Id,
              Fecha,
              Frecuencias!inner(
                Id,
                CiudadOrigen,
                CiudadDestino,
                Cooperativas!inner(Id, Nombre)
              )
            )
          )
        `)
        .order('CreatedAt', { ascending: false });

      if (filtros?.desde) {
        query = query.gte('CreatedAt', `${filtros.desde}T00:00:00`);
      }
      if (filtros?.hasta) {
        query = query.lte('CreatedAt', `${filtros.hasta}T23:59:59`);
      }

      const { data, error: boletosError } = await query;
      if (boletosError) throw new Error(boletosError.message);

      const mapeados = (data || []).map(mapearBoleto);
      boletos.value = mapeados.filter((b) => {
        if (filtros?.cooperativa && b.cooperativa !== filtros.cooperativa) return false;
        if (filtros?.ruta && b.ruta !== filtros.ruta) return false;
        return true;
      });
    } catch (err: any) {
      error.value.boletos = err.message || 'Error al cargar los boletos.';
      boletos.value = [];
    } finally {
      loading.value.boletos = false;
    }
  }

  onMounted(() => {
    cargarAuditoria();
  });

  return { boletos, auditoria, loading, error, cargarAuditoria, cargarBoletos };
}