-- ============================================
-- Migración: Agregar nombre de grupo
-- ============================================

-- Agregar columna group_name a guest_groups
-- Este campo es opcional y sirve para nombrar grupos como "Familia Fernández"
-- Si no se proporciona, se usa el nombre del representante
ALTER TABLE guest_groups ADD COLUMN group_name TEXT;
