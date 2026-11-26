import { Form, Link, redirect, useActionData, useNavigation, useLoaderData } from "react-router";
import type { Route } from "./+types/tables-new";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { getCapacityStatus } from "~/lib/db.server";

export function meta() {
  return [{ title: "Nueva Mesa - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Obtener capacidad del evento
  const capacityStatus = await getCapacityStatus(db);

  // Obtener capacidad total de mesas existentes
  const tablesCapacity = await db
    .prepare("SELECT COALESCE(SUM(capacity), 0) as total FROM tables")
    .first<{ total: number }>();

  return {
    capacityStatus,
    totalTablesCapacity: tablesCapacity?.total ?? 0,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const capacity = parseInt(formData.get("capacity") as string, 10);

  if (!name || name.trim() === "") {
    return { error: "El nombre de la mesa es requerido" };
  }

  if (isNaN(capacity) || capacity < 1) {
    return { error: "La capacidad debe ser un número mayor a 0" };
  }

  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Verificar si ya existe una mesa con ese nombre
  const existing = await db
    .prepare("SELECT id FROM tables WHERE name = ?")
    .bind(name.trim())
    .first();

  if (existing) {
    return { error: "Ya existe una mesa con ese nombre" };
  }

  // Validar capacidad del evento si está configurada
  const capacityStatus = await getCapacityStatus(db);
  if (capacityStatus) {
    // Obtener capacidad total de mesas existentes
    const tablesCapacity = await db
      .prepare("SELECT COALESCE(SUM(capacity), 0) as total FROM tables")
      .first<{ total: number }>();

    const totalTablesCapacity = (tablesCapacity?.total ?? 0) + capacity;

    // Validar que la suma de capacidad de mesas no exceda la capacidad del evento
    if (totalTablesCapacity > capacityStatus.maxCapacity) {
      return {
        error: `La capacidad total de mesas (${totalTablesCapacity}) excedería la capacidad del evento (${capacityStatus.maxCapacity}). Reduce la capacidad de esta mesa o aumenta el límite del evento en Configuración.`,
      };
    }
  }

  await db
    .prepare("INSERT INTO tables (name, capacity) VALUES (?, ?)")
    .bind(name.trim(), capacity)
    .run();

  return redirect("/admin/tables");
}

export default function NewTablePage() {
  const { capacityStatus, totalTablesCapacity } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/tables" className="admin-back-link">
          ← Volver a mesas
        </Link>
        <h1 className="admin-page-title mt-2">Nueva Mesa</h1>
      </div>

      <div className="admin-card p-6 max-w-lg">
        <Form method="post" className="space-y-6">
          {actionData?.error && (
            <div className="admin-alert-error">{actionData.error}</div>
          )}

          {/* Warning de capacidad */}
          {capacityStatus && (
            <div className="p-4 bg-[var(--admin-surface-elevated)] rounded-lg border border-[var(--admin-border)]">
              <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-2">
                Capacidad del evento
              </p>
              <p className="text-xs text-[var(--admin-text-secondary)]">
                Límite del evento: {capacityStatus.maxCapacity} invitados
              </p>
              <p className="text-xs text-[var(--admin-text-secondary)]">
                Capacidad actual de mesas: {totalTablesCapacity}
              </p>
              <p className="text-xs text-[var(--admin-text-secondary)]">
                Disponible para nuevas mesas: {Math.max(0, capacityStatus.maxCapacity - totalTablesCapacity)}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="admin-label">
              Nombre de la mesa
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Ej: Mesa 1, Mesa Principal, Mesa de Honor"
              className="admin-input"
            />
          </div>

          <div>
            <label htmlFor="capacity" className="admin-label">
              Capacidad máxima
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              required
              min="1"
              max={capacityStatus ? Math.max(1, capacityStatus.maxCapacity - totalTablesCapacity) : undefined}
              defaultValue="10"
              className="admin-input"
            />
            <p className="admin-help-text">
              Número máximo de personas que pueden sentarse en esta mesa.
              {capacityStatus && ` Máximo recomendado: ${Math.max(1, capacityStatus.maxCapacity - totalTablesCapacity)}`}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary flex-1"
            >
              {isSubmitting ? "Creando..." : "Crear Mesa"}
            </button>
            <Link to="/admin/tables" className="admin-btn-secondary">
              Cancelar
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
