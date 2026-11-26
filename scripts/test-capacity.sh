#!/bin/bash

# Script de testing para sistema de control de capacidad
# Uso: ./scripts/test-capacity.sh [comando]

set -e

DB_NAME="patricia-fernando-db"

echo "🧪 Sistema de Control de Capacidad - Helper de Testing"
echo "======================================================"

case "$1" in
  "reset-db")
    echo "🗑️  Reseteando base de datos local..."
    rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject
    echo "✅ Base de datos eliminada"
    echo ""
    echo "📦 Aplicando migraciones..."
    npx wrangler d1 execute $DB_NAME --local --file=migrations/0001_initial.sql
    npx wrangler d1 execute $DB_NAME --local --file=migrations/0002_add_group_name.sql
    npx wrangler d1 execute $DB_NAME --local --file=migrations/0003_add_is_superadmin.sql
    echo "✅ Migraciones aplicadas"
    echo ""
    echo "ℹ️  Usuario admin recreado:"
    echo "   Usuario: admin"
    echo "   Contraseña: admin123"
    ;;

  "set-capacity")
    if [ -z "$2" ]; then
      echo "❌ Error: Debes proporcionar un valor de capacidad"
      echo "Uso: ./scripts/test-capacity.sh set-capacity [número]"
      exit 1
    fi
    echo "⚙️  Configurando capacidad máxima en $2..."
    npx wrangler d1 execute $DB_NAME --local --command \
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('max_capacity', '$2')"
    echo "✅ Capacidad configurada en $2 pases"
    ;;

  "remove-capacity")
    echo "🔓 Eliminando límite de capacidad..."
    npx wrangler d1 execute $DB_NAME --local --command \
      "DELETE FROM settings WHERE key = 'max_capacity'"
    echo "✅ Límite de capacidad eliminado (sin límite)"
    ;;

  "show-capacity")
    echo "📊 Estado actual de capacidad:"
    echo ""
    
    # Capacidad máxima
    echo "🎯 Capacidad Máxima:"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT value as max_capacity FROM settings WHERE key = 'max_capacity'" || echo "   No configurada (sin límite)"
    echo ""
    
    # Confirmados
    echo "✅ Confirmados:"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT COALESCE(SUM(confirmed_count), 0) as total FROM guest_groups WHERE status = 'confirmed'"
    echo ""
    
    # Pendientes
    echo "⏳ Pendientes:"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT COALESCE(SUM(max_guests), 0) as total FROM guest_groups WHERE status = 'pending'"
    echo ""
    
    # Pool disponible
    echo "🎫 Pases en Pool (no asignados):"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT COALESCE(SUM(quantity), 0) as total FROM pass_pool WHERE assigned_to_group_id IS NULL"
    echo ""
    
    # Total ocupado (calculado)
    echo "📈 Total Ocupado (confirmados + pendientes + pool):"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT 
        (SELECT COALESCE(SUM(confirmed_count), 0) FROM guest_groups WHERE status = 'confirmed') +
        (SELECT COALESCE(SUM(max_guests), 0) FROM guest_groups WHERE status = 'pending') +
        (SELECT COALESCE(SUM(quantity), 0) FROM pass_pool WHERE assigned_to_group_id IS NULL)
       as total_ocupado"
    ;;

  "list-groups")
    echo "📋 Lista de grupos de invitados:"
    npx wrangler d1 execute $DB_NAME --local --command \
      "SELECT id, name, max_guests, status, confirmed_count FROM guest_groups ORDER BY created_at DESC"
    ;;

  "create-test-data")
    echo "🎲 Creando datos de prueba..."
    
    # Token aleatorio simple
    TOKEN1=$(openssl rand -hex 4)
    TOKEN2=$(openssl rand -hex 4)
    TOKEN3=$(openssl rand -hex 4)
    
    npx wrangler d1 execute $DB_NAME --local --command "
      INSERT INTO guest_groups (token, name, max_guests, status) 
      VALUES 
        ('$TOKEN1', 'Juan Pérez', 10, 'pending'),
        ('$TOKEN2', 'María García', 15, 'pending'),
        ('$TOKEN3', 'Pedro López', 8, 'pending');
      
      INSERT INTO guests (group_id, name, is_representative) 
      VALUES 
        (1, 'Juan Pérez', 1),
        (2, 'María García', 1),
        (3, 'Pedro López', 1);
    "
    echo "✅ Datos de prueba creados:"
    echo "   - Juan Pérez: 10 pases (token: $TOKEN1)"
    echo "   - María García: 15 pases (token: $TOKEN2)"
    echo "   - Pedro López: 8 pases (token: $TOKEN3)"
    echo ""
    echo "Total ocupado: 33 pases"
    ;;

  "query")
    if [ -z "$2" ]; then
      echo "❌ Error: Debes proporcionar una query SQL"
      echo "Uso: ./scripts/test-capacity.sh query \"SELECT * FROM settings\""
      exit 1
    fi
    echo "🔍 Ejecutando query..."
    npx wrangler d1 execute $DB_NAME --local --command "$2"
    ;;

  "help"|"")
    echo ""
    echo "Comandos disponibles:"
    echo ""
    echo "  reset-db              Resetea la base de datos local y aplica migraciones"
    echo "  set-capacity [num]    Configura la capacidad máxima (ej: set-capacity 100)"
    echo "  remove-capacity       Elimina el límite de capacidad"
    echo "  show-capacity         Muestra el estado actual de capacidad"
    echo "  list-groups           Lista todos los grupos de invitados"
    echo "  create-test-data      Crea datos de prueba (3 invitaciones)"
    echo "  query \"SQL\"           Ejecuta una query SQL personalizada"
    echo "  help                  Muestra esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./scripts/test-capacity.sh reset-db"
    echo "  ./scripts/test-capacity.sh set-capacity 50"
    echo "  ./scripts/test-capacity.sh show-capacity"
    echo "  ./scripts/test-capacity.sh create-test-data"
    echo ""
    ;;

  *)
    echo "❌ Comando desconocido: $1"
    echo "Usa './scripts/test-capacity.sh help' para ver comandos disponibles"
    exit 1
    ;;
esac
