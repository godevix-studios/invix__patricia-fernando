# 🚀 Quick Start - Probar Sistema de Capacidad

## TL;DR - Comandos Rápidos

```bash
# 1. Build del proyecto
npm run build

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Acceder al panel admin
# Ir a: http://localhost:5173/admin
# Usuario: admin
# Contraseña: admin123
```

---

## 🎯 Flujo Rápido de Pruebas (5 minutos)

### 1️⃣ Configurar Capacidad

```bash
# Opción A: Desde el navegador
# - Ve a http://localhost:5173/admin/settings
# - Busca "Capacidad del Evento"
# - Ingresa: 50
# - Guardar

# Opción B: Desde la terminal
./scripts/test-capacity.sh set-capacity 50
```

### 2️⃣ Crear Datos de Prueba

```bash
# Crear 3 invitaciones automáticamente (33 pases totales)
./scripts/test-capacity.sh create-test-data

# Ver lo que se creó
./scripts/test-capacity.sh list-groups
```

### 3️⃣ Ver Dashboard

```bash
# Abrir: http://localhost:5173/admin
# Deberías ver:
# - Nueva sección "Capacidad del Evento"
# - "33 / 50 pases ocupados"
# - Barra de progreso verde
# - Desglose: "0 confirmados • 33 pendientes • 0 en pool"
```

### 4️⃣ Probar Validaciones

```bash
# En el navegador:
# - Ve a /admin/guests/new
# - Intenta crear invitación de 20 pases
# - Resultado: ❌ ERROR "Capacidad excedida: 53/50..."
# - Ahora crea invitación de 10 pases
# - Resultado: ✅ Se crea exitosamente (43/50)
```

### 5️⃣ Ver Estado en Terminal

```bash
# Ver ocupación actual
./scripts/test-capacity.sh show-capacity

# Resultado esperado:
# 🎯 Capacidad Máxima: 50
# ✅ Confirmados: 0
# ⏳ Pendientes: 43
# 🎫 Pases en Pool: 0
# 📈 Total Ocupado: 43
```

---

## 📋 Comandos del Script Helper

```bash
# Ver todos los comandos disponibles
./scripts/test-capacity.sh help

# Configurar capacidad
./scripts/test-capacity.sh set-capacity 100

# Ver estado actual
./scripts/test-capacity.sh show-capacity

# Crear datos de prueba
./scripts/test-capacity.sh create-test-data

# Listar invitaciones
./scripts/test-capacity.sh list-groups

# Eliminar límite de capacidad
./scripts/test-capacity.sh remove-capacity

# Resetear todo (¡cuidado! borra datos)
./scripts/test-capacity.sh reset-db

# Query personalizada
./scripts/test-capacity.sh query "SELECT * FROM settings"
```

---

## 🧪 Escenarios de Prueba

### A) Validación al Crear Invitación

```bash
# 1. Configurar capacidad
./scripts/test-capacity.sh set-capacity 50

# 2. Crear invitaciones hasta llenar (desde el navegador)
# - Crea invitación de 30 pases ✅
# - Crea invitación de 15 pases ✅ (45/50)
# - Intenta crear invitación de 10 pases ❌ ERROR

# 3. Verificar en terminal
./scripts/test-capacity.sh show-capacity
```

### B) Pool de Pases

```bash
# 1. Crear invitación de 10 pases (desde navegador)

# 2. Como invitado, confirmar solo 6 personas
# - Ve a: http://localhost:5173/i/{token}
# - Confirma asistencia de 6 personas
# - 4 pases van al pool

# 3. Verificar que el pool cuenta como ocupado
./scripts/test-capacity.sh show-capacity
# Deberías ver: "🎫 Pases en Pool: 4"
```

### C) Reactivar Invitación Rechazada

```bash
# 1. Crear invitación (desde navegador)
# 2. Como invitado, rechazar: http://localhost:5173/i/{token}
# 3. En admin, editar esa invitación
# 4. Verás botón "Reactivar invitación"
# 5. Haz clic, ingresa número de pases
# 6. Sistema valida capacidad antes de reactivar
```

---

## 🔧 Troubleshooting Rápido

### Error: Base de datos no existe

```bash
./scripts/test-capacity.sh reset-db
```

### Error: Puerto 5173 ocupado

```bash
# Matar proceso
pkill -f "wrangler\|vite"

# Reiniciar
npm run dev
```

### Error: Cannot find module

```bash
npm install
npm run build
```

### Quiero empezar de cero

```bash
# Resetear base de datos
./scripts/test-capacity.sh reset-db

# Configurar capacidad nueva
./scripts/test-capacity.sh set-capacity 100

# Crear datos de prueba
./scripts/test-capacity.sh create-test-data
```

---

## ✅ Verificación Rápida (Checklist)

Verifica que todo funciona:

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Configurar y verificar
./scripts/test-capacity.sh set-capacity 50
./scripts/test-capacity.sh create-test-data
./scripts/test-capacity.sh show-capacity

# Navegador:
# □ Ir a http://localhost:5173/admin/login
# □ Login con admin / admin123
# □ Dashboard muestra "Capacidad del Evento"
# □ Ve a Settings, se ve campo de capacidad
# □ Ve a Nuevo Invitado, intenta crear más de 50 pases
# □ Debe rechazar con error claro
```

---

## 🚢 Deploy a Producción

Una vez probado en local:

```bash
# 1. Build final
npm run build

# 2. Deploy
npm run deploy

# 3. Configurar capacidad en producción
# - Ve a tu URL de producción /admin/settings
# - Configura capacidad máxima
# - ¡Listo!
```

**Nota:** La capacidad es independiente por ambiente (local vs producción).

---

## 📚 Documentación Completa

- `TESTING_CAPACITY.md` - Guía completa de pruebas con todos los escenarios
- `README.md` - Documentación general del proyecto
- `DESIGN.md` - Decisiones de arquitectura (si existe)

---

¿Necesitas ayuda? Revisa los logs del servidor con:

```bash
# Ver logs del servidor de desarrollo
npm run dev

# Ver errores recientes en la terminal donde corre npm run dev
```

¡Listo para probar! 🎉
