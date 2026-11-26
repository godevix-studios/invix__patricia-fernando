import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/tables-new";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta() {
  return [{ title: "Nueva Mesa - Panel de Administración" }];
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

  await db
    .prepare("INSERT INTO tables (name, capacity) VALUES (?, ?)")
    .bind(name.trim(), capacity)
    .run();

  return redirect("/admin/tables");
}

export default function NewTablePage() {
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
              defaultValue="10"
              className="admin-input"
            />
            <p className="admin-help-text">
              Número máximo de personas que pueden sentarse en esta mesa.
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
