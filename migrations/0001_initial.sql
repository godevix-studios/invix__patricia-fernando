-- ============================================
-- Migración inicial: Panel de Administración
-- Patricia & Fernando - Invitación de Boda
-- ============================================

-- Tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de configuración (key-value)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Tabla de mesas
CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de grupos de invitados
CREATE TABLE IF NOT EXISTS guest_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    max_guests INTEGER NOT NULL DEFAULT 1,
    table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    confirmed_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT
);

-- Tabla de invitados individuales (miembros de un grupo)
CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_representative INTEGER NOT NULL DEFAULT 0,
    confirmed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de pool de pases libres
CREATE TABLE IF NOT EXISTS pass_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_group_id INTEGER REFERENCES guest_groups(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    assigned_to_group_id INTEGER REFERENCES guest_groups(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_guest_groups_token ON guest_groups(token);
CREATE INDEX IF NOT EXISTS idx_guest_groups_status ON guest_groups(status);
CREATE INDEX IF NOT EXISTS idx_guest_groups_table_id ON guest_groups(table_id);
CREATE INDEX IF NOT EXISTS idx_guests_group_id ON guests(group_id);
CREATE INDEX IF NOT EXISTS idx_pass_pool_assigned ON pass_pool(assigned_to_group_id);

-- ============================================
-- Datos iniciales
-- ============================================

-- Usuario admin inicial
-- Password: admin123 (hash generado con SHA-256 + secret)
-- IMPORTANTE: Cambiar la contraseña después del primer login
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', 'c6ffd4f74de2e8ed3bb7d263652ae60122be5950e542d1627e4ac7d52de6c31a');

-- Plantilla de WhatsApp por defecto
INSERT INTO settings (key, value) VALUES (
    'whatsapp_template',
    '¡Hola {nombre}! 💍✨

Patricia y Fernando te invitan a celebrar su boda.

📅 Fecha: {fecha}
📍 Lugar: Hacienda la Victoria

Confirma tu asistencia aquí:
{enlace}

¡Esperamos contar contigo en este día tan especial!

Con cariño,
{novios}'
);

-- Configuración adicional
INSERT INTO settings (key, value) VALUES ('wedding_date', '23 de enero de 2027');
INSERT INTO settings (key, value) VALUES ('couple_names', 'Patricia y Fernando');
INSERT INTO settings (key, value) VALUES ('venue_name', 'Hacienda la Victoria');
