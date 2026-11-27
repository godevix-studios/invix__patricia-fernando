# Script de Testing Manual - Sistema de Distribución de Mesas

## Pre-requisitos
- Servidor de desarrollo iniciado: `npm run dev`
- Base de datos con migración `0002_seating_assignments.sql` aplicada
- Al menos 20 grupos de invitados creados con diferentes tamaños
- Usuario admin con acceso al panel

## Casos de Prueba

### 1. Creación Masiva de Mesas

**URL**: http://localhost:5173/admin/tables/bulk

**Pasos**:
1. ✅ Acceder a la página de creación masiva
2. ✅ Configurar: 10 mesas, capacidad 8, prefijo "Mesa", separador "-", número inicial 1
3. ✅ Verificar preview muestra "Mesa-1" a "Mesa-10"
4. ✅ Cambiar separador a espacio, verificar preview actualiza a "Mesa 1", etc.
5. ✅ Crear mesas
6. ✅ Verificar redirección a /admin/tables
7. ✅ Verificar que las 10 mesas aparecen en la lista

**Resultado esperado**: 10 mesas creadas con nombres correctos

---

### 2. Visualización del Canvas

**URL**: http://localhost:5173/admin/seating-chart

**Pasos**:
1. ✅ Acceder a la distribución de mesas
2. ✅ Verificar que el canvas muestra las mesas creadas
3. ✅ Verificar que las mesas están en posiciones grid (5 columnas)
4. ✅ Verificar que el panel lateral muestra los grupos de invitados
5. ✅ Verificar que el resumen en header muestra estadísticas correctas

**Resultado esperado**: Canvas con grid visible, mesas posicionadas, panel lateral funcional

---

### 3. Asignación de Invitado Individual

**Pasos**:
1. ✅ Expandir un grupo en el panel lateral (click en icono de expandir)
2. ✅ Ver lista de invitados del grupo
3. ✅ Arrastrar un invitado individual sobre una mesa
4. ✅ Verificar que la mesa se resalta en dorado durante el drag
5. ✅ Verificar tooltip flotante muestra "✓ Disponible: X espacios"
6. ✅ Soltar el invitado sobre la mesa
7. ✅ Verificar toast de éxito "✓ Asignación guardada"
8. ✅ Verificar que el invitado ahora muestra chip con nombre de mesa
9. ✅ Verificar que la mesa muestra el nombre del invitado en su lista

**Resultado esperado**: Invitado asignado correctamente, cambios visibles en UI inmediatamente

---

### 4. Asignación de Grupo Completo

**Pasos**:
1. ✅ Colapsar un grupo (si está expandido)
2. ✅ Arrastrar el header del grupo (todo el grupo) sobre una mesa
3. ✅ Verificar validación de capacidad (si el grupo tiene 5 personas, la mesa debe tener al menos 5 espacios)
4. ✅ Soltar sobre mesa con capacidad suficiente
5. ✅ Verificar toast de éxito
6. ✅ Expandir el grupo
7. ✅ Verificar que TODOS los invitados del grupo ahora muestran la misma mesa asignada
8. ✅ Verificar que la mesa muestra todos los nombres

**Resultado esperado**: Todos los miembros del grupo asignados a la misma mesa

---

### 5. Validación de Capacidad - Mesa Llena

**Pasos**:
1. ✅ Identificar una mesa con capacidad 8
2. ✅ Asignar invitados hasta llenarla (8/8)
3. ✅ Verificar que el indicador de la mesa cambia a rojo "Llena"
4. ✅ Intentar arrastrar otro invitado sobre la mesa llena
5. ✅ Verificar que la mesa se resalta en rojo (no en dorado)
6. ✅ Verificar animación "shake" de la mesa
7. ✅ Intentar soltar el invitado
8. ✅ Verificar alert/toast de error "La mesa está llena"
9. ✅ Verificar que la asignación NO se guardó

**Resultado esperado**: No se permite asignar invitados a mesas llenas, feedback visual claro

---

### 6. Validación de Capacidad - Grupo Grande

**Pasos**:
1. ✅ Identificar un grupo con 7 personas
2. ✅ Identificar una mesa con solo 5 espacios disponibles
3. ✅ Intentar arrastrar el grupo sobre esa mesa
4. ✅ Verificar que la mesa se resalta en rojo
5. ✅ Intentar soltar
6. ✅ Verificar alert/toast "La mesa no tiene suficiente espacio. Disponible: 5, Necesita: 7"
7. ✅ Verificar que la asignación NO se guardó

**Resultado esperado**: Validación de capacidad para grupos funciona correctamente

---

### 7. Prioridad de Asignación Individual > Grupal

**Pasos**:
1. ✅ Asignar un grupo completo a "Mesa 1" (todos los miembros ahora en Mesa 1)
2. ✅ Expandir el grupo
3. ✅ Arrastrar UN miembro individual a "Mesa 2"
4. ✅ Verificar que ese miembro ahora muestra "Mesa 2"
5. ✅ Verificar que los demás miembros siguen en "Mesa 1"
6. ✅ Verificar estado del grupo muestra "Parcial (3/4)" o similar
7. ✅ Recargar la página (F5)
8. ✅ Verificar que las asignaciones persisten correctamente

**Resultado esperado**: Asignaciones individuales prevalecen sobre grupales, persisten después de reload

---

### 8. Búsqueda y Filtros

**Pasos**:
1. ✅ En el panel lateral, escribir un nombre en el campo de búsqueda
2. ✅ Verificar que solo aparecen grupos/invitados que coinciden
3. ✅ Borrar búsqueda
4. ✅ Click en filtro "Sin asignar"
5. ✅ Verificar que solo aparecen grupos sin asignaciones
6. ✅ Click en filtro "Asignados"
7. ✅ Verificar que solo aparecen grupos con al menos una asignación
8. ✅ Click en filtro "Confirmados"
9. ✅ Verificar que solo aparecen grupos con status "confirmed"
10. ✅ Click en "Todos" para volver a ver todos

**Resultado esperado**: Búsqueda y filtros funcionan correctamente

---

### 9. Expandir/Colapsar Todos

**Pasos**:
1. ✅ Verificar que varios grupos están colapsados
2. ✅ Click en "Expandir todos"
3. ✅ Verificar que todos los grupos se expanden con animación
4. ✅ Verificar que se pueden ver todos los invitados de todos los grupos
5. ✅ Click en "Colapsar todos"
6. ✅ Verificar que todos los grupos se colapsan

**Resultado esperado**: Botones de expandir/colapsar funcionan correctamente

---

### 10. Reposicionamiento de Mesas (Opcional - no implementado en Tasks básicas)

**Pasos**:
1. ⚠️ Intentar arrastrar una mesa dentro del canvas
2. ⚠️ Verificar si se puede mover (esta funcionalidad no fue implementada en las tasks básicas)

**Resultado esperado**: N/A - Feature pendiente

---

### 11. Responsive - Tablet

**Pasos**:
1. ✅ Cambiar viewport a 1024px o menos (Chrome DevTools)
2. ✅ Verificar que el layout cambia a vertical (sidebar arriba, canvas abajo)
3. ✅ Verificar que drag & drop sigue funcionando
4. ✅ Volver a viewport desktop
5. ✅ Verificar que layout vuelve a horizontal

**Resultado esperado**: Layout responsive funciona, drag & drop sigue operativo

---

### 12. Accesibilidad - Keyboard Navigation

**Pasos**:
1. ✅ Usar Tab para navegar entre elementos
2. ✅ Verificar que los elementos draggables reciben focus visible (outline dorado)
3. ✅ Con un invitado en focus, presionar Enter o Space
4. ⚠️ Verificar si activa drag (esta funcionalidad avanzada requiere implementación adicional)

**Resultado esperado**: Tab navigation funciona, focus visible correcto

---

### 13. Accesibilidad - Screen Reader

**Pasos**:
1. ✅ Activar VoiceOver (macOS) o NVDA (Windows)
2. ✅ Navegar por el sidebar
3. ✅ Verificar que anuncia: "Arrastrar invitado [Nombre] asignado a [Mesa]" o "sin asignar"
4. ✅ Navegar por las mesas del canvas
5. ✅ Verificar que anuncia: "Mesa [Nombre], X de Y personas asignadas"

**Resultado esperado**: Screen reader proporciona información útil sobre los elementos

---

### 14. Performance con Muchos Datos

**Pasos**:
1. ✅ Crear 50+ grupos de invitados
2. ✅ Acceder a /admin/seating-chart
3. ✅ Verificar que la página carga en < 2 segundos
4. ✅ Scroll en el sidebar
5. ✅ Verificar que el scroll es fluido (no lag)
6. ✅ Expandir/colapsar múltiples grupos
7. ✅ Verificar que las animaciones son fluidas
8. ✅ Arrastrar invitados
9. ✅ Verificar que no hay lag durante drag

**Resultado esperado**: Performance aceptable incluso con muchos datos

---

### 15. Persistencia de Datos

**Pasos**:
1. ✅ Realizar varias asignaciones de invitados a mesas
2. ✅ Recargar la página (F5)
3. ✅ Verificar que todas las asignaciones se mantienen
4. ✅ Cerrar sesión y volver a iniciar sesión
5. ✅ Verificar que las asignaciones siguen ahí
6. ✅ Acceder desde otro navegador (si es posible)
7. ✅ Verificar que las asignaciones son las mismas

**Resultado esperado**: Todas las asignaciones persisten correctamente

---

### 16. Optimistic UI

**Pasos**:
1. ✅ Throttle de red a "Slow 3G" (Chrome DevTools)
2. ✅ Arrastrar un invitado a una mesa
3. ✅ Verificar que el cambio es INMEDIATO en la UI (antes de respuesta del servidor)
4. ✅ Esperar respuesta del servidor (puede tardar varios segundos)
5. ✅ Verificar que el toast aparece después de la respuesta
6. ✅ Si hay error (simular desconectando internet), verificar que se muestra error

**Resultado esperado**: UI se actualiza inmediatamente (optimistic), respuesta del servidor confirma

---

### 17. Diferentes Navegadores

**Pasos**:
1. ✅ Probar en Chrome
2. ✅ Probar en Firefox
3. ✅ Probar en Safari (si está disponible)
4. ✅ Verificar que drag & drop funciona en todos
5. ✅ Verificar que las animaciones se ven bien en todos

**Resultado esperado**: Funciona consistentemente en todos los navegadores modernos

---

## Bugs Encontrados

Documentar aquí cualquier bug encontrado durante el testing:

- [ ] **Bug #1**: [Descripción]
  - **Pasos para reproducir**: 
  - **Resultado esperado**: 
  - **Resultado actual**: 
  - **Severidad**: Alta / Media / Baja

- [ ] **Bug #2**: [Descripción]
  - **Pasos para reproducir**: 
  - **Resultado esperado**: 
  - **Resultado actual**: 
  - **Severidad**: Alta / Media / Baja

---

## Checklist Final

- [ ] Todos los casos de prueba ejecutados
- [ ] Bugs documentados y priorizados
- [ ] Performance aceptable (no lag visible)
- [ ] Responsive funciona en tablet
- [ ] Accesibilidad básica implementada (ARIA labels)
- [ ] Persistencia de datos verificada
- [ ] Optimistic UI funciona correctamente
- [ ] Compatible con navegadores principales

---

## Notas Adicionales

[Espacio para notas durante el testing]
