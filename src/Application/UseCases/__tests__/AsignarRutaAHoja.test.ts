import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsignarRutaAHoja } from '../AsignarRutaAHoja';
import { IHojaRutaRepository } from '../../../Domain/Repositories/IHojaRutaRepository';
import { IRutaRepository } from '../../../Domain/Repositories/IRutaRepository';
import { IFrecuenciaRepository } from '../../../Domain/Repositories/IFrecuenciaRepository';
import { HojaRuta } from '../../../Domain/Entities/HojaRuta';
import { Ruta } from '../../../Domain/Entities/Ruta';
import { Frecuencia } from '../../../Domain/Entities/Frecuencia';

describe('AsignarRutaAHoja', () => {
  let useCase: AsignarRutaAHoja;
  let mockHojaRutaRepo: vi.Mocked<IHojaRutaRepository>;
  let mockRutaRepo: vi.Mocked<IRutaRepository>;
  let mockFrecuenciaRepo: vi.Mocked<IFrecuenciaRepository>;

  beforeEach(() => {
    mockHojaRutaRepo = {
      crear: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorFecha: vi.fn(),
      actualizarEstado: vi.fn(),
    } as any;

    mockRutaRepo = {
      crearRuta: vi.fn(),
      buscarPorId: vi.fn(),
      actualizarEstado: vi.fn(),
      verificarBusDisponible: vi.fn(),
      obtenerRutaActivaPorBus: vi.fn(),
    } as any;

    mockFrecuenciaRepo = {
      obtenerPorId: vi.fn(),
      listarTodas: vi.fn(),
      crear: vi.fn(),
    } as any;

    useCase = new AsignarRutaAHoja(mockHojaRutaRepo, mockRutaRepo, mockFrecuenciaRepo);
  });

  it('debe asignar una ruta a una hoja de ruta existente si no hay solapamiento', async () => {
    const hojaRuta: HojaRuta = {
      id: 1,
      fecha: '2026-06-10',
      estado: 'PROGRAMADA',
      tipoGeneracion: 'MANUAL',
      rutas: [
        new Ruta(1, 50, '2026-06-10', 'Programada', 101, null, '07:00', '10:00')
      ]
    };

    const frecuenciaNueva = new Frecuencia(1, 'Quito', 'Ambato', '12:00', true);
    frecuenciaNueva.id = 2;

    mockHojaRutaRepo.obtenerPorFecha.mockResolvedValue([hojaRuta]);
    mockFrecuenciaRepo.obtenerPorId.mockResolvedValue(frecuenciaNueva);
    mockRutaRepo.crearRuta.mockResolvedValue({ id: 102 } as any);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 2,
      fecha: '2026-06-10'
    });

    expect(result.success).toBe(true);
    expect(mockRutaRepo.crearRuta).toHaveBeenCalled();
  });

  it('debe fallar si la nueva ruta se solapa con una existente para el mismo bus', async () => {
    const hojaRuta: HojaRuta = {
      id: 1,
      fecha: '2026-06-10',
      estado: 'PROGRAMADA',
      tipoGeneracion: 'MANUAL',
      rutas: [
        new Ruta(1, 50, '2026-06-10', 'Programada', 101, null, '07:00', '10:00')
      ]
    };

    const frecuenciaSolapada = new Frecuencia(1, 'Quito', 'Latacunga', '08:00', true);
    frecuenciaSolapada.id = 3;

    mockHojaRutaRepo.obtenerPorFecha.mockResolvedValue([hojaRuta]);
    mockFrecuenciaRepo.obtenerPorId.mockResolvedValue(frecuenciaSolapada);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 3,
      fecha: '2026-06-10'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('solapa');
  });

  it('debe permitir asignar una ruta si el horario se solapa pero es para otro bus', async () => {
    const hojaRuta: HojaRuta = {
      id: 1,
      fecha: '2026-06-10',
      estado: 'PROGRAMADA',
      tipoGeneracion: 'MANUAL',
      rutas: [
        new Ruta(1, 51, '2026-06-10', 'Programada', 101, null, '07:00', '10:00')
      ]
    };

    const frecuenciaSolapadaEnTiempo = new Frecuencia(1, 'Quito', 'Latacunga', '08:00', true);
    frecuenciaSolapadaEnTiempo.id = 3;

    mockHojaRutaRepo.obtenerPorFecha.mockResolvedValue([hojaRuta]);
    mockFrecuenciaRepo.obtenerPorId.mockResolvedValue(frecuenciaSolapadaEnTiempo);
    mockRutaRepo.crearRuta.mockResolvedValue({ id: 102 } as any);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 3,
      fecha: '2026-06-10'
    });

    expect(result.success).toBe(true);
    expect(mockRutaRepo.crearRuta).toHaveBeenCalled();
  });

  it('debe crear una nueva hoja de ruta si no existe para esa fecha', async () => {
    mockHojaRutaRepo.obtenerPorFecha.mockResolvedValue([]);
    mockFrecuenciaRepo.obtenerPorId.mockResolvedValue(new Frecuencia(1, 'A', 'B', '07:00'));
    mockHojaRutaRepo.crear.mockResolvedValue({ id: 2 } as any);

    const result = await useCase.ejecutar({
      busId: 50,
      frecuenciaId: 1,
      fecha: '2026-06-10'
    });

    expect(result.success).toBe(true);
    expect(mockHojaRutaRepo.crear).toHaveBeenCalled();
  });
});
