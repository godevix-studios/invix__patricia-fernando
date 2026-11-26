import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/tables";
import type { TableWithOccupancy } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconTable } from "~/components/admin-icons";

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
        COALESCE(SUM(CASE WHEN gg.status = 'confirmed' THEN gg.confirmed_count ELSE 0 END), 0) as current_occupancy
      FROM tables t
      LEFT JOIN guest_groups gg ON gg.table_id = t.id
      GROUP BY t.id
      ORDER BY t.name
    `
    )
    .all<TableWithOccupancy & { created_at: string }>();

  return { tables: tablesResult.results };
}

export default function TablesPage() {
  const { tables } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Mesas</h1>
          <p className="admin-page-subtitle">
            Gestiona las mesas del evento
          </p>
        </div>
        <Link to="/admin/tables/new" className="admin-btn-primary">
          + Nueva Mesa
        </Link>
      </div>

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
