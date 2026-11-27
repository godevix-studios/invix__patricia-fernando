# Patricia & Fernando - Invitación de Boda

Invitación digital de boda con panel de administración para gestionar invitados, mesas y confirmaciones.

## Características

- 💌 **Invitación digital interactiva** - Diseño elegante con animaciones y música
- 👥 **Gestión de invitados** - Individuales o grupos con representante
- 🪑 **Gestión de mesas** - Asignación automática y manual
- 🎨 **Distribución de mesas con canvas** - Sistema visual de drag & drop para asignar invitados a mesas
- 🎫 **Pool de pases** - Reasignación de pases no utilizados
- 🎯 **Control de capacidad** - Límite total de invitados con validaciones automáticas
- 📱 **WhatsApp integrado** - Envío de invitaciones con plantilla personalizable
- ✅ **Confirmación online** - Los invitados confirman y completan nombres
- 🔄 **Reactivación de invitaciones** - Reactivar invitaciones rechazadas con validación
- ☁️ **Cloudflare D1** - Base de datos SQLite en el edge

## Stack Tecnológico

- React Router 8 (SSR)
- React 19.3.1
- Vite 8
- Tailwind CSS v4
- TypeScript 5.9
- @dnd-kit (Drag & Drop)
- Motion (Animaciones)
- Cloudflare D1 (SQLite)
- Cloudflare Workers (Edge Computing)

## Desarrollo Local

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .dev.vars.example .dev.vars
```

### Inicializar base de datos local

```bash
# Ejecutar migración inicial
npm run db:migrate:local

# Ejecutar migración del sistema de asignación de mesas
./scripts/migrate-seating.sh local

# O manualmente:
wrangler d1 execute patricia-fernando-db --local --file=migrations/0002_seating_assignments.sql
```

### Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Acceso al panel de administración

- URL: `http://localhost:5173/admin`
- Usuario: `admin`
- Contraseña: `admin123`

**⚠️ Importante:** Cambia la contraseña inmediatamente en Configuración.

## Estructura del Proyecto

```
├── app/
│   ├── components/
│   │   ├── admin-icons.tsx # Iconos del panel admin
│   │   └── seating/        # Componentes de distribución de mesas
│   ├── lib/              # Utilidades (auth, db)
│   ├── routes/
│   │   ├── admin/        # Panel de administración
│   │   ├── home.tsx      # Invitación pública
│   │   ├── invitation.tsx # Invitación personalizada
│   │   └── confirm.tsx   # Confirmación de asistencia
│   └── routes.ts         # Configuración de rutas
├── migrations/           # Migraciones SQL
│   ├── 0001_initial.sql  # Esquema inicial
│   └── 0002_seating_assignments.sql # Sistema de asignación de mesas
├── docs/                 # Documentación
│   └── SEATING_CHART.md  # Documentación del sistema de distribución
├── scripts/              # Scripts de utilidad
└── wrangler.toml         # Configuración de Cloudflare
```

## Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Invitación pública (sin personalización) |
| `/i/:token` | Invitación personalizada para un invitado |
| `/confirmar/:token` | Página de confirmación de asistencia |
| `/admin` | Panel de administración |
| `/admin/guests` | Gestión de invitados |
| `/admin/tables` | Gestión de mesas |
| `/admin/tables/bulk` | Creación masiva de mesas |
| `/admin/seating-chart` | Distribución visual de mesas (Drag & Drop) |
| `/admin/pool` | Pool de pases libres |
| `/admin/settings` | Configuración (WhatsApp, contraseña) |

## Flujo de Uso

1. **Admin crea invitados** en `/admin/guests/new`
2. **Admin crea mesas** en `/admin/tables/bulk` (creación masiva) o `/admin/tables/new` (individual)
3. **Admin asigna invitados a mesas** en `/admin/seating-chart` usando drag & drop
4. **Admin envía enlaces** por WhatsApp usando el botón integrado
5. **Invitado recibe enlace** personalizado (`/i/:token`)
6. **Invitado confirma** en `/confirmar/:token`
7. **Admin ve confirmaciones** en el dashboard

## Sistema de Distribución de Mesas

El sistema de distribución de mesas permite asignar invitados visualmente usando drag & drop:

### Características

- **Canvas interactivo** con grid para posicionar mesas
- **Drag & Drop** de invitados individuales o grupos completos
- **Validación de capacidad** en tiempo real
- **Asignaciones mixtas**: individuales prevalecen sobre grupales
- **Creación masiva** de mesas con nombres personalizados
- **Optimistic UI** para feedback inmediato
- **Búsqueda y filtros** de invitados

### Uso Rápido

1. Crear mesas: **Admin → Mesas → Crear múltiples**
2. Configurar cantidad, capacidad y patrón de nombres
3. Ir a: **Admin → Distribución**
4. Expandir grupos para ver invitados individuales
5. Arrastrar invitados/grupos sobre mesas
6. Las asignaciones se guardan automáticamente

Ver documentación completa en: [`docs/SEATING_CHART.md`](docs/SEATING_CHART.md)

## Despliegue en Cloudflare

### Pre-requisitos

1. Cuenta de Cloudflare (plan gratuito funciona)
2. Wrangler CLI (`npm install -g wrangler`)
3. Autenticarse: `wrangler login`

### Crear base de datos D1

```bash
# Crear la base de datos
npx wrangler d1 create patricia-fernando-db
```

Copia el `database_id` que aparece y actualiza `wrangler.toml`.

### Ejecutar migración remota

```bash
npm run db:migrate:remote
```

### Configurar variables de producción

En `wrangler.toml`, actualiza:
```toml
[vars]
APP_URL = "https://tu-dominio.pages.dev"
```

### Desplegar

```bash
npm run deploy
```

> **Nota:** Para despliegue completo en Cloudflare Workers/Pages con SSR, 
> se requiere configuración adicional del entry point del worker.
> Para un MVP, considera usar el servidor Node.js incluido.

## Despliegue Alternativo (Node.js)

Si prefieres un despliegue tradicional:

```bash
# Build
npm run build

# Iniciar servidor
npm run start
```

Despliega en Railway, Render, Fly.io, o cualquier plataforma que soporte Node.js.

## Cambiar Contraseña del Admin

1. Accede a `/admin/settings`
2. En "Cambiar Contraseña", ingresa:
   - Contraseña actual
   - Nueva contraseña (mínimo 6 caracteres)
   - Confirmar nueva contraseña
3. Clic en "Cambiar Contraseña"

## Personalizar Plantilla de WhatsApp

1. Accede a `/admin/settings`
2. Edita la plantilla usando estas variables:
   - `{nombre}` - Nombre del invitado
   - `{enlace}` - Enlace de invitación
   - `{novios}` - Nombres de los novios
   - `{fecha}` - Fecha del evento

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (Wrangler) |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run db:migrate:local` | Migrar DB local |
| `npm run db:migrate:remote` | Migrar DB remota |
| `npm run deploy` | Build + Deploy a Cloudflare |

## Sistema de Control de Capacidad

El sistema incluye control de capacidad total para el evento:

### Configuración

1. Ve a `/admin/settings`
2. En "Capacidad del Evento", ingresa el límite máximo de invitados
3. El sistema contabiliza: confirmados + pendientes + pases en pool

### Validaciones Automáticas

- ✅ **Al crear invitación:** Valida que no exceda el límite total
- ✅ **Al editar invitación:** Valida solo el incremento de pases
- ✅ **Al reactivar rechazada:** Modal que pregunta cuántos pases asignar
- ✅ **Pool incluido:** Los pases no asignados en el pool cuentan como ocupados

### Visualización

- Dashboard muestra ocupación actual con barra de progreso
- Colores: verde (<75%), amarillo (75-95%), rojo (>95%)
- Warnings cuando quedan pocos pases disponibles

### Scripts de Testing

Usa el script helper para testing local:

```bash
# Ver comandos disponibles
./scripts/test-capacity.sh help

# Configurar capacidad de prueba
./scripts/test-capacity.sh set-capacity 50

# Ver estado actual
./scripts/test-capacity.sh show-capacity

# Crear datos de prueba
./scripts/test-capacity.sh create-test-data

# Resetear base de datos
./scripts/test-capacity.sh reset-db
```

Ver `TESTING_CAPACITY.md` para guía completa de pruebas.

---

Desarrollado por [Godevix Studios](https://www.godevix-studios.com/)
