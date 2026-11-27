import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
  // Invitación pública (sin personalización)
  index("routes/home.tsx"),
  
  // Invitación personalizada con token
  route("i/:token", "routes/invitation.tsx"),
  
  // Página de confirmación
  route("confirmar/:token", "routes/confirm.tsx"),
  
  // Panel de administración
  ...prefix("admin", [
    route("login", "routes/admin/login.tsx"),
    layout("routes/admin/layout.tsx", [
      index("routes/admin/dashboard.tsx"),
      route("tables", "routes/admin/tables.tsx"),
      route("tables/new", "routes/admin/tables-new.tsx"),
      route("tables/bulk", "routes/admin/tables-bulk.tsx"),
      route("tables/:id", "routes/admin/tables-edit.tsx"),
      route("guests", "routes/admin/guests.tsx"),
      route("guests/new", "routes/admin/guests-new.tsx"),
      route("guests/:id", "routes/admin/guests-edit.tsx"),
      route("seating-chart", "routes/admin/seating-chart.tsx"),
      route("pool", "routes/admin/pool.tsx"),
      route("settings", "routes/admin/settings.tsx"),
      route("users", "routes/admin/users.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
