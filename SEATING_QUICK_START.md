# Quick Start - Sistema de Distribución de Mesas

## 🚀 Inicio Rápido (5 minutos)

Este documento te guía paso a paso para usar el sistema de distribución de mesas por primera vez.

---

## Paso 1: Crear Mesas en Lote

1. **Accede al panel admin**: http://localhost:5173/admin
2. **Ve a Mesas**: Click en "Mesas" en el menú lateral
3. **Click en "Crear múltiples"**
4. **Configura las mesas**:
   - Cantidad: `10`
   - Capacidad: `8` personas por mesa
   - Prefijo: `Mesa`
   - Separador: `-` (guión)
   - Número inicial: `1`
5. **Verifica el preview**: Debe mostrar "Mesa-1" a "Mesa-10"
6. **Click en "Crear 10 mesas"**

✅ **Resultado**: 10 mesas creadas automáticamente con posiciones en grid

---

## Paso 2: Acceder a la Distribución

1. **Click en "Distribución"** en el menú lateral izquierdo (icono de cuadrícula)
2. **Verás dos paneles**:
   - **Izquierda**: Panel de invitados (sidebar)
   - **Derecha**: Canvas con las mesas

---

## Paso 3: Asignar un Invitado Individual

1. **En el panel izquierdo**, busca un grupo de invitados
2. **Click en el icono > (flecha)** para expandir el grupo
3. **Verás la lista de invitados** del grupo
4. **Arrastra un invitado** con el mouse
5. **Suéltalo sobre una mesa** en el canvas
6. **Verás**:
   - ✓ Toast verde: "Asignación guardada"
   - El invitado ahora muestra el nombre de la mesa
   - La mesa muestra el nombre del invitado en su lista

---

## Paso 4: Asignar un Grupo Completo

1. **En el panel izquierdo**, identifica un grupo **SIN expandir**
2. **Arrastra el header del grupo** (toda la tarjeta)
3. **Suéltalo sobre una mesa** con suficiente capacidad
4. **Verás**:
   - ✓ Todos los invitados del grupo ahora tienen la misma mesa
   - El estado del grupo muestra "Todos en [Mesa X]"

---

## Paso 5: Usar Búsqueda y Filtros

### Búsqueda
1. **En el campo de búsqueda** (arriba del panel izquierdo)
2. **Escribe** un nombre de invitado o grupo
3. **La lista se filtra** en tiempo real

### Filtros
1. **Click en "Sin asignar"** para ver solo grupos sin mesa
2. **Click en "Asignados"** para ver solo grupos con mesa
3. **Click en "Confirmados"** para ver solo invitados que confirmaron
4. **Click en "Todos"** para volver a ver todos

---

## Paso 6: Expandir/Colapsar Todos

1. **Click en "Expandir todos"** (arriba del panel izquierdo)
2. **Verás todos los invitados** de todos los grupos
3. **Click en "Colapsar todos"** para cerrar todos

---

## 🎯 Tips y Trucos

### Durante el Drag & Drop

**Cuando arrastras un invitado/grupo**:
- 🟢 **Borde dorado** = La mesa tiene espacio, puedes soltar
- 🔴 **Borde rojo** = La mesa está llena, no puedes soltar
- 💬 **Tooltip flotante** = Muestra cuántos espacios hay disponibles

**Si intentas soltar en una mesa llena**:
- ❌ La mesa "tiembla" (animación shake)
- ❌ Aparece error: "La mesa está llena"
- ❌ La asignación NO se guarda

### Validación de Capacidad

El sistema valida automáticamente:
- ✅ Un invitado individual cabe en la mesa
- ✅ Un grupo completo cabe en la mesa
- ❌ No permite exceder la capacidad

**Ejemplo**: Mesa de 8 personas, ocupada con 6
- ✅ Puedes asignar 1 o 2 invitados individuales
- ❌ NO puedes asignar un grupo de 3 personas

### Prioridad de Asignaciones

**Individual > Grupal**:
1. Si asignas un grupo a "Mesa 1", todos van a Mesa 1
2. Si luego mueves UN miembro a "Mesa 2", ese miembro va a Mesa 2
3. Los demás siguen en Mesa 1
4. El estado del grupo muestra "Parcial (3/4)"

---

## 🔄 Cambiar una Asignación

**Para reasignar un invitado**:
1. Simplemente **arrastra el invitado** a otra mesa
2. La asignación se **actualiza automáticamente**
3. No necesitas "eliminar" primero

---

## 📊 Ver Estado de Asignaciones

**En el header superior** verás:
- **X / Y asignados** = X invitados tienen mesa de Y totales
- **Z grupos sin asignar** = Cuántos grupos no tienen ninguna asignación
- **W grupos parcial** = Cuántos grupos tienen algunos invitados sin mesa

---

## 💾 Persistencia

**Todas las asignaciones se guardan automáticamente**:
- ✅ Recargar la página (F5) mantiene las asignaciones
- ✅ Cerrar sesión y volver a entrar mantiene las asignaciones
- ✅ Las asignaciones están en la base de datos

---

## 🐛 Problemas Comunes

### "No veo las mesas en el canvas"
**Solución**: Verifica que creaste mesas. Ve a Admin → Mesas y verifica que hay mesas listadas.

### "Puedo arrastrar pero no suelta"
**Solución**: 
1. Verifica que la mesa tiene espacio disponible
2. Si el borde es rojo, la mesa está llena
3. Intenta soltar en una mesa con espacio (borde dorado)

### "El invitado no muestra la mesa asignada"
**Solución**: Recarga la página (F5). Si aún no aparece, verifica la consola del navegador por errores.

### "La búsqueda no encuentra a nadie"
**Solución**: 
1. Verifica que escribiste el nombre correctamente
2. Borra el campo de búsqueda y vuelve a intentar
3. Usa el filtro "Todos" para ver todos los grupos

---

## 📱 Responsive

**En tablet (< 1024px)**:
- El layout cambia a vertical (sidebar arriba, canvas abajo)
- Puedes hacer scroll para ver todo

**En móvil (< 768px)**:
- La experiencia es limitada debido al tamaño del canvas
- Recomendado usar desktop o tablet para esta funcionalidad

---

## ⌨️ Atajos de Teclado

- **Tab**: Navegar entre elementos
- **Enter/Space**: Activar elemento enfocado (solo con keyboard navigation avanzado)
- **Escape**: Cancelar drag actual

---

## 📚 Más Información

- **Documentación completa**: [`docs/SEATING_CHART.md`](docs/SEATING_CHART.md)
- **Testing manual**: [`scripts/test-seating-chart.md`](scripts/test-seating-chart.md)
- **Resumen de implementación**: [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras un problema o tienes dudas:
1. Revisa la documentación completa en `docs/SEATING_CHART.md`
2. Verifica la sección "Troubleshooting" en la documentación
3. Revisa la consola del navegador (F12) por errores

---

**¡Listo! Ya puedes gestionar la distribución de mesas visualmente** 🎉
