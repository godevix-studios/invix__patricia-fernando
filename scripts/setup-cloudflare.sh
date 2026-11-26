#!/bin/bash

# ============================================
# Script de configuración de Cloudflare
# Patricia & Fernando - Invitación de Boda
# ============================================

set -e

echo "🚀 Configurando Cloudflare para la invitación de boda..."
echo ""

# Verificar que wrangler está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx no está instalado. Instala Node.js primero."
    exit 1
fi

# 1. Crear la base de datos D1
echo "📦 Creando base de datos D1..."
npx wrangler d1 create patricia-fernando-db

echo ""
echo "⚠️  IMPORTANTE: Copia el 'database_id' que aparece arriba y actualiza"
echo "   el archivo wrangler.toml con ese ID (reemplaza 'local' por el ID real)."
echo ""
read -p "Presiona Enter después de actualizar wrangler.toml..."

# 2. Ejecutar la migración inicial
echo ""
echo "🗄️  Ejecutando migración inicial en la base de datos remota..."
npx wrangler d1 execute patricia-fernando-db --remote --file=migrations/0001_initial.sql

echo ""
echo "✅ ¡Configuración completada!"
echo ""
echo "Próximos pasos:"
echo "1. Configura la variable APP_URL en wrangler.toml con tu dominio de producción"
echo "2. Ejecuta 'npm run deploy' para desplegar la aplicación"
echo "3. Accede a /admin/login con usuario: admin, contraseña: admin123"
echo "4. ¡Cambia la contraseña inmediatamente en Configuración!"
