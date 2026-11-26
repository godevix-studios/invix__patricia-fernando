-- ============================================
-- Migración: Agregar campo is_superadmin
-- ============================================

-- Agregar columna is_superadmin a admin_users
-- Solo el superadmin puede crear usuarios y resetear contraseñas
ALTER TABLE admin_users ADD COLUMN is_superadmin INTEGER NOT NULL DEFAULT 0;

-- Marcar el usuario admin existente como superadmin
UPDATE admin_users SET is_superadmin = 1 WHERE username = 'admin';
