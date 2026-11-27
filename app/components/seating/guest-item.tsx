import { useDraggable } from "@dnd-kit/core";
import { memo } from "react";
import { IconMove, IconCrown } from "~/components/admin-icons";

interface GuestItemProps {
  guest: {
    id: number;
    name: string;
    is_representative: number;
    assigned_table_name: string | null;
  };
  groupName: string;
  isDragDisabled?: boolean;
}

function GuestItem({ guest, groupName, isDragDisabled = false }: GuestItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: { type: "guest", guestId: guest.id, name: guest.name },
    disabled: isDragDisabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-3 py-2 rounded
        bg-[var(--admin-surface-elevated)] 
        border border-[var(--admin-border)]
        hover:border-[var(--gold)]
        transition-all duration-200
        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        ${isDragDisabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      role="button"
      aria-label={`Arrastrar invitado ${guest.name}${
        guest.assigned_table_name ? ` asignado a ${guest.assigned_table_name}` : " sin asignar"
      }`}
      tabIndex={isDragDisabled ? -1 : 0}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      {!isDragDisabled && (
        <IconMove size={14} className="text-[var(--admin-text-muted)] flex-shrink-0" />
      )}

      {/* Badge de representante */}
      {guest.is_representative === 1 && (
        <IconCrown size={14} className="text-[var(--gold)] flex-shrink-0" />
      )}

      {/* Contenedor de nombre y mesa */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm text-[var(--admin-text-primary)] truncate">
          {guest.name}
        </span>
        {/* Mostrar mesa asignada debajo del nombre */}
        {guest.assigned_table_name && (
          <span className="text-xs text-[var(--admin-text-secondary)] truncate">
            📍 {guest.assigned_table_name}
          </span>
        )}
      </div>

      {/* Chip de estado */}
      {guest.assigned_table_name ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--admin-status-confirmed)] bg-opacity-20 text-[var(--admin-status-confirmed)] flex-shrink-0 font-medium">
          ✓
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--admin-text-muted)] bg-opacity-20 text-[var(--admin-text-muted)] flex-shrink-0">
          −
        </span>
      )}
    </div>
  );
}

export default memo(GuestItem);
