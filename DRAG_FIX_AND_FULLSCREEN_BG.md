# Correcciones: Drag de Mesas y Fondo de Vista Expandida

## Problemas Corregidos

### 1. Drag de Mesas No Funcionaba ❌ → ✅

**Problema:**
- El drag handle tenía `setDraggableRef` pero usaba un `<div>`
- Conflicto entre `useDroppable` y `useDraggable` en el mismo elemento
- El transform no se aplicaba correctamente

**Solución:**

**Antes:**
```tsx
<motion.div ref={setDroppableRef}>
  <div ref={setDraggableRef} {...attributes} {...listeners}>
    <IconMove />
  </div>
</motion.div>
```

**Ahora:**
```tsx
<div ref={setDroppableRef}>
  <button ref={setDraggableRef} type="button" {...attributes} {...listeners}>
    <IconMove />
  </button>
</div>
```

**Cambios clave:**
1. **Separación de responsabilidades:**
   - Contenedor principal: `useDroppable` (para recibir invitados)
   - Botón drag handle: `useDraggable` (para mover mesa)

2. **Transform corregido:**
   ```typescript
   const baseStyle = {
     left: `${table.position_x}px`,
     top: `${table.position_y}px`,
   };
   
   const dragStyle = transform
     ? {
         transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
         opacity: isDragging ? 0.7 : 1,
         zIndex: isDragging ? 1000 : 1,
       }
     : {};
   
   style={{ ...baseStyle, ...dragStyle }}
   ```

3. **Cambio de `<div>` a `<button>`:**
   - Mejor accesibilidad
   - `type="button"` evita submit
   - `touch-none` previene scroll en mobile

4. **Removido `motion.div`:**
   - Simplificado a `<div>` normal
   - Menos overhead, mejor performance
   - Animaciones de motion no eran necesarias

### 2. Vista Expandida Sin Fondo ❌ → ✅

**Problema:**
- Modal fullscreen usaba `bg-[var(--admin-bg)]` que era transparente
- Se veía el contenido de abajo

**Solución:**

**Antes:**
```tsx
<motion.div className="fixed inset-0 z-50 bg-[var(--admin-bg)]">
```

**Ahora:**
```tsx
<motion.div 
  className="fixed inset-0 z-50 flex flex-col overflow-hidden"
  style={{ 
    padding: "2rem",
    backgroundColor: "#0C0C0E", // --surface-base sólido
  }}
>
```

**Cambios:**
- Fondo sólido `#0C0C0E` (color del tema NoirLuxe)
- Agregado `overflow-hidden` para evitar scroll
- Background aplicado con `style` en lugar de clase Tailwind

## Resultado

### Drag de Mesas

✅ **Ahora funciona correctamente:**
- Haz clic en el icono 🔄 de cualquier mesa
- Arrastra la mesa a una nueva posición
- Se ve el transform en tiempo real
- Se guarda la posición automáticamente

**Feedback visual durante drag:**
- Opacidad: 70%
- Z-index: 1000 (encima de todo)
- Overlay muestra: "Moviendo Mesa 3"

### Vista Expandida

✅ **Ahora tiene fondo sólido:**
- Color: `#0C0C0E` (negro cálido del tema)
- No se ve el contenido de abajo
- Modal con altura completa
- ESC para salir

## Testing

**Para probar el drag de mesas:**
1. Ve a `/admin/seating-chart`
2. Localiza el icono 🔄 en la esquina superior derecha de cualquier mesa
3. Haz clic y arrastra el icono
4. Suelta en la nueva posición
5. Recarga la página - la posición persiste ✅

**Para probar la vista expandida:**
1. Clic en botón "Expandir"
2. Verifica que el fondo sea sólido negro
3. Ambos paneles (sidebar y canvas) visibles
4. Presiona ESC para salir
5. O clic en "Vista normal"

## Archivos Modificados

1. `app/components/seating/table-card.tsx`
   - Reescrito completamente para corregir drag
   - Removido `motion.div`
   - Separación de `setDroppableRef` y `setDraggableRef`
   - Botón con `touch-none` para mobile
   - Transform aplicado con `translate3d`

2. `app/components/seating/seating-canvas.tsx`
   - Fondo sólido en modal: `backgroundColor: "#0C0C0E"`
   - Agregado `overflow-hidden`

---
**Fecha:** 2026-11-26
**Build:** ✅ Exitoso
**Estado:** ✅ Ambos problemas corregidos y funcionando
