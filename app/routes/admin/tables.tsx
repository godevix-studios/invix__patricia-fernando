import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/tables";
import type { TableWithOccupancy } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconTable } from "~/components/admin-icons";
import { getCapacityStatus } from "~/lib/db.server";

export function meta() {
  return [{ title: "Mesas - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  const tablesResult = await db
    .prepare(
      `
      SELECT 
        t.id,
        t.name,
        t.capacity,
        t.created_at,
        COUNT(DISTINCT CASE 
          WHEN gta.guest_id IS NOT NULL THEN gta.guest_id
          WHEN gg.table_id = t.id THEN g.id
          ELSE NULL
        END) as current_occupancy
      FROM tables t
      LEFT JOIN guest_table_assignments gta ON gta.table_id = t.id
      LEFT JOIN guest_groups gg ON gg.table_id = t.id
      LEFT JOIN guests g ON g.group_id = gg.id
      WHERE gta.guest_id IS NOT NULL OR g.id IS NOT NULL OR (gta.guest_id IS NULL AND g.id IS NULL)
      GROUP BY t.id
      ORDER BY t.name
    `
    )
    .all<TableWithOccupancy & { created_at: string }>();

  // Obtener capacidad del evento y calcular totales
  const capacityStatus = await getCapacityStatus(db);
  
  const totalTablesCapacity = tablesResult.results?.reduce((sum, table) => sum + table.capacity, 0) ?? 0;

  return { 
    tables: tablesResult.results,
    capacityStatus,
    totalTablesCapacity,
  };
}

export default function TablesPage() {
  const { tables, capacityStatus, totalTablesCapacity } = useLoaderData<typeof loader>();

  const exceedsEventCapacity = capacityStatus && totalTablesCapacity > capacityStatus.maxCapacity;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Mesas</h1>
          <p className="admin-page-subtitle">
            Gestiona las mesas del evento
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/tables/bulk" className="admin-btn-secondary">
            Crear múltiples
          </Link>
          <Link to="/admin/tables/new" className="admin-btn-primary">
            + Nueva Mesa
          </Link>
        </div>
      </div>

      {/* Warning de capacidad del evento */}
      {capacityStatus && (
        <div className={`p-4 rounded-lg border ${
          exceedsEventCapacity 
            ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]'
            : 'bg-[var(--admin-surface-elevated)] border-[var(--admin-border)]'
        }`}>
          <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-2">
            Capacidad de mesas vs. evento
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--admin-text-secondary)]">
            <span>Capacidad total de mesas: <strong>{totalTablesCapacity}</strong></span>
            <span>•</span>
            <span>Límite del evento: <strong>{capacityStatus.maxCapacity}</strong></span>
            {exceedsEventCapacity && (
              <>
                <span>•</span>
                <span className="text-[var(--admin-status-declined)] font-medium">
                  ⚠️ Las mesas exceden el límite del evento
                </span>
              </>
            )}
          </div>
          {exceedsEventCapacity && (
            <p className="text-xs text-[var(--admin-text-secondary)] mt-2">
              Reduce la capacidad de algunas mesas o aumenta el límite del evento en <Link to="/admin/settings" className="admin-link">Configuración</Link>.
            </p>
          )}
        </div>
      )}

      {tables.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <div className="flex justify-center mb-4">
            <IconTable size={48} className="text-[var(--admin-text-muted)]" />
          </div>
          <h2 className="text-lg font-medium text-[var(--admin-text-primary)] mb-2">
            No hay mesas registradas
          </h2>
          <p className="text-[var(--admin-text-secondary)] mb-6">
            Comienza creando la primera mesa para tu evento.
          </p>
          <Link to="/admin/tables/new" className="admin-btn-primary inline-block">
            Crear primera mesa
          </Link>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Capacidad</th>
                <th>Ocupación</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => {
                const occupancyPercent = Math.round(
                  (table.current_occupancy / table.capacity) * 100
                );
                const isFull = table.current_occupancy >= table.capacity;
                const isAlmostFull = occupancyPercent >= 75;

                return (
                  <tr key={table.id}>
                    <td>
                      <span className="font-medium text-[var(--admin-text-primary)]">
                        {table.name}
                      </span>
                    </td>
                    <td className="text-[var(--admin-text-secondary)]">
                      {table.capacity} personas
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="admin-progress w-24">
                          <div
                            className={`admin-progress-bar ${
                              isFull
                                ? "bg-[var(--admin-status-declined)]"
                                : isAlmostFull
                                  ? "bg-[var(--admin-status-pending)]"
                                  : "bg-[var(--admin-status-confirmed)]"
                            }`}
                            style={{
                              width: `${Math.min(occupancyPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-[var(--admin-text-secondary)]">
                          {table.current_occupancy}/{table.capacity}
                        </span>
                      </div>
                    </td>
                    <td>
                      {isFull ? (
                        <span className="admin-chip-declined">Llena</span>
                      ) : isAlmostFull ? (
                        <span className="admin-chip-pending">Casi llena</span>
                      ) : (
                        <span className="admin-chip-confirmed">Disponible</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/admin/tables/${table.id}`}
                        className="admin-link"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
