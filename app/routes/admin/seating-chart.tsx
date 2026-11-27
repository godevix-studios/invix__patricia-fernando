import { useLoaderData, useFetcher } from "react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import type { Route } from "./+types/seating-chart";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import {
  getTablesWithPositions,
  assignGuestToTable,
  removeGuestAssignment,
  updateTablePosition,
  type TableWithPosition,
  type GuestGroupWithAssignments,
} from "~/lib/db.server";

export function meta() {
  return [{ title: "Distribución de Mesas - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Obtener todas las mesas con posiciones y ocupación
  const tables = await getTablesWithPositions(db);

  // Obtener todos los grupos con sus invitados y estado de asignación
  const groupsResult = await db
    .prepare(
      `SELECT 
        gg.id,
        gg.token,
        gg.name,
        gg.group_name,
        gg.phone,
        gg.max_guests,
        gg.table_id,
        gg.status,
        gg.confirmed_count,
        gg.notes,
        gg.created_at,
        gg.confirmed_at,
        t.name as group_table_name,
        json_group_array(
          json_object(
            'id', g.id,
            'name', g.name,
            'group_id', g.group_id,
            'is_representative', g.is_representative,
            'confirmed', g.confirmed,
            'created_at', g.created_at,
            'assigned_table_id', COALESCE(gta.table_id, gg.table_id),
            'assigned_table_name', COALESCE(t2.name, t.name)
          )
        ) as guests_json
      FROM guest_groups gg
      LEFT JOIN tables t ON t.id = gg.table_id
      LEFT JOIN guests g ON g.group_id = gg.id
      LEFT JOIN guest_table_assignments gta ON gta.guest_id = g.id
      LEFT JOIN tables t2 ON t2.id = gta.table_id
      GROUP BY gg.id
      ORDER BY gg.created_at DESC`
    )
    .all<GuestGroupWithAssignments & { guests_json: string }>();

  // Parsear JSON de invitados
  const groups = (groupsResult.results || []).map((group) => {
    const guests = JSON.parse(group.guests_json).filter((g: any) => g.id !== null);
    return {
      ...group,
      guests,
    };
  });

  // Calcular resumen de asignaciones
  let totalGuests = 0;
  let assignedGuests = 0;
  let unassignedGroups = 0;
  let partiallyAssignedGroups = 0;

  groups.forEach((group) => {
    totalGuests += group.guests.length;
    
    const assignedCount = group.guests.filter((g: any) => g.assigned_table_id !== null).length;
    assignedGuests += assignedCount;

    if (assignedCount === 0) {
      unassignedGroups++;
    } else if (assignedCount < group.guests.length) {
      partiallyAssignedGroups++;
    }
  });

  const summary = {
    totalGuests,
    assignedGuests,
    unassignedGuests: totalGuests - assignedGuests,
    unassignedGroups,
    partiallyAssignedGroups,
    totalGroups: groups.length,
  };

  return {
    tables,
    groups,
    summary,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    if (intent === "assign-guest") {
      const guestId = parseInt(formData.get("guestId") as string, 10);
      const tableId = parseInt(formData.get("tableId") as string, 10);

      if (isNaN(guestId) || isNaN(tableId)) {
        return { error: "IDs inválidos" };
      }

      // Verificar capacidad de la mesa
      const tableInfo = await db
        .prepare(
          `SELECT 
            t.capacity,
            COUNT(DISTINCT CASE 
              WHEN gta.guest_id IS NOT NULL THEN gta.guest_id
              WHEN gg.table_id = t.id AND gg.status = 'confirmed' THEN g.id
              ELSE NULL
            END) as current_occupancy
          FROM tables t
          LEFT JOIN guest_table_assignments gta ON gta.table_id = t.id
          LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.status = 'confirmed'
          LEFT JOIN guests g ON g.group_id = gg.id AND g.id != ?
          WHERE t.id = ?
          GROUP BY t.id`
        )
        .bind(guestId, tableId)
        .first<{ capacity: number; current_occupancy: number }>();

      if (!tableInfo) {
        return { error: "Mesa no encontrada" };
      }

      if (tableInfo.current_occupancy >= tableInfo.capacity) {
        return { error: "La mesa está llena" };
      }

      await assignGuestToTable(db, guestId, tableId);
      return { success: true };
    }

    if (intent === "assign-group") {
      const groupId = parseInt(formData.get("groupId") as string, 10);
      const tableId = parseInt(formData.get("tableId") as string, 10);

      if (isNaN(groupId) || isNaN(tableId)) {
        return { error: "IDs inválidos" };
      }

      // Obtener invitados del grupo
      const guestsResult = await db
        .prepare("SELECT id FROM guests WHERE group_id = ?")
        .bind(groupId)
        .all<{ id: number }>();

      const guests = guestsResult.results || [];

      // Verificar capacidad de la mesa
      const tableInfo = await db
        .prepare(
          `SELECT 
            t.capacity,
            COUNT(DISTINCT CASE 
              WHEN gta.guest_id IS NOT NULL THEN gta.guest_id
              WHEN gg.table_id = t.id AND gg.status = 'confirmed' THEN g.id
              ELSE NULL
            END) as current_occupancy
          FROM tables t
          LEFT JOIN guest_table_assignments gta ON gta.table_id = t.id
          LEFT JOIN guest_groups gg ON gg.table_id = t.id AND gg.status = 'confirmed'
          LEFT JOIN guests g ON g.group_id = gg.id
          WHERE t.id = ?
          GROUP BY t.id`
        )
        .bind(tableId)
        .first<{ capacity: number; current_occupancy: number }>();

      if (!tableInfo) {
        return { error: "Mesa no encontrada" };
      }

      const availableSpace = tableInfo.capacity - tableInfo.current_occupancy;
      if (availableSpace < guests.length) {
        return { error: `La mesa solo tiene ${availableSpace} espacio(s) disponible(s)` };
      }

      // Asignar todos los invitados del grupo
      const statements = guests.map((guest) =>
        db
          .prepare(
            `INSERT INTO guest_table_assignments (guest_id, table_id, updated_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT(guest_id) DO UPDATE SET 
               table_id = excluded.table_id,
               updated_at = datetime('now')`
          )
          .bind(guest.id, tableId)
      );

      await db.batch(statements);
      return { success: true };
    }

    if (intent === "remove-assignment") {
      const guestId = parseInt(formData.get("guestId") as string, 10);

      if (isNaN(guestId)) {
        return { error: "ID inválido" };
      }

      await removeGuestAssignment(db, guestId);
      return { success: true };
    }

    if (intent === "update-position") {
      const tableId = parseInt(formData.get("tableId") as string, 10);
      const x = parseInt(formData.get("x") as string, 10);
      const y = parseInt(formData.get("y") as string, 10);

      if (isNaN(tableId) || isNaN(x) || isNaN(y)) {
        return { error: "Datos inválidos" };
      }

      await updateTablePosition(db, tableId, x, y);
      return { success: true };
    }

    if (intent === "auto-arrange") {
      // Obtener todas las mesas
      const tablesResult = await db
        .prepare("SELECT id FROM tables ORDER BY id ASC")
        .all<{ id: number }>();

      const tables = tablesResult.results || [];

      // Configuración del grid
      const PADDING = 50; // Padding desde el borde
      const TABLE_WIDTH = 200;
      const TABLE_HEIGHT = 180;
      const GAP_X = 50; // Espacio horizontal entre mesas
      const GAP_Y = 80; // Espacio vertical entre mesas (más grande para mejor separación)
      const COLS = 3; // 3 columnas para un canvas de 1000px de ancho

      // Calcular posiciones en grid
      const statements = tables.map((table, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        
        const x = PADDING + col * (TABLE_WIDTH + GAP_X);
        const y = PADDING + row * (TABLE_HEIGHT + GAP_Y);

        return db
          .prepare(
            `UPDATE tables 
             SET position_x = ?, position_y = ?
             WHERE id = ?`
          )
          .bind(x, y, table.id);
      });

      await db.batch(statements);
      return { success: true, message: "Mesas ordenadas automáticamente" };
    }

    return { error: "Intent no reconocido" };
  } catch (error) {
    console.error("Error in seating-chart action:", error);
    return { error: "Error al procesar la solicitud" };
  }
}

// Lazy load de componentes para evitar SSR
const SeatingCanvas = lazy(() => import("~/components/seating/seating-canvas"));

export default function SeatingChartPage() {
  const initialData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  
  // Estado optimista - inicia con datos del loader
  const [optimisticData, setOptimisticData] = useState(initialData);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Actualizar datos optimistas cuando cambia el loader (después de revalidación)
  useEffect(() => {
    setOptimisticData(initialData);
  }, [initialData]);

  // Mostrar toast cuando hay respuesta del fetcher
  useEffect(() => {
    if (fetcher.data) {
      if ("error" in fetcher.data) {
        setToast({ message: fetcher.data.error, type: "error" });
      } else if ("success" in fetcher.data) {
        setToast({ message: "✓ Asignación guardada", type: "success" });
      }

      // Auto-hide toast después de 3 segundos
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  const handleAssignGuest = (guestId: number, tableId: number) => {
    // Actualización optimista
    setOptimisticData((prev) => {
      const newGroups = prev.groups.map((group) => ({
        ...group,
        guests: group.guests.map((guest: any) =>
          guest.id === guestId
            ? {
                ...guest,
                assigned_table_id: tableId,
                assigned_table_name:
                  prev.tables.find((t) => t.id === tableId)?.name || null,
              }
            : guest
        ),
      }));

      return { ...prev, groups: newGroups };
    });

    // Enviar al servidor
    const formData = new FormData();
    formData.append("intent", "assign-guest");
    formData.append("guestId", guestId.toString());
    formData.append("tableId", tableId.toString());
    fetcher.submit(formData, { method: "post" });
  };

  const handleAssignGroup = (groupId: number, tableId: number) => {
    // Actualización optimista
    setOptimisticData((prev) => {
      const tableName = prev.tables.find((t) => t.id === tableId)?.name || null;
      const newGroups = prev.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              guests: group.guests.map((guest: any) => ({
                ...guest,
                assigned_table_id: tableId,
                assigned_table_name: tableName,
              })),
            }
          : group
      );

      return { ...prev, groups: newGroups };
    });

    // Enviar al servidor
    const formData = new FormData();
    formData.append("intent", "assign-group");
    formData.append("groupId", groupId.toString());
    formData.append("tableId", tableId.toString());
    fetcher.submit(formData, { method: "post" });
  };

  const handleUpdatePosition = (tableId: number, x: number, y: number) => {
    // Actualización optimista
    setOptimisticData((prev) => {
      const newTables = prev.tables.map((table) =>
        table.id === tableId ? { ...table, position_x: x, position_y: y } : table
      );

      return { ...prev, tables: newTables };
    });

    // Enviar al servidor (sin revalidación para evitar flicker)
    const formData = new FormData();
    formData.append("intent", "update-position");
    formData.append("tableId", tableId.toString());
    formData.append("x", x.toString());
    formData.append("y", y.toString());
    fetcher.submit(formData, { method: "post", navigate: false });
  };

  const handleAutoArrange = () => {
    // Enviar al servidor para reordenar
    const formData = new FormData();
    formData.append("intent", "auto-arrange");
    fetcher.submit(formData, { method: "post" });
    
    // Mostrar feedback
    setToast({ message: "Ordenando mesas...", type: "success" });
  };

  // Usar datos optimistas para renderizar
  const { tables, groups, summary } = optimisticData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="admin-page-title">Distribución de Mesas</h1>
        <p className="admin-page-subtitle">
          Arrastra invitados y grupos a las mesas del canvas
        </p>
      </div>

      {/* Summary */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-[var(--admin-text-secondary)]">Invitados: </span>
            <span className="font-medium text-[var(--admin-text-primary)]">
              {summary.assignedGuests} / {summary.totalGuests} asignados
            </span>
          </div>
          <span className="text-[var(--admin-text-muted)]">•</span>
          <div>
            <span className="text-[var(--admin-text-secondary)]">Grupos: </span>
            <span className="font-medium text-[var(--admin-text-primary)]">
              {summary.totalGroups} total
            </span>
          </div>
          <span className="text-[var(--admin-text-muted)]">•</span>
          <div>
            <span className="text-[var(--admin-text-secondary)]">Sin asignar: </span>
            <span className="font-medium text-[var(--admin-status-pending)]">
              {summary.unassignedGroups} grupos
            </span>
          </div>
          {summary.partiallyAssignedGroups > 0 && (
            <>
              <span className="text-[var(--admin-text-muted)]">•</span>
              <div>
                <span className="text-[var(--admin-text-secondary)]">Parcial: </span>
                <span className="font-medium text-[var(--admin-status-pending)]">
                  {summary.partiallyAssignedGroups} grupos
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Layout - wrapped in Suspense */}
      <Suspense
        fallback={
          <div className="flex gap-6">
            <div className="w-[360px] admin-card p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-[var(--admin-surface-elevated)] rounded" />
                <div className="h-64 bg-[var(--admin-surface-elevated)] rounded" />
              </div>
            </div>
            <div className="flex-1 admin-card p-6">
              <div className="animate-pulse">
                <div className="h-[600px] bg-[var(--admin-surface-elevated)] rounded" />
              </div>
            </div>
          </div>
        }
      >
        <SeatingCanvas
          tables={tables}
          groups={groups}
          onAssignGuest={handleAssignGuest}
          onAssignGroup={handleAssignGroup}
          onUpdatePosition={handleUpdatePosition}
          onAutoArrange={handleAutoArrange}
        />
      </Suspense>

      {/* Toast de feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg border z-50 animate-slide-up ${
            toast.type === "success"
              ? "bg-[var(--admin-status-confirmed)] bg-opacity-20 border-[var(--admin-status-confirmed)] text-[var(--admin-status-confirmed)]"
              : "bg-[var(--admin-status-declined)] bg-opacity-20 border-[var(--admin-status-declined)] text-[var(--admin-status-declined)]"
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
