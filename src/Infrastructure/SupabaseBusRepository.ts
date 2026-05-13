/**
 * SupabaseBusRepository.ts - Implementación de IBusRepository con Supabase
 */

import { supabase } from '../Api/supabaseClient';
import { Bus, BusAsiento } from '../../Domain/Entities/Bus';
import { IBusRepository, BusFiltros } from '../../Domain/Repositories/IBusRepository';
import {
  BusNoEncontradoException,
  BusInvalidoException,
  PlacaDuplicadaException,
  NumeroBusDuplicadoException,
  BusNoActivoException,
} from '../../Domain/Exceptions/BusExceptions';

export class SupabaseBusRepository implements IBusRepository {
  private readonly TABLA_BUSES = 'buses';
  private readonly TABLA_ASIENTOS = 'asientos_bus';

  /**
   * Obtiene todos los buses
   */
  async obtenerTodos(): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .order('numero', { ascending: true });

    if (error) throw new Error(`Error al obtener buses: ${error.message}`);
    return this.mapearBuses(data || []);
  }

  /**
   * Obtiene buses de una cooperativa específica
   */
  async obtenerPorCooperativa(cooperativaId: string): Promise<Bus[]> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('cooperativa_id', cooperativaId)
      .eq('estado', true)
      .order('numero', { ascending: true });

    if (error)
      throw new Error(
        `Error al obtener buses de la cooperativa: ${error.message}`
      );
    return this.mapearBuses(data || []);
  }

  /**
   * Obtiene un bus por su ID
   */
  async obtenerPorId(id: string): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus: ${error.message}`);
    }

    if (!data) return null;

    const bus = this.mapearBus(data);
    bus.asientosNormales = await this.obtenerAsientosPorTipo(id, 'NORMAL');
    bus.asientosVip = await this.obtenerAsientosPorTipo(id, 'VIP');

    return bus;
  }

  /**
   * Obtiene un bus por su número
   */
  async obtenerPorNumero(numero: number): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('numero', numero)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus: ${error.message}`);
    }

    if (!data) return null;
    return this.mapearBus(data);
  }

  /**
   * Obtiene un bus por su placa
   */
  async obtenerPorPlaca(placa: string): Promise<Bus | null> {
    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('placa', placa.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener bus: ${error.message}`);
    }

    if (!data) return null;
    return this.mapearBus(data);
  }

  /**
   * Crea un nuevo bus
   */
  async crear(bus: Bus): Promise<Bus> {
    // Validación
    if (!bus.esValido()) {
      throw new BusInvalidoException();
    }

    // Verificar duplicados
    const busExistente = await this.obtenerPorPlaca(bus.placa);
    if (busExistente) {
      throw new PlacaDuplicadaException(bus.placa);
    }

    const datosInsert = this.mapearBusADatos(bus);

    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .insert([datosInsert])
      .select()
      .single();

    if (error) throw new Error(`Error al crear bus: ${error.message}`);

    const busCreado = this.mapearBus(data);

    // Crear asientos automáticamente
    await this.crearAsientosParaBus(busCreado.id!, bus.capacidadNormal, bus.capacidadVip);

    return busCreado;
  }

  /**
   * Actualiza un bus existente
   */
  async actualizar(bus: Bus): Promise<Bus> {
    if (!bus.id) {
      throw new Error('El bus debe tener un ID para actualizar');
    }

    if (!bus.esValido()) {
      throw new BusInvalidoException();
    }

    const datosUpdate = this.mapearBusADatos(bus);

    const { data, error } = await supabase
      .from(this.TABLA_BUSES)
      .update(datosUpdate)
      .eq('id', bus.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar bus: ${error.message}`);
    if (!data) throw new BusNoEncontradoException(bus.id);

    return this.mapearBus(data);
  }

  /**
   * Elimina un bus (eliminación lógica)
   */
  async eliminar(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_BUSES)
      .update({ estado: false })
      .eq('id', id);

    if (error) throw new Error(`Error al eliminar bus: ${error.message}`);
  }

  /**
   * Obtiene los asientos de un bus
   */
  async obtenerAsientos(busId: string): Promise<BusAsiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('bus_id', busId)
      .order('numero_asiento', { ascending: true });

    if (error) throw new Error(`Error al obtener asientos: ${error.message}`);
    return this.mapearAsientos(data || []);
  }

  /**
   * Obtiene asientos disponibles de un tipo
   */
  async obtenerAsientosDisponibles(
    busId: string,
    tipo: 'NORMAL' | 'VIP'
  ): Promise<BusAsiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('bus_id', busId)
      .eq('tipo', tipo)
      .eq('disponible', true)
      .order('numero_asiento', { ascending: true });

    if (error)
      throw new Error(`Error al obtener asientos disponibles: ${error.message}`);
    return this.mapearAsientos(data || []);
  }

  /**
   * Actualiza el estado de un asiento
   */
  async actualizarAsiento(asiento: BusAsiento): Promise<BusAsiento> {
    if (!asiento.id) {
      throw new Error('El asiento debe tener un ID');
    }

    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .update({
        disponible: asiento.disponible,
        pasajero_id: asiento.pasajeroId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asiento.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar asiento: ${error.message}`);
    return this.mapearAsiento(data);
  }

  /**
   * Reserva asientos para un usuario
   */
  async reservarAsientos(asientos: BusAsiento[]): Promise<void> {
    const actualizaciones = asientos.map((a) => ({
      id: a.id,
      disponible: false,
      pasajero_id: a.pasajeroId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .upsert(actualizaciones, { onConflict: 'id' });

    if (error) throw new Error(`Error al reservar asientos: ${error.message}`);
  }

  /**
   * Libera asientos reservados
   */
  async liberarAsientos(asientos: BusAsiento[]): Promise<void> {
    const asientosIds = asientos.map((a) => a.id);

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .update({
        disponible: true,
        pasajero_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', asientosIds);

    if (error) throw new Error(`Error al liberar asientos: ${error.message}`);
  }

  /**
   * Busca buses disponibles en una ruta y fecha
   */
  async buscarDisponibles(
    ciudadOrigen: string,
    ciudadDestino: string,
    fecha: Date,
    filtros?: BusFiltros
  ): Promise<Bus[]> {
    let query = supabase
      .from(this.TABLA_BUSES)
      .select('*')
      .eq('estado', true);

    if (filtros?.cooperativaId) {
      query = query.eq('cooperativa_id', filtros.cooperativaId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Error al buscar buses: ${error.message}`);
    return this.mapearBuses(data || []);
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Mapea un registro de BD a la entidad Bus
   */
  private mapearBus(data: any): Bus {
    const bus = new Bus(
      data.numero,
      data.placa,
      data.chasis,
      data.carroceria,
      data.cooperativa_id,
      data.capacidad_normal,
      data.capacidad_vip,
      data.fotografia_url,
      data.estado
    );
    bus.id = data.id;
    bus.createdAt = new Date(data.created_at);
    bus.updatedAt = new Date(data.updated_at);
    return bus;
  }

  /**
   * Mapea múltiples registros de BD
   */
  private mapearBuses(data: any[]): Bus[] {
    return data.map((item) => this.mapearBus(item));
  }

  /**
   * Mapea la entidad Bus a datos para BD
   */
  private mapearBusADatos(bus: Bus) {
    return {
      numero: bus.numero,
      placa: bus.placa.toUpperCase(),
      chasis: bus.chasis,
      carroceria: bus.carroceria,
      cooperativa_id: bus.cooperativaId,
      fotografia_url: bus.fotografiaUrl,
      capacidad_normal: bus.capacidadNormal,
      capacidad_vip: bus.capacidadVip,
      estado: bus.estado,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Mapea un asiento de BD
   */
  private mapearAsiento(data: any): BusAsiento {
    const asiento = new BusAsiento(
      data.bus_id,
      data.numero_asiento,
      data.tipo_asiento_id,
      data.tipo,
      data.disponible
    );
    asiento.id = data.id;
    asiento.pasajeroId = data.pasajero_id;
    asiento.createdAt = new Date(data.created_at);
    asiento.updatedAt = new Date(data.updated_at);
    return asiento;
  }

  /**
   * Mapea múltiples asientos
   */
  private mapearAsientos(data: any[]): BusAsiento[] {
    return data.map((item) => this.mapearAsiento(item));
  }

  /**
   * Obtiene asientos por tipo
   */
  private async obtenerAsientosPorTipo(
    busId: string,
    tipo: 'NORMAL' | 'VIP'
  ): Promise<BusAsiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('bus_id', busId)
      .eq('tipo', tipo)
      .order('numero_asiento', { ascending: true });

    if (error) return [];
    return this.mapearAsientos(data || []);
  }

  /**
   * Crea asientos automáticamente para un bus
   */
  private async crearAsientosParaBus(
    busId: string,
    capacidadNormal: number,
    capacidadVip: number
  ): Promise<void> {
    const asientos: any[] = [];

    // Asientos normales
    for (let i = 1; i <= capacidadNormal; i++) {
      asientos.push({
        bus_id: busId,
        numero_asiento: `A${i}`,
        tipo: 'NORMAL',
        tipo_asiento_id: null, // Se obtendrá del tipo por defecto
        disponible: true,
      });
    }

    // Asientos VIP
    for (let i = 1; i <= capacidadVip; i++) {
      asientos.push({
        bus_id: busId,
        numero_asiento: `V${i}`,
        tipo: 'VIP',
        tipo_asiento_id: null, // Se obtendrá del tipo por defecto
        disponible: true,
      });
    }

    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .insert(asientos);

    if (error) {
      console.error('Error al crear asientos:', error.message);
    }
  }
}