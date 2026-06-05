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
/* =========================================================================
 *  Métodos de pago (enum real de Supabase: MetodoPago)
 *  ------------------------------------------------------------------------
 *  El cliente puede elegir "Tarjeta" (Stripe) en la UI, pero ese valor NO
 *  existe en el ENUM de la base. En la capa de datos se mapea a uno válido.
 * ========================================================================= */
export const METODOS_PAGO = ['Transferencia', 'Deposito', 'PayPal', 'Efectivo'] as const
export type MetodoPago = typeof METODOS_PAGO[number]

/* =========================================================================
 *  Resultado de validación de abordaje (enum real: ResultadoValidacion)
 * ========================================================================= */
export const RESULTADOS_VALIDACION = [
  'Exitosa',
  'CodigoInvalido',
  'BoletoYaUsado',
  'BoletoVencido',
] as const
export type ResultadoValidacion = typeof RESULTADOS_VALIDACION[number]

/* =========================================================================
 *  Normalizador de EstadoVenta (legado -> enum real)
 * ========================================================================= */
export function normalizarEstadoVenta(estado: string): EstadoVenta {
  const limpio = (estado || '').toString().trim().toLowerCase().replace(/\s+/g, '')
  const mapa: Record<string, EstadoVenta> = {
    pendiente: 'Pendiente',
    pendientepago: 'Pendiente',
    aprobadapago: 'AprobadaPago',
    pagado: 'AprobadaPago',
    confirmada: 'Confirmada',
    confirmado: 'Confirmada',
    cancelada: 'Cancelada',
    cancelado: 'Cancelada',
    rechazada: 'Cancelada',
    rechazado: 'Cancelada',
  }
  return mapa[limpio] ?? 'Pendiente'
}

/* =========================================================================
 *  REGLA ÚNICA DE DESCUENTO DEL SISTEMA (igual cliente y oficinista)
 *  ------------------------------------------------------------------------
 *  NO se acumulan: se aplica el MAYOR descuento aplicable.
 *    - Menor de 18 años ......... 30%
 *    - Discapacidad ............. 50%
 *    - Tercera edad (>= 65) ..... 50%
 * ========================================================================= */
export const DESCUENTO_MENOR = 0.3
export const DESCUENTO_DISCAPACIDAD = 0.5
export const DESCUENTO_TERCERA_EDAD = 0.5

export type CalculoDescuento = {
  esMenor: boolean
  esDiscapacitado: boolean
  esTerceraEdad: boolean
  descuentoAplicado: number // 0..1
  precioFinal: number
}

export function calcularEdad(fechaNacimiento: string): number {
  const fecha = new Date(fechaNacimiento)
  if (Number.isNaN(fecha.getTime())) return -1
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getFullYear()
  const m = hoy.getMonth() - fecha.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--
  return edad
}

/**
 * Calcula el descuento de UN boleto. Es la fuente única de verdad:
 * se usa tanto en ConfirmarCompra (cliente) como al armar el monto a cobrar
 * por Stripe en BuscarRutas, para que el cobro y el Total guardado coincidan.
 */
export function calcularDescuentoBoleto(
  fechaNacimiento: string,
  tieneDiscapacidad: boolean,
  precioBase: number,
): CalculoDescuento {
  const edad = calcularEdad(fechaNacimiento)
  const esMenor = edad >= 0 && edad < 18
  const esTerceraEdad = edad >= 65
  const esDiscapacitado = !!tieneDiscapacidad

  const candidatos: number[] = [0]
  if (esMenor) candidatos.push(DESCUENTO_MENOR)
  if (esDiscapacitado) candidatos.push(DESCUENTO_DISCAPACIDAD)
  if (esTerceraEdad) candidatos.push(DESCUENTO_TERCERA_EDAD)

  const descuentoAplicado = Math.max(...candidatos)
  const precioFinal = Number((precioBase * (1 - descuentoAplicado)).toFixed(2))
  return { esMenor, esDiscapacitado, esTerceraEdad, descuentoAplicado, precioFinal }
}