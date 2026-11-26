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

  return {
    totalInvited: totalGroups?.total ?? 0,
    confirmed: confirmed?.total ?? 0,
    pending: pending?.total ?? 0,
    declined: declined?.total ?? 0,
    poolPasses: poolPasses?.total ?? 0,
    tables: tables?.total ?? 0,
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
