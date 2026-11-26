import { useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/guests-new";
import { generateToken, type Table } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta() {
  return [{ title: "Nuevo Invitado - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Obtener mesas disponibles
  const tablesResult = await db
    .prepare(
      `SELECT 
        t.id,
        t.name,
        t.capacity,
        COALESCE(SUM(CASE WHEN gg.status = 'confirmed' THEN gg.confirmed_count ELSE 0 END), 0) as current_occupancy
      FROM tables t
      LEFT JOIN guest_groups gg ON gg.table_id = t.id
      GROUP BY t.id
      ORDER BY t.name`
    )
    .all<Table & { current_occupancy: number }>();

  return { tables: tablesResult.results };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const groupName = formData.get("groupName") as string;
  const phone = formData.get("phone") as string;
  const maxGuests = parseInt(formData.get("maxGuests") as string, 10);
  const tableId = formData.get("tableId") as string;
  const notes = formData.get("notes") as string;
  const memberNames = formData.getAll("memberName") as string[];

  if (!name || name.trim() === "") {
    return { error: "El nombre es requerido" };
  }

  if (isNaN(maxGuests) || maxGuests < 1) {
    return { error: "El número de pases debe ser al menos 1" };
  }

  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Generar token único
  let token = generateToken();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db
      .prepare("SELECT id FROM guest_groups WHERE token = ?")
      .bind(token)
      .first();
    if (!existing) break;
    token = generateToken();
    attempts++;
  }

  // Verificar capacidad de la mesa si se seleccionó una
  if (tableId) {
    const table = await db
      .prepare(
        `SELECT 
          t.capacity,
          COALESCE(SUM(CASE WHEN gg.status = 'confirmed' THEN gg.confirmed_count ELSE gg.max_guests END), 0) as current_occupancy
        FROM tables t
        LEFT JOIN guest_groups gg ON gg.table_id = t.id
        WHERE t.id = ?
        GROUP BY t.id`
      )
      .bind(parseInt(tableId, 10))
      .first<{ capacity: number; current_occupancy: number }>();

    if (table && table.current_occupancy + maxGuests > table.capacity) {
      return {
        error: `La mesa seleccionada no tiene suficiente capacidad (disponible: ${table.capacity - table.current_occupancy})`,
      };
    }
  }

  // Crear el grupo
  const result = await db
    .prepare(
      `INSERT INTO guest_groups (token, name, group_name, phone, max_guests, table_id, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      token,
      name.trim(),
      groupName?.trim() || null,
      phone?.trim() || null,
      maxGuests,
      tableId ? parseInt(tableId, 10) : null,
      notes?.trim() || null
    )
    .run();

  const groupId = result.meta.last_row_id;

  // Crear el representante como primer miembro
  await db
    .prepare(
      `INSERT INTO guests (group_id, name, is_representative) VALUES (?, ?, 1)`
    )
    .bind(groupId, name.trim())
    .run();

  // Crear miembros adicionales si se proporcionaron nombres
  for (const memberName of memberNames) {
    if (memberName && memberName.trim()) {
      await db
        .prepare(
          `INSERT INTO guests (group_id, name, is_representative) VALUES (?, ?, 0)`
        )
        .bind(groupId, memberName.trim())
        .run();
    }
  }

  return redirect("/admin/guests");
}

export default function NewGuestPage() {
  const { tables } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [maxGuests, setMaxGuests] = useState(1);
  const [memberNames, setMemberNames] = useState<string[]>([]);

  // Ajustar el array de nombres cuando cambia maxGuests
  const handleMaxGuestsChange = (value: number) => {
    setMaxGuests(value);
    // Ajustar el array de miembros (menos 1 porque el representante ya cuenta)
    const newLength = Math.max(0, value - 1);
    setMemberNames((prev) => {
      if (prev.length < newLength) {
        return [...prev, ...Array(newLength - prev.length).fill("")];
      }
      return prev.slice(0, newLength);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/guests" className="admin-back-link">
          ← Volver a invitados
        </Link>
        <h1 className="admin-page-title mt-2">Nuevo Invitado</h1>
        <p className="admin-page-subtitle">
          Registra un invitado individual o un grupo
        </p>
      </div>

      <div className="admin-card p-6 max-w-2xl">
        <Form method="post" className="space-y-6">
          {actionData?.error && (
            <div className="admin-alert-error">{actionData.error}</div>
          )}

          {/* Información del representante */}
          <div className="space-y-4">
            <h2 className="admin-section-title">
              Información del invitado / representante
            </h2>

            <div>
              <label htmlFor="name" className="admin-label">
                Nombre completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="Ej: Juan Pérez García"
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
                placeholder="Ej: +52 618 123 4567"
                className="admin-input"
              />
              <p className="admin-help-text">
                Se usará para enviar la invitación por WhatsApp
              </p>
            </div>
          </div>

          {/* Pases */}
          <div className="admin-section">
            <h2 className="admin-section-title">Pases de invitación</h2>

            <div>
              <label htmlFor="maxGuests" className="admin-label">
                Número de pases *
              </label>
              <input
                type="number"
                id="maxGuests"
                name="maxGuests"
                required
                min="1"
                max="20"
                value={maxGuests}
                onChange={(e) =>
                  handleMaxGuestsChange(parseInt(e.target.value, 10) || 1)
                }
                className="admin-input"
              />
              <p className="admin-help-text">
                Máximo de personas que pueden asistir con esta invitación
              </p>
            </div>

            {/* Nombres de miembros adicionales */}
            {maxGuests > 1 && (
              <div className="space-y-3 mt-4">
                <p className="text-sm text-[var(--admin-text-secondary)]">
                  Nombres de los acompañantes (opcional):
                </p>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Si los dejas vacíos, el representante podrá completarlos al
                  confirmar
                </p>
                {memberNames.map((name, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      name="memberName"
                      placeholder={`Acompañante ${index + 1}`}
                      value={name}
                      onChange={(e) => {
                        const newNames = [...memberNames];
                        newNames[index] = e.target.value;
                        setMemberNames(newNames);
                      }}
                      className="admin-input text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mesa */}
          <div className="admin-section">
            <h2 className="admin-section-title">Asignación de mesa</h2>

            <div>
              <label htmlFor="tableId" className="admin-label">
                Mesa (opcional)
              </label>
              <select id="tableId" name="tableId" className="admin-select">
                <option value="">Sin asignar</option>
                {tables.map((table) => {
                  const available = table.capacity - table.current_occupancy;
                  const disabled = available < maxGuests;
                  return (
                    <option
                      key={table.id}
                      value={table.id}
                      disabled={disabled}
                    >
                      {table.name} ({available} lugares disponibles)
                      {disabled && " - Sin espacio"}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="admin-section">
            <div>
              <label htmlFor="notes" className="admin-label">
                Notas (opcional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Notas internas sobre este invitado..."
                className="admin-textarea"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary flex-1"
            >
              {isSubmitting ? "Creando..." : "Crear Invitado"}
            </button>
            <Link to="/admin/guests" className="admin-btn-secondary">
              Cancelar
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
