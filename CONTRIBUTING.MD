# Contributing

Gracias por tu interés en contribuir a este proyecto.
Este documento explica las reglas básicas para reportar errores, proponer mejoras y enviar cambios mediante Pull Requests.

## 1. Antes de contribuir

Antes de realizar cambios, revisa el estado actual del repositorio y asegúrate de que tu aporte no duplique una funcionalidad, corrección o propuesta ya existente.

Puedes contribuir con:

* Corrección de errores.
* Mejoras visuales o de experiencia de usuario.
* Refactorización de código.
* Nuevas funcionalidades.
* Pruebas automatizadas.
* Mejoras en documentación.
* Correcciones de seguridad.

Para cambios grandes, primero abre un Issue explicando la propuesta antes de empezar a desarrollarla.

## 2. Reportar errores

Para reportar un error, crea un Issue con información clara y suficiente.

Incluye:

* Descripción breve del problema.
* Pasos para reproducirlo.
* Resultado esperado.
* Resultado obtenido.
* Capturas de pantalla si el error es visual.
* Navegador utilizado, si aplica.
* Rama o versión donde ocurrió el problema.

Ejemplo:

```markdown
## Descripción

El sistema muestra asientos disponibles que ya fueron vendidos.

## Pasos para reproducir

1. Iniciar sesión.
2. Ir al módulo de venta de boletos.
3. Seleccionar una ruta.
4. Revisar los asientos disponibles.

## Resultado esperado

Solo deberían mostrarse los asientos realmente disponibles.

## Resultado obtenido

Se muestran asientos que ya fueron vendidos.
```

## 3. Proponer mejoras o nuevas funcionalidades

Para proponer una mejora, abre un Issue usando una descripción clara.

Incluye:

* Qué funcionalidad o mejora propones.
* Qué problema resuelve.
* Qué usuarios se benefician.
* Cómo debería funcionar.
* Posibles riesgos o partes del sistema afectadas.

Evita iniciar cambios grandes sin haberlos discutido previamente.

## 4. Flujo de trabajo recomendado

Crea una rama nueva para cada cambio.

Formato recomendado:

```bash
tipo/descripcion-corta
```

Ejemplos:

```text
feature/validacion-qr
feature/reporte-ventas
fix/error-login
fix/asientos-disponibles
docs/actualizar-guia
refactor/componentes-ventas
test/pruebas-rutas
```

Tipos sugeridos:

* `feature`: nueva funcionalidad.
* `fix`: corrección de errores.
* `docs`: documentación.
* `refactor`: mejora interna del código.
* `test`: pruebas.
* `chore`: tareas menores de mantenimiento.

## 5. Convención de commits

Usa mensajes de commit claros y descriptivos.

Formato recomendado:

```text
tipo: descripción breve del cambio
```

Ejemplos:

```text
feat: agregar validación de boletos por código QR
fix: corregir cálculo de asientos disponibles
docs: actualizar guía de contribución
refactor: separar lógica de ventas
test: agregar pruebas para rutas
```

Procura que cada commit represente un cambio concreto y fácil de revisar.

## 6. Reglas generales de código

Al contribuir, ten en cuenta lo siguiente:

* Mantén el código claro y legible.
* Usa nombres descriptivos para variables, funciones, componentes y archivos.
* Evita duplicar lógica.
* No subas código comentado que ya no se utilice.
* No introduzcas dependencias nuevas sin justificación.
* Mantén los cambios limitados al objetivo del Pull Request.
* No mezcles correcciones no relacionadas en una misma rama.
* Respeta la estructura existente del proyecto.
* Evita usar `any` innecesariamente en TypeScript.
* Verifica que los cambios no rompan funcionalidades existentes.

## 7. Seguridad

No subas al repositorio:

* Archivos `.env` reales.
* Contraseñas.
* Tokens privados.
* Claves secretas.
* Credenciales de servicios externos.
* Datos personales de usuarios reales.
* Información sensible relacionada con pagos o transacciones.

Si accidentalmente subes una credencial, revócala de inmediato y comunica el problema al equipo.

## 8. Pruebas antes de enviar cambios

Antes de abrir un Pull Request, verifica que el proyecto funcione correctamente.

Ejecuta las pruebas disponibles:

```bash
npm run test
```

También verifica que el proyecto compile sin errores:

```bash
npm run build
```

Si realizaste cambios visuales, revisa manualmente la interfaz en el navegador.

## 9. Pull Requests

Antes de enviar un Pull Request:

* Asegúrate de que tu rama esté actualizada.
* Verifica que las pruebas pasen.
* Confirma que el proyecto compile correctamente.
* Revisa que no hayas subido archivos sensibles.
* Explica claramente qué cambios realizaste.
* Relaciona el Pull Request con el Issue correspondiente, si existe.

## 10. Estructura recomendada del Pull Request

Los Pull Requests deben ser claros, ordenados y fáciles de revisar.
La descripción debe explicar qué se hizo, por qué se hizo, qué archivos o módulos fueron modificados y cómo se puede probar el cambio.

### Título del Pull Request

Usa un título breve, descriptivo y relacionado con el tipo de cambio.

### Rama de origen

La rama debe indicar el tipo de trabajo realizado.

Ejemplos:

```text
feature/cliente-buscar-rutas-reales
feature/IPM-10-pagos-con-tarjeta
fix/correccion-dashboard
hotfix/arreglo-compra-boleto
refactor/validaciones-usuarios-admin
docs/contributing
```

De forma general, los cambios deben enviarse hacia la rama `develop`, salvo que el equipo indique otra rama de destino.

### Plantilla sugerida para el Pull Request

Usa la siguiente estructura al crear un Pull Request:

```markdown
## Resumen

Explica brevemente qué se implementó, corrigió o modificó.

Ejemplo:
Se ajustó el flujo de compra de boletos para integrar la pasarela de pagos y alinear los estados del sistema con los estados utilizados en la base de datos.

## Cambios principales

- Cambio principal 1.
- Cambio principal 2.
- Cambio principal 3.

Ejemplo:
- Se integró el formulario de pago con Stripe.
- Se corrigió la asignación inicial del estado del boleto.
- Se actualizó la lógica de validación del QR.
- Se ajustó la vista de búsqueda de rutas para manejar el estado posterior al pago.

## Archivos o módulos modificados

Indica los archivos, vistas, composables, casos de uso o repositorios principales que fueron modificados.

Ejemplo:

- `src/Application/UseCases/ConfirmarCompra.ts`
- `src/Presentation/Views/cliente/BuscarRutas.vue`
- `src/Presentation/Composables/useControlBoletos.ts`
- `src/Domain/Constants/EstadosSistema.ts`

## ¿Cómo probar?

Describe los pasos necesarios para validar el cambio.

Ejemplo:

1. Iniciar el proyecto en entorno local.
2. Iniciar sesión con un usuario válido.
3. Ir al módulo afectado.
4. Ejecutar el flujo modificado.
5. Verificar que el resultado sea el esperado.

Si el cambio incluye pagos, validaciones de boletos, QR, asientos o estados, se deben indicar pasos concretos para comprobar el flujo completo.

## Resultado esperado

Describe qué debería ocurrir si el cambio funciona correctamente.

Ejemplo:
El usuario debe poder seleccionar una ruta, elegir asientos disponibles, completar el pago y visualizar el boleto generado sin errores de estado.

## Consideraciones importantes

Agrega aquí cualquier detalle que el reviewer deba tener en cuenta.

Ejemplo:

- Verificar que los estados coincidan con los valores permitidos en la base de datos.
- Confirmar que no se muestren códigos QR para boletos pendientes.
- Revisar que no existan errores en consola.
- Comprobar que los datos se guarden correctamente.
- Validar que no se hayan subido credenciales ni archivos sensibles.

## Pruebas realizadas

Marca las pruebas que aplican:

- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Prueba manual en navegador
- [ ] Validación de flujo completo
- [ ] Revisión de consola sin errores
- [ ] Verificación en base de datos, si aplica

### Revisión del Pull Request

Durante la revisión, se debe verificar especialmente:

* Que el cambio cumpla con el objetivo descrito.
* Que no afecte funcionalidades existentes.
* Que los estados, validaciones y flujos críticos funcionen correctamente.
* Que no existan errores en consola.
* Que el código sea claro y mantenible.
* Que no se hayan usado tipos inseguros innecesarios.
* Que no se hayan incluido credenciales, tokens o información sensible.
* Que la lógica de negocio no quede mezclada innecesariamente con la interfaz.

Si el reviewer solicita cambios, el autor debe corregirlos y dejar un comentario indicando qué fue ajustado.

Ejemplo:

```markdown
Cambios realizados después de la revisión:

- Se corrigió la validación de disponibilidad.
- Se ajustó el estado inicial del boleto.
- Se agregó validación para impedir mostrar QR en boletos pendientes.
- Se ejecutaron nuevamente las pruebas.
```

Una vez corregidos los puntos solicitados, se debe volver a pedir revisión.
