# Fondo Dorado para Mesas en Canvas

## Cambio Implementado

Agregado color de fondo dorado (amarillo de la paleta) a las mesas para que resalten sobre el grid del canvas.

## Colores Aplicados

### Mesa (contenedor principal)
```css
backgroundColor: "rgba(201, 168, 76, 0.08)" /* --gold con 8% opacidad */
backdropFilter: "blur(8px)" /* Efecto glassmorphism sutil */
```

**Resultado:** Fondo amarillo muy suave que permite ver el grid pero resalta la mesa.

### Header de la mesa
```css
backgroundColor: "rgba(201, 168, 76, 0.15)" /* --gold con 15% opacidad */
border-bottom: 1px solid var(--gold) /* Borde dorado */
```

**Resultado:** Header con color dorado más visible que el body, crea jerarquía visual.

## Comparación Visual

### ANTES
```
┌─────────────────────┐
│ Mesa 1              │ ← Transparente, se perdía con el grid
│ 3 / 10              │
├─────────────────────┤
│ • Juan Pérez        │
│ • María González    │
└─────────────────────┘
```

### AHORA
```
┏━━━━━━━━━━━━━━━━━━━━━┓
┃ Mesa 1       🔄     ┃ ← Fondo dorado 15% (más visible)
┃ 3 / 10              ┃
┣━━━━━━━━━━━━━━━━━━━━━┫ ← Borde dorado
┃ • Juan Pérez        ┃ ← Fondo dorado 8% (sutil)
┃ • María González    ┃
┗━━━━━━━━━━━━━━━━━━━━━┛
```

## Paleta de Colores Usada

De `app/admin.css`:
```css
--gold: #C9A84C; /* Base dorado */
--gold-dim: rgba(201, 168, 76, 0.08); /* Mesa body */
/* Custom: rgba(201, 168, 76, 0.15) */ /* Mesa header */
```

**Por qué estos valores:**
- 8% opacidad: Suficiente para distinguir la mesa sin opacar el grid
- 15% opacidad: Header más prominente, crea contraste visual
- Efecto blur: Da sensación de profundidad y modernidad

## Beneficios

✅ **Mejor visibilidad:** Las mesas se distinguen claramente del grid
✅ **Coherencia visual:** Usa el color dorado de la paleta del tema
✅ **Jerarquía clara:** Header más visible que el body
✅ **Elegancia:** Efecto glassmorphism sutil
✅ **No interfiere:** El grid sigue visible a través del fondo

## Notas de Diseño

**Variantes consideradas:**
- 5% opacidad: Demasiado sutil, casi invisible
- 10% opacidad: Bien pero queremos un poco más
- 15% opacidad: Perfecto para header
- 20% opacidad: Demasiado opaco, oculta el grid

**Efecto glassmorphism:**
- `backdrop-filter: blur(8px)` agrega un desenfoque sutil
- Da sensación de profundidad
- Efecto moderno y premium
- Compatible con la mayoría de navegadores modernos

## Testing

Para ver el cambio:
1. Ve a `/admin/seating-chart`
2. Las mesas ahora tienen fondo amarillo dorado
3. El header es un poco más oscuro que el body
4. El grid sigue visible a través del fondo

---
**Fecha:** 2026-11-26
**Build:** ✅ Exitoso
**Color:** 🟡 Dorado (#C9A84C con 8% y 15% opacidad)
