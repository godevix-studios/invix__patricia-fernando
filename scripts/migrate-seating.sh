#!/bin/bash

# Script para ejecutar la migración del sistema de asignación de mesas
# Uso: ./scripts/migrate-seating.sh [local|remote]

ENVIRONMENT=${1:-local}

if [ "$ENVIRONMENT" = "local" ]; then
    echo "🔄 Ejecutando migración en base de datos LOCAL..."
    wrangler d1 execute patricia-fernando-db --local --file=migrations/0002_seating_assignments.sql
elif [ "$ENVIRONMENT" = "remote" ]; then
    echo "🔄 Ejecutando migración en base de datos REMOTA..."
    echo "⚠️  IMPORTANTE: Asegúrate de hacer backup antes de continuar."
    read -p "¿Continuar? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler d1 execute patricia-fernando-db --remote --file=migrations/0002_seating_assignments.sql
    else
        echo "❌ Operación cancelada"
        exit 1
    fi
else
    echo "❌ Ambiente inválido. Usa: local o remote"
    exit 1
fi

echo "✅ Migración completada"
echo ""
echo "Verificando estructura de la tabla 'tables'..."
wrangler d1 execute patricia-fernando-db --$ENVIRONMENT --command "PRAGMA table_info(tables);" | grep -E "(position_x|position_y)"

echo ""
echo "Verificando tabla 'guest_table_assignments'..."
wrangler d1 execute patricia-fernando-db --$ENVIRONMENT --command "SELECT COUNT(*) as count FROM guest_table_assignments;"

echo ""
echo "✨ Todo listo. Ahora puedes usar:"
echo "   - /admin/tables/bulk (Creación masiva de mesas)"
echo "   - /admin/seating-chart (Distribución visual)"
