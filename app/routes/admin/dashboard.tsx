import { useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard";
import { getDashboardMetrics, type TableWithOccupancy } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import {
  IconUsers,
  IconCheck,
  IconClock,
  IconX,
  IconTicket,
  IconTable,
} from "~/components/admin-icons";

export function meta() {
  return [{ title: "Dashboard - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  
  const [metrics, tablesResult] = await Promise.all([
    getDashboardMetrics(db),
    db.prepare(`
      SELECT 
        t.id,
        t.name,
        t.capacity,
        COALESCE(SUM(gg.confirmed_count), 0) as current_occupancy
      FROM tables t
      LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.status = 'confirmed'
      GROUP BY t.id
      ORDER BY t.name
    `).all<TableWithOccupancy>(),
  ]);

  return {
    metrics,
    tables: tablesResult.results,
  };
}

function MetricCard({
  label,
  value,
  Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  variant?: "default" | "gold" | "success" | "warning" | "error";
}) {
  const variantClasses = {
    default: "",
    gold: "gold",
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    error: "text-[var(--error)]",
  };

  const iconBgClasses = {
    default: "bg-[var(--surface-sunken)]",
    gold: "bg-[var(--gold-soft)] shadow-[var(--glow-gold-sm)]",
    success: "bg-[rgba(74,222,128,0.1)]",
    warning: "bg-[rgba(251,191,36,0.1)]",
    error: "bg-[rgba(239,68,68,0.1)]",
  };

  return (
    <div className="admin-metric">
      <div className="flex items-center gap-4">
        <div className={`admin-metric-icon ${iconBgClasses[variant]} ${variantClasses[variant]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="admin-metric-label">{label}</p>
          <p className="admin-metric-value">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { metrics, tables } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">
          Resumen de invitaciones y mesas para la boda
        </p>
      </div>

      {/* Capacidad del Evento (si está configurada) */}
      {metrics.capacityStatus && (
        <div className="admin-card p-6">
          <h3 className="text-xl text-[var(--content-primary)] mb-4">Capacidad del Evento</h3>
          
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-semibold text-[var(--admin-text-primary)]">
                {metrics.totalOccupied} <span className="text-lg text-[var(--admin-text-secondary)]">/ {metrics.maxCapacity}</span>
              </span>
              <span className="text-sm text-[var(--admin-text-secondary)]">
                pases ocupados
              </span>
            </div>
            
            <div className="admin-progress" style={{ height: '12px' }}>
              <div
                className={`admin-progress-bar ${
                  (metrics.totalOccupied! / metrics.maxCapacity!) > 0.95 
                    ? "error" 
                    : (metrics.totalOccupied! / metrics.maxCapacity!) > 0.75 
                    ? "warning" 
                    : "success"
                }`}
                style={{ width: `${Math.min((metrics.totalOccupied! / metrics.maxCapacity!) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-[var(--admin-text-secondary)]">
            <span>{metrics.capacityStatus.confirmed} confirmados</span>
            <span>•</span>
            <span>{metrics.capacityStatus.pending} pendientes</span>
            <span>•</span>
            <span>{metrics.capacityStatus.poolAvailable} en pool</span>
          </div>

          {metrics.capacityAvailable! <= 10 && metrics.capacityAvailable! > 0 && (
            <div className="mt-4 p-3 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-lg">
              <p className="text-sm text-[var(--admin-text-primary)]">
                ⚠️ Solo quedan <strong>{metrics.capacityAvailable} pases disponibles</strong>
              </p>
            </div>
          )}

          {metrics.capacityAvailable! === 0 && (
            <div className="mt-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg">
              <p className="text-sm text-[var(--admin-text-primary)]">
                🚫 <strong>Capacidad máxima alcanzada.</strong> No se pueden crear nuevas invitaciones.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Invitados"
          value={metrics.totalInvited}
          Icon={IconUsers}
          variant="gold"
        />
        <MetricCard
          label="Confirmados"
          value={metrics.confirmed}
          Icon={IconCheck}
          variant="success"
        />
        <MetricCard
          label="Pendientes"
          value={metrics.pending}
          Icon={IconClock}
          variant="warning"
        />
        <MetricCard
          label="Rechazados"
          value={metrics.declined}
          Icon={IconX}
          variant="error"
        />
        <MetricCard
          label="Pases en Pool"
          value={metrics.poolPasses}
          Icon={IconTicket}
          variant="default"
        />
        <MetricCard
          label="Mesas"
          value={metrics.tables}
          Icon={IconTable}
          variant="default"
        />
      </div>

      {/* Resumen de Mesas */}
      <div className="admin-card">
        <div className="mb-6">
          <h3 className="text-xl text-[var(--content-primary)]">Ocupación de Mesas</h3>
        </div>
        
        {tables.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <IconTable size={48} className="opacity-50" />
            </div>
            <p className="admin-empty-title">No hay mesas registradas</p>
            <p className="admin-empty-text">
              Comienza creando la primera mesa para tu evento.
            </p>
            <a href="/admin/tables/new" className="admin-btn admin-btn-primary">
              Crear primera mesa
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {tables.map((table) => {
              const occupancyPercent = Math.round(
                (table.current_occupancy / table.capacity) * 100
              );
              const isFull = table.current_occupancy >= table.capacity;
              const isAlmostFull = occupancyPercent >= 75;

              return (
                <div key={table.id} className="admin-list-item">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--content-primary)]">
                        {table.name}
                      </span>
                      <span className={`text-sm ${isFull ? "text-[var(--error)]" : "text-[var(--content-tertiary)]"}`}>
                        {table.current_occupancy} / {table.capacity} personas
                      </span>
                    </div>
                    <div className="admin-progress">
                      <div
                        className={`admin-progress-bar ${
                          isFull ? "error" : isAlmostFull ? "warning" : "success"
                        }`}
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
