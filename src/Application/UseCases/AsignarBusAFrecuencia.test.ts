import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsignarBusAFrecuencia } from './AsignarBusAFrecuencia';
import { HabilitarRutaDiaria } from './HabilitarRutaDiaria';

// Mocks simples para repositorios
const mockRutaRepo: any = { verificarBusDisponible: vi.fn().mockResolvedValue(true), crearRuta: vi.fn().mockResolvedValue({ id: 1 }) };
const mockBusRepo: any = { obtenerPorId: vi.fn().mockResolvedValue({ id: 3, estado: 'Activo' }) };
const mockFrecuenciaRepo: any = { obtenerPorId: vi.fn().mockResolvedValue({ id: 2, activa: true }) };
const mockAuditRepo: any = { logCambio: vi.fn().mockResolvedValue(undefined), contarPorTipo: vi.fn().mockResolvedValue({ normal: 0, estandar: 0, emergencia: 0 }) };
const mockCambiosRepo: any = { marcarImplementado: vi.fn().mockResolvedValue(undefined), contarImplementadosPorTipo: vi.fn().mockResolvedValue({ normal: 0, estandar: 0, emergencia: 0 }) };

describe('AsignarBusAFrecuencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to HabilitarRutaDiaria and returns created route', async () => {
    const asignar = new AsignarBusAFrecuencia(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);

    const expected = { id: 1, frecuenciaId: 2, busId: 3, fecha: '2026-05-20' };

    const spy = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar').mockResolvedValue(expected as any);

    const result = await asignar.ejecutar({ frecuenciaId: 2, busId: 3, fecha: '2026-05-20' });

    expect(result).toEqual(expected);
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });

  it('denies execution when user role is not admin', async () => {
    const asignar = new AsignarBusAFrecuencia(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);

    await expect(asignar.ejecutar({ frecuenciaId: 2, busId: 3, fecha: '2026-05-20', usuarioRole: 'oficinista' as any })).rejects.toThrow(/Permiso denegado/);
  });

  it('logs audit when auditRepo provided', async () => {
    const asignar = new AsignarBusAFrecuencia(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo, mockAuditRepo);
    const expected = { id: 2, frecuenciaId: 2, busId: 3, fecha: '2026-05-20' };
    const spy = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar').mockResolvedValue(expected as any);

    const result = await asignar.ejecutar({ frecuenciaId: 2, busId: 3, fecha: '2026-05-20', usuarioId: 'admin1', tipoCambio: 'estandar' });

    expect(result).toEqual(expected);
    expect(mockAuditRepo.logCambio).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('marca el cambio como implementado si se proporciona cambioId', async () => {
    const asignar = new AsignarBusAFrecuencia(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo, mockAuditRepo, mockCambiosRepo);
    const spy = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar').mockResolvedValue({ id: 10 } as any);

    const res = await asignar.ejecutar({ frecuenciaId: 2, busId: 3, fecha: '2026-05-20', cambioId: 99, usuarioId: 'admin1' } as any);

    expect(mockCambiosRepo.marcarImplementado).toHaveBeenCalledWith(99, expect.any(Date), 'ruta/10');

    spy.mockRestore();
  });
});
