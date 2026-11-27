import { useDroppable, useDraggable } from "@dnd-kit/core";
import { memo } from "react";
import type { TableWithPosition } from "~/lib/db.server";
import { IconMove } from "~/components/admin-icons";

interface AssignedGuest {
  id: number;
  name: string;
  is_representative: number;
}

interface TableCardProps {
  table: TableWithPosition;
  assignedGuests: AssignedGuest[];
  isDragOver?: boolean;
  canAcceptDrop?: boolean;
  isDraggingTable?: boolean; // Nueva prop para saber si estamos arrastrando una mesa
}

function TableCard({
  table,
  assignedGuests,
  isDragOver = false,
  canAcceptDrop = true,
  isDraggingTable = false,
}: TableCardProps) {
  // Desactivar droppable cuando estamos arrastrando una mesa
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `table-${table.id}`,
    data: { type: "table", tableId: table.id },
    disabled: isDraggingTable, // CLAVE: desactivar cuando arrastramos mesa
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `table-move-${table.id}`,
    data: { type: "table-move", tableId: table.id, table },
  });

  const occupancyPercent = Math.round((assignedGuests.length / table.capacity) * 100);
  const isFull = assignedGuests.length >= table.capacity;
  const isAlmostFull = occupancyPercent >= 75;

  // Colores según ocupación
  let statusColor = "text-[var(--admin-status-confirmed)]"; // Verde
  if (isFull) {
    statusColor = "text-[var(--admin-status-declined)]"; // Rojo
  } else if (isAlmostFull) {
    statusColor = "text-[var(--admin-status-pending)]"; // Amarillo
  }

  // Estilos de borde durante drag
  let borderClass = "border-[var(--admin-border)]";
  if (isDragOver) {
    if (canAcceptDrop && !isFull) {
      borderClass = "border-[var(--gold)] border-2 shadow-[var(--glow-gold-md)]";
    } else {
      borderClass = "border-[var(--admin-status-declined)] border-2 animate-shake";
    }
  }

  // Posición base
  const baseStyle = {
    left: `${table.position_x}px`,
    top: `${table.position_y}px`,
  };

  // Aplicar transform solo si hay drag
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 1000 : 1,
      }
    : {};

  return (
    <div
      ref={setDroppableRef}
      className={`absolute rounded-lg border ${borderClass} transition-all duration-200`}
      style={{
        ...baseStyle,
        ...dragStyle,
        width: "200px",
        height: "180px",
        backgroundColor: "rgba(201, 168, 76, 0.08)", // --gold con 8% opacidad
        backdropFilter: "blur(8px)",
      }}
      role="region"
      aria-label={`Mesa ${table.name}, ${assignedGuests.length} de ${table.capacity} personas asignadas${
        isFull ? ", llena" : ""
      }`}
    >
      {/* Header con drag handle */}
      <div className="px-4 py-3 border-b border-[var(--gold)] flex items-center justify-between" style={{ backgroundColor: "rgba(201, 168, 76, 0.15)" }}>
        <div className="flex-1">
          <h3 className="font-medium text-[var(--admin-text-primary)] text-sm mb-1">
            {table.name}
          </h3>
          <p className={`text-xs font-medium ${statusColor}`}>
            {assignedGuests.length} / {table.capacity}
            {isFull && " • Llena"}
          </p>
        </div>
        
        {/* Drag handle para mover mesa */}
        <div
          ref={setDraggableRef}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-[var(--admin-surface-elevated)] rounded transition-colors select-none"
          title="Arrastrar para mover mesa"
          style={{ touchAction: "none" }}
          {...listeners}
          {...attributes}
        >
          <IconMove size={16} className="text-[var(--admin-text-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Lista de invitados */}
      <div className="table-guest-list px-4 py-2 overflow-y-auto overflow-x-hidden" style={{ maxHeight: "100px" }}>
        {assignedGuests.length === 0 ? (
          <p className="text-xs text-[var(--admin-text-muted)] italic">Sin asignar</p>
        ) : (
          <ul className="space-y-1">
            {assignedGuests.map((guest) => (
              <li
                key={guest.id}
                className="text-xs text-[var(--admin-text-secondary)] flex items-center gap-1"
              >
                {guest.is_representative === 1 && (
                  <span className="text-[var(--gold)]">★</span>
                )}
                <span className="truncate">{guest.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(TableCard);
