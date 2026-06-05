/**
 * SupabaseRutaRepository.ts - Implementación de IRutaRepository con Supabase.
 * Adaptado al esquema real con columnas PascalCase.
 */

import { supabase } from '../Api/supabaseClient'
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository'
import { Ruta } from '../../Domain/Entities/Ruta'
import { DomainException } from '../../Domain/Exceptions/DomainException'
import { normalizarEstadoRuta } from '../../Domain/Constants/EstadosSistema'

const getFieldValue = (obj: any, fieldName: string) => {
  if (!obj) return undefined
  const key = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? obj[key] : undefined
}

export class SupabaseRutaRepository implements IRutaRepository {
  private readonly tabla = 'Rutas'

  async crearRuta(ruta: Ruta): Promise<Ruta> {
    const datosInsert = this.mapearRutaADatos(ruta)

    const { data, error } = await supabase
      .from(this.tabla)
      .insert([datosInsert])
      .select()
      .single()

    if (error) {
      throw new DomainException(`Error al crear ruta diaria: ${error.message}`)
    }

    return this.mapearRuta(data)
  }

  async buscarPorId(id: number): Promise<Ruta | null> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('Id', id)
      .maybeSingle()

    if (error) {
      throw new DomainException(`Error al obtener ruta diaria: ${error.message}`)
    }

    return data ? this.mapearRuta(data) : null
  }

  async verificarBusDisponible(
    busId: number,
    fecha: string,
    frecuenciaId?: number,
    rutaActualId?: number
  ): Promise<boolean> {
    const estadosActivos = ['Programada', 'Habilitada', 'EnCurso']

    if (!frecuenciaId) {
      let query = supabase
        .from(this.tabla)
        .select('Id')
        .eq('BusId', busId)
        .eq('Fecha', fecha)
        .in('Estado', estadosActivos)

      if (rutaActualId) {
        query = query.neq('Id', rutaActualId)
      }

      const { data, error } = await query.limit(1)

      if (error) {
        throw new DomainException(`Error al verificar disponibilidad del bus: ${error.message}`)
      }

      return !data || data.length === 0
    }

    const { data: frecData, error: frecError } = await supabase
      .from('Frecuencias')
      .select('HoraSalida')
      .eq('Id', frecuenciaId)
      .maybeSingle()

    if (frecError) {
      throw new DomainException(`Error al obtener la frecuencia para validar horario: ${frecError.message}`)
    }

    if (!frecData) {
      throw new DomainException('La frecuencia seleccionada no existe.')
    }

    const horaRequerida = getFieldValue(frecData, 'HoraSalida')

    let query = supabase
      .from(this.tabla)
      .select(`
        Id,
        Frecuencias!inner(
          HoraSalida
        )
      `)
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .in('Estado', estadosActivos)

    if (rutaActualId) {
      query = query.neq('Id', rutaActualId)
    }

    const { data, error } = await query

    if (error) {
      throw new DomainException(`Error al verificar disponibilidad del bus por horario: ${error.message}`)
    }

    for (const ruta of data || []) {
      const frecuencia = getFieldValue(ruta, 'Frecuencias')
      const horaAsignada = getFieldValue(frecuencia, 'HoraSalida')

      if (horaAsignada === horaRequerida) {
        return false
      }
    }

    return true
  }

  async actualizarEstado(id: number, estado: string): Promise<void> {
    const { error } = await supabase
      .from(this.tabla)
      .update({ Estado: normalizarEstadoRuta(estado) })
      .eq('Id', id)

    if (error) {
      throw new DomainException(`Error al actualizar estado de ruta diaria: ${error.message}`)
    }
  }

  async obtenerRutasPorBusYFecha(busId: number, fecha: string): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .order('CreatedAt', { ascending: true })

    if (error) {
      throw new DomainException(`Error al obtener rutas del bus: ${error.message}`)
    }

    return (data || []).map((item) => this.mapearRuta(item))
  }

  async obtenerRutasPorFrecuenciaYFecha(frecuenciaId: number, fecha: string): Promise<Ruta[]> {
    const { data, error } = await supabase
      .from(this.tabla)
      .select('*')
      .eq('FrecuenciaId', frecuenciaId)
      .eq('Fecha', fecha)
      .order('CreatedAt', { ascending: true })

    if (error) {
      throw new DomainException(`Error al obtener rutas de la frecuencia: ${error.message}`)
    }

    return (data || []).map((item) => this.mapearRuta(item))
  }

  private mapearRuta(data: any): Ruta {
    const createdAtVal = getFieldValue(data, 'CreatedAt')

    return new Ruta(
      Number(getFieldValue(data, 'FrecuenciaId') || 0),
      Number(getFieldValue(data, 'BusId') || 0),
      String(getFieldValue(data, 'Fecha') || ''),
      normalizarEstadoRuta(String(getFieldValue(data, 'Estado') || 'Programada')),
      Number(getFieldValue(data, 'Id')),
      getFieldValue(data, 'ChoferId'),
      getFieldValue(data, 'HoraSalida'),
      getFieldValue(data, 'HoraLlegada'),
      getFieldValue(data, 'ObservacionChofer'),
      createdAtVal ? new Date(createdAtVal) : undefined,
      getFieldValue(data, 'HojaRutaId')
    )
  }

  private mapearRutaADatos(ruta: Ruta) {
    return {
      FrecuenciaId: ruta.frecuenciaId,
      BusId: ruta.busId,
      Fecha: ruta.fecha,
      Estado: normalizarEstadoRuta(String(ruta.estado || 'Programada')),
      ChoferId: ruta.choferId || null,
      HojaRutaId: ruta.hojaRutaId || null,
    }
  }
}