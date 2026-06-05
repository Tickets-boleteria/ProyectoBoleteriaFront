/**
 * HabilitarRutaDiaria.test.ts - Tests para el caso de uso de habilitación de ruta diaria
 * Valida que se pueda asignar un bus a una frecuencia en una fecha específica
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HabilitarRutaDiaria, HabilitarRutaInput } from './HabilitarRutaDiaria';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { Bus } from '../../Domain/Entities/Bus';
import { Frecuencia } from '../../Domain/Entities/Frecuencia';
import { Ruta } from '../../Domain/Entities/Ruta';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IFrecuenciaRepository } from '../../Domain/Repositories/IFrecuenciaRepository';

describe('HabilitarRutaDiaria', () => {
  let habilitarRutaDiaria: HabilitarRutaDiaria;

  // Mocks de los repositorios
  let mockRutaRepo: IRutaRepository;
  let mockBusRepo: IBusRepository;
  let mockFrecuenciaRepo: IFrecuenciaRepository;

  beforeEach(() => {
    /**
     * Paso 3: Crear mocks de los repositorios
     * Los mocks simulan el comportamiento de los repositorios sin acceder a la base de datos
     */
    mockRutaRepo = {
      crearRuta: vi.fn(),
      buscarPorId: vi.fn(),
      verificarBusDisponible: vi.fn(),
      actualizarEstado: vi.fn(),
    };

    mockBusRepo = {
      obtenerTodos: vi.fn(),
      obtenerPorCooperativa: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorPlaca: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminarLogico: vi.fn(),
      obtenerAsientos: vi.fn(),
      obtenerAsientosDisponibles: vi.fn(),
      actualizarAsiento: vi.fn(),
      reservarAsientos: vi.fn(),
      liberarAsientos: vi.fn(),
      buscarDisponibles: vi.fn(),
    };

    mockFrecuenciaRepo = {
      crear: vi.fn(),
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      actualizar: vi.fn(),
      eliminarLogico: vi.fn(),
      agregarParada: vi.fn(),
      obtenerParadasPorFrecuencia: vi.fn(),
      actualizarParada: vi.fn(),
      eliminarParada: vi.fn(),
    };

    // Crear instancia del caso de uso con los mocks
    habilitarRutaDiaria = new HabilitarRutaDiaria(mockRutaRepo, mockBusRepo, mockFrecuenciaRepo);
  });

  /**
   * TEST 1: Caso de éxito - Habilitar ruta diaria correctamente
   * Todos los datos son válidos: fecha, frecuencia activa, bus activo, bus disponible
   */
  it('debe habilitar una ruta diaria cuando todos los datos son válidos', async () => {
    // Preparar datos
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const frecuenciaValida = new Frecuencia(
      1, // cooperativaId
      'Quito',
      'Cuenca',
      '08:00',
      true, // esDirecto
      true // activa
    );
    frecuenciaValida.id = 1;

    const busValido = new Bus(1, '001', 'ABC-123', 40);
    busValido.id = 10;
    busValido.estado = 'Activo';

    const rutaEsperada = new Ruta(1, 10, '2026-05-25', 'Programada', 100);

    // Configurar mocks para que devuelvan datos válidos
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaValida);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busValido);
    vi.mocked(mockRutaRepo.verificarBusDisponible).mockResolvedValue(true); // Bus disponible
    vi.mocked(mockRutaRepo.crearRuta).mockResolvedValue(rutaEsperada);

    // Ejecutar
    const resultado = await habilitarRutaDiaria.ejecutar(input);

    // Aserciones
    expect(resultado).toBeDefined();
    expect(resultado.frecuenciaId).toBe(1);
    expect(resultado.busId).toBe(10);
    expect(resultado.fecha).toBe('2026-05-25');
    expect(resultado.estado).toBe('Programada');

    // Verificar que se llamaron los métodos correctos
    expect(mockFrecuenciaRepo.obtenerPorId).toHaveBeenCalledWith(1);
    expect(mockBusRepo.obtenerPorId).toHaveBeenCalledWith(10);
    expect(mockRutaRepo.verificarBusDisponible).toHaveBeenCalledWith(10, '2026-05-25', 1);
    expect(mockRutaRepo.crearRuta).toHaveBeenCalled();
  });

  /**
   * TEST 2: Validación - Fecha inválida
   * Debe rechazar fechas que no sean válidas
   */
  it('debe rechazar una fecha inválida', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: 'fecha-invalida',
    };

    // Ejecutar y esperar que lance excepción
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/fecha.*válida/i);
  });

  /**
   * TEST 3: Validación - Fecha vacía
   */
  it('debe rechazar una fecha vacía', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '',
    };

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
  });

  /**
   * TEST 4: Validación - Frecuencia no existe
   */
  it('debe rechazar si la frecuencia no existe', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 999, // ID que no existe
      busId: 10,
      fecha: '2026-05-25',
    };

    // Configurar mock para que devuelva null
    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(null);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/frecuencia.*no existe/i);
  });

  /**
   * TEST 5: Validación - Frecuencia inactiva
   */
  it('debe rechazar si la frecuencia está inactiva', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const frecuenciaInactiva = new Frecuencia(
      1,
      'Quito',
      'Cuenca',
      '08:00',
      true,
      false // activa = false
    );
    frecuenciaInactiva.id = 1;

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaInactiva);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/activa/i);
  });

  /**
   * TEST 6: Validación - Bus no existe
   */
  it('debe rechazar si el bus no existe', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 999, // ID que no existe
      fecha: '2026-05-25',
    };

    const frecuenciaValida = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', true, true);
    frecuenciaValida.id = 1;

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaValida);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(null);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/bus.*no existe/i);
  });

  /**
   * TEST 7: Validación - Bus inactivo
   */
  it('debe rechazar si el bus no está en estado Activo', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const frecuenciaValida = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', true, true);
    frecuenciaValida.id = 1;

    const busInactivo = new Bus(1, '001', 'ABC-123', 40);
    busInactivo.id = 10;
    busInactivo.estado = 'Inactivo'; // Estado no activo

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaValida);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busInactivo);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/no está en estado Activo/i);
  });

  /**
   * TEST 8: Validación - Bus no disponible en esa fecha
   */
  it('debe rechazar si el bus ya está asignado a otra ruta en esa fecha', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const frecuenciaValida = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', true, true);
    frecuenciaValida.id = 1;

    const busValido = new Bus(1, '001', 'ABC-123', 40);
    busValido.id = 10;
    busValido.estado = 'Activo';

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaValida);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busValido);
    vi.mocked(mockRutaRepo.verificarBusDisponible).mockResolvedValue(false); // Bus NO disponible

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/ya se encuentra asignado/i);
  });

  /**
   * TEST 9: Verificar el orden de validaciones
   * Las validaciones deben ejecutarse en el orden correcto: fecha -> frecuencia -> bus -> disponibilidad
   */
  it('debe validar fecha antes de validar frecuencia', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: 'invalida',
    };

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);

    // Verificar que no se consultó la frecuencia
    expect(mockFrecuenciaRepo.obtenerPorId).not.toHaveBeenCalled();
  });

  /**
   * TEST 10: Verificar que se crea la ruta con estado 'Programada' por defecto
   */
  it('debe crear la ruta con estado Programada por defecto', async () => {
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-05-25',
    };

    const frecuenciaValida = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', true, true);
    frecuenciaValida.id = 1;

    const busValido = new Bus(1, '001', 'ABC-123', 40);
    busValido.id = 10;
    busValido.estado = 'Activo';

    const rutaEsperada = new Ruta(1, 10, '2026-05-25', 'Programada', 100);

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaValida);
    vi.mocked(mockBusRepo.obtenerPorId).mockResolvedValue(busValido);
    vi.mocked(mockRutaRepo.verificarBusDisponible).mockResolvedValue(true);
    vi.mocked(mockRutaRepo.crearRuta).mockResolvedValue(rutaEsperada);

    const resultado = await habilitarRutaDiaria.ejecutar(input);

    expect(resultado.estado).toBe('Programada');
  });

  /**
   * TEST 11: Validación - Día de la semana no permitido
   */
  it('debe rechazar si la fecha no coincide con los días de operación de la frecuencia', async () => {
    // 2026-06-04 es Jueves
    const input: HabilitarRutaInput = {
      frecuenciaId: 1,
      busId: 10,
      fecha: '2026-06-04',
    };

    const frecuenciaLunesMiercoles = new Frecuencia(1, 'Quito', 'Cuenca', '08:00', true, true);
    frecuenciaLunesMiercoles.id = 1;
    frecuenciaLunesMiercoles.diasOperacion = ['Lunes', 'Miércoles'];

    vi.mocked(mockFrecuenciaRepo.obtenerPorId).mockResolvedValue(frecuenciaLunesMiercoles);

    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(DomainException);
    await expect(habilitarRutaDiaria.ejecutar(input)).rejects.toThrow(/no opera los días Jueves/i);
  });
});
