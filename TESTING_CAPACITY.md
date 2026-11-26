# Guía de Pruebas - Sistema de Control de Capacidad

## 🚀 Preparación del Entorno Local

### 1. Asegúrate de tener las dependencias instaladas

```bash
npm install
```

### 2. Verificar que la base de datos local esté inicializada

La base de datos local de D1 se crea automáticamente al ejecutar `npm run dev` por primera vez. Si ya ejecutaste el proyecto antes, la base de datos ya existe.

**Si es la primera vez que ejecutas el proyecto:**

```bash
# Crear base de datos local (si no existe)
npx wrangler d1 execute patricia-fernando-db --local --command "SELECT 1"
```

**Si necesitas resetear la base de datos local (CUIDADO: borra todos los datos):**

```bash
# Eliminar base de datos local
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject

# Aplicar todas las migraciones
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0001_initial.sql
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0002_add_group_name.sql
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0003_add_is_superadmin.sql
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Esto iniciará el servidor en `http://localhost:5173`

---

## 🧪 Escenarios de Prueba

### **Escenario 1: Configurar Capacidad Máxima**

1. **Acceder al panel de administración:**
   - Navega a: `http://localhost:5173/admin/login`
   - Usuario: `admin`
   - Contraseña: `admin123` (la contraseña inicial de la migración)

2. **Configurar capacidad:**
   - Ve a "Configuración" en el menú lateral
   - Busca la sección "Capacidad del Evento"
   - Ingresa un valor de prueba (ej: **50**)
   - Haz clic en "Guardar Capacidad"
   - ✅ Deberías ver: "Capacidad máxima actualizada"
   - ✅ Deberías ver un resumen de ocupación actual

3. **Verificar en Dashboard:**
   - Ve al Dashboard (inicio)
   - ✅ Deberías ver una nueva sección "Capacidad del Evento"
   - ✅ Muestra: "X / 50 pases ocupados"
   - ✅ Tiene una barra de progreso visual

---

### **Escenario 2: Crear Invitaciones con Validación**

**Setup:** Capacidad configurada en 50 pases

1. **Crear primera invitación (dentro del límite):**
   - Ve a "Invitados" → "Nuevo Invitado"
   - Nombre: `Juan Pérez`
   - Número de pases: `10`
   - Haz clic en "Crear Invitado"
   - ✅ Debería crearse exitosamente
   - ✅ Dashboard muestra: 10 / 50 pases ocupados

2. **Crear más invitaciones:**
   - Crea otra invitación con 15 pases
   - Crea otra con 10 pases
   - Total ocupado: 35 / 50
   - ✅ Dashboard se actualiza

3. **Ver warning de capacidad baja:**
   - Crea otra invitación con 10 pases (total: 45 / 50)
   - Ve a "Nuevo Invitado" nuevamente
   - ✅ Deberías ver un warning amarillo: "⚠️ Atención: Solo quedan 5 pases disponibles de 50 totales"

4. **Intentar exceder capacidad:**
   - Intenta crear invitación con 10 pases
   - ✅ Debería mostrar error: "Capacidad excedida: 55/50 pases ocupados. No hay cupos disponibles."
   - ✅ La invitación NO se crea

5. **Crear invitación que llena exactamente:**
   - Crea invitación con 5 pases
   - ✅ Debería crearse (total: 50 / 50)
   - Ve a "Nuevo Invitado"
   - ✅ Debería ver error rojo: "🚫 Capacidad máxima alcanzada"

---

### **Escenario 3: Editar Invitaciones con Validación de Incremento**

**Setup:** Capacidad en 50, ocupación 50/50

1. **Reducir pases (siempre permitido):**
   - Edita una invitación de 10 pases
   - Cambia a 5 pases
   - ✅ Debería guardarse sin validación
   - ✅ Dashboard muestra: 45 / 50

2. **Aumentar pases (valida incremento):**
   - Edita una invitación de 5 pases
   - Intenta cambiar a 15 pases (incremento de 10)
   - ✅ Debería mostrar error: "Capacidad excedida..."
   - Cambia a 10 pases (incremento de 5)
   - ✅ Debería guardarse correctamente
   - ✅ Dashboard muestra: 50 / 50

3. **Mantener igual (sin validación):**
   - Edita una invitación
   - Cambia el nombre pero mantén max_guests igual
   - ✅ Debería guardarse sin problemas

---

### **Escenario 4: Pool de Pases y Validación**

**Setup:** Capacidad en 50, ocupación 50/50

1. **Generar pases en pool (confirmación parcial):**
   - Como invitado, ve a: `http://localhost:5173/i/{token}` 
     (copia el token de alguna invitación desde el panel admin)
   - Haz clic en "Confirmar Asistencia"
   - Si la invitación tiene 10 pases, confirma solo 6
   - ✅ Se crean 4 pases en el pool
   - ✅ Dashboard muestra capacidad ocupada: 50 / 50 (incluye los 4 en pool)

2. **Intentar crear invitación (pool cuenta como ocupado):**
   - Ve a "Nuevo Invitado"
   - Intenta crear invitación de 1 pase
   - ✅ Debería rechazarse: "Capacidad excedida: 51/50..."
   - Esto confirma que el pool cuenta como ocupado

3. **Ver pool en Dashboard:**
   - Ve al Dashboard
   - ✅ En la sección de capacidad, el desglose muestra:
     "X confirmados • Y pendientes • 4 en pool"

---

### **Escenario 5: Reactivar Invitación Rechazada**

**Setup:** Capacidad en 50, ocupación 45/50 (5 disponibles)

1. **Crear invitación y rechazarla:**
   - Crea invitación de 10 pases para "María López"
   - Copia el token de la invitación
   - Como invitado, ve a: `http://localhost:5173/i/{token}`
   - Haz clic en "No podré asistir"
   - ✅ Estado cambia a "Rechazado"
   - ✅ Dashboard muestra: 45 / 50 (los 10 pases se liberaron)

2. **Reactivar con validación:**
   - En el panel admin, edita la invitación de María López
   - ✅ Deberías ver botón "Reactivar invitación" en la zona de peligro
   - Haz clic en "Reactivar invitación"
   - ✅ Se abre un modal
   - ✅ Muestra: "Capacidad disponible: 5 pases"
   - Intenta reactivar con 10 pases
   - ✅ Debería mostrar error: "Capacidad excedida: 55/50..."
   - Cambia a 5 pases
   - Haz clic en "Reactivar"
   - ✅ Debería reactivarse con éxito
   - ✅ Estado cambia a "Pendiente"
   - ✅ Dashboard muestra: 50 / 50

3. **Verificar que el botón desaparece:**
   - Refresca la página de edición
   - ✅ El botón "Reactivar invitación" ya no aparece (porque ya no está rechazada)

---

### **Escenario 6: Validación en Settings**

1. **Intentar reducir capacidad por debajo de ocupación:**
   - Ve a "Configuración"
   - Ocupación actual: 50 / 50
   - Intenta cambiar capacidad a 40
   - ✅ Debería mostrar error: "No puedes establecer una capacidad menor a la ocupación actual (50 pases ocupados)"

2. **Desactivar límite de capacidad:**
   - En "Configuración", borra el valor del campo
   - Guarda
   - ✅ Mensaje: "Límite de capacidad desactivado"
   - Ve al Dashboard
   - ✅ La sección "Capacidad del Evento" desaparece
   - Ve a "Nuevo Invitado"
   - ✅ Puedes crear invitaciones sin límite

3. **Reactivar límite:**
   - Ve a "Configuración"
   - Ingresa capacidad de 100
   - ✅ Se guarda correctamente
   - ✅ Dashboard muestra la sección nuevamente

---

### **Escenario 7: Colores de Barra de Progreso**

**Setup:** Capacidad en 100

1. **Barra verde (<75%):**
   - Crea invitaciones hasta tener 50 / 100
   - Ve al Dashboard
   - ✅ Barra de progreso es VERDE

2. **Barra amarilla (75-95%):**
   - Crea invitaciones hasta tener 80 / 100
   - Ve al Dashboard
   - ✅ Barra de progreso es AMARILLA

3. **Barra roja (>95%):**
   - Crea invitaciones hasta tener 98 / 100
   - Ve al Dashboard
   - ✅ Barra de progreso es ROJA
   - ✅ Muestra warning: "⚠️ Solo quedan 2 pases disponibles"

4. **Capacidad máxima:**
   - Llena completamente (100 / 100)
   - Ve al Dashboard
   - ✅ Barra roja al 100%
   - ✅ Mensaje: "🚫 Capacidad máxima alcanzada"

---

## 🔍 Verificaciones en Base de Datos (Opcional)

Si quieres verificar directamente en la base de datos:

```bash
# Ver todas las configuraciones
npx wrangler d1 execute patricia-fernando-db --local --command "SELECT * FROM settings"

# Ver capacidad configurada
npx wrangler d1 execute patricia-fernando-db --local --command "SELECT value FROM settings WHERE key = 'max_capacity'"

# Ver ocupación de invitaciones
npx wrangler d1 execute patricia-fernando-db --local --command "
  SELECT 
    status,
    COUNT(*) as grupos,
    SUM(max_guests) as pases
  FROM guest_groups 
  GROUP BY status
"

# Ver pases en pool
npx wrangler d1 execute patricia-fernando-db --local --command "
  SELECT 
    SUM(quantity) as total_pool 
  FROM pass_pool 
  WHERE assigned_to_group_id IS NULL
"
```

---

## ✅ Checklist de Pruebas

- [ ] Configurar capacidad en settings
- [ ] Ver métrica en dashboard con barra de progreso
- [ ] Crear invitación dentro del límite
- [ ] Ver warning cuando quedan pocos pases
- [ ] Intentar crear invitación que exceda límite (debe rechazar)
- [ ] Editar invitación para reducir pases (debe permitir)
- [ ] Editar invitación para aumentar pases (debe validar incremento)
- [ ] Generar pases en pool (confirmación parcial)
- [ ] Verificar que pool cuenta como ocupado
- [ ] Rechazar invitación
- [ ] Reactivar invitación con modal
- [ ] Intentar reactivar excediendo límite (debe rechazar)
- [ ] Reactivar dentro del límite (debe permitir)
- [ ] Intentar reducir capacidad por debajo de ocupación (debe rechazar)
- [ ] Desactivar límite (borrar valor en settings)
- [ ] Verificar colores de barra (verde/amarillo/rojo)

---

## 🐛 Si Encuentras Problemas

### Error: "Cannot find module..."
```bash
npm install
npm run build
```

### Base de datos no existe o está corrupta
```bash
# Resetear completamente
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0001_initial.sql
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0002_add_group_name.sql
npx wrangler d1 execute patricia-fernando-db --local --file=migrations/0003_add_is_superadmin.sql
```

### Servidor no inicia
```bash
# Limpiar y reiniciar
pkill -f "wrangler\|vite"
npm run dev
```

---

## 📦 Deploy a Producción

Una vez que hayas probado todo en local y esté funcionando correctamente:

```bash
# 1. Asegúrate de que el build esté actualizado
npm run build

# 2. Deploy
npm run deploy

# 3. No necesitas migración porque max_capacity se guarda en settings
# La tabla settings ya existe en producción
```

**Nota:** La capacidad máxima es independiente por ambiente (local vs producción). Después del deploy, necesitarás configurar la capacidad en producción desde el panel de settings de producción.

---

## 🎯 Resultado Esperado

Después de completar todas las pruebas:

✅ El sistema rechaza invitaciones que excedan el límite  
✅ Las validaciones funcionan correctamente al crear/editar  
✅ El pool de pases se contabiliza como ocupado  
✅ Las invitaciones rechazadas pueden reactivarse con validación  
✅ El dashboard muestra información clara y actualizada  
✅ Los warnings aparecen cuando se acerca al límite  
✅ Se puede desactivar el límite borrando el valor  
✅ Build y deploy funcionan sin errores  

¡Todo listo para producción! 🚀
