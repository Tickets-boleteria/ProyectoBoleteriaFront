import { describe, it, expect, vi } from 'vitest';
import { useAsignarBusAFrecuencia } from './useAsignarBusAFrecuencia';
import { AsignarBusAFrecuencia } from '../../Application/UseCases/AsignarBusAFrecuencia';
import { DomainException } from '../../Domain/Exceptions/DomainException';

vi.mock('../../Infrastructure/Repositories/SupabaseRutaRepository');
vi.mock('../../Infrastructure/Repositories/SupabaseBusRepository');
vi.mock('../../Infrastructure/Repositories/SupabaseFrecuenciaRepository');
vi.mock('../../Infrastructure/Repositories/SupabaseAuditRepository');

describe('useAsignarBusAFrecuencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa con estados por defecto', () => {
    const c = useAsignarBusAFrecuencia();
    expect(c.loading.value).toBe(false);
    expect(c.error.value).toBe(null);
    expect(c.resultado.value).toBe(null);
  });

  it('asigna correctamente y actualiza estado', async () => {
    const spy = vi.spyOn(AsignarBusAFrecuencia.prototype, 'ejecutar').mockResolvedValue({ id: 1 } as any);
    const c = useAsignarBusAFrecuencia();

    const res = await c.asignar({ frecuenciaId: 1, busId: 2, fecha: '2026-05-20' });

    expect(c.loading.value).toBe(false);
    expect(c.error.value).toBe(null);
    expect(c.resultado.value).toBeDefined();
    expect(res).toEqual({ id: 1 });

    spy.mockRestore();
  });

  it('captura error y setea error.message', async () => {
    const err = new DomainException('No disponible');
    const spy = vi.spyOn(AsignarBusAFrecuencia.prototype, 'ejecutar').mockRejectedValue(err);
    const c = useAsignarBusAFrecuencia();

    await c.asignar({ frecuenciaId: 1, busId: 2, fecha: '2026-05-20' }).catch(() => {});

    expect(c.loading.value).toBe(false);
    expect(c.error.value).toBe('No disponible');

    spy.mockRestore();
  });
});
