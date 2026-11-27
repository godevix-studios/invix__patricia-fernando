import { useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "motion/react";
import { memo } from "react";
import { IconExpand, IconCollapse, IconMove, IconUserGroup } from "~/components/admin-icons";
import GuestItem from "./guest-item";

interface Guest {
  id: number;
  name: string;
  is_representative: number;
  assigned_table_id: number | null;
  assigned_table_name: string | null;
}

interface GuestGroupItemProps {
  group: {
    id: number;
    name: string;
    group_name: string | null;
    max_guests: number;
    table_id: number | null;
    group_table_name: string | null;
    guests: Guest[];
  };
  expanded: boolean;
  onToggle: () => void;
}

function GuestGroupItem({ group, expanded, onToggle }: GuestGroupItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `group-${group.id}`,
    data: { 
      type: "group", 
      groupId: group.id, 
      name: group.group_name || group.name,
      guestCount: group.guests.length,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  // Calcular estado de asignación
  const assignedCount = group.guests.filter((g) => g.assigned_table_name !== null).length;
  const totalGuests = group.guests.length;
  
  // Obtener lista de mesas únicas asignadas
  const assignedTables = new Set(
    group.guests
      .filter((g) => g.assigned_table_name)
      .map((g) => g.assigned_table_name)
  );
  
  let assignmentStatus = "unassigned";
  let assignmentLabel = "Sin asignar";
  let assignmentColor = "text-[var(--admin-text-muted)]";
  let assignmentBgColor = "bg-[var(--admin-text-muted)] bg-opacity-10";
  
  if (assignedCount === totalGuests && totalGuests > 0) {
    assignmentStatus = "fully-assigned";
    if (assignedTables.size === 1) {
      // Todos en la misma mesa
      assignmentLabel = Array.from(assignedTables)[0] || "";
      assignmentColor = "text-[var(--admin-status-confirmed)]";
      assignmentBgColor = "bg-[var(--admin-status-confirmed)] bg-opacity-20";
    } else {
      // Asignados en varias mesas
      assignmentLabel = `${assignedTables.size} mesas`;
      assignmentColor = "text-[var(--admin-status-confirmed)]";
      assignmentBgColor = "bg-[var(--admin-status-confirmed)] bg-opacity-20";
    }
  } else if (assignedCount > 0) {
    assignmentStatus = "partial";
    if (assignedTables.size === 1) {
      assignmentLabel = `${assignedCount}/${totalGuests} en ${Array.from(assignedTables)[0]}`;
    } else {
      assignmentLabel = `${assignedCount}/${totalGuests} en ${assignedTables.size} mesas`;
    }
    assignmentColor = "text-[var(--admin-status-pending)]";
    assignmentBgColor = "bg-[var(--admin-status-pending)] bg-opacity-20";
  }

  const displayName = group.group_name || group.name;

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      {/* Header (draggable) */}
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg
          bg-[var(--admin-surface-raised)]
          border border-[var(--admin-border)]
          hover:border-[var(--gold)]
          transition-all duration-200
          ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        `}
        role="button"
        aria-label={`Arrastrar grupo ${displayName} con ${totalGuests} ${
          totalGuests === 1 ? "persona" : "personas"
        }. ${assignmentLabel}`}
        tabIndex={0}
        {...attributes}
        {...listeners}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors cursor-pointer"
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          {expanded ? <IconExpand size={18} /> : <IconCollapse size={18} />}
        </button>

        {/* Icono de grupo */}
        <IconUserGroup size={18} className="text-[var(--admin-text-muted)] flex-shrink-0" />

        {/* Info del grupo */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--admin-text-primary)] truncate text-sm">
            {displayName}
          </p>
          <p className="text-xs text-[var(--admin-text-secondary)]">
            {totalGuests} {totalGuests === 1 ? "persona" : "personas"}
          </p>
        </div>

        {/* Estado de asignación con badge más visible */}
        <div className={`text-xs px-3 py-1 rounded-full ${assignmentBgColor} ${assignmentColor} flex-shrink-0 font-medium`}>
          {assignmentStatus === "fully-assigned" && "✓ "}
          {assignmentStatus === "partial" && "⚠ "}
          {assignmentLabel}
        </div>

        {/* Drag handle */}
        <IconMove size={16} className="text-[var(--admin-text-muted)] flex-shrink-0" />
      </div>

      {/* Body (expandible) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-6 space-y-2">
              {group.guests.map((guest) => (
                <GuestItem
                  key={guest.id}
                  guest={guest}
                  groupName={displayName}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(GuestGroupItem);
