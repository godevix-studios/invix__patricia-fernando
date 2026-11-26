# 📊 Sistema de Control de Capacidad - Resumen Técnico

## 🎯 Objetivo

Implementar un sistema que controle el número total de invitados que pueden asistir al evento, validando en tiempo real que no se exceda la capacidad configurada.

---

## 🏗️ Arquitectura Implementada

### **Capa de Datos** (`app/lib/db.server.ts`)

```typescript
// Interface principal
interface CapacityStatus {
  maxCapacity: number;        // Límite configurado
  confirmed: number;           // Pases confirmados
  pending: number;             // Pases pendientes
  poolAvailable: number;       // Pases en pool no asignados
  totalOccupied: number;       // Total ocupado
  available: number;           // Disponibles
}

// Funciones principales
getCapacityStatus(db)        // Obtiene estado actual
validateCapacity(db, pases)  // Valida disponibilidad
getDashboardMetrics(db)      // Incluye métricas de capacidad
```

### **Fórmula de Cálculo**

```
Total Ocupado = Confirmados + Pendientes + Pool Disponible

Donde:
- Confirmados = SUM(confirmed_count) WHERE status='confirmed'
- Pendientes = SUM(max_guests) WHERE status='pending'
- Pool Disponible = SUM(quantity) WHERE assigned_to_group_id IS NULL

Disponible = Max Capacity - Total Ocupado
```

### **Lógica de Validación**

```
SI no hay max_capacity configurado:
  → Permitir operación (sin límite)

SI hay max_capacity:
  1. Calcular Total Ocupado
  2. SI se excluye un grupo (edición):
     → Restar sus pases del Total Ocupado
  3. Nueva Ocupación = Total Ocupado + Pases Solicitados
  4. SI Nueva Ocupación > Max Capacity:
     → RECHAZAR con mensaje de error
  5. SINO:
     → PERMITIR operación
```

---

## 📁 Archivos Modificados

### 1. **`app/lib/db.server.ts`** (Capa de Datos)

**Agregado:**
- Interface `CapacityStatus`
- Función `getCapacityStatus()`
- Función `validateCapacity()`
- Modificado `getDashboardMetrics()` para incluir capacidad

**Líneas de código:** ~130 líneas agregadas

---

### 2. **`app/routes/admin/settings.tsx`** (Configuración)

**Agregado:**
- Loader obtiene `max_capacity` y `capacityStatus`
- Action case `intent === "capacity"` con validaciones:
  - Valor debe ser número positivo o vacío
  - No puede ser menor a ocupación actual
- Sección UI "Capacidad del Evento":
  - Input para capacidad máxima
  - Resumen de ocupación actual
  - Mensajes de éxito/error

**Líneas de código:** ~80 líneas agregadas

**Pantalla:**
```
┌─────────────────────────────────────┐
│ Capacidad del Evento                │
├─────────────────────────────────────┤
│ Capacidad máxima: [  150  ]         │
│                                     │
│ Ocupación actual: 75 pases          │
│ 45 confirmados • 20 pendientes      │
│ • 10 en pool                        │
│                                     │
│ [Guardar Capacidad]                 │
└─────────────────────────────────────┘
```

---

### 3. **`app/routes/admin/guests-new.tsx`** (Crear Invitación)

**Agregado:**
- Import `validateCapacity` y `getCapacityStatus`
- Validación antes de crear invitación
- Warning visual cuando ≤20 pases disponibles
- Error visual cuando capacidad = 0

**Líneas de código:** ~40 líneas agregadas

**Pantalla:**
```
┌─────────────────────────────────────┐
│ ⚠️ Atención: Solo quedan 5 pases   │
│    disponibles de 50 totales        │
├─────────────────────────────────────┤
│ Nombre: [________________]          │
│ Pases: [__]                         │
│ [Crear Invitado]                    │
└─────────────────────────────────────┘

O si capacidad = 0:

┌─────────────────────────────────────┐
│ 🚫 Capacidad máxima alcanzada.     │
│    No se pueden crear invitaciones  │
└─────────────────────────────────────┘
```

---

### 4. **`app/routes/admin/guests-edit.tsx`** (Editar Invitación)

**Agregado:**
- Validación al editar (solo valida incremento)
- Modal de reactivación para invitaciones rechazadas:
  - Estado local `showReactivateModal`
  - Input para cantidad de pases
  - Muestra capacidad disponible
  - Validación antes de reactivar
- Action case `intent === "reactivate"`

**Líneas de código:** ~120 líneas agregadas

**Pantalla - Modal de Reactivación:**
```
┌─────────────────────────────────────┐
│ Reactivar invitación            [X] │
├─────────────────────────────────────┤
│ Esta invitación fue rechazada.      │
│ ¿Cuántos pases deseas asignar?      │
│                                     │
│ Capacidad disponible: 10 pases      │
│                                     │
│ Número de pases: [__]               │
│ Máximo original: 15 pases           │
│                                     │
│ [Cancelar]  [Reactivar]            │
└─────────────────────────────────────┘
```

---

### 5. **`app/routes/admin/dashboard.tsx`** (Dashboard)

**Agregado:**
- Nueva sección "Capacidad del Evento" (condicional)
- Visualización con:
  - Ocupación actual en grande
  - Barra de progreso con colores:
    - Verde: <75%
    - Amarillo: 75-95%
    - Rojo: >95%
  - Desglose de ocupación
  - Warnings cuando quedan ≤10 pases

**Líneas de código:** ~60 líneas agregadas

**Pantalla:**
```
┌─────────────────────────────────────┐
│ Capacidad del Evento                │
├─────────────────────────────────────┤
│        75 / 150                     │
│     pases ocupados                  │
│                                     │
│ ████████████░░░░░░░░░░░░ 50%        │
│                                     │
│ 45 confirmados • 20 pendientes      │
│ • 10 en pool                        │
│                                     │
│ ⚠️ Solo quedan 10 pases disponibles │
└─────────────────────────────────────┘
```

---

## 🔄 Flujos de Usuario

### **Flujo 1: Configurar Capacidad**

```
Admin → Settings → Capacidad del Evento
  ↓
Ingresa valor (ej: 150)
  ↓
Sistema valida:
  ✓ Es número positivo
  ✓ No es menor a ocupación actual
  ↓
Guarda en settings (key: "max_capacity")
  ↓
Dashboard muestra nueva sección
```

### **Flujo 2: Crear Invitación (Con Límite)**

```
Admin → Nuevo Invitado
  ↓
Sistema muestra warning si ≤20 disponibles
  ↓
Admin ingresa datos + pases
  ↓
Al enviar:
  ├→ Sistema calcula: Total + Nuevos Pases
  │
  ├→ Si excede límite:
  │    └→ Muestra error
  │        └→ No crea invitación
  │
  └→ Si hay espacio:
       └→ Crea invitación
           └→ Dashboard se actualiza
```

### **Flujo 3: Editar Invitación (Incremento)**

```
Admin → Editar Invitación
  ↓
Cambia pases de 10 a 15 (incremento = 5)
  ↓
Al guardar:
  ├→ Sistema calcula ocupación excluyendo este grupo
  │
  ├→ Valida: Ocupación + 5 ≤ Límite
  │
  ├→ Si no excede:
  │    └→ Guarda cambios
  │
  └→ Si excede:
       └→ Muestra error
           └→ No guarda
```

### **Flujo 4: Reactivar Rechazada**

```
Admin → Editar Invitación Rechazada
  ↓
Ve botón "Reactivar invitación"
  ↓
Hace clic → Modal se abre
  ↓
Modal muestra:
  - Capacidad disponible actual
  - Input para pases (1 a max_guests original)
  ↓
Admin ingresa cantidad
  ↓
Al confirmar:
  ├→ Sistema valida capacidad (excluyendo grupo)
  │
  ├→ Si excede:
  │    └→ Muestra error en modal
  │
  └→ Si hay espacio:
       └→ Reactiva con nuevos pases
           └→ Status → 'pending'
           └→ Cierra modal
           └→ Muestra éxito
```

### **Flujo 5: Pool de Pases**

```
Invitado confirma asistencia parcial
  ↓
Ej: Tiene 10 pases, confirma 6
  ↓
Sistema crea entrada en pass_pool:
  - source_group_id: id del grupo
  - quantity: 4
  - assigned_to_group_id: NULL
  ↓
En cálculo de capacidad:
  Pool Disponible = SUM(4 + otros no asignados)
  ↓
Total Ocupado incluye estos 4 pases
  ↓
Admin puede:
  - Asignarlos a otro grupo (desde /admin/pool)
  - Se mantienen reservados hasta entonces
```

---

## 🎨 Componentes Visuales

### **Colores de Barra de Progreso**

```javascript
if (ocupación > 95%) {
  color = "rojo (error)"
} else if (ocupación > 75%) {
  color = "amarillo (warning)"
} else {
  color = "verde (success)"
}
```

### **Warnings y Mensajes**

| Situación | Tipo | Mensaje |
|-----------|------|---------|
| ≤20 pases disponibles | Warning (amarillo) | ⚠️ Atención: Solo quedan X pases disponibles |
| ≤10 pases disponibles | Warning (amarillo) | ⚠️ Solo quedan X pases disponibles |
| Capacidad = 0 | Error (rojo) | 🚫 Capacidad máxima alcanzada |
| Excede capacidad | Error (rojo) | Capacidad excedida: X/Y pases ocupados |

---

## 📊 Métricas y KPIs

### **Dashboard Muestra:**

1. **Ocupación Principal**
   - X / Y pases ocupados (grande)
   - Barra de progreso visual

2. **Desglose**
   - X confirmados
   - Y pendientes
   - Z en pool

3. **Alertas**
   - Warning si ≤10 disponibles
   - Error si capacidad = 0

### **Settings Muestra:**

1. **Configuración**
   - Input para capacidad máxima
   - Ayuda contextual

2. **Estado Actual**
   - X pases ocupados
   - Desglose (confirmados + pendientes + pool)

---

## 🧪 Testing

### **Scripts Creados:**

| Script | Función |
|--------|---------|
| `./scripts/test-capacity.sh help` | Muestra comandos |
| `./scripts/test-capacity.sh set-capacity N` | Configura capacidad |
| `./scripts/test-capacity.sh show-capacity` | Muestra estado |
| `./scripts/test-capacity.sh create-test-data` | Crea invitaciones de prueba |
| `./scripts/test-capacity.sh reset-db` | Resetea base de datos |

### **Documentación:**

- `TESTING_CAPACITY.md` - Guía completa con 7 escenarios
- `QUICK_START.md` - Inicio rápido (5 minutos)
- `README.md` - Actualizado con nueva funcionalidad

---

## ✅ Validaciones Implementadas

| Acción | Validación | Comportamiento |
|--------|------------|----------------|
| Crear invitación | Total + Nuevos ≤ Límite | Rechaza si excede |
| Editar invitación | Total + Incremento ≤ Límite | Solo valida si aumenta |
| Reactivar rechazada | Total + Nuevos ≤ Límite | Modal con validación |
| Configurar capacidad | Límite ≥ Ocupación actual | Rechaza si es menor |

---

## 🚀 Deploy

### **Sin Migración Adicional**

No se requiere migración nueva porque:
- `max_capacity` se guarda en tabla `settings` (ya existe)
- Es key-value: `INSERT OR REPLACE INTO settings (key, value)`

### **Pasos:**

```bash
# 1. Build
npm run build

# 2. Deploy
npm run deploy

# 3. Configurar en producción
# Ir a /admin/settings en producción
# Ingresar capacidad deseada
```

### **Nota Importante:**

La capacidad es **independiente por ambiente**:
- Local: se configura en `localhost:5173/admin/settings`
- Producción: se configura en `tu-dominio.com/admin/settings`

---

## 📈 Estadísticas de Implementación

| Métrica | Valor |
|---------|-------|
| **Archivos modificados** | 5 |
| **Archivos nuevos** | 3 (docs + script) |
| **Líneas de código agregadas** | ~430 |
| **Funciones nuevas** | 3 principales |
| **Interfaces nuevas** | 1 (CapacityStatus) |
| **Rutas afectadas** | 4 |
| **Validaciones agregadas** | 4 puntos de validación |
| **Tiempo de desarrollo** | ~2 horas |
| **Cobertura de testing** | 7 escenarios documentados |

---

## 🎯 Funcionalidades Entregadas

✅ **Core:**
- Control de capacidad total configurable
- Validaciones en crear/editar invitaciones
- Contabilización: confirmados + pendientes + pool
- Reactivación de invitaciones rechazadas

✅ **UX:**
- Visualización en dashboard con barra de progreso
- Warnings informativos progresivos
- Mensajes de error claros y específicos
- Modal intuitivo para reactivación

✅ **DX (Developer Experience):**
- Scripts de testing
- Documentación completa
- Código comentado
- Build sin errores ni warnings

---

## 🔮 Futuras Mejoras (Opcionales)

Posibles extensiones si se requieren:

1. **Histórico de cambios de capacidad**
   - Log de cuándo y quién cambió la capacidad

2. **Alertas por email/WhatsApp**
   - Notificar a admin cuando se acerque al límite

3. **Capacidad por tipo de invitado**
   - Límites separados para adultos/niños

4. **Dashboard avanzado**
   - Proyecciones basadas en tasa de confirmación
   - Gráficos históricos

5. **API REST**
   - Endpoints para integrar con otros sistemas

---

## 📝 Notas Técnicas

### **Decisiones de Diseño:**

1. **Pool cuenta como ocupado**
   - Razón: Son pases reservados aunque no asignados
   - Alternativa considerada: No contar pool (descartada)

2. **Validación de incremento en edición**
   - Razón: Permitir ajustes sin restricciones innecesarias
   - Ejemplo: Reducir de 10 a 5 no debe validar

3. **Sin migración SQL nueva**
   - Razón: Tabla `settings` ya existe (key-value store)
   - Beneficio: Deploy más simple, menos riesgo

4. **Reactivación con modal**
   - Razón: Permitir control fino de pases al reactivar
   - Alternativa considerada: Reactivar con original (menos flexible)

5. **Capacidad opcional**
   - Razón: Compatibilidad con eventos sin límite
   - Comportamiento: Si no está configurada, no valida

---

## 🏆 Conclusión

Sistema de control de capacidad completamente funcional, testeado y documentado, listo para deploy a producción. Implementa todas las validaciones requeridas manteniendo flexibilidad y buena experiencia de usuario.

**Estado:** ✅ COMPLETO Y LISTO PARA PRODUCCIÓN
