import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/settings";
import { getSetting, setSetting, getCapacityStatus } from "~/lib/db.server";
import { hashPassword } from "~/lib/auth.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta() {
  return [{ title: "Configuración - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  const [whatsappTemplate, weddingDate, coupleNames, venueName, maxCapacity] = await Promise.all([
    getSetting(db, "whatsapp_template"),
    getSetting(db, "wedding_date"),
    getSetting(db, "couple_names"),
    getSetting(db, "venue_name"),
    getSetting(db, "max_capacity"),
  ]);

  // Obtener estado de capacidad si está configurado
  const capacityStatus = await getCapacityStatus(db);

  const appUrl = env.APP_URL || "http://localhost:5173";

  return {
    whatsappTemplate: whatsappTemplate || "",
    weddingDate: weddingDate || "",
    coupleNames: coupleNames || "",
    venueName: venueName || "",
    maxCapacity: maxCapacity || "",
    capacityStatus,
    appUrl,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "whatsapp") {
    const template = formData.get("whatsappTemplate") as string;
    await setSetting(db, "whatsapp_template", template);
    return { success: "Plantilla de WhatsApp actualizada", section: "whatsapp" };
  }

  if (intent === "event") {
    const weddingDate = formData.get("weddingDate") as string;
    const coupleNames = formData.get("coupleNames") as string;
    const venueName = formData.get("venueName") as string;

    await Promise.all([
      setSetting(db, "wedding_date", weddingDate),
      setSetting(db, "couple_names", coupleNames),
      setSetting(db, "venue_name", venueName),
    ]);

    return { success: "Información del evento actualizada", section: "event" };
  }

  if (intent === "capacity") {
    const maxCapacityStr = formData.get("maxCapacity") as string;

    // Si está vacío, eliminar el límite
    if (!maxCapacityStr || maxCapacityStr.trim() === "") {
      await setSetting(db, "max_capacity", "");
      return { success: "Límite de capacidad desactivado", section: "capacity" };
    }

    const maxCapacity = parseInt(maxCapacityStr, 10);

    if (isNaN(maxCapacity) || maxCapacity <= 0) {
      return { error: "La capacidad debe ser un número positivo", section: "capacity" };
    }

    // Validar que no sea menor que la capacidad actual ocupada
    const capacityStatus = await getCapacityStatus(db);
    if (capacityStatus && capacityStatus.totalOccupied > maxCapacity) {
      return {
        error: `No puedes establecer una capacidad menor a la ocupación actual (${capacityStatus.totalOccupied} pases ocupados)`,
        section: "capacity",
      };
    }

    await setSetting(db, "max_capacity", maxCapacity.toString());
    return { success: "Capacidad máxima actualizada", section: "capacity" };
  }

  if (intent === "password") {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: "Todos los campos son requeridos", section: "password" };
    }

    if (newPassword !== confirmPassword) {
      return { error: "Las contraseñas no coinciden", section: "password" };
    }

    if (newPassword.length < 6) {
      return { error: "La contraseña debe tener al menos 6 caracteres", section: "password" };
    }

    // Verificar contraseña actual
    const user = await db
      .prepare("SELECT password_hash FROM admin_users WHERE id = 1")
      .first<{ password_hash: string }>();

    if (!user) {
      return { error: "Usuario no encontrado", section: "password" };
    }

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return { error: "Contraseña actual incorrecta", section: "password" };
    }

    // Actualizar contraseña
    const newHash = await hashPassword(newPassword);
    await db
      .prepare("UPDATE admin_users SET password_hash = ? WHERE id = 1")
      .bind(newHash)
      .run();

    return { success: "Contraseña actualizada correctamente", section: "password" };
  }

  return null;
}

export default function SettingsPage() {
  const { whatsappTemplate, weddingDate, coupleNames, venueName, maxCapacity, capacityStatus, appUrl } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Configuración</h1>
        <p className="admin-page-subtitle">
          Personaliza las opciones del panel de administración
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plantilla de WhatsApp */}
        <div className="admin-card p-6">
          <h2 className="admin-section-title mb-4">Plantilla de WhatsApp</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="whatsapp" />

            {actionData?.section === "whatsapp" && actionData?.success && (
              <div className="admin-alert-success">{actionData.success}</div>
            )}

            <div>
              <label htmlFor="whatsappTemplate" className="admin-label">
                Mensaje
              </label>
              <textarea
                id="whatsappTemplate"
                name="whatsappTemplate"
                rows={10}
                defaultValue={whatsappTemplate}
                className="admin-textarea font-mono text-sm"
              />
              <div className="mt-3 p-3 bg-[var(--admin-surface-elevated)] rounded-lg border border-[var(--admin-border)]">
                <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-2">
                  Variables disponibles:
                </p>
                <ul className="text-xs text-[var(--admin-text-secondary)] space-y-1">
                  <li>
                    <code className="admin-code">{"{nombre}"}</code> - Nombre del
                    invitado
                  </li>
                  <li>
                    <code className="admin-code">{"{enlace}"}</code> - Enlace de
                    invitación
                  </li>
                  <li>
                    <code className="admin-code">{"{novios}"}</code> - Nombres de
                    los novios
                  </li>
                  <li>
                    <code className="admin-code">{"{fecha}"}</code> - Fecha del
                    evento
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary w-full"
            >
              {isSubmitting ? "Guardando..." : "Guardar Plantilla"}
            </button>
          </Form>
        </div>

        {/* Información del evento */}
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Información del Evento</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="event" />

              {actionData?.section === "event" && actionData?.success && (
                <div className="admin-alert-success">{actionData.success}</div>
              )}

              <div>
                <label htmlFor="coupleNames" className="admin-label">
                  Nombres de los novios
                </label>
                <input
                  type="text"
                  id="coupleNames"
                  name="coupleNames"
                  defaultValue={coupleNames}
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="weddingDate" className="admin-label">
                  Fecha del evento
                </label>
                <input
                  type="text"
                  id="weddingDate"
                  name="weddingDate"
                  defaultValue={weddingDate}
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="venueName" className="admin-label">
                  Nombre del lugar
                </label>
                <input
                  type="text"
                  id="venueName"
                  name="venueName"
                  defaultValue={venueName}
                  className="admin-input"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary w-full"
              >
                {isSubmitting ? "Guardando..." : "Guardar Información"}
              </button>
            </Form>
          </div>

          {/* Capacidad del Evento */}
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Capacidad del Evento</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="capacity" />

              {actionData?.section === "capacity" && actionData?.error && (
                <div className="admin-alert-error">{actionData.error}</div>
              )}
              {actionData?.section === "capacity" && actionData?.success && (
                <div className="admin-alert-success">{actionData.success}</div>
              )}

              <div>
                <label htmlFor="maxCapacity" className="admin-label">
                  Capacidad máxima (pases totales)
                </label>
                <input
                  type="number"
                  id="maxCapacity"
                  name="maxCapacity"
                  min="0"
                  defaultValue={maxCapacity}
                  placeholder="Dejar vacío para sin límite"
                  className="admin-input"
                />
                <p className="admin-help-text">
                  Límite total de invitados que pueden asistir al evento. Incluye confirmados, pendientes y pases en pool.
                </p>
              </div>

              {capacityStatus && (
                <div className="p-4 bg-[var(--admin-surface-elevated)] rounded-lg border border-[var(--admin-border)]">
                  <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-2">
                    Ocupación actual:
                  </p>
                  <p className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">
                    {capacityStatus.totalOccupied} pases ocupados
                  </p>
                  <p className="text-xs text-[var(--admin-text-secondary)]">
                    {capacityStatus.confirmed} confirmados • {capacityStatus.pending} pendientes • {capacityStatus.poolAvailable} en pool
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary w-full"
              >
                {isSubmitting ? "Guardando..." : "Guardar Capacidad"}
              </button>
            </Form>
          </div>

          {/* Cambiar contraseña */}
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Cambiar Contraseña</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="password" />

              {actionData?.section === "password" && actionData?.error && (
                <div className="admin-alert-error">{actionData.error}</div>
              )}
              {actionData?.section === "password" && actionData?.success && (
                <div className="admin-alert-success">{actionData.success}</div>
              )}

              <div>
                <label htmlFor="currentPassword" className="admin-label">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="admin-label">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="admin-label">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="admin-input"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary w-full"
              >
                {isSubmitting ? "Actualizando..." : "Cambiar Contraseña"}
              </button>
            </Form>
          </div>

          {/* URL de la aplicación */}
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">URL de la Aplicación</h2>
            <div className="admin-code-block break-all">
              {appUrl}
            </div>
            <p className="admin-help-text mt-3">
              Esta URL se usa para generar los enlaces de invitación. Se configura en las variables de entorno de Cloudflare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
