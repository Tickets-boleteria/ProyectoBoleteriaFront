import { describe, it, expect, vi } from 'vitest';
import { ObtenerConteoCambios } from './ObtenerConteoCambios';

describe('ObtenerConteoCambios', () => {
  it('retorna conteos por tipo desde el repo', async () => {
    const mockRepo: any = { contarImplementadosPorTipo: vi.fn().mockResolvedValue({ normal: 5, estandar: 2, emergencia: 1 }) };
    const caso = new ObtenerConteoCambios(mockRepo);
    const res = await caso.ejecutar();
    expect(res.normal).toBe(5);
    expect(res.estandar).toBe(2);
    expect(res.emergencia).toBe(1);
    expect(mockRepo.contarImplementadosPorTipo).toHaveBeenCalledOnce();
  });
});
