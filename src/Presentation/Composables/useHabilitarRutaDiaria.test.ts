/**
 * useHabilitarRutaDiaria.test.ts - Tests para el composable Vue
 * Valida que el composable maneja correctamente estados y errores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHabilitarRutaDiaria } from './useHabilitarRutaDiaria';
import { HabilitarRutaDiaria } from '../../Application/UseCases/HabilitarRutaDiaria';
import { DomainException } from '../../Domain/Exceptions/DomainException';

/**
 * Mock de los repositorios
 */
vi.mock('../../Infrastructure/Repositories/SupabaseRutaRepository');
vi.mock('../../Infrastructure/Repositories/SupabaseBusRepository');
vi.mock('../../Infrastructure/Repositories/SupabaseFrecuenciaRepository');

describe('useHabilitarRutaDiaria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Inicialización - Estados correctos
   */
  it('debe inicializar con estados correctos', () => {
    const composable = useHabilitarRutaDiaria();

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBe(null);
    expect(composable.rutaCreada.value).toBe(null);
  });

  /**
   * TEST 2: Ejecutar habilitar exitosamente
   */
  it('debe crear ruta exitosamente y actualizar estado', async () => {
    const composable = useHabilitarRutaDiaria();

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockResolvedValue({
        id: 100,
        frecuenciaId: 1,
        busId: 10,
        fecha: '2026-05-25',
        estado: 'Programada',
        createdAt: new Date(),
      } as any);

    const input = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    await composable.habilitar(input).catch(() => {});

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBe(null);
    expect(composable.rutaCreada.value).toBeDefined();
    expect(composable.rutaCreada.value?.id).toBe(100);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 3: Manejo de error en creación
   */
  it('debe capturar error y actualizar estado', async () => {
    const composable = useHabilitarRutaDiaria();

    const errorMsg = 'Frecuencia no se encuentra activa';
    const error = new DomainException(errorMsg);
    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockRejectedValue(error);

    const input = {
      frecuenciaId: 999,
      busId: 10,
      fecha: '2026-05-25',
    };

    await composable.habilitar(input).catch(() => {});

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBe(errorMsg);
    expect(composable.rutaCreada.value).toBe(null);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 4: Loading state durante ejecución
   */
  it('debe establecer loading en true durante ejecución', async () => {
    const composable = useHabilitarRutaDiaria();

    let loadingEnEjecucion = false;

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockImplementation(async () => {
        loadingEnEjecucion = composable.loading.value === true;
        return {
          id: 100,
          frecuenciaId: 1,
          busId: 10,
          fecha: '2026-05-25',
          estado: 'Programada',
          createdAt: new Date(),
        } as any;
      });

    const input = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    await composable.habilitar(input).catch(() => {});

    expect(loadingEnEjecucion).toBe(true);
    expect(composable.loading.value).toBe(false);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 5: Función limpiar
   */
  it('debe limpiar estados al llamar limpiar()', async () => {
    const composable = useHabilitarRutaDiaria();

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockResolvedValue({
        id: 100,
        frecuenciaId: 1,
        busId: 10,
        fecha: '2026-05-25',
        estado: 'Programada',
        createdAt: new Date(),
      } as any);

    await composable.habilitar({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    }).catch(() => {});

    expect(composable.rutaCreada.value).not.toBe(null);

    composable.limpiar();

    expect(composable.loading.value).toBe(false);
    expect(composable.error.value).toBe(null);
    expect(composable.rutaCreada.value).toBe(null);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 6: Exportación de métodos y refs
   */
  it('debe exportar todos los métodos y refs requeridos', () => {
    const composable = useHabilitarRutaDiaria();

    expect(typeof composable.habilitar).toBe('function');
    expect(typeof composable.limpiar).toBe('function');
    expect(composable.loading).toBeDefined();
    expect(composable.error).toBeDefined();
    expect(composable.rutaCreada).toBeDefined();
  });

  /**
   * TEST 7: Error message preservación
   */
  it('debe preservar el mensaje exacto del error', async () => {
    const composable = useHabilitarRutaDiaria();

    const mensajeError = 'El bus no está disponible en esa fecha';
    const error = new DomainException(mensajeError);
    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockRejectedValue(error);

    await composable.habilitar({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    }).catch(() => {});

    expect(composable.error.value).toBe(mensajeError);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 8: Reactividad de refs
   */
  it('debe mantener reactividad en los refs', async () => {
    const composable = useHabilitarRutaDiaria();

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar');

    mockHabilitar.mockResolvedValueOnce({
      id: 50,
      frecuenciaId: 2,
      busId: 20,
      fecha: '2026-06-01',
      estado: 'Programada',
      createdAt: new Date(),
    } as any);

    await composable.habilitar({
      frecuenciaId: 2,
      busId: 20,
      fecha: '2026-06-01',
    }).catch(() => {});

    expect(composable.rutaCreada.value?.id).toBe(50);

    composable.limpiar();
    expect(composable.rutaCreada.value).toBe(null);

    mockHabilitar.mockResolvedValueOnce({
      id: 60,
      frecuenciaId: 3,
      busId: 30,
      fecha: '2026-06-02',
      estado: 'Programada',
      createdAt: new Date(),
    } as any);

    await composable.habilitar({
      frecuenciaId: 3,
      busId: 30,
      fecha: '2026-06-02',
    }).catch(() => {});

    expect(composable.rutaCreada.value?.id).toBe(60);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 9: Manejo de errores no-DomainException
   */
  it('debe manejar errores no esperados', async () => {
    const composable = useHabilitarRutaDiaria();

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar')
      .mockRejectedValue(new Error('Error desconocido'));

    await composable.habilitar({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    }).catch(() => {});

    expect(composable.error.value).toBe('Error desconocido');
    expect(composable.loading.value).toBe(false);

    mockHabilitar.mockRestore();
  });

  /**
   * TEST 10: Múltiples llamadas secuenciales
   */
  it('debe manejar múltiples llamadas secuenciales correctamente', async () => {
    const composable = useHabilitarRutaDiaria();

    const mockHabilitar = vi.spyOn(HabilitarRutaDiaria.prototype, 'ejecutar');

    mockHabilitar.mockResolvedValueOnce({
      id: 1,
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
      createdAt: new Date(),
    } as any);

    await composable.habilitar({
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    }).catch(() => {});

    expect(composable.rutaCreada.value?.id).toBe(1);

    composable.limpiar();

    mockHabilitar.mockResolvedValueOnce({
      id: 2,
      frecuenciaId: 2,
      busId: 20,
      fecha: '2026-05-26',
      estado: 'Programada',
      createdAt: new Date(),
    } as any);

    await composable.habilitar({
      frecuenciaId: 2,
      busId: 20,
      fecha: '2026-05-26',
    }).catch(() => {});

    expect(composable.rutaCreada.value?.id).toBe(2);
    expect(composable.error.value).toBe(null);

    mockHabilitar.mockRestore();
  });
});
