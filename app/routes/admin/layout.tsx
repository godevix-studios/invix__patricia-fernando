import { Link, NavLink, Outlet, redirect, useLoaderData, Form } from "react-router";
import type { Route } from "./+types/layout";
import { requireAuth, createLogoutCookie } from "~/lib/auth.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import {
  IconDashboard,
  IconUsers,
  IconTable,
  IconTicket,
  IconSettings,
  IconLogout,
  IconLink,
  IconShield,
  IconGrid,
} from "~/components/admin-icons";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const user = await requireAuth(request, db);
  
  // Prevenir cache para rutas autenticadas
  return Response.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}

export async function action({ request }: Route.ActionArgs) {
  // Logout action - redirigir con headers para limpiar cookie y evitar cache
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin/login",
      "Set-Cookie": createLogoutCookie(),
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}

const navItems = [
  { to: "/admin", label: "Dashboard", Icon: IconDashboard, end: true },
  { to: "/admin/guests", label: "Invitados", Icon: IconUsers },
  { to: "/admin/tables", label: "Mesas", Icon: IconTable },
  { to: "/admin/seating-chart", label: "Distribución", Icon: IconGrid },
  { to: "/admin/pool", label: "Pool de Pases", Icon: IconTicket },
  { to: "/admin/settings", label: "Configuración", Icon: IconSettings },
];

const superadminNavItems = [
  { to: "/admin/users", label: "Usuarios", Icon: IconShield },
];

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="admin-theme">
      {/* Header */}
      <header className="admin-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="admin-logo">
                P&F
              </Link>
              <span className="hidden sm:inline text-[var(--content-tertiary)] text-sm">
                Panel de Invitaciones
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--content-secondary)]">
                Hola, <span className="text-[var(--gold)] font-medium">{user.username}</span>
              </span>
              <Form method="post" reloadDocument>
                <button
                  type="submit"
                  className="admin-btn admin-btn-ghost text-sm flex items-center gap-2"
                  style={{ minHeight: '32px', padding: '4px 12px' }}
                >
                  <IconLogout size={16} />
                  Cerrar sesión
                </button>
              </Form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="admin-sidebar">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `admin-nav-item ${isActive ? "active" : ""}`
                      }
                    >
                      <item.Icon size={18} className="flex-shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/* Enlaces solo para superadmin */}
              {user.is_superadmin === 1 && (
                <>
                  <hr className="admin-divider" />
                  <ul className="space-y-1">
                    {superadminNavItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `admin-nav-item ${isActive ? "active" : ""}`
                          }
                        >
                          <item.Icon size={18} className="flex-shrink-0" />
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <hr className="admin-divider" />

              <Link
                to="/"
                target="_blank"
                className="admin-nav-item text-sm"
              >
                <IconLink size={18} className="flex-shrink-0" />
                Ver invitación
              </Link>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
