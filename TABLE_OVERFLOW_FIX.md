# Corrección: Overflow de Lista de Invitados en Mesas

## Problema

La lista de invitados asignados a una mesa sobresalía del contenedor de la mesa en el canvas.

**Causa:** `maxHeight: 120px` era demasiado para el espacio disponible dentro de la mesa de 180px.

## Solución

### 1. Ajuste de Altura Máxima

**Cálculo:**
```
Altura total de mesa: 180px
- Header (py-3 + contenido): ~60px
- Padding de lista (py-2): ~16px
- Borde: ~1px
= Espacio disponible: ~103px
```

**Configuración aplicada:**
```tsx
<div style={{ maxHeight: "100px" }}>
```

Dejamos 100px para estar seguros y evitar cualquier overflow.

### 2. Prevención de Overflow Horizontal

Agregado `overflow-x-hidden` para evitar scroll horizontal innecesario:

```tsx
className="overflow-y-auto overflow-x-hidden"
```

### 3. Scrollbar Personalizado

Agregado estilos CSS para un scrollbar elegante que coincide con el tema dorado:

**Chrome/Safari (Webkit):**
```css
.table-guest-list::-webkit-scrollbar {
  width: 4px; /* Scrollbar delgado */
}

.table-guest-list::-webkit-scrollbar-thumb {
  background: rgba(201, 168, 76, 0.3); /* Dorado 30% */
  border-radius: 2px;
}

.table-guest-list::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.5); /* Dorado 50% en hover */
}
```

**Firefox:**
```css
.table-guest-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 168, 76, 0.3) rgba(242, 240, 235, 0.03);
}
```

## Resultado

### ANTES ❌
```
┏━━━━━━━━━━━━━━━━━━━┓
┃ Mesa 1      🔄    ┃
┃ 5 / 8             ┃
┣━━━━━━━━━━━━━━━━━━━┫
┃ • Juan Pérez      ┃
┃ • María González  ┃
┃ • Pedro López     ┃
┃ • Ana Martínez    ┃
┃ • Luis Sánchez    ┃ ← Se sale de la mesa
  • Carlos Ruiz     ← Overflow visible
```

### AHORA ✅
```
┏━━━━━━━━━━━━━━━━━━━┓
┃ Mesa 1      🔄    ┃
┃ 5 / 8             ┃
┣━━━━━━━━━━━━━━━━━━━┫
┃ • Juan Pérez      ┃
┃ • María González  ┃
┃ • Pedro López    ║┃ ← Scrollbar dorado
┃ • Ana Martínez   ║┃
┃ • Luis Sánchez   ║┃
┗━━━━━━━━━━━━━━━━━━━┛
  (Scroll para ver más)
```

## Comportamiento

✅ **Sin overflow:** Lista no sobresale de la mesa
✅ **Scroll vertical:** Aparece solo cuando hay más de ~5 invitados
✅ **Sin scroll horizontal:** Texto se trunca con `truncate` si es muy largo
✅ **Scrollbar elegante:** Delgado (4px) y color dorado
✅ **Hover:** Scrollbar se hace más visible al pasar el mouse

## Capacidad Visual

Con `maxHeight: 100px` y cada item de ~20px de altura:
- **Visible sin scroll:** ~5 invitados
- **Con scroll:** Hasta 10+ invitados (según la capacidad de la mesa)

## Archivos Modificados

1. `app/components/seating/table-card.tsx`
   - Reducido `maxHeight` de 120px a 100px
   - Agregado `overflow-x-hidden`
   - Agregado clase `table-guest-list`

2. `app/admin.css`
   - Agregado estilos de scrollbar personalizado
   - Compatible con Chrome, Safari, Firefox

## Testing

Para probar:
1. Ve a `/admin/seating-chart`
2. Asigna más de 5 invitados a una mesa
3. Verifica que:
   - La lista no sobresale de la mesa ✅
   - Aparece un scrollbar dorado delgado ✅
   - El scroll funciona correctamente ✅
   - El scrollbar se hace más visible en hover ✅

---
**Fecha:** 2026-11-26
**Build:** ✅ Exitoso
**Estado:** ✅ Overflow corregido, scrollbar elegante agregado
