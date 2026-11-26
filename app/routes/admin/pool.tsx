import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/pool";
import type { PassPool, GuestGroup } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconTicket, IconList } from "~/components/admin-icons";

export function meta() {
  return [{ title: "Pool de Pases - Panel de Administración" }];
}

interface PoolEntryWithDetails extends PassPool {
  source_group_name: string | null;
  assigned_group_name: string | null;
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Obtener pases del pool con detalles
  const poolResult = await db
    .prepare(
      `SELECT 
        pp.*,
        sg.name as source_group_name,
        ag.name as assigned_group_name
      FROM pass_pool pp
      LEFT JOIN guest_groups sg ON sg.id = pp.source_group_id
      LEFT JOIN guest_groups ag ON ag.id = pp.assigned_to_group_id
      ORDER BY pp.created_at DESC`
    )
    .all<PoolEntryWithDetails>();

  // Obtener grupos pendientes o confirmados para asignar pases
  const groupsResult = await db
    .prepare(
      `SELECT id, name, max_guests, confirmed_count, status 
       FROM guest_groups 
       WHERE status IN ('pending', 'confirmed')
       ORDER BY name`
    )
    .all<GuestGroup>();

  // Calcular totales
  const availablePasses =
    poolResult.results?.filter((p) => !p.assigned_to_group_id).reduce((sum, p) => sum + p.quantity, 0) || 0;
  const assignedPasses =
    poolResult.results?.filter((p) => p.assigned_to_group_id).reduce((sum, p) => sum + p.quantity, 0) || 0;

  return {
    pool: poolResult.results || [],
    groups: groupsResult.results || [],
    availablePasses,
    assignedPasses,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "assign") {
    const poolId = parseInt(formData.get("poolId") as string, 10);
    const groupId = parseInt(formData.get("groupId") as string, 10);
    const quantity = parseInt(formData.get("quantity") as string, 10);

    if (isNaN(poolId) || isNaN(groupId) || isNaN(quantity) || quantity < 1) {
      return { error: "Datos inválidos" };
    }

    // Verificar que el pool entry existe y tiene suficientes pases
    const poolEntry = await db
      .prepare("SELECT * FROM pass_pool WHERE id = ? AND assigned_to_group_id IS NULL")
      .bind(poolId)
      .first<PassPool>();

    if (!poolEntry) {
      return { error: "Entrada de pool no encontrada o ya asignada" };
    }

    if (quantity > poolEntry.quantity) {
      return { error: `Solo hay ${poolEntry.quantity} pases disponibles en esta entrada` };
    }

    // Obtener grupo destino
    const group = await db
      .prepare("SELECT * FROM guest_groups WHERE id = ?")
      .bind(groupId)
      .first<GuestGroup>();

    if (!group) {
      return { error: "Grupo no encontrado" };
    }

    // Actualizar max_guests del grupo
    await db
      .prepare("UPDATE guest_groups SET max_guests = max_guests + ? WHERE id = ?")
      .bind(quantity, groupId)
      .run();

    if (quantity === poolEntry.quantity) {
      // Asignar toda la entrada
      await db
        .prepare("UPDATE pass_pool SET assigned_to_group_id = ? WHERE id = ?")
        .bind(groupId, poolId)
        .run();
    } else {
      // Dividir la entrada: crear una nueva para los asignados, reducir la original
      await db
        .prepare(
          "INSERT INTO pass_pool (source_group_id, quantity, assigned_to_group_id) VALUES (?, ?, ?)"
        )
        .bind(poolEntry.source_group_id, quantity, groupId)
        .run();

      await db
        .prepare("UPDATE pass_pool SET quantity = quantity - ? WHERE id = ?")
        .bind(quantity, poolId)
        .run();
    }

    return { success: `${quantity} pase(s) asignado(s) a ${group.name}` };
  }

  if (intent === "revoke") {
    const poolId = parseInt(formData.get("poolId") as string, 10);

    // Obtener la entrada asignada
    const poolEntry = await db
      .prepare("SELECT * FROM pass_pool WHERE id = ? AND assigned_to_group_id IS NOT NULL")
      .bind(poolId)
      .first<PassPool>();

    if (!poolEntry) {
      return { error: "Entrada no encontrada o no está asignada" };
    }

    // Reducir max_guests del grupo
    await db
      .prepare("UPDATE guest_groups SET max_guests = max_guests - ? WHERE id = ?")
      .bind(poolEntry.quantity, poolEntry.assigned_to_group_id)
      .run();

    // Desasignar
    await db
      .prepare("UPDATE pass_pool SET assigned_to_group_id = NULL WHERE id = ?")
      .bind(poolId)
      .run();

    return { success: "Pase(s) revocado(s) y devuelto(s) al pool" };
  }

  if (intent === "add") {
    const quantity = parseInt(formData.get("quantity") as string, 10);
    const notes = formData.get("notes") as string;

    if (isNaN(quantity) || quantity < 1) {
      return { error: "La cantidad debe ser al menos 1" };
    }

    await db
      .prepare("INSERT INTO pass_pool (quantity, source_group_id) VALUES (?, NULL)")
      .bind(quantity)
      .run();

    return { success: `${quantity} pase(s) agregado(s) al pool` };
  }

  if (intent === "delete") {
    const poolId = parseInt(formData.get("poolId") as string, 10);

    // Solo permitir eliminar entradas no asignadas
    await db
      .prepare("DELETE FROM pass_pool WHERE id = ? AND assigned_to_group_id IS NULL")
      .bind(poolId)
      .run();

    return { success: "Entrada eliminada del pool" };
  }

  return null;
}

export default function PoolPage() {
  const { pool, groups, availablePasses, assignedPasses } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const availableEntries = pool.filter((p) => !p.assigned_to_group_id);
  const assignedEntries = pool.filter((p) => p.assigned_to_group_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Pool de Pases</h1>
          <p className="admin-page-subtitle">
            Gestiona pases no utilizados para reasignación
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="admin-metric">
          <div className="admin-metric-icon bg-[var(--admin-status-confirmed)]/20 text-[var(--admin-status-confirmed)]">
            <IconTicket size={24} />
          </div>
          <div>
            <p className="admin-metric-label">Pases disponibles</p>
            <p className="admin-metric-value">{availablePasses}</p>
          </div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-icon bg-[var(--admin-gold)]/20 text-[var(--admin-gold)]">
            <IconList size={24} />
          </div>
          <div>
            <p className="admin-metric-label">Pases asignados</p>
            <p className="admin-metric-value">{assignedPasses}</p>
          </div>
        </div>
      </div>

      {actionData?.error && (
        <div className="admin-alert-error">{actionData.error}</div>
      )}
      {actionData?.success && (
        <div className="admin-alert-success">{actionData.success}</div>
      )}

      {/* Agregar pases manualmente */}
      <div className="admin-card p-6">
        <h2 className="admin-section-title mb-4">Agregar pases manualmente</h2>
        <Form method="post" className="flex gap-4 items-end">
          <input type="hidden" name="intent" value="add" />
          <div className="flex-1">
            <label htmlFor="quantity" className="admin-label">
              Cantidad
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              defaultValue="1"
              className="admin-input"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="admin-btn-primary"
          >
            Agregar al pool
          </button>
        </Form>
        <p className="admin-help-text mt-3">
          Los pases también se agregan automáticamente cuando un grupo confirma
          menos personas de las asignadas.
        </p>
      </div>

      {/* Pases disponibles */}
      <div className="admin-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--admin-border)]">
          <h2 className="admin-section-title">
            Pases Disponibles ({availablePasses})
          </h2>
        </div>

        {availableEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--admin-text-secondary)]">
            No hay pases disponibles en el pool.
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {availableEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="text-lg font-medium text-[var(--admin-text-primary)]">
                      {entry.quantity} pase{entry.quantity > 1 ? "s" : ""}
                    </span>
                    {entry.source_group_name && (
                      <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                        Origen:{" "}
                        <Link
                          to={`/admin/guests/${entry.source_group_id}`}
                          className="admin-link"
                        >
                          {entry.source_group_name}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Form method="post" className="flex items-center gap-2 flex-wrap">
                      <input type="hidden" name="intent" value="assign" />
                      <input type="hidden" name="poolId" value={entry.id} />
                      <select
                        name="groupId"
                        required
                        className="admin-select text-sm"
                      >
                        <option value="">Asignar a...</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.max_guests} pases)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        max={entry.quantity}
                        defaultValue="1"
                        className="admin-input w-20 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="admin-btn-success text-sm"
                      >
                        Asignar
                      </button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="poolId" value={entry.id} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="admin-link-danger text-sm"
                      >
                        Eliminar
                      </button>
                    </Form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de asignaciones */}
      {assignedEntries.length > 0 && (
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--admin-border)]">
            <h2 className="admin-section-title">
              Historial de Asignaciones ({assignedPasses} pases)
            </h2>
          </div>
          <div className="divide-y divide-[var(--admin-border)]">
            {assignedEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[var(--admin-text-primary)]">
                      {entry.quantity} pase{entry.quantity > 1 ? "s" : ""}
                    </span>
                    <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                      {entry.source_group_name ? (
                        <>
                          De{" "}
                          <Link
                            to={`/admin/guests/${entry.source_group_id}`}
                            className="admin-link"
                          >
                            {entry.source_group_name}
                          </Link>
                        </>
                      ) : (
                        "Agregado manualmente"
                      )}{" "}
                      →{" "}
                      <Link
                        to={`/admin/guests/${entry.assigned_to_group_id}`}
                        className="admin-link"
                      >
                        {entry.assigned_group_name}
                      </Link>
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="revoke" />
                    <input type="hidden" name="poolId" value={entry.id} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="admin-link-danger text-sm"
                    >
                      Revocar
                    </button>
                  </Form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
