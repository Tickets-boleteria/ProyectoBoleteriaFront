export const ESTADOS_RUTA = [
  'Programada',
  'Habilitada',
  'EnCurso',
  'Completada',
  'Cancelada',
] as const

export type EstadoRuta = typeof ESTADOS_RUTA[number]

export const ESTADOS_BOLETO = [
  'Emitido',
  'Validado',
  'Cancelado',
] as const

export type EstadoBoleto = typeof ESTADOS_BOLETO[number]

export const ESTADOS_VENTA = [
  'Pendiente',
  'AprobadaPago',
  'Confirmada',
  'Cancelada',
] as const

export type EstadoVenta = typeof ESTADOS_VENTA[number]

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

export function esEstadoVentaValido(estado: string): estado is EstadoVenta {
  return ESTADOS_VENTA.includes(estado as EstadoVenta)
}

export function esEstadoBusValido(estado: string): estado is EstadoBus {
  return ESTADOS_BUS.includes(estado as EstadoBus)
}

export function getEstadoRutaLabel(estado: EstadoRuta): string {
  const labels: Record<EstadoRuta, string> = {
    Programada: 'Programada',
    Habilitada: 'Habilitada',
    EnCurso: 'En curso',
    Completada: 'Completada',
    Cancelada: 'Cancelada',
  }

  return labels[estado]
}

export function getEstadoBoletoLabel(estado: EstadoBoleto): string {
  const labels: Record<EstadoBoleto, string> = {
    Emitido: 'Emitido (Pagado)',
    Validado: 'Validado (En Viaje)',
    Cancelado: 'Cancelado/Rechazado',
  }

  return labels[estado]
}

export function getEstadoVentaLabel(estado: EstadoVenta): string {
  const labels: Record<EstadoVenta, string> = {
    Pendiente: 'Pendiente de Verificación',
    AprobadaPago: 'Pago Aprobado',
    Confirmada: 'Venta Confirmada',
    Cancelada: 'Venta Cancelada',
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

export function normalizarEstadoRuta(estado: string): EstadoRuta {
  const limpio = String(estado || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')

  const equivalencias: Record<string, EstadoRuta> = {
    programada: 'Programada',
    habilitada: 'Habilitada',

    encurso: 'EnCurso',
    curso: 'EnCurso',
    enproceso: 'EnCurso',
    iniciado: 'EnCurso',
    iniciada: 'EnCurso',

    completada: 'Completada',
    finalizada: 'Completada',
    finalizado: 'Completada',

    cancelada: 'Cancelada',
    cancelado: 'Cancelada',
  }

  return equivalencias[limpio] || 'Programada'
}

export function normalizarEstadoBus(estado: string): EstadoBus {
  const limpio = String(estado || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')

  const equivalencias: Record<string, EstadoBus> = {
    activo: 'Activo',
    enmantenimiento: 'EnMantenimiento',
    mantenimiento: 'EnMantenimiento',
    inactivo: 'Inactivo',
    viajando: 'Viajando',
    enviaje: 'Viajando',
  }

  return equivalencias[limpio] || 'Activo'
}

export function normalizarEstadoBoleto(estado: string): EstadoBoleto {
  const limpio = String(estado || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')

  const equivalencias: Record<string, EstadoBoleto> = {
    emitido: 'Emitido',
    pendiente: 'Emitido',
    pagado: 'Emitido',
    enviaje: 'Validado',
    finalizado: 'Validado',
    rechazado: 'Cancelado',
    cancelado: 'Cancelado',
    validado: 'Validado'
  }

  return equivalencias[limpio] || 'Emitido'
}

export function puedeCambiarEstadoRuta(
  estadoActual: EstadoRuta,
  nuevoEstado: EstadoRuta
): boolean {
  const flujo: Record<EstadoRuta, EstadoRuta[]> = {
    Programada: ['Habilitada', 'EnCurso', 'Cancelada'],
    Habilitada: ['EnCurso', 'Cancelada'],
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
    Programada: 'Habilitada',
    Habilitada: 'EnCurso',
    EnCurso: 'Completada',
    Completada: null,
    Cancelada: null,
  }

  return siguiente[estadoActual]
}
