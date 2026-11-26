import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/users";
import { requireAuth, hashPassword } from "~/lib/auth.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { IconUsers, IconShield, IconTrash, IconKey } from "~/components/admin-icons";

export function meta() {
  return [{ title: "Usuarios - Panel de Administración" }];
}

interface AdminUser {
  id: number;
  username: string;
  is_superadmin: number;
  created_at: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const user = await requireAuth(request, db);

  // Solo superadmin puede ver esta página
  if (!user.is_superadmin) {
    throw new Response("No autorizado", { status: 403 });
  }

  const usersResult = await db
    .prepare("SELECT id, username, is_superadmin, created_at FROM admin_users ORDER BY created_at")
    .all<AdminUser>();

  return Response.json(
    { currentUser: user, users: usersResult.results },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const user = await requireAuth(request, db);

  // Solo superadmin puede realizar acciones
  if (!user.is_superadmin) {
    return { error: "No autorizado" };
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const username = (formData.get("username") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!username || username.length < 3) {
      return { error: "El nombre de usuario debe tener al menos 3 caracteres" };
    }

    if (!password || password.length < 6) {
      return { error: "La contraseña debe tener al menos 6 caracteres" };
    }

    if (password !== confirmPassword) {
      return { error: "Las contraseñas no coinciden" };
    }

    // Verificar si el usuario ya existe
    const existing = await db
      .prepare("SELECT id FROM admin_users WHERE username = ?")
      .bind(username)
      .first();

    if (existing) {
      return { error: "Ya existe un usuario con ese nombre" };
    }

    const passwordHash = await hashPassword(password);

    await db
      .prepare("INSERT INTO admin_users (username, password_hash, is_superadmin) VALUES (?, ?, 0)")
      .bind(username, passwordHash)
      .run();

    return { success: `Usuario "${username}" creado correctamente` };
  }

  if (intent === "reset-password") {
    const userId = parseInt(formData.get("userId") as string, 10);
    const newPassword = formData.get("newPassword") as string;
    const confirmNewPassword = formData.get("confirmNewPassword") as string;

    if (!newPassword || newPassword.length < 6) {
      return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
    }

    if (newPassword !== confirmNewPassword) {
      return { error: "Las contraseñas no coinciden" };
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, userId)
      .run();

    return { success: "Contraseña actualizada correctamente" };
  }

  if (intent === "delete") {
    const userId = parseInt(formData.get("userId") as string, 10);

    // No permitir eliminar al superadmin actual
    if (userId === user.id) {
      return { error: "No puedes eliminarte a ti mismo" };
    }

    // No permitir eliminar otros superadmins
    const targetUser = await db
      .prepare("SELECT is_superadmin FROM admin_users WHERE id = ?")
      .bind(userId)
      .first<{ is_superadmin: number }>();

    if (targetUser?.is_superadmin) {
      return { error: "No puedes eliminar a otro superadministrador" };
    }

    await db
      .prepare("DELETE FROM admin_users WHERE id = ?")
      .bind(userId)
      .run();

    return { success: "Usuario eliminado correctamente" };
  }

  return { error: "Acción no válida" };
}

export default function UsersPage() {
  const { currentUser, users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Gestión de Usuarios</h1>
        <p className="admin-page-subtitle">
          Administra los usuarios que pueden acceder al panel
        </p>
      </div>

      {actionData?.error && (
        <div className="admin-alert-error">{actionData.error}</div>
      )}
      {actionData?.success && (
        <div className="admin-alert-success">{actionData.success}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Crear nuevo usuario */}
        <div className="admin-card p-6">
          <h2 className="admin-section-title flex items-center gap-2 mb-4">
            <IconUsers size={20} />
            Crear nuevo usuario
          </h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />
            
            <div>
              <label htmlFor="username" className="admin-label">
                Nombre de usuario *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                minLength={3}
                placeholder="Ej: coordinador"
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="admin-label">
                Contraseña *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="admin-label">
                Confirmar contraseña *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="Repite la contraseña"
                className="admin-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary w-full"
            >
              {isSubmitting ? "Creando..." : "Crear Usuario"}
            </button>
          </Form>
        </div>

        {/* Resetear contraseña */}
        <div className="admin-card p-6">
          <h2 className="admin-section-title flex items-center gap-2 mb-4">
            <IconKey size={20} />
            Resetear contraseña
          </h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="reset-password" />
            
            <div>
              <label htmlFor="userId" className="admin-label">
                Usuario *
              </label>
              <select
                id="userId"
                name="userId"
                required
                className="admin-select"
              >
                <option value="">Selecciona un usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} {u.is_superadmin ? "(admin)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="newPassword" className="admin-label">
                Nueva contraseña *
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="admin-label">
                Confirmar nueva contraseña *
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                required
                minLength={6}
                placeholder="Repite la contraseña"
                className="admin-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary w-full"
            >
              {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </Form>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="admin-card">
        <div className="p-4 border-b border-[var(--admin-border)]">
          <h2 className="admin-section-title">Usuarios registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Creado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="font-medium text-[var(--admin-text-primary)]">
                      {u.username}
                    </span>
                    {u.id === currentUser.id && (
                      <span className="ml-2 text-xs text-[var(--admin-text-muted)]">(tú)</span>
                    )}
                  </td>
                  <td>
                    {u.is_superadmin ? (
                      <span className="admin-chip-premium flex items-center gap-1 w-fit">
                        <IconShield size={12} />
                        Superadmin
                      </span>
                    ) : (
                      <span className="admin-chip-pending">Usuario</span>
                    )}
                  </td>
                  <td className="text-[var(--admin-text-secondary)]">
                    {new Date(u.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td>
                    {!u.is_superadmin && u.id !== currentUser.id && (
                      <Form method="post" className="inline">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="userId" value={u.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) {
                              e.preventDefault();
                            }
                          }}
                          className="admin-btn-ghost text-[var(--admin-status-declined)] p-2"
                          title="Eliminar usuario"
                        >
                          <IconTrash size={16} />
                        </button>
                      </Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
