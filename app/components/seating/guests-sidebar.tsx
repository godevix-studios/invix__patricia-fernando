import { useState, useMemo } from "react";
import GuestGroupItem from "./guest-group-item";

interface Guest {
  id: number;
  name: string;
  is_representative: number;
  assigned_table_id: number | null;
  assigned_table_name: string | null;
}

interface GuestGroup {
  id: number;
  name: string;
  group_name: string | null;
  max_guests: number;
  status: string;
  table_id: number | null;
  group_table_name: string | null;
  guests: Guest[];
}

interface GuestsSidebarProps {
  groups: GuestGroup[];
  onAssignmentChange?: () => void;
}

export default function GuestsSidebar({ groups }: GuestsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned" | "confirmed">("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Filtrar y buscar grupos
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Aplicar filtro de estado
    if (filter === "unassigned") {
      result = result.filter((group) => {
        const assignedCount = group.guests.filter((g) => g.assigned_table_name !== null).length;
        return assignedCount === 0;
      });
    } else if (filter === "assigned") {
      result = result.filter((group) => {
        const assignedCount = group.guests.filter((g) => g.assigned_table_name !== null).length;
        return assignedCount > 0;
      });
    } else if (filter === "confirmed") {
      result = result.filter((group) => group.status === "confirmed");
    }

    // Aplicar búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((group) => {
        const groupNameMatch =
          group.name.toLowerCase().includes(query) ||
          group.group_name?.toLowerCase().includes(query);
        const guestMatch = group.guests.some((g) => g.name.toLowerCase().includes(query));
        return groupNameMatch || guestMatch;
      });
    }

    return result;
  }, [groups, filter, searchQuery]);

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.id)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  return (
    <div className="w-full lg:w-[360px] flex-shrink-0 admin-card overflow-hidden flex flex-col" style={{ maxHeight: "780px" }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--admin-border)] flex-shrink-0">
        <h2 className="admin-section-title mb-4">Invitados</h2>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-input text-sm mb-3"
        />

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`admin-filter-btn text-xs ${filter === "all" ? "active" : ""}`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilter("unassigned")}
            className={`admin-filter-btn text-xs ${filter === "unassigned" ? "active" : ""}`}
          >
            Sin asignar
          </button>
          <button
            type="button"
            onClick={() => setFilter("assigned")}
            className={`admin-filter-btn text-xs ${filter === "assigned" ? "active" : ""}`}
          >
            Asignados
          </button>
          <button
            type="button"
            onClick={() => setFilter("confirmed")}
            className={`admin-filter-btn text-xs ${filter === "confirmed" ? "active confirmed" : ""}`}
          >
            Confirmados
          </button>
        </div>

        {/* Botones expandir/colapsar */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-[var(--admin-text-secondary)] hover:text-[var(--gold)] transition-colors"
          >
            Expandir todos
          </button>
          <span className="text-[var(--admin-text-muted)]">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-[var(--admin-text-secondary)] hover:text-[var(--gold)] transition-colors"
          >
            Colapsar todos
          </button>
        </div>
      </div>

      {/* Body - Lista de grupos */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--admin-text-muted)]">
              {searchQuery ? "No se encontraron resultados" : "No hay invitados"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <GuestGroupItem
                key={group.id}
                group={group}
                expanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Stats */}
      <div className="p-4 border-t border-[var(--admin-border)] bg-[var(--admin-surface-elevated)] flex-shrink-0">
        <p className="text-xs text-[var(--admin-text-secondary)]">
          Mostrando <strong className="text-[var(--admin-text-primary)]">{filteredGroups.length}</strong>{" "}
          de {groups.length} grupos
        </p>
      </div>
    </div>
  );
}
