/**
 * Utilidades para acceder a la base de datos D1
 */

import { getCloudflareContext } from "./cloudflare-context";
import type { RouterContextProvider } from "react-router";

// Tipos para las tablas de la base de datos
export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  is_superadmin: number;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Table {
  id: number;
  name: string;
  capacity: number;
  created_at: string;
}

export interface GuestGroup {
  id: number;
  token: string;
  name: string;
  group_name: string | null;
  phone: string | null;
  max_guests: number;
  table_id: number | null;
  status: "pending" | "confirmed" | "declined";
  confirmed_count: number;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface Guest {
  id: number;
  group_id: number;
  name: string;
  is_representative: number;
  confirmed: number;
  created_at: string;
}

export interface PassPool {
  id: number;
  source_group_id: number | null;
  quantity: number;
  assigned_to_group_id: number | null;
  created_at: string;
}

export interface GuestTableAssignment {
  id: number;
  guest_id: number;
  table_id: number;
  created_at: string;
  updated_at: string;
}

// Tipos extendidos con relaciones
export interface GuestGroupWithTable extends GuestGroup {
  table_name: string | null;
}

export interface GuestGroupWithGuests extends GuestGroup {
  guests: Guest[];
}

export interface TableWithOccupancy extends Table {
  current_occupancy: number;
}

export interface TableWithPosition extends Table {
  position_x: number;
  position_y: number;
  current_occupancy?: number;
}

export interface GuestWithAssignment extends Guest {
  assigned_table_id: number | null;
  assigned_table_name: string | null;
}

export interface GuestGroupWithAssignments extends GuestGroup {
  guests: GuestWithAssignment[];
  group_table_name: string | null;
}

// Funciones de utilidad para la base de datos
export function getDb(context: RouterContextProvider): D1Database {
  return getCloudflareContext(context).env.DB;
}

/**
 * Obtiene una configuración por clave
 */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const result = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return result?.value ?? null;
}

/**
 * Actualiza o crea una configuración
 */
export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .bind(key, value)
    .run();
}

/**
 * Obtiene las métricas del dashboard
 */
export async function getDashboardMetrics(db: D1Database) {
  const [totalGroups, confirmed, pending, declined, poolPasses, tables] = await Promise.all([
    // Total de pases (suma de max_guests)
    db.prepare("SELECT COALESCE(SUM(max_guests), 0) as total FROM guest_groups").first<{ total: number }>(),
    // Confirmados
    db.prepare("SELECT COALESCE(SUM(confirmed_count), 0) as total FROM guest_groups WHERE status = 'confirmed'").first<{ total: number }>(),
    // Pendientes (suma de max_guests de grupos pendientes)
    db.prepare("SELECT COALESCE(SUM(max_guests), 0) as total FROM guest_groups WHERE status = 'pending'").first<{ total: number }>(),
    // Rechazados
    db.prepare("SELECT COUNT(*) as total FROM guest_groups WHERE status = 'declined'").first<{ total: number }>(),
    // Pases en pool disponibles
    db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM pass_pool WHERE assigned_to_group_id IS NULL").first<{ total: number }>(),
    // Total de mesas
    db.prepare("SELECT COUNT(*) as total FROM tables").first<{ total: number }>(),
  ]);

  // Obtener información de capacidad
  const capacityStatus = await getCapacityStatus(db);

  return {
    totalInvited: totalGroups?.total ?? 0,
    confirmed: confirmed?.total ?? 0,
    pending: pending?.total ?? 0,
    declined: declined?.total ?? 0,
    poolPasses: poolPasses?.total ?? 0,
    tables: tables?.total ?? 0,
    // Incluir datos de capacidad si está configurado
    maxCapacity: capacityStatus?.maxCapacity ?? null,
    totalOccupied: capacityStatus?.totalOccupied ?? null,
    capacityAvailable: capacityStatus?.available ?? null,
    capacityStatus,
  };
}

/**
 * Genera un token único para invitaciones
 */
export function generateToken(): string {
  // Usar nanoid para generar tokens cortos y únicos
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Estado de capacidad del evento
 */
export interface CapacityStatus {
  maxCapacity: number;
  confirmed: number;
  pending: number;
  poolAvailable: number;
  totalOccupied: number;
  available: number;
}

/**
 * Obtiene el estado actual de capacidad del evento
 * Retorna null si no hay límite de capacidad configurado
 */
export async function getCapacityStatus(db: D1Database): Promise<CapacityStatus | null> {
  // Obtener capacidad máxima de settings
  const maxCapacitySetting = await getSetting(db, "max_capacity");
  if (!maxCapacitySetting) {
    return null;
  }

  const maxCapacity = parseInt(maxCapacitySetting, 10);
  if (isNaN(maxCapacity) || maxCapacity <= 0) {
    return null;
  }

  // Calcular confirmados (suma de confirmed_count donde status='confirmed')
  const confirmedResult = await db
    .prepare("SELECT COALESCE(SUM(confirmed_count), 0) as total FROM guest_groups WHERE status = 'confirmed'")
    .first<{ total: number }>();
  const confirmed = confirmedResult?.total ?? 0;

  // Calcular pendientes (suma de max_guests donde status='pending')
  const pendingResult = await db
    .prepare("SELECT COALESCE(SUM(max_guests), 0) as total FROM guest_groups WHERE status = 'pending'")
    .first<{ total: number }>();
  const pending = pendingResult?.total ?? 0;

  // Calcular pases en pool disponibles (no asignados)
  const poolResult = await db
    .prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM pass_pool WHERE assigned_to_group_id IS NULL")
    .first<{ total: number }>();
  const poolAvailable = poolResult?.total ?? 0;

  // Calcular totales
  const totalOccupied = confirmed + pending + poolAvailable;
  const available = Math.max(0, maxCapacity - totalOccupied);

  return {
    maxCapacity,
    confirmed,
    pending,
    poolAvailable,
    totalOccupied,
    available,
  };
}

/**
 * Valida si hay capacidad disponible para agregar pases
 * @param db Base de datos
 * @param requestedPasses Número de pases solicitados
 * @param excludeGroupId ID del grupo a excluir del cálculo (para ediciones)
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 */
export async function validateCapacity(
  db: D1Database,
  requestedPasses: number,
  excludeGroupId?: number
): Promise<{ valid: boolean; message?: string; status?: CapacityStatus }> {
  // Obtener estado de capacidad
  const status = await getCapacityStatus(db);

  // Si no hay límite configurado, permitir operación
  if (!status) {
    return { valid: true };
  }

  let adjustedOccupied = status.totalOccupied;

  // Si se proporciona excludeGroupId, restar sus pases actuales del cálculo
  if (excludeGroupId) {
    const groupResult = await db
      .prepare("SELECT max_guests, status FROM guest_groups WHERE id = ?")
      .bind(excludeGroupId)
      .first<{ max_guests: number; status: string }>();

    if (groupResult) {
      // Solo restar si el grupo está en pending o confirmed
      // Los grupos declined no cuentan en la ocupación actual
      if (groupResult.status === "pending" || groupResult.status === "confirmed") {
        adjustedOccupied -= groupResult.max_guests;
      }
    }
  }

  // Calcular nueva ocupación
  const newOccupied = adjustedOccupied + requestedPasses;

  // Validar capacidad
  if (newOccupied > status.maxCapacity) {
    return {
      valid: false,
      message: `Capacidad excedida: ${newOccupied}/${status.maxCapacity} pases ocupados. No hay cupos disponibles.`,
      status,
    };
  }

  return { valid: true, status };
}

/**
 * Obtiene la asignación individual de un invitado a una mesa
 * @param db Base de datos
 * @param guestId ID del invitado
 * @returns Asignación si existe, null si no tiene asignación individual
 */
export async function getGuestAssignment(
  db: D1Database,
  guestId: number
): Promise<GuestTableAssignment | null> {
  const result = await db
    .prepare("SELECT * FROM guest_table_assignments WHERE guest_id = ?")
    .bind(guestId)
    .first<GuestTableAssignment>();
  
  return result || null;
}

/**
 * Obtiene todos los invitados asignados a una mesa
 * Considera tanto asignaciones individuales como grupales
 * Prioridad: asignaciones individuales prevalecen sobre grupales
 * @param db Base de datos
 * @param tableId ID de la mesa
 * @returns Array de invitados con sus datos
 */
export async function getTableAssignments(
  db: D1Database,
  tableId: number
): Promise<GuestWithAssignment[]> {
  const result = await db
    .prepare(
      `SELECT 
        g.id,
        g.group_id,
        g.name,
        g.is_representative,
        g.confirmed,
        g.created_at,
        COALESCE(gta.table_id, gg.table_id) as assigned_table_id,
        COALESCE(t1.name, t2.name) as assigned_table_name
      FROM guests g
      INNER JOIN guest_groups gg ON gg.id = g.group_id
      LEFT JOIN guest_table_assignments gta ON gta.guest_id = g.id
      LEFT JOIN tables t1 ON t1.id = gta.table_id
      LEFT JOIN tables t2 ON t2.id = gg.table_id
      WHERE COALESCE(gta.table_id, gg.table_id) = ?
      ORDER BY g.is_representative DESC, g.name`
    )
    .bind(tableId)
    .all<GuestWithAssignment>();
  
  return result.results || [];
}

/**
 * Asigna un invitado individual a una mesa
 * Crea nueva asignación o actualiza existente
 * @param db Base de datos
 * @param guestId ID del invitado
 * @param tableId ID de la mesa
 */
export async function assignGuestToTable(
  db: D1Database,
  guestId: number,
  tableId: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO guest_table_assignments (guest_id, table_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(guest_id) DO UPDATE SET 
         table_id = excluded.table_id,
         updated_at = datetime('now')`
    )
    .bind(guestId, tableId)
    .run();
}

/**
 * Elimina la asignación individual de un invitado
 * El invitado volverá a heredar la mesa de su grupo (si tiene)
 * @param db Base de datos
 * @param guestId ID del invitado
 */
export async function removeGuestAssignment(
  db: D1Database,
  guestId: number
): Promise<void> {
  await db
    .prepare("DELETE FROM guest_table_assignments WHERE guest_id = ?")
    .bind(guestId)
    .run();
}

/**
 * Obtiene todas las mesas con sus posiciones y ocupación actual
 * @param db Base de datos
 * @returns Array de mesas con posiciones y ocupación
 */
export async function getTablesWithPositions(
  db: D1Database
): Promise<TableWithPosition[]> {
  const result = await db
    .prepare(
      `SELECT 
        t.id,
        t.name,
        t.capacity,
        t.created_at,
        t.position_x,
        t.position_y,
        COUNT(DISTINCT CASE 
          WHEN gta.guest_id IS NOT NULL THEN gta.guest_id
          WHEN gg.table_id = t.id AND gg.status = 'confirmed' THEN g.id
          ELSE NULL
        END) as current_occupancy
      FROM tables t
      LEFT JOIN guest_table_assignments gta ON gta.table_id = t.id
      LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.status = 'confirmed'
      LEFT JOIN guests g ON g.group_id = gg.id
      GROUP BY t.id
      ORDER BY t.name`
    )
    .all<TableWithPosition>();
  
  return result.results || [];
}

/**
 * Actualiza la posición de una mesa en el canvas
 * @param db Base de datos
 * @param tableId ID de la mesa
 * @param x Posición X (en píxeles)
 * @param y Posición Y (en píxeles)
 */
export async function updateTablePosition(
  db: D1Database,
  tableId: number,
  x: number,
  y: number
): Promise<void> {
  await db
    .prepare("UPDATE tables SET position_x = ?, position_y = ? WHERE id = ?")
    .bind(x, y, tableId)
    .run();
}
