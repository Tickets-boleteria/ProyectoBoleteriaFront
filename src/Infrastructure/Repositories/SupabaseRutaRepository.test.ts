/**
 * SupabaseRutaRepository.test.ts - Tests para el repositorio de rutas diarias
 * Valida que el repositorio mapea correctamente datos y hace consultas a Supabase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseRutaRepository } from './SupabaseRutaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { DomainException } from '../../Domain/Exceptions/DomainException';

/**
 * Mock de Supabase
 * Simulamos el cliente de Supabase sin conectar a la base de datos real
 */
vi.mock('../Api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../Api/supabaseClient';

describe('SupabaseRutaRepository', () => {
  let repository: SupabaseRutaRepository;

  beforeEach(() => {
    repository = new SupabaseRutaRepository();
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Crear una ruta diaria correctamente
   */
  it('debe crear una ruta diaria correctamente', async () => {
    const ruta = new Ruta(1, 10, '2026-05-25', 'Programada');

    const datosInsertados = {
      id: 100,
      frecuencia_id: 1,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
      created_at: '2026-05-19T10:00:00Z',
    };

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: datosInsertados,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    mockInsert.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      single: mockSingle,
    });

    const resultado = await repository.crearRuta(ruta);

    expect(resultado).toBeDefined();
    expect(resultado.id).toBe(100);
    expect(resultado.frecuenciaId).toBe(1);
    expect(resultado.busId).toBe(10);
    expect(resultado.fecha).toBe('2026-05-25');
    expect(resultado.estado).toBe('Programada');
    expect(supabase.from).toHaveBeenCalledWith('RutasDiarias');
  });

  /**
   * TEST 2: Manejar error al crear ruta
   */
  it('debe lanzar excepción si hay error al crear ruta', async () => {
    const ruta = new Ruta(1, 10, '2026-05-25', 'Programada');

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Error en base de datos' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    mockInsert.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      single: mockSingle,
    });

    await expect(repository.crearRuta(ruta)).rejects.toThrow(DomainException);
    await expect(repository.crearRuta(ruta)).rejects.toThrow(/Error al crear ruta diaria/);
  });

  /**
   * TEST 3: Buscar ruta por ID cuando existe
   */
  it('debe buscar una ruta por ID correctamente', async () => {
    const datosRuta = {
      id: 100,
      frecuencia_id: 1,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
      created_at: '2026-05-19T10:00:00Z',
    };

    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: datosRuta,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    } as any);

    mockEq.mockReturnValue({
      single: mockSingle,
    });

    const resultado = await repository.buscarPorId(100);

    expect(resultado).toBeDefined();
    expect(resultado?.id).toBe(100);
    expect(resultado?.frecuenciaId).toBe(1);
    expect(supabase.from).toHaveBeenCalledWith('RutasDiarias');
  });

  /**
   * TEST 4: Buscar ruta por ID cuando no existe (devuelve null)
   */
  it('debe devolver null cuando la ruta no existe', async () => {
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    } as any);

    mockEq.mockReturnValue({
      single: mockSingle,
    });

    const resultado = await repository.buscarPorId(999);

    expect(resultado).toBeNull();
  });

  /**
   * TEST 5: Verificar disponibilidad del bus cuando está disponible
   */
  it('debe retornar true cuando el bus está disponible en esa fecha', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockIn = vi.fn().mockReturnValue({
      limit: mockLimit,
    });

    const mockEq2 = vi.fn().mockReturnValue({
      in: mockIn,
    });

    const mockEq1 = vi.fn().mockReturnValue({
      eq: mockEq2,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq1,
      }),
    } as any);

    const resultado = await repository.verificarBusDisponible(10, '2026-05-25');

    expect(resultado).toBe(true);
  });

  /**
   * TEST 6: Verificar disponibilidad del bus cuando NO está disponible
   */
  it('debe retornar false cuando el bus NO está disponible en esa fecha', async () => {
    const datosRutaExistente = {
      id: 50,
      frecuencia_id: 1,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
    };

    const mockLimit = vi.fn().mockResolvedValue({
      data: [datosRutaExistente],
      error: null,
    });

    const mockIn = vi.fn().mockReturnValue({
      limit: mockLimit,
    });

    const mockEq2 = vi.fn().mockReturnValue({
      in: mockIn,
    });

    const mockEq1 = vi.fn().mockReturnValue({
      eq: mockEq2,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq1,
      }),
    } as any);

    const resultado = await repository.verificarBusDisponible(10, '2026-05-25');

    expect(resultado).toBe(false);
  });

  /**
   * TEST 7: Actualizar estado de ruta
   */
  it('debe actualizar el estado de una ruta correctamente', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    await repository.actualizarEstado(100, 'En curso');

    expect(supabase.from).toHaveBeenCalledWith('RutasDiarias');
  });

  /**
   * TEST 8: Manejar error al actualizar estado
   */
  it('debe lanzar excepción si hay error al actualizar estado', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'Error en actualización' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    await expect(repository.actualizarEstado(100, 'En curso')).rejects.toThrow(DomainException);
  });

  /**
   * TEST 9: Obtener rutas de un bus en una fecha
   */
  it('debe obtener todas las rutas de un bus en una fecha específica', async () => {
    const datosRuta1 = {
      id: 100,
      frecuencia_id: 1,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
    };

    const datosRuta2 = {
      id: 101,
      frecuencia_id: 2,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'Programada',
    };

    const mockOrder = vi.fn().mockResolvedValue({
      data: [datosRuta1, datosRuta2],
      error: null,
    });

    const mockEq2 = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockEq1 = vi.fn().mockReturnValue({
      eq: mockEq2,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq1,
      }),
    } as any);

    const resultado = await repository.obtenerRutasPorBusYFecha(10, '2026-05-25');

    expect(resultado).toBeDefined();
    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado.length).toBe(2);
  });

  /**
   * TEST 10: Mapeador de datos Supabase -> Entidad Ruta
   */
  it('debe mapear correctamente datos de Supabase a entidad Ruta', async () => {
    const datosRuta = {
      id: 100,
      frecuencia_id: 1,
      bus_id: 10,
      fecha: '2026-05-25',
      estado: 'En curso',
      created_at: '2026-05-19T10:00:00Z',
    };

    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: datosRuta,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    } as any);

    mockEq.mockReturnValue({
      single: mockSingle,
    });

    const resultado = await repository.buscarPorId(100);

    expect(resultado?.id).toBe(100);
    expect(resultado?.frecuenciaId).toBe(1);
    expect(resultado?.busId).toBe(10);
    expect(resultado?.fecha).toBe('2026-05-25');
    expect(resultado?.estado).toBe('En curso');
    expect(resultado?.createdAt).toBeInstanceOf(Date);
  });
});
