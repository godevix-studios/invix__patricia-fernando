import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/tables-edit";
import type { Table } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.table ? `Editar ${data.table.name} - Panel de Administración` : "Editar Mesa" },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const tableId = parseInt(params.id, 10);

  if (isNaN(tableId)) {
    throw new Response("Mesa no encontrada", { status: 404 });
  }

  const table = await db
    .prepare("SELECT * FROM tables WHERE id = ?")
    .bind(tableId)
    .first<Table>();

  if (!table) {
    throw new Response("Mesa no encontrada", { status: 404 });
  }

  // Obtener ocupación actual
  const occupancy = await db
    .prepare(
      `SELECT COALESCE(SUM(confirmed_count), 0) as count 
       FROM guest_groups 
       WHERE table_id = ? AND status = 'confirmed'`
    )
    .bind(tableId)
    .first<{ count: number }>();

  return {
    table,
    currentOccupancy: occupancy?.count ?? 0,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const tableId = parseInt(params.id, 10);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    // Verificar que no tenga invitados asignados
    const hasGuests = await db
      .prepare("SELECT COUNT(*) as count FROM guest_groups WHERE table_id = ?")
      .bind(tableId)
      .first<{ count: number }>();

    if (hasGuests && hasGuests.count > 0) {
      return {
        error: "No se puede eliminar una mesa con invitados asignados. Primero reasigna los invitados a otra mesa.",
      };
    }

    await db.prepare("DELETE FROM tables WHERE id = ?").bind(tableId).run();
    return redirect("/admin/tables");
  }

  // Update
  const name = formData.get("name") as string;
  const capacity = parseInt(formData.get("capacity") as string, 10);

  if (!name || name.trim() === "") {
    return { error: "El nombre de la mesa es requerido" };
  }

  if (isNaN(capacity) || capacity < 1) {
    return { error: "La capacidad debe ser un número mayor a 0" };
  }

  // Verificar que la nueva capacidad no sea menor a la ocupación actual
  const occupancy = await db
    .prepare(
      `SELECT COALESCE(SUM(confirmed_count), 0) as count 
       FROM guest_groups 
       WHERE table_id = ? AND status = 'confirmed'`
    )
    .bind(tableId)
    .first<{ count: number }>();

  if (occupancy && capacity < occupancy.count) {
    return {
      error: `La capacidad no puede ser menor a la ocupación actual (${occupancy.count} personas)`,
    };
  }

  // Verificar nombre duplicado
  const existing = await db
    .prepare("SELECT id FROM tables WHERE name = ? AND id != ?")
    .bind(name.trim(), tableId)
    .first();

  if (existing) {
    return { error: "Ya existe otra mesa con ese nombre" };
  }

  await db
    .prepare("UPDATE tables SET name = ?, capacity = ? WHERE id = ?")
    .bind(name.trim(), capacity, tableId)
    .run();

  return redirect("/admin/tables");
}

export default function EditTablePage() {
  const { table, currentOccupancy } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/tables" className="admin-back-link">
          ← Volver a mesas
        </Link>
        <h1 className="admin-page-title mt-2">Editar Mesa</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card p-6">
          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="admin-alert-error">{actionData.error}</div>
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
                defaultValue={table.name}
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
                min={currentOccupancy || 1}
                defaultValue={table.capacity}
                className="admin-input"
              />
              {currentOccupancy > 0 && (
                <p className="admin-help-text text-[var(--admin-status-pending)]">
                  Mínimo {currentOccupancy} (ocupación actual)
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary flex-1"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </button>
              <Link to="/admin/tables" className="admin-btn-secondary">
                Cancelar
              </Link>
            </div>
          </Form>
        </div>

        {/* Panel de información y eliminación */}
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="font-medium text-[var(--admin-text-primary)] mb-4">
              Información de la mesa
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--admin-text-secondary)]">Ocupación actual:</dt>
                <dd className="font-medium text-[var(--admin-text-primary)]">
                  {currentOccupancy} / {table.capacity} personas
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--admin-text-secondary)]">Espacios disponibles:</dt>
                <dd className="font-medium text-[var(--admin-text-primary)]">
                  {table.capacity - currentOccupancy}
                </dd>
              </div>
            </dl>
          </div>

          <div className="admin-card-danger p-6">
            <h2 className="font-medium text-[var(--admin-status-declined)] mb-2">
              Zona de peligro
            </h2>
            <p className="text-sm text-[var(--admin-text-secondary)] mb-4">
              Eliminar esta mesa es una acción irreversible.
              {currentOccupancy > 0 &&
                " Primero debes reasignar los invitados a otra mesa."}
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                disabled={currentOccupancy > 0}
                className="admin-btn-destructive w-full"
              >
                Eliminar Mesa
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
