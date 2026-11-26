import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/guests";
import type { GuestGroupWithTable } from "~/lib/db.server";
import { getSetting } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconUsers, IconClipboard, IconWhatsApp } from "~/components/admin-icons";

export function meta() {
  return [{ title: "Invitados - Panel de Administración" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let query = `
    SELECT 
      gg.*,
      t.name as table_name
    FROM guest_groups gg
    LEFT JOIN tables t ON t.id = gg.table_id
  `;

  if (statusFilter && ["pending", "confirmed", "declined"].includes(statusFilter)) {
    query += ` WHERE gg.status = '${statusFilter}'`;
  }

  query += ` ORDER BY gg.created_at DESC`;

  const groupsResult = await db.prepare(query).all<GuestGroupWithTable>();

  // Obtener la URL de la app para generar enlaces
  const appUrl = env.APP_URL || "http://localhost:5173";
  
  // Obtener la plantilla de WhatsApp
  const whatsappTemplate = await getSetting(db, "whatsapp_template") || "";
  const weddingDate = await getSetting(db, "wedding_date") || "";
  const coupleNames = await getSetting(db, "couple_names") || "";

  return {
    groups: groupsResult.results,
    appUrl,
    whatsappTemplate,
    weddingDate,
    coupleNames,
    statusFilter,
  };
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

function generateWhatsAppLink(
  phone: string,
  template: string,
  name: string,
  link: string,
  coupleNames: string,
  weddingDate: string
) {
  // Limpiar el teléfono (solo números)
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Reemplazar variables en la plantilla
  const message = template
    .replace(/{nombre}/g, name)
    .replace(/{enlace}/g, link)
    .replace(/{novios}/g, coupleNames)
    .replace(/{fecha}/g, weddingDate);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export default function GuestsPage() {
  const { groups, appUrl, whatsappTemplate, weddingDate, coupleNames, statusFilter } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Invitados</h1>
          <p className="admin-page-subtitle">
            Gestiona invitados individuales y grupos
          </p>
        </div>
        <Link to="/admin/guests/new" className="admin-btn-primary">
          + Nuevo Invitado
        </Link>
      </div>

      {/* Filtros */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/guests"
            className={`admin-filter-btn ${!statusFilter ? "active" : ""}`}
          >
            Todos
          </Link>
          <Link
            to="/admin/guests?status=pending"
            className={`admin-filter-btn ${statusFilter === "pending" ? "active pending" : ""}`}
          >
            Pendientes
          </Link>
          <Link
            to="/admin/guests?status=confirmed"
            className={`admin-filter-btn ${statusFilter === "confirmed" ? "active confirmed" : ""}`}
          >
            Confirmados
          </Link>
          <Link
            to="/admin/guests?status=declined"
            className={`admin-filter-btn ${statusFilter === "declined" ? "active declined" : ""}`}
          >
            Rechazados
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <div className="flex justify-center mb-4">
            <IconUsers size={48} className="text-[var(--admin-text-muted)]" />
          </div>
          <h2 className="text-lg font-medium text-[var(--admin-text-primary)] mb-2">
            No hay invitados registrados
          </h2>
          <p className="text-[var(--admin-text-secondary)] mb-6">
            Comienza agregando tu primer invitado o grupo.
          </p>
          <Link to="/admin/guests/new" className="admin-btn-primary inline-block">
            Agregar primer invitado
          </Link>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Pases</th>
                  <th>Mesa</th>
                  <th>Estado</th>
                  <th>WhatsApp</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const invitationLink = `${appUrl}/i/${group.token}`;
                  const whatsappLink = group.phone
                    ? generateWhatsAppLink(
                        group.phone,
                        whatsappTemplate,
                        group.name,
                        invitationLink,
                        coupleNames,
                        weddingDate
                      )
                    : null;

                  return (
                    <tr key={group.id}>
                      <td>
                        <div>
                          <span className="font-medium text-[var(--admin-text-primary)]">
                            {group.name}
                          </span>
                          {group.phone && (
                            <p className="text-sm text-[var(--admin-text-secondary)]">
                              {group.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-[var(--admin-text-secondary)]">
                        {group.status === "confirmed" ? (
                          <span>
                            {group.confirmed_count} / {group.max_guests}
                          </span>
                        ) : (
                          <span>{group.max_guests}</span>
                        )}
                      </td>
                      <td className="text-[var(--admin-text-secondary)]">
                        {group.table_name || (
                          <span className="text-[var(--admin-text-muted)]">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={group.status} />
                      </td>
                      <td>
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn-whatsapp"
                          >
                            <IconWhatsApp size={16} />
                            Enviar
                          </a>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">
                            Sin teléfono
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(invitationLink);
                              alert("Enlace copiado al portapapeles");
                            }}
                            className="admin-btn-icon"
                            title="Copiar enlace"
                          >
                            <IconClipboard size={16} />
                          </button>
                          <Link
                            to={`/admin/guests/${group.id}`}
                            className="admin-link"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
