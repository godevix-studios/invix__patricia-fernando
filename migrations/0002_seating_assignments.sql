-- ============================================
-- Migración 0002: Sistema de Asignación de Mesas
-- Patricia & Fernando - Invitación de Boda
-- ============================================

-- Tabla de asignaciones individuales de invitados a mesas
-- Prioridad: las asignaciones individuales prevalecen sobre la asignación grupal
CREATE TABLE IF NOT EXISTS guest_table_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(guest_id) -- Un invitado solo puede estar asignado a una mesa
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_guest_id 
    ON guest_table_assignments(guest_id);

CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_table_id 
    ON guest_table_assignments(table_id);

-- Extender tabla de mesas con posiciones para el canvas
-- position_x y position_y representan coordenadas en el grid del canvas
ALTER TABLE tables ADD COLUMN position_x INTEGER DEFAULT 0;
ALTER TABLE tables ADD COLUMN position_y INTEGER DEFAULT 0;

-- Índice compuesto para consultas de posicionamiento
CREATE INDEX IF NOT EXISTS idx_tables_position 
    ON tables(position_x, position_y);
