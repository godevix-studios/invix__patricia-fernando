import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import {
  verifyCredentials,
  createSessionCookie,
  getSessionFromCookie,
} from "~/lib/auth.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta() {
  return [{ title: "Login - Panel de Administración" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // Si ya tiene sesión válida, redirigir al dashboard
  const session = getSessionFromCookie(request.headers.get("Cookie"));
  
  if (session) {
    // Verificar que el usuario existe en la base de datos
    const { env } = getCloudflareContext(context);
    const db = env.DB;
    const user = await db
      .prepare("SELECT id FROM admin_users WHERE id = ?")
      .bind(session.userId)
      .first();
    
    if (user) {
      return redirect("/admin");
    }
  }
  
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Usuario y contraseña son requeridos" };
  }

  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const user = await verifyCredentials(db, username, password);

  if (!user) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  return redirect("/admin", {
    headers: {
      "Set-Cookie": createSessionCookie(user.id),
    },
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="admin-theme min-h-screen flex items-center justify-center p-4">
      <div className="admin-card-elevated w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="admin-logo text-4xl mb-2">P&F</h1>
          <h2 className="text-xl text-[var(--content-primary)]">Panel de Administración</h2>
          <p className="text-[var(--content-tertiary)] text-sm mt-1">
            Patricia & Fernando - Invitaciones
          </p>
        </div>

        <Form method="post" className="space-y-6">
          {actionData?.error && (
            <div className="admin-alert admin-alert-error">
              {actionData.error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="admin-label">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoComplete="username"
              className="admin-input"
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="admin-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="admin-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="admin-btn admin-btn-primary w-full large"
          >
            {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </Form>

        <p className="mt-6 text-center text-xs text-[var(--content-tertiary)]">
          Usuario inicial: <span className="admin-mono">admin</span> / <span className="admin-mono">admin123</span>
        </p>
      </div>
    </div>
  );
}
