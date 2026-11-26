# Changelog

## [Unreleased]

### Added
- Validación de capacidad en módulo de mesas
  - Al crear mesa: valida que la suma de capacidad de todas las mesas no exceda el límite del evento
  - Al editar mesa: valida que al aumentar capacidad no exceda el límite del evento
  - Muestra información de capacidad disponible en formularios
  - Indicador visual en lista de mesas cuando la capacidad total excede el límite
  - Mensajes de error claros con valores específicos

### Fixed
- Modal de reactivación ahora se cierra automáticamente después de reactivar con éxito una invitación
- Agregado `useEffect` que detecta cuando la acción de reactivación es exitosa y cierra el modal

### Technical Details
- Agregado hook `useEffect` que monitorea `actionData.success` 
- El modal se cierra cuando el mensaje incluye "reactivada"
- Mejora en la experiencia de usuario al evitar tener que cerrar manualmente el modal después de una acción exitosa
- Validaciones en mesas usan `getCapacityStatus` para obtener límite del evento
- Se calcula capacidad total de mesas y se compara contra límite del evento

---

## [1.0.0] - 2024-11-26

### Added - Sistema de Control de Capacidad

#### Funcionalidades Principales
- Control de capacidad total del evento configurable desde settings
- Validación automática al crear nuevas invitaciones
- Validación de incrementos al editar invitaciones existentes
- Reactivación de invitaciones rechazadas con modal y validación
- Visualización de capacidad en dashboard con barra de progreso
- Contabilización completa: confirmados + pendientes + pool disponible

#### Configuración (`app/routes/admin/settings.tsx`)
- Nueva sección "Capacidad del Evento" en settings
- Input para configurar capacidad máxima
- Resumen de ocupación actual (confirmados + pendientes + pool)
- Validación que previene establecer capacidad menor a ocupación actual
- Opción de desactivar límite dejando el campo vacío

#### Validaciones
- **Al crear invitación:** Valida que no exceda capacidad total
- **Al editar invitación:** Valida solo el incremento de pases
- **Al reactivar rechazada:** Modal con validación de capacidad
- Mensajes de error claros: "Capacidad excedida: X/Y pases ocupados"

#### Visualización en Dashboard
- Nueva sección "Capacidad del Evento" (solo si está configurada)
- Muestra: "X / Y pases ocupados" con tamaño grande
- Barra de progreso con colores según ocupación:
  - Verde (success): <75%
  - Amarillo (warning): 75-95%
  - Rojo (error): >95%
- Desglose: "X confirmados • Y pendientes • Z en pool"
- Warning cuando quedan ≤10 pases disponibles
- Alert de capacidad máxima alcanzada

#### Warnings Informativos
- En crear invitación: warning cuando quedan ≤20 pases
- En crear invitación: error cuando capacidad = 0
- En dashboard: warning cuando quedan ≤10 pases
- En modal reactivación: muestra capacidad disponible

#### Reactivación de Invitaciones
- Botón "Reactivar invitación" en zona de peligro (solo para declined)
- Modal con input para cantidad de pases (1 a max_guests original)
- Muestra capacidad disponible en tiempo real
- Validación de capacidad antes de permitir reactivación
- Mensajes de error claros si excede capacidad

#### Capa de Datos (`app/lib/db.server.ts`)
- Nueva interface `CapacityStatus`
- Función `getCapacityStatus()`: calcula estado actual de capacidad
- Función `validateCapacity()`: valida disponibilidad con exclusión de grupos
- Modificado `getDashboardMetrics()`: incluye métricas de capacidad

#### Scripts y Documentación
- Script helper: `scripts/test-capacity.sh`
  - Comandos para configurar, resetear, ver estado
  - Crear datos de prueba
  - Queries personalizadas
- Documentación completa:
  - `TESTING_CAPACITY.md`: Guía de pruebas con 7 escenarios
  - `QUICK_START.md`: Inicio rápido (5 minutos)
  - `CAPACITY_SYSTEM_SUMMARY.md`: Resumen técnico detallado
- `README.md` actualizado con nueva funcionalidad

#### Archivos Modificados
- `app/lib/db.server.ts` (~130 líneas)
- `app/routes/admin/settings.tsx` (~80 líneas)
- `app/routes/admin/guests-new.tsx` (~40 líneas)
- `app/routes/admin/guests-edit.tsx` (~120 líneas)
- `app/routes/admin/dashboard.tsx` (~60 líneas)

#### Notas Técnicas
- No requiere migración SQL (usa tabla `settings` existente)
- Capacidad independiente por ambiente (local vs producción)
- Sistema opcional: sin configurar = sin validaciones
- Pool de pases cuenta como ocupado
- Build exitoso sin errores ni warnings

---

## Formato del Changelog

Este changelog sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

### Categorías
- **Added**: Para nuevas funcionalidades
- **Changed**: Para cambios en funcionalidades existentes
- **Deprecated**: Para funcionalidades que serán removidas
- **Removed**: Para funcionalidades removidas
- **Fixed**: Para corrección de bugs
- **Security**: Para vulnerabilidades de seguridad
