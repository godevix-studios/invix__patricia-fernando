# Sistema de Distribución de Mesas

## Descripción General

El sistema de distribución de mesas es una funcionalidad avanzada del panel de administración que permite asignar invitados a mesas de forma visual e interactiva mediante un canvas con drag & drop.

### Características Principales

- **Asignaciones individuales**: Cada invitado puede ser asignado a una mesa específica, independiente de su grupo
- **Asignaciones grupales**: Asignación rápida de todos los miembros de un grupo a la misma mesa
- **Prioridad mixta**: Las asignaciones individuales prevalecen sobre las asignaciones grupales
- **Canvas interactivo**: Visualización espacial de mesas en un grid de 1200x800px
- **Drag & Drop dual**: Arrastrar grupos completos O invitados individuales
- **Creación masiva de mesas**: Formulario para crear múltiples mesas con nombres personalizados
- **Persistencia de posiciones**: Las posiciones X,Y de las mesas se guardan en la base de datos

## Arquitectura de Datos

### Tablas de Base de Datos

#### `guest_table_assignments` (Nueva)
Almacena asignaciones individuales de invitados a mesas.

```sql
CREATE TABLE guest_table_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(guest_id) -- Un invitado solo puede estar en una mesa
);
```

#### `tables` (Extendida)
Se agregaron columnas para posicionamiento en el canvas:

```sql
ALTER TABLE tables ADD COLUMN position_x INTEGER DEFAULT 0;
ALTER TABLE tables ADD COLUMN position_y INTEGER DEFAULT 0;
```

### Lógica de Prioridad

La asignación de un invitado a una mesa se resuelve con la siguiente prioridad:

1. **Asignación individual** (tabla `guest_table_assignments`) - Mayor prioridad
2. **Asignación grupal** (tabla `guest_groups.table_id`) - Menor prioridad

Esto permite que algunos miembros de un grupo estén en mesas diferentes.

### Queries Principales

#### Obtener invitados asignados a una mesa
```sql
SELECT 
  g.id, g.name, g.is_representative,
  COALESCE(gta.table_id, gg.table_id) as assigned_table_id
FROM guests g
INNER JOIN guest_groups gg ON gg.id = g.group_id
LEFT JOIN guest_table_assignments gta ON gta.guest_id = g.id
WHERE COALESCE(gta.table_id, gg.table_id) = ?
```

## Componentes de la Interfaz

### 1. SeatingChart (`/admin/seating-chart`)
Ruta principal que integra todos los componentes.

**Funcionalidad:**
- Loader: carga mesas con posiciones, grupos con invitados, y resumen de asignaciones
- Action: procesa intents de asignación (`assign-guest`, `assign-group`, `update-position`)
- Layout: panel lateral (GuestsSidebar) + canvas (SeatingCanvas)

### 2. GuestsSidebar
Panel lateral izquierdo con lista de grupos e invitados.

**Características:**
- Búsqueda en tiempo real (nombre de grupo o invitado)
- Filtros: Todos, Sin asignar, Asignados, Confirmados
- Árbol expandible de grupos con invitados
- Botones "Expandir todos" / "Colapsar todos"

### 3. SeatingCanvas
Canvas interactivo con grid y mesas.

**Características:**
- Grid visual de fondo (50px x 50px)
- Mesas posicionadas con `position: absolute`
- Drag & Drop con @dnd-kit:
  - Arrastrar invitado individual → asignar a mesa
  - Arrastrar grupo completo → asignar todos a mesa
- Validación de capacidad en tiempo real
- Feedback visual: borde dorado (válido) o rojo (inválido)

### 4. TableCard
Componente visual de mesa droppable.

**Características:**
- Muestra nombre + ocupación (ej: "Mesa 1 • 7/10")
- Lista de invitados asignados (con scroll)
- Indicador de capacidad:
  - Verde: < 75% ocupado
  - Amarillo: 75-99% ocupado
  - Rojo: 100% lleno
- Estados hover durante drag

### 5. GuestItem
Componente de invitado individual draggable.

**Características:**
- Badge de representante (★ dorada)
- Chip de mesa asignada (verde) o "Sin mesa" (gris)
- Icono de drag handle
- Opacidad 50% durante drag

### 6. GuestGroupItem
Componente de grupo con árbol expandible.

**Características:**
- Header draggable (arrastrar grupo completo)
- Icono expand/collapse
- Estado de asignación:
  - "Todos en [Mesa X]" (verde)
  - "Parcial (X/Y)" (amarillo)
  - "Sin asignar" (gris)
- Body expandible con animación (motion)

### 7. BulkTablesCreator (`/admin/tables/bulk`)
Formulario de creación masiva de mesas.

**Características:**
- Cantidad de mesas (1-100)
- Capacidad por mesa
- Patrón de nombres: `{prefix}{separator}{number}`
  - Prefijo: texto antes del número (ej: "VIP", "Mesa")
  - Separador: `-`, ` `, `_`, o sin separador
  - Número inicial: comenzar numeración desde N
- Preview en tiempo real de nombres generados
- Validación de capacidad del evento
- Posicionamiento automático en grid (5 columnas, 250px horizontal, 220px vertical)

## Flujo de Trabajo

### 1. Crear Mesas
1. Acceder a `/admin/tables/bulk`
2. Configurar cantidad, capacidad y patrón de nombres
3. Verificar preview
4. Crear mesas → se generan con posiciones en grid automático

### 2. Asignar Invitados
1. Acceder a `/admin/seating-chart`
2. Ver mesas en canvas (lado derecho) y grupos en sidebar (lado izquierdo)
3. Expandir grupo para ver invitados individuales (opcional)
4. Arrastrar grupo o invitado sobre una mesa
5. Validación automática de capacidad:
   - ✓ Si hay espacio: asignación exitosa
   - ✗ Si está llena: error y animación shake
6. La asignación se guarda automáticamente en la BD

### 3. Reposicionar Mesas
1. En el canvas, arrastrar una mesa a nueva posición
2. Snap to grid automático (múltiplos de 50px)
3. Posición se guarda con debounce de 500ms

## Consideraciones Técnicas

### SSR y Client-Side Rendering
Los componentes de drag & drop (`SeatingCanvas`, `GuestsSidebar`) se cargan con `lazy()` para evitar ejecución en el servidor:

```tsx
const SeatingCanvas = lazy(() => import("~/components/seating/seating-canvas"));
const GuestsSidebar = lazy(() => import("~/components/seating/guests-sidebar"));
```

Esto es **crítico** porque @dnd-kit accede a APIs del navegador no disponibles en SSR.

### Performance
- **Memoización**: `TableCard`, `GuestItem`, `GuestGroupItem` deberían ser memoizados con `React.memo` para evitar re-renders innecesarios
- **Virtualización**: Si hay >100 grupos, considerar virtualización de la lista (react-window)
- **Debounce**: Actualización de posiciones de mesas usa debounce de 500ms para evitar múltiples requests

### Validaciones
- **Capacidad de mesa**: se verifica antes de cada asignación
- **Capacidad del evento**: se valida en creación masiva de mesas
- **IDs válidos**: se valida existencia de guest_id, group_id, table_id en actions

### Transacciones
Para asignar un grupo completo, se usa `db.batch()` para insertar todas las asignaciones en una sola transacción.

## Troubleshooting

### Problema: Mesas no aparecen en el canvas
**Solución**: Verificar que las mesas tienen valores en `position_x` y `position_y`. Si fueron creadas antes de la migración, actualizar manualmente:
```sql
UPDATE tables SET position_x = 50, position_y = 50 WHERE position_x = 0 AND position_y = 0;
```

### Problema: Drag & Drop no funciona
**Solución**: 
1. Verificar que `@dnd-kit/core` está instalado
2. Abrir consola del navegador y buscar errores
3. Verificar que los componentes están cargados con lazy (no en SSR)

### Problema: Asignación no se guarda
**Solución**:
1. Verificar que el action en `seating-chart.tsx` recibe los parámetros correctos
2. Revisar logs del servidor para errores de BD
3. Verificar que el `guest_id` y `table_id` existen

### Problema: Error "Mesa está llena" cuando hay espacio
**Solución**: La query de ocupación considera tanto asignaciones individuales como grupales. Verificar que no hay asignaciones duplicadas en `guest_table_assignments`.

## Próximas Mejoras (Tasks 11-14)

### Task 11: Integración completa y optimistic UI
- Usar `useFetcher()` para actualizar sin full page reload
- Implementar optimistic UI para feedback inmediato

### Task 12: Validaciones y feedback visual mejorado
- Tooltip flotante con capacidad disponible
- Animaciones de mesa (pulso cuando es target válido)
- Componente Toast para mensajes de confirmación

### Task 13: Responsive y accesibilidad
- Layout responsive (tabs en móvil)
- Keyboard navigation (Tab, Enter, Arrow keys)
- ARIA labels y screen reader support

### Task 14: Documentación y testing final
- Testing manual end-to-end
- Verificación de tipos TypeScript completos
- Limpieza de console.logs

## Referencias de Código

### Funciones principales de DB (`app/lib/db.server.ts`)
- `assignGuestToTable(db, guestId, tableId)` - Asignar invitado individual
- `removeGuestAssignment(db, guestId)` - Eliminar asignación individual
- `getTableAssignments(db, tableId)` - Obtener invitados de una mesa
- `getTablesWithPositions(db)` - Obtener mesas con posiciones
- `updateTablePosition(db, tableId, x, y)` - Actualizar posición de mesa

### Componentes (`app/components/seating/`)
- `seating-canvas.tsx` - Canvas principal con DndContext
- `table-card.tsx` - Mesa droppable
- `guest-item.tsx` - Invitado draggable
- `guest-group-item.tsx` - Grupo con árbol expandible
- `guests-sidebar.tsx` - Panel lateral con lista y filtros

### Rutas (`app/routes/admin/`)
- `seating-chart.tsx` - Ruta principal del sistema
- `tables-bulk.tsx` - Creación masiva de mesas

## Stack Tecnológico

- **Frontend**: React 19.3.1, React Router 8.5.3, TailwindCSS 4.2.2
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Animaciones**: motion (Framer Motion) v14.14.0
- **Backend**: Cloudflare Workers (SSR), Cloudflare D1 (SQLite)
- **Build**: Vite 8.0.3, TypeScript 5.9.3

## Licencia

Este sistema es parte del proyecto de invitaciones de boda Patricia & Fernando.
