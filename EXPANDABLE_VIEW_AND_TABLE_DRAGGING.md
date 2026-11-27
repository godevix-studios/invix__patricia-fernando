# Nuevas Funcionalidades: Vista Expandida y Mesas Movibles

## Funcionalidades Implementadas

### 1. Mesas Arrastrables 🔄

**Ahora puedes mover las mesas en el canvas** para reorganizar visualmente la distribución.

**Cómo funciona:**
- Cada mesa tiene un icono 🔄 en la esquina superior derecha
- Haz clic y arrastra el icono para mover la mesa
- La posición se guarda automáticamente en la base de datos
- Las posiciones persisten entre sesiones

**Notas importantes:**
- ✅ Las posiciones son solo visuales para facilitar la gestión
- ✅ NO afectan la distribución real del evento
- ✅ Útil para agrupar mesas por zonas, categorías, etc.
- ✅ Se guarda cada cambio de posición automáticamente

### 2. Vista Expandida 🖼️

**Botón "Expandir"** en la esquina superior derecha del canvas.

**Vista Normal:**
```
┌─────────────────────────────────────────┐
│ Sidebar  │   Canvas (700px alto)        │
│ (360px)  │                              │
│          │                              │
└─────────────────────────────────────────┘
```

**Vista Expandida:**
```
┌─────────────────────────────────────────┐
│          Vista Expandida                │
│ [Minimizar]                       [X]   │
├─────────────────────────────────────────┤
│ Sidebar  │   Canvas (pantalla completa)│
│ (360px)  │   (calc(100vh - 180px))     │
│          │                              │
│          │                              │
│          │                              │
└─────────────────────────────────────────┘
```

**Ventajas:**
- ✅ **Más espacio**: Canvas ocupa casi toda la pantalla
- ✅ **Mejor visibilidad**: Ambos paneles siempre visibles
- ✅ **Mayor comodidad**: Perfecto para sesiones largas de asignación
- ✅ **Atajo de teclado**: Presiona ESC para salir

**Controles:**
- Botón "Expandir" → Abre vista expandida
- Botón "Vista normal" → Cierra vista expandida
- Tecla ESC → Cierra vista expandida

### 3. Drag & Drop Mejorado

**3 tipos de drag & drop en el mismo contexto:**

1. **Invitados individuales** → Mesa
   - Arrastra un invitado desde el sidebar
   - Suéltalo sobre una mesa
   - Validación de capacidad automática

2. **Grupos completos** → Mesa
   - Arrastra el header del grupo
   - Asigna todos los invitados del grupo a la vez
   - Verifica que haya espacio suficiente

3. **Mesas** → Nueva posición en canvas (NUEVO ✨)
   - Haz clic en el icono 🔄 de la mesa
   - Arrastra a la nueva posición
   - Se guarda automáticamente

## Cambios Técnicos

### Archivos Modificados

1. **`app/components/seating/table-card.tsx`**
   - Agregado `useDraggable` para mover mesas
   - Header ahora tiene un drag handle con icono 🔄
   - Transform aplicado durante el drag
   - Título "Arrastrar para mover mesa" en hover

2. **`app/components/seating/seating-canvas.tsx`**
   - Estado `isExpanded` para controlar vista expandida
   - Listener de tecla ESC para cerrar modal
   - `handleDragEnd` actualizado para manejar `table-move`
   - Calcula nueva posición con delta del drag
   - Modal fullscreen con `AnimatePresence` de Framer Motion
   - Botón de expandir/contraer con iconos

3. **`app/components/admin-icons.tsx`**
   - Agregado `IconMaximize` (expandir)
   - Agregado `IconMinimize` (contraer)

### Lógica de Drag & Drop

```typescript
// Tipos de drag identificados por `type`:
- "guest" → Invitado individual
- "group" → Grupo completo  
- "table-move" → Mover mesa (NUEVO)

// En handleDragEnd:
if (activeData?.type === "table-move" && delta) {
  const newX = Math.max(0, table.position_x + delta.x);
  const newY = Math.max(0, table.position_y + delta.y);
  onUpdatePosition(tableId, newX, newY);
}
```

### Vista Expandida

```typescript
// Control de estado
const [isExpanded, setIsExpanded] = useState(false);

// Listener ESC
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isExpanded) {
      setIsExpanded(false);
    }
  };
  window.addEventListener("keydown", handleEscape);
  return () => window.removeEventListener("keydown", handleEscape);
}, [isExpanded]);

// Altura dinámica del canvas
height: isExpanded ? "calc(100vh - 180px)" : "700px"
```

## UX / UI

### Feedback Visual

**Mesas siendo arrastradas:**
- Opacidad 50% durante drag
- Overlay con nombre de la mesa
- "Moviendo Mesa 3" en el drag overlay

**Botón de expandir:**
- Icono y texto cambian según el estado
- Hover con color dorado
- Transición suave

**Modal de vista expandida:**
- Fade in/out con Framer Motion
- Fondo completo con tema admin
- Header con título descriptivo
- Instrucciones claras

### Accesibilidad

- ✅ Botones con labels descriptivos
- ✅ Atajo de teclado (ESC)
- ✅ Títulos en hover para drag handles
- ✅ Estados visuales claros

## Resultado

**Nuevas capacidades:**

✅ **Reorganizar mesas visualmente** - Mejora la gestión y organización
✅ **Vista expandida** - Más espacio y comodidad para trabajar
✅ **3 tipos de drag & drop** - Invitados, grupos y mesas
✅ **Persistencia automática** - Posiciones guardadas en DB
✅ **UX mejorada** - Atajos de teclado, feedback visual, instrucciones

**Workflow típico:**

1. Crear mesas en `/admin/tables/bulk`
2. Ir a `/admin/seating-chart`
3. Mover mesas para organizarlas (ej: por zona)
4. Expandir vista para trabajar más cómodo
5. Arrastrar invitados/grupos a las mesas
6. Las posiciones y asignaciones se guardan automáticamente

---
**Fecha:** 2026-11-26
**Build:** ✅ Exitoso
**Estado:** ✅ Listo para usar
