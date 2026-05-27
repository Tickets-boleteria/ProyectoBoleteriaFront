/**
 * SupabaseBusRepository.ts - Implementación para gestionar la entidad Bus.
 */

import { supabase } from '../Api/supabaseClient';
import { Bus } from '../../Domain/Entities/Bus';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

// Extractor robusto para leer las columnas sin importar mayúsculas o minúsculas (ej. Numero, NUMERO, numero)
const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? obj[key] : undefined;
};

export class SupabaseBusRepository implements IBusRepository {
  private readonly tabla = 'Buses';

  async obtenerTodos(): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      // Usamos el nombre de la columna con la primera letra mayúscula
      .order('Numero', { ascending: true });

    if (error) {
      throw new DomainException(`Error al obtener todos los buses: ${error.message}`);
    }

    return (data || []).map(this.mapearBus);
  }

  async obtenerPorId(id: number): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // No rows found
      throw new DomainException(`Error al obtener bus por ID: ${error.message}`);
    }

    return data ? this.mapearBus(data) : null;
  }

  async obtenerPorPlaca(placa: string): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .ilike('Placa', placa.trim())
      .single();

    // 'PGRST116' is the code for "No rows found", which is not an error in this case.
    if (error && error.code !== 'PGRST116') {
      throw new DomainException(`Error al obtener bus por placa: ${error.message}`);
    }

    return data ? this.mapearBus(data) : null;
  }

  async crear(bus: Bus): Promise<Bus> {
    const { data, error } = await supabase
      .from(this.tabla)
      .insert({
        // Aseguramos enviar los nombres de las columnas capitalizados para el INSERT
        CooperativaId: bus.cooperativaId, 
        Numero: bus.numero,
        Placa: bus.placa,
        TotalAsientos: bus.totalAsientos, 
        Estructura: bus.estructura,
      })
      .select()
      .single();

    if (error) {
      throw new DomainException(`Error al crear el bus: ${error.message}`);
    }

    return this.mapearBus(data);
  }

  private mapearBus(data: any): Bus {
    const bus = new Bus(
      getFieldValue(data, 'cooperativaid') ?? getFieldValue(data, 'cooperativa_id'),
      getFieldValue(data, 'numero') ?? '',
      getFieldValue(data, 'placa') ?? '',
      getFieldValue(data, 'totalasientos') ?? getFieldValue(data, 'total_asientos') ?? 0
    );
    bus.id = getFieldValue(data, 'id');
    bus.estado = getFieldValue(data, 'estado') ?? 'Activo';
    bus.estructura = (getFieldValue(data, 'estructura') ?? 'UnPiso') as any;
    bus.createdAt = new Date(getFieldValue(data, 'createdat') ?? getFieldValue(data, 'created_at') ?? new Date());
    return bus;
  }
}