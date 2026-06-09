# 🚌 Sistema de Gestión de Flota y Boletaje Interprovincial

¡Bienvenido al portal centralizado de la cooperativa!

Este proyecto ha sido desarrollado bajo estrictas normas de usabilidad e ingeniería de software, utilizando una estructura desacoplada basada en **Domain-Driven Design (DDD)** y **Clean Architecture**, optimizada para mitigar la sobrecarga cognitiva en los procesos operativos de transporte.

---

# 📐 1. Arquitectura del Proyecto (Clean Architecture + DDD)

El sistema implementa una separación absoluta de responsabilidades, aislando las reglas de negocio de la infraestructura o frameworks visuales.

Las dependencias siempre apuntan hacia el núcleo del dominio.

```text
┌─────────────────────────────────────────────┐
│ PRESENTATION LAYER                          │
│ Vue 3 + Tailwind CSS + Pinia                │
│ Composables → Use Cases                     │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ APPLICATION LAYER                           │
│ Use Cases + DTOs                            │
│ Orquesta reglas de negocio                  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ DOMAIN LAYER                                │
│ Entities + Value Objects + Interfaces       │
│ Núcleo puro de la lógica del negocio        │
└─────────────────────────────────────────────┘
                    ▲
                    │
┌─────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER                        │
│ Supabase SDK + Stripe + SendGrid            │
│ Implementaciones concretas                  │
└─────────────────────────────────────────────┘
```

## 📁 Estructura del Repositorio

### `src/Domain/`

Contiene el corazón del software:

* Entidades:

  * `Bus.ts`
  * `Ruta.ts`
  * `Frecuencia.ts`
* Excepciones de negocio:

  * `BusFueraDeServicioException.ts`
* Contratos:

  * `IBusRepository.ts`
  * `IRutaRepository.ts`

### `src/Application/`

Casos de uso y DTOs:

* `ReportarIncidenteOperativo.ts`
* `CalcularDescuentoVenta.ts`
* `HabilitarRutaDiaria.ts`

### `src/Infrastructure/`

Persistencia y servicios externos:

* `SupabaseBusRepository.ts`
* `SupabaseRutaRepository.ts`
* `SupabaseVentasRepository.ts`

### `src/Presentation/`

Interfaz gráfica:

* Componentes Vue 3
* Stores Pinia
* Tailwind CSS

---

# 🧠 2. Reglas de Negocio Esenciales

El software valida automáticamente el cumplimiento de las políticas operativas de la cooperativa.

## Frecuencia vs Ruta

Una **Frecuencia** representa la planificación abstracta aprobada por la cooperativa.

**Ejemplo:**

> Ambato → Quito a las 07:00 AM

La frecuencia se convierte en una **Ruta** cuando:

* Se asigna una fecha específica.
* Se asigna un bus operativo.

---

## Consistencia de Capacidad

El sistema impide la sobreventa de boletos.

La disponibilidad se calcula utilizando:

* `TotalAsientos` del bus asignado.
* Asientos registrados en la base de datos.

---

## Políticas de Descuento

Los descuentos **no son acumulables**.

Se aplica únicamente el beneficio de mayor valor.

| Condición                | Descuento |
| ------------------------ | --------- |
| Menor de edad            | 30%       |
| Tercera edad (≥ 65 años) | 50%       |
| Persona con discapacidad | 50%       |

---

## Restricción de Trayectos Directos

Si una frecuencia está marcada como **Directa**:

* No se permiten paradas intermedias.
* No se pueden vender trayectos parciales.

Esto garantiza la integridad del itinerario.

---

# 🛠️ 3. Stack Tecnológico

| Categoría          | Tecnología   |
| ------------------ | ------------ |
| Framework Frontend | Vue 3        |
| Lenguaje           | TypeScript   |
| Estilos            | Tailwind CSS |
| Estado Global      | Pinia        |
| Base de Datos      | PostgreSQL   |
| Backend Cloud      | Supabase     |
| Pasarela de Pagos  | Stripe       |
| Lectura QR         | html5-qrcode |
| Testing            | Vitest       |

---

# 📊 4. Gestión de Cambios y Auditoría

Para cumplir con los procesos de auditoría, el sistema registra todos los cambios operativos en la tabla `Cambios`.

Además, existe sincronización con el flujo de trabajo basado en **GitHub Issues**.

## Tipos de Cambios

### ✅ Cambio Estándar

Modificaciones repetitivas y preaprobadas.

Ejemplos:

* Actualización de datos.
* Compra regular de boletos.

### ⚠️ Cambio Normal

Requiere evaluación previa.

Ejemplo:

* Asignar manualmente un bus a una frecuencia.

### 🚨 Cambio de Emergencia

Acciones inmediatas ante incidentes críticos.

Ejemplos:

* Bus averiado.
* Cambio de estado a:

  * `EnMantenimiento`
  * `FueraDeServicio`

---

## 📈 Métricas Disponibles

El módulo de reportes muestra:

* Total de Cambios Normales.
* Total de Cambios Estándar.
* Total de Cambios de Emergencia.
* Total de Cambios Implementados.

También permite:

* Exportación CSV.
* Seguimiento histórico.
* Auditoría completa.

---

# 🚀 5. Instalación y Despliegue Local

## Requisitos

* Node.js 18+
* npm 9+

## 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/IHC-Grupo2.git

cd ProyectoBoleteriaFront
```

## 2️⃣ Configurar Variables de Entorno

Crear un archivo `.env`:

```env
VITE_SUPABASE_URL=https://ymnvvrzqhejqrpszigbw.supabase.co

VITE_SUPABASE_ANON_KEY=tu_clave_anonima_publica

VITE_STRIPE_PUBLISHABLE_KEY=tu_token_publico_de_stripe
```

## 3️⃣ Instalar Dependencias

```bash
npm install
```

## 4️⃣ Ejecutar el Proyecto

```bash
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## 5️⃣ Ejecutar Pruebas

```bash
npm run test
```

---

# 👥 6. Control de Roles y Accesos

El sistema restringe funcionalidades según el rol autenticado.

| Rol                       | Funcionalidades                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| 👑 Administrador Central  | Gestión CRUD de buses, frecuencias y usuarios. Auditoría completa. Asignación manual de rutas. |
| 🧾 Oficinista de Terminal | Venta presencial de boletos. Selección de asientos. Validación de transferencias.              |
| 🚌 Chofer de la Unidad    | Escaneo QR y códigos de barras. Inicio y cierre de rutas. Registro de emergencias.             |
| 👤 Cliente                | Consulta de rutas, compra online, gestión de boletos y pagos mediante Stripe.                  |

---

# 📌 Características Principales

* ✅ Arquitectura Clean Architecture + DDD
* ✅ Gestión integral de flota
* ✅ Venta presencial y online
* ✅ Control de asientos
* ✅ Validación QR y códigos de barras
* ✅ Reportes y auditoría
* ✅ Integración con Stripe
* ✅ Supabase como backend principal
* ✅ Testing automatizado con Vitest

---
## 📈 Estadísticas del Proyecto

### 🏗️ Arquitectura

| Métrica               | Valor                    |
| --------------------- | ------------------------ |
| Patrón Arquitectónico | Clean Architecture + DDD |
| Capas Principales     | 4                        |
| Framework Frontend    | Vue 3                    |
| Lenguaje Principal    | TypeScript               |
| Base de Datos         | PostgreSQL (Supabase)    |
| Pasarela de Pago      | Stripe                   |
| Gestión de Estado     | Pinia                    |
| Framework CSS         | Tailwind CSS             |

---

### 🚌 Cobertura Funcional

| Módulo                 | Estado         |
| ---------------------- | -------------- |
| Gestión de Buses       | ✅ Implementado |
| Gestión de Frecuencias | ✅ Implementado |
| Gestión de Rutas       | ✅ Implementado |
| Venta de Boletos       | ✅ Implementado |
| Gestión de Usuarios    | ✅ Implementado |
| Control de Roles       | ✅ Implementado |
| Verificación QR        | ✅ Implementado |
| Reportes Operativos    | ✅ Implementado |
| Auditoría de Cambios   | ✅ Implementado |
| Integración Stripe     | ✅ Implementado |

---

### 🔐 Seguridad y Control

* ✅ Autenticación mediante Supabase Auth
* ✅ Control de acceso basado en roles (RBAC)
* ✅ Validación de permisos por módulo
* ✅ Prevención de sobreventa de asientos
* ✅ Auditoría de cambios operativos
* ✅ Registro histórico de acciones críticas

---

### 📊 Indicadores de Negocio

El sistema permite monitorear:

* Número total de boletos vendidos.
* Ocupación por ruta.
* Ocupación por frecuencia.
* Cambios estándar realizados.
* Cambios normales ejecutados.
* Cambios de emergencia reportados.
* Rutas activas por día.
* Buses operativos disponibles.
* Buses en mantenimiento.
* Ingresos generados por ventas.

---

### ⚡ Características Técnicas

```text
Frontend       ████████████████████ 100%
Backend Cloud  ████████████████████ 100%
Base de Datos  ████████████████████ 100%
Autenticación  ████████████████████ 100%
Pagos Stripe   ████████████████████ 100%
Auditoría      ████████████████████ 100%
Testing        ███████████████████░ 90%
```

---

### 🎯 Objetivos Alcanzados

* Reducción de errores en la asignación de rutas.
* Eliminación de sobreventa de boletos.
* Centralización de operaciones de la cooperativa.
* Trazabilidad completa de cambios.
* Automatización de validación de pasajeros.
* Mejora de la experiencia de compra online.

© Proyecto Académico

Sistema desarrollado para la gestión de transporte interprovincial, aplicando principios de Ingeniería de Software, Arquitectura Limpia y Diseño Centrado en el Usuario.
