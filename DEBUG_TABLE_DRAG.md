# Debug: Drag de Mesas

## Cambios Implementados para Debug

### 1. Logs de Consola Agregados

**En `seating-canvas.tsx`:**
```typescript
useEffect(() => {
  if (activeId) {
    console.log("🎯 Drag started:", activeId, dragData);
  }
}, [activeId, dragData]);
```

**En `table-card.tsx`:**
```typescript
console.log(`Table ${table.id} draggable setup:`, {
  id: `table-move-${table.id}`,
  hasTransform: !!transform,
  isDragging,
});
```

### 2. Mejoras en el Botón de Drag

**Cambios aplicados:**
```tsx
<button
  ref={setDraggableRef}
  type="button"
  className="cursor-grab active:cursor-grabbing p-2 hover:bg-[var(--admin-surface-elevated)] rounded transition-colors"
  title="Arrastrar para mover mesa"
  style={{ touchAction: "none" }}
  {...listeners}
  {...attributes}
>
  <IconMove size={16} className="text-[var(--admin-text-muted)] pointer-events-none" />
</button>
```

**Mejoras:**
- ✅ `cursor-grab` → `cursor-grabbing` en hover/active
- ✅ `touchAction: "none"` para prevenir gestos de navegador
- ✅ `pointer-events-none` en el icono (eventos solo en el botón)
- ✅ Padding aumentado a `p-2` (área más grande para hacer clic)
- ✅ Listeners y attributes en el orden correcto

### 3. Sensor Más Sensible

```typescript
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 5, // Reducido de 8px a 5px
  },
})
```

## Cómo Debuggear

### 1. Abre la Consola del Navegador

```bash
npm run dev
```

Luego ve a: http://localhost:5173/admin/seating-chart

Abre DevTools (F12) y ve a la pestaña Console.

### 2. Verifica los Logs de Setup

Deberías ver logs como:
```
Table 1 draggable setup: { id: "table-move-1", hasTransform: false, isDragging: false }
Table 2 draggable setup: { id: "table-move-2", hasTransform: false, isDragging: false }
...
```

**✅ Si ves estos logs:** Los draggables se están registrando correctamente.
**❌ Si NO los ves:** Hay un problema con el render de TableCard.

### 3. Intenta Arrastrar una Mesa

Haz clic en el icono 🔄 de una mesa y arrastra.

**Deberías ver:**
```
🎯 Drag started: table-move-3 { type: "table-move", tableId: 3, table: {...} }
```

**Si ves esto:** El drag está iniciando correctamente.

### 4. Suelta la Mesa

**Deberías ver en el network tab:**
- Request POST a `/admin/seating-chart`
- Con `intent: "update-position"`
- Con los nuevos valores de x, y

### 5. Verificaciones Adicionales

**En la consola, ejecuta:**
```javascript
// Ver todos los elementos con data-dnd-kit-draggable
document.querySelectorAll('[data-dnd-kit-draggable-id]').length
```

**Resultado esperado:** Número igual a la cantidad de mesas.

**En la consola, ejecuta:**
```javascript
// Ver IDs de draggables
Array.from(document.querySelectorAll('[data-dnd-kit-draggable-id]'))
  .map(el => el.getAttribute('data-dnd-kit-draggable-id'))
```

**Resultado esperado:** 
```javascript
["table-move-1", "table-move-2", "table-move-3", ...]
```

## Posibles Problemas

### Problema 1: No aparecen logs de setup

**Causa:** TableCard no se está renderizando o el lazy loading falla.

**Solución:** Verifica que las mesas existan:
```bash
wrangler d1 execute patricia-fernando-db --local --command "SELECT * FROM tables LIMIT 5;"
```

### Problema 2: Aparecen logs pero no inicia drag

**Causa:** Los listeners no se están aplicando correctamente.

**Verifica en DevTools:**
1. Inspecciona el botón 🔄
2. Ve a la pestaña "Event Listeners"
3. Debería tener: `pointerdown`, `touchstart`

**Si NO tiene listeners:**
- Verifica que `{...listeners}` esté en el botón
- Verifica que `setDraggableRef` esté en el botón

### Problema 3: Inicia drag pero no se ve transform

**Causa:** El transform no se está aplicando al estilo.

**Verifica:** Inspecciona el elemento con clase `absolute` (el contenedor de la mesa).
Debería tener en el estilo:
```css
transform: translate3d(10px, 20px, 0);
```

**Si NO lo tiene:**
- El problema está en la aplicación del `dragStyle`

### Problema 4: Se ve transform pero no guarda

**Causa:** El `handleDragEnd` no detecta `type === "table-move"`.

**Verifica en la consola:**
```javascript
// Al soltar, debería aparecer un log con activeData
```

**Si el log no aparece:**
- Verifica que `dragData.type === "table-move"`
- Agrega más logs en `handleDragEnd`

## Próximos Pasos

1. **Reinicia el servidor:** `npm run dev`
2. **Abre la consola del navegador**
3. **Intenta arrastrar una mesa**
4. **Copia y pega los logs aquí**
5. **Seguimos debuggeando con la información**

---
**Fecha:** 2026-11-26
**Build:** ✅ Exitoso con logs de debug
