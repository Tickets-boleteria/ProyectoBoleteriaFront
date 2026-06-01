export const ESTADOS_RUTA = [
  'Programada',
  'EnCurso',
  'Completada',
  'Cancelada',
] as const

export type EstadoRuta = typeof ESTADOS_RUTA[number]

export const ESTADOS_BOLETO = [
  'Pagado',
  'En Viaje',
  'Finalizado',
  'Rechazado',
] as const

export type EstadoBoleto = typeof ESTADOS_BOLETO[number]

export const ESTADOS_BUS = [
  'Activo',
  'EnMantenimiento',
  'Inactivo',
  'Viajando',
] as const

export type EstadoBus = typeof ESTADOS_BUS[number]

export function esEstadoRutaValido(estado: string): estado is EstadoRuta {
  return ESTADOS_RUTA.includes(estado as EstadoRuta)
}

export function esEstadoBoletoValido(estado: string): estado is EstadoBoleto {
  return ESTADOS_BOLETO.includes(estado as EstadoBoleto)
}

export function esEstadoBusValido(estado: string): estado is EstadoBus {
  return ESTADOS_BUS.includes(estado as EstadoBus)
}

export function getEstadoRutaLabel(estado: EstadoRuta): string {
  const labels: Record<EstadoRuta, string> = {
    Programada: 'Programada',
    EnCurso: 'En curso',
    Completada: 'Completada',
    Cancelada: 'Cancelada',
  }

  return labels[estado]
}

export function getEstadoBoletoLabel(estado: EstadoBoleto): string {
  const labels: Record<EstadoBoleto, string> = {
    Pagado: 'Pagado',
    'En Viaje': 'En viaje',
    Finalizado: 'Finalizado',
    Rechazado: 'Rechazado',
  }

  return labels[estado]
}

export function getEstadoBusLabel(estado: EstadoBus): string {
  const labels: Record<EstadoBus, string> = {
    Activo: 'Activo',
    EnMantenimiento: 'En mantenimiento',
    Inactivo: 'Inactivo',
    Viajando: 'Viajando',
  }

  return labels[estado]
}

export function puedeCambiarEstadoRuta(
  estadoActual: EstadoRuta,
  nuevoEstado: EstadoRuta
): boolean {
  const flujo: Record<EstadoRuta, EstadoRuta[]> = {
    Programada: ['EnCurso', 'Cancelada'],
    EnCurso: ['Completada', 'Cancelada'],
    Completada: [],
    Cancelada: [],
  }

  return flujo[estadoActual].includes(nuevoEstado)
}

export function obtenerSiguienteEstadoRuta(
  estadoActual: EstadoRuta
): EstadoRuta | null {
  const siguiente: Record<EstadoRuta, EstadoRuta | null> = {
    Programada: 'EnCurso',
    EnCurso: 'Completada',
    Completada: null,
    Cancelada: null,
  }

  return siguiente[estadoActual]
}

export function normalizarEstadoRuta(estado: string): EstadoRuta {
  const limpio = estado.trim().toLowerCase().replace(/\s+/g, '')

  if (limpio === 'programada') return 'Programada'
  if (limpio === 'programado') return 'Programada'
  if (limpio === 'encurso') return 'EnCurso'
  if (limpio === 'enproceso') return 'EnCurso'
  if (limpio === 'enviaje') return 'EnCurso'
  if (limpio === 'completada') return 'Completada'
  if (limpio === 'completado') return 'Completada'
  if (limpio === 'cancelada') return 'Cancelada'
  if (limpio === 'cancelado') return 'Cancelada'

  return 'Programada'
}

export function normalizarEstadoBus(estado: string): EstadoBus {
  const limpio = estado.trim().toLowerCase().replace(/\s+/g, '')

  if (limpio === 'activo') return 'Activo'
  if (limpio === 'enmantenimiento') return 'EnMantenimiento'
  if (limpio === 'mantenimiento') return 'EnMantenimiento'
  if (limpio === 'inactivo') return 'Inactivo'
  if (limpio === 'viajando') return 'Viajando'
  if (limpio === 'enruta') return 'Viajando'

  return 'Activo'
}