import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/guests-edit";
import type { GuestGroup, Guest, Table } from "~/lib/db.server";
import { getSetting } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconClipboard, IconEye, IconWhatsApp } from "~/components/admin-icons";

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data?.group
        ? `Editar ${data.group.name} - Panel de Administración`
        : "Editar Invitado",
    },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const groupId = parseInt(params.id, 10);

  if (isNaN(groupId)) {
    throw new Response("Invitado no encontrado", { status: 404 });
  }

  const group = await db
    .prepare("SELECT * FROM guest_groups WHERE id = ?")
    .bind(groupId)
    .first<GuestGroup>();

  if (!group) {
    throw new Response("Invitado no encontrado", { status: 404 });
  }

  const guestsResult = await db
    .prepare("SELECT * FROM guests WHERE group_id = ? ORDER BY is_representative DESC, id")
    .bind(groupId)
    .all<Guest>();

  const tablesResult = await db
    .prepare(
      `SELECT 
        t.id,
        t.name,
        t.capacity,
        COALESCE(SUM(CASE WHEN gg.status = 'confirmed' THEN gg.confirmed_count ELSE gg.max_guests END), 0) as current_occupancy
      FROM tables t
      LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.id != ?
      GROUP BY t.id
      ORDER BY t.name`
    )
    .bind(groupId)
    .all<Table & { current_occupancy: number }>();

  const appUrl = env.APP_URL || "http://localhost:5173";
  const whatsappTemplate = await getSetting(db, "whatsapp_template") || "";
  const weddingDate = await getSetting(db, "wedding_date") || "";
  const coupleNames = await getSetting(db, "couple_names") || "";

  return {
    group,
    guests: guestsResult.results,
    tables: tablesResult.results,
    appUrl,
    whatsappTemplate,
    weddingDate,
    coupleNames,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const groupId = parseInt(params.id, 10);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    // Eliminar el grupo (cascade eliminará los guests)
    await db.prepare("DELETE FROM guest_groups WHERE id = ?").bind(groupId).run();
    
    // También eliminar entradas del pool relacionadas
    await db
      .prepare("DELETE FROM pass_pool WHERE source_group_id = ? OR assigned_to_group_id = ?")
      .bind(groupId, groupId)
      .run();

    return redirect("/admin/guests");
  }

  if (intent === "reset") {
    // Resetear confirmación
    await db
      .prepare(
        "UPDATE guest_groups SET status = 'pending', confirmed_count = 0, confirmed_at = NULL WHERE id = ?"
      )
      .bind(groupId)
      .run();

    // Marcar todos los guests como no confirmados
    await db
      .prepare("UPDATE guests SET confirmed = 0 WHERE group_id = ?")
      .bind(groupId)
      .run();

    // Eliminar pases del pool que vinieron de este grupo
    await db
      .prepare("DELETE FROM pass_pool WHERE source_group_id = ?")
      .bind(groupId)
      .run();

    return { success: "Confirmación reseteada" };
  }

  // Update normal
  const name = formData.get("name") as string;
  const groupName = formData.get("groupName") as string;
  const phone = formData.get("phone") as string;
  const maxGuests = parseInt(formData.get("maxGuests") as string, 10);
  const tableId = formData.get("tableId") as string;
  const notes = formData.get("notes") as string;

  if (!name || name.trim() === "") {
    return { error: "El nombre es requerido" };
  }

  if (isNaN(maxGuests) || maxGuests < 1) {
    return { error: "El número de pases debe ser al menos 1" };
  }

  // Verificar que maxGuests no sea menor que confirmed_count si ya confirmó
  const current = await db
    .prepare("SELECT confirmed_count, status FROM guest_groups WHERE id = ?")
    .bind(groupId)
    .first<{ confirmed_count: number; status: string }>();

  if (current && current.status === "confirmed" && maxGuests < current.confirmed_count) {
    return {
      error: `No puedes reducir los pases por debajo de la cantidad confirmada (${current.confirmed_count})`,
    };
  }

  // Verificar capacidad de la mesa
  if (tableId) {
    const table = await db
      .prepare(
        `SELECT 
          t.capacity,
          COALESCE(SUM(CASE WHEN gg.status = 'confirmed' THEN gg.confirmed_count ELSE gg.max_guests END), 0) as current_occupancy
        FROM tables t
        LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.id != ?
        WHERE t.id = ?
        GROUP BY t.id`
      )
      .bind(groupId, parseInt(tableId, 10))
      .first<{ capacity: number; current_occupancy: number }>();

    const neededSpace = current?.status === "confirmed" ? current.confirmed_count : maxGuests;
    if (table && table.current_occupancy + neededSpace > table.capacity) {
      return {
        error: `La mesa seleccionada no tiene suficiente capacidad (disponible: ${table.capacity - table.current_occupancy})`,
      };
    }
  }

  await db
    .prepare(
      `UPDATE guest_groups 
       SET name = ?, group_name = ?, phone = ?, max_guests = ?, table_id = ?, notes = ? 
       WHERE id = ?`
    )
    .bind(
      name.trim(),
      groupName?.trim() || null,
      phone?.trim() || null,
      maxGuests,
      tableId ? parseInt(tableId, 10) : null,
      notes?.trim() || null,
      groupId
    )
    .run();

  // Actualizar el nombre del representante
  await db
    .prepare(
      "UPDATE guests SET name = ? WHERE group_id = ? AND is_representative = 1"
    )
    .bind(name.trim(), groupId)
    .run();

  return { success: "Cambios guardados" };
}

function StatusBadge({ status }: { status: string }) {
  const chipClass = {
    pending: "admin-chip-pending",
    confirmed: "admin-chip-confirmed",
    declined: "admin-chip-declined",
  };
  const labels = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    declined: "Rechazado",
  };
  return (
    <span className={chipClass[status as keyof typeof chipClass] || chipClass.pending}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

export default function EditGuestPage() {
  const {
    group,
    guests,
    tables,
    appUrl,
    whatsappTemplate,
    weddingDate,
    coupleNames,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const invitationLink = `${appUrl}/i/${group.token}`;

  const generateWhatsAppLink = () => {
    if (!group.phone) return null;
    const cleanPhone = group.phone.replace(/\D/g, "");
    const message = whatsappTemplate
      .replace(/{nombre}/g, group.name)
      .replace(/{enlace}/g, invitationLink)
      .replace(/{novios}/g, coupleNames)
      .replace(/{fecha}/g, weddingDate);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const whatsappLink = generateWhatsAppLink();

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/guests" className="admin-back-link">
          ← Volver a invitados
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <h1 className="admin-page-title">{group.name}</h1>
          <StatusBadge status={group.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <Form method="post" className="space-y-6">
              {actionData?.error && (
                <div className="admin-alert-error">{actionData.error}</div>
              )}
              {actionData?.success && (
                <div className="admin-alert-success">{actionData.success}</div>
              )}

              <div>
                <label htmlFor="name" className="admin-label">
                  Nombre del representante *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  defaultValue={group.name}
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="groupName" className="admin-label">
                  Nombre del grupo (opcional)
                </label>
                <input
                  type="text"
                  id="groupName"
                  name="groupName"
                  defaultValue={group.group_name || ""}
                  placeholder="Ej: Familia Pérez García"
                  className="admin-input"
                />
                <p className="admin-help-text">
                  Si no se especifica, se usará el nombre del representante en la invitación
                </p>
              </div>

              <div>
                <label htmlFor="phone" className="admin-label">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  defaultValue={group.phone || ""}
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="maxGuests" className="admin-label">
                  Número de pases *
                </label>
                <input
                  type="number"
                  id="maxGuests"
                  name="maxGuests"
                  required
                  min={group.status === "confirmed" ? group.confirmed_count : 1}
                  defaultValue={group.max_guests}
                  className="admin-input"
                />
                {group.status === "confirmed" && (
                  <p className="admin-help-text text-[var(--admin-status-pending)]">
                    Mínimo {group.confirmed_count} (ya confirmados)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="tableId" className="admin-label">
                  Mesa
                </label>
                <select
                  id="tableId"
                  name="tableId"
                  defaultValue={group.table_id || ""}
                  className="admin-select"
                >
                  <option value="">Sin asignar</option>
                  {tables.map((table) => {
                    const available = table.capacity - table.current_occupancy;
                    const needed =
                      group.status === "confirmed"
                        ? group.confirmed_count
                        : group.max_guests;
                    const disabled = available < needed;
                    return (
                      <option
                        key={table.id}
                        value={table.id}
                        disabled={disabled}
                      >
                        {table.name} ({available} disponibles)
                        {disabled && " - Sin espacio"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="admin-label">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={group.notes || ""}
                  className="admin-textarea"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary flex-1"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </Form>
          </div>

          {/* Lista de miembros */}
          {guests.length > 0 && (
            <div className="admin-card p-6">
              <h2 className="admin-section-title mb-4">Miembros del grupo</h2>
              <ul className="divide-y divide-[var(--admin-border)]">
                {guests.map((guest) => (
                  <li
                    key={guest.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--admin-text-primary)]">{guest.name}</span>
                      {guest.is_representative === 1 && (
                        <span className="admin-chip-premium text-xs">
                          Representante
                        </span>
                      )}
                    </div>
                    {group.status === "confirmed" && (
                      <span
                        className={`text-sm ${
                          guest.confirmed
                            ? "text-[var(--admin-status-confirmed)]"
                            : "text-[var(--admin-text-muted)]"
                        }`}
                      >
                        {guest.confirmed ? "✓ Confirmado" : "No asiste"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Enlace de invitación */}
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Enlace de invitación</h2>
            <div className="space-y-4">
              <div className="admin-code-block break-all">
                {invitationLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invitationLink);
                    alert("Enlace copiado");
                  }}
                  className="admin-btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <IconClipboard size={16} />
                  Copiar
                </button>
                <a
                  href={invitationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <IconEye size={16} />
                  Ver
                </a>
              </div>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn-whatsapp w-full justify-center"
                >
                  <IconWhatsApp size={20} />
                  Enviar por WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Información */}
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Información</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--admin-text-secondary)]">Estado:</dt>
                <dd>
                  <StatusBadge status={group.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--admin-text-secondary)]">Pases:</dt>
                <dd className="font-medium text-[var(--admin-text-primary)]">
                  {group.status === "confirmed"
                    ? `${group.confirmed_count} / ${group.max_guests}`
                    : group.max_guests}
                </dd>
              </div>
              {group.confirmed_at && (
                <div className="flex justify-between">
                  <dt className="text-[var(--admin-text-secondary)]">Confirmado:</dt>
                  <dd className="text-[var(--admin-text-primary)]">
                    {new Date(group.confirmed_at).toLocaleDateString("es-MX")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[var(--admin-text-secondary)]">Token:</dt>
                <dd className="font-mono text-[var(--admin-text-secondary)] text-xs">{group.token}</dd>
              </div>
            </dl>
          </div>

          {/* Acciones peligrosas */}
          <div className="admin-card-danger p-6">
            <h2 className="font-medium text-[var(--admin-status-declined)] mb-4">
              Zona de peligro
            </h2>
            <div className="space-y-3">
              {group.status === "confirmed" && (
                <Form method="post">
                  <input type="hidden" name="intent" value="reset" />
                  <button
                    type="submit"
                    className="admin-btn-warning w-full text-sm"
                  >
                    Resetear confirmación
                  </button>
                </Form>
              )}
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <button
                  type="submit"
                  onClick={(e) => {
                    if (
                      !confirm(
                        "¿Estás seguro de eliminar este invitado? Esta acción no se puede deshacer."
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="admin-btn-destructive w-full text-sm"
                >
                  Eliminar invitado
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
