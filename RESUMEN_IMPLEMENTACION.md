# Módulo de Reporte de Incidentes Operativos

## ✅ IMPLEMENTACIÓN COMPLETADA

Se ha implementado un módulo completo siguiendo arquitectura limpia (Domain → Application → Infrastructure → Presentation) para reportar buses fuera de servicio y gestionar su reemplazo.

---

## 📋 ARCHIVOS CREADOS / MODIFICADOS

### 1. **Domain Layer** (Lógica de Negocio)

#### Actualizado: `src/Domain/Constants/EstadosSistema.ts`
- ✅ Agregado estado `FueraDeServicio` al enum `ESTADOS_BUS`
- ✅ Agregado label y normalización para el nuevo estado
- Motivos soportados: catálogo preestablecido (AveriaMecánica, Accidente, ReparacionProgramada, Otro)

#### Creado: `src/Domain/Exceptions/BusFueraDeServicioException.ts`
- `BusFueraDeServicioException` — Excepción cuando un bus ya está o no puede cambiar a estado `FueraDeServicio`
- `BusNoDisponibleParaReactivarException` — Cuando intenta reactivar bus que no está en `FueraDeServicio`
- `BusReemplazoNoValidoException` — Cuando el bus de reemplazo no existe o no está disponible

#### Actualizado: `src/Domain/Repositories/IBusRepository.ts`
Agregados 3 nuevos métodos:
```typescript
marcarFueraDeServicio(busId: number, motivo: string, descripcion?: string, replacementBusId?: number, reportadoPor?: string): Promise<Bus>
reactivarBus(busId: number, reactivadoPor: string): Promise<Bus>
obtenerRutasAfectadas(busId: number): Promise<number>
```

---

### 2. **Infrastructure Layer** (Persistencia)

#### Actualizado: `src/Infrastructure/Repositories/SupabaseBusRepository.ts`
- ✅ Implementados todos los métodos de `IBusRepository` que faltaban
- ✅ `marcarFueraDeServicio()` — Cambia estado del bus a `FueraDeServicio` en BD
- ✅ `reactivarBus()` — Cambia estado del bus a `Activo` en BD
- ✅ `obtenerRutasAfectadas()` — Cuenta rutas programadas/en curso que serán impactadas
- ✅ Métodos de soporte: `actualizar()`, `eliminarLogico()`, `obtenerAsientos()`, etc.

---

### 3. **Application Layer** (Orquestación)

#### Creado: `src/Application/Dtos/ReportarIncidenteOperativoDto.ts`
```typescript
{
  busId: string
  motivo: string
  descripcion?: string
  fechaIncidente?: string (ISO)
  replacementBusId?: string | null
  reportadoPor?: string | null
}
```

#### Creado: `src/Application/Dtos/ReactivarBusDto.ts`
```typescript
{
  busId: number
  reactivadoPor: string
  motivo?: string
}
```

#### Creado: `src/Application/UseCases/ReportarIncidenteOperativo.ts`
Orquesta:
1. Valida que el bus existe
2. Valida que el motivo está en el catálogo
3. Valida que el bus de reemplazo (si se proporciona) es válido
4. Marca el bus como `FueraDeServicio` en el repositorio
5. Cuenta rutas afectadas
6. Devuelve respuesta enriquecida con contexto operativo

**Respuesta:**
```typescript
{
  success: boolean
  incidenteId: string
  busActualizado: { id, numero, estado }
  rutasAfectadas: number
  acciones: {
    reemplazoPosible: boolean
    busReemplazoSugerido?: { id, numero }
    requiereConfirmacion: boolean
    mensaje: string
  }
}
```

#### Creado: `src/Application/UseCases/ReactivarBus.ts`
Orquesta:
1. Valida que el bus está en estado `FueraDeServicio`
2. Cambia estado a `Activo`
3. Devuelve confirmación de reactivación

---

### 4. **Presentation Layer** (UI)

#### Creado: `src/Presentation/Composables/useReportarIncidente.ts`
Composable Vue que:
- Maneja estado reactivo del formulario
- Inyecta repositorios y use cases
- Ejecuta validación y reporte
- Expone métodos y catálogos de motivos
- Maneja errores, loading, y respuestas exitosas

#### Creado: `src/Presentation/Components/ReportarIncidenteModal.vue`
Componente modal con:
- ✅ Chips de motivos (selección intuitiva)
- ✅ Campo de Bus ID (obligatorio)
- ✅ Campo de Descripción (opcional)
- ✅ Campo de Fecha del Incidente
- ✅ Campo de Bus de Reemplazo (opcional)
- ✅ Campo de Reportado Por (usuario)
- ✅ Feedback visual: éxito/error/loading
- ✅ Resumen de impacto (rutas afectadas)
- ✅ Estilos Tailwind CSS

---

### 5. **Documentación**

#### Creado: `src/INTEGRACION_REPORTE_INCIDENTES.md`
- Ejemplos de integración en vistas
- Explicación del flujo completo de arquitectura
- Casos de uso soportados
- Responsabilidades por capa

---

## 🎯 CARACTERÍSTICAS IMPLEMENTADAS

✅ **Separación de Responsabilidades:**
- Lógica de negocio en Domain + Application
- Persistencia en Infrastructure
- UI en Presentation (sin lógica de negocio)

✅ **Validaciones:**
- Motivos preestablecidos (catálogo)
- Bus de reemplazo válido si se proporciona
- Bus a reportar existe y es válido
- No permite auto-reemplazo (bus + replacement = mismo)

✅ **Manejo de Estados:**
- Permite reportar aunque bus esté `Viajando` (emergencia)
- Bloquea selección en nuevas rutas automáticamente
- Cuenta rutas afectadas para operaciones

✅ **Respuesta Enriquecida:**
- Admin recibe contexto: rutas impactadas, reemplazo posible, etc.
- Mensaje claro sobre qué hacer

✅ **Reactivación:**
- Use case separado `ReactivarBus`
- Validación de que bus esté en `FueraDeServicio`
- Auditoría de quién reactivó y cuándo

✅ **Notificaciones:**
- Estructura preparada para crear notificaciones en tabla `Notificaciones`
- Lógica de envío de correo a Operaciones (lista para implementar en backend si lo requiere)

---

## 🚀 PRÓXIMOS PASOS (OPCIONALES)

1. **Integración en Vista Existente:**
   - Agregar botón "Reportar Incidente" en página de buses
   - Ver `INTEGRACION_REPORTE_INCIDENTES.md` para ejemplo

2. **Notificaciones por Correo (Backend):**
   - Crear endpoint que envíe correo a `SoporteEmail` de cooperativa
   - Implementar lógica en tabla `Notificaciones`

3. **Historial/Auditoría:**
   - Implementar listado de incidentes reportados
   - Usar tabla `Cambios` para auditoría completa

4. **Tests:**
   - Test unitarios para use cases
   - Test de integración para repositorio Supabase

5. **Reemplazo Automático (Avanzado):**
   - Si se pasa `replacementBusId`, actualizar automáticamente las rutas
   - Reasignar asientos disponibles del bus nuevo

---

## 📝 VALIDACIONES DE NEGOCIO

| Escenario | ¿Permitido? | Acción |
|-----------|------------|--------|
| Reportar bus activo | ✅ Sí | Cambiar a `FueraDeServicio` |
| Reportar bus en Viajando | ✅ Sí | Cambiar estado + alerta crítica |
| Reportar sin motivo | ❌ No | Error: campo obligatorio |
| Reemplazo = mismo bus | ❌ No | Error: no puedes reemplazar contigo mismo |
| Reemplazo inactivo/fuera | ❌ No | Error: bus no válido |
| Reactivar si no está fuera | ❌ No | Error: estado inválido |

---

## 🔌 CÓMO USAR

### Desde una Vista:

```vue
<template>
  <button @click="abrirModal" class="btn-danger">
    🚨 Reportar Incidente
  </button>
  
  <ReportarIncidenteModal
    :isOpen="modal"
    @close="modal = false"
    @success="onSuccess"
  />
</template>

<script setup>
import { ref } from 'vue';
import ReportarIncidenteModal from '../Components/ReportarIncidenteModal.vue';

const modal = ref(false);

function abrirModal() { modal.value = true; }
function onSuccess() { 
  console.log('Incidente reportado');
  // Recargar datos, etc.
}
</script>
```

---

**✨ Implementación finalizada siguiendo patrones de arquitectura limpia.**
