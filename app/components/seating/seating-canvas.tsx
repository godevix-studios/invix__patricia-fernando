import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "motion/react";
import TableCard from "./table-card";
import type { TableWithPosition } from "~/lib/db.server";
import { IconMaximize, IconMinimize, IconMove, IconGridSort } from "~/components/admin-icons";

// Lazy load sidebar para evitar SSR
const GuestsSidebar = lazy(() => import("./guests-sidebar"));

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
  guests: Guest[];
}

interface SeatingCanvasProps {
  tables: TableWithPosition[];
  groups: GuestGroup[];
  onAssignGuest: (guestId: number, tableId: number) => void;
  onAssignGroup: (groupId: number, tableId: number) => void;
  onUpdatePosition: (tableId: number, x: number, y: number) => void;
  onAutoArrange?: () => void; // Nueva prop para ordenamiento automático
}

export default function SeatingCanvas({
  tables,
  groups,
  onAssignGuest,
  onAssignGroup,
  onUpdatePosition,
  onAutoArrange,
}: SeatingCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragData, setDragData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    tableId: number;
    available: number;
    x: number;
    y: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reducido a 5px para ser más sensible
      },
    })
  );

  // Manejar tecla ESC para salir de fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Obtener invitados asignados a cada mesa
  const getAssignedGuests = useCallback(
    (tableId: number) => {
      const assigned: Guest[] = [];
      groups.forEach((group) => {
        group.guests.forEach((guest) => {
          if (guest.assigned_table_id === tableId) {
            assigned.push(guest);
          }
        });
      });
      return assigned;
    },
    [groups]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragData(event.active.data.current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const newOverId = event.over?.id as string | null;
    setOverId(newOverId);

    // No mostrar tooltip si estamos moviendo una mesa
    const activeData = event.active.data.current;
    if (activeData?.type === "table-move") {
      setTooltipData(null);
      return;
    }

    // Actualizar tooltip si está sobre una mesa
    if (newOverId && newOverId.startsWith("table-")) {
      const tableId = parseInt(newOverId.replace("table-", ""), 10);
      const table = tables.find((t) => t.id === tableId);
      
      if (table) {
        const currentOccupancy = getAssignedGuests(tableId).length;
        const available = table.capacity - currentOccupancy;
        
        // Obtener posición del mouse
        const rect = event.over?.rect;
        if (rect) {
          setTooltipData({
            tableId,
            available,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        }
      }
    } else {
      setTooltipData(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (!over && !delta) {
      setActiveId(null);
      setOverId(null);
      setDragData(null);
      setTooltipData(null);
      return;
    }

    const activeData = active.data.current;

    // Si es mover una mesa (table-move)
    if (activeData?.type === "table-move" && delta) {
      const tableId = activeData.tableId;
      const table = activeData.table;
      
      // Calcular nueva posición
      const newX = Math.max(0, table.position_x + delta.x);
      const newY = Math.max(0, table.position_y + delta.y);
      
      onUpdatePosition(tableId, newX, newY);
      
      setActiveId(null);
      setOverId(null);
      setDragData(null);
      setTooltipData(null);
      return;
    }

    if (!over) {
      setActiveId(null);
      setOverId(null);
      setDragData(null);
      setTooltipData(null);
      return;
    }

    const overData = over.data.current;

    // Si se suelta sobre una mesa (asignar invitado/grupo)
    if (overData?.type === "table") {
      const tableId = overData.tableId;
      const table = tables.find((t) => t.id === tableId);
      
      if (!table) {
        setActiveId(null);
        setOverId(null);
        setDragData(null);
        setTooltipData(null);
        return;
      }

      const currentOccupancy = getAssignedGuests(tableId).length;

      // Si es un invitado individual
      if (activeData?.type === "guest") {
        const guestId = activeData.guestId;
        
        // Verificar capacidad
        if (currentOccupancy >= table.capacity) {
          alert(`La mesa ${table.name} está llena (${currentOccupancy}/${table.capacity})`);
        } else {
          onAssignGuest(guestId, tableId);
        }
      }

      // Si es un grupo
      if (activeData?.type === "group") {
        const groupId = activeData.groupId;
        const guestCount = activeData.guestCount || 0;
        const availableSpace = table.capacity - currentOccupancy;

        // Verificar capacidad
        if (availableSpace < guestCount) {
          alert(
            `La mesa ${table.name} no tiene suficiente espacio. Disponible: ${availableSpace}, Necesita: ${guestCount}`
          );
        } else {
          onAssignGroup(groupId, tableId);
        }
      }
    }

    setActiveId(null);
    setOverId(null);
    setDragData(null);
    setTooltipData(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    setDragData(null);
    setTooltipData(null);
  };

  // Verificar si una mesa puede aceptar el drop actual
  const canTableAcceptDrop = (tableId: number): boolean => {
    if (!dragData) return false;

    // Si estamos moviendo una mesa, ninguna mesa debe "aceptar" el drop
    if (dragData.type === "table-move") return false;

    const table = tables.find((t) => t.id === tableId);
    if (!table) return false;

    const currentOccupancy = getAssignedGuests(tableId).length;

    if (dragData.type === "guest") {
      return currentOccupancy < table.capacity;
    }

    if (dragData.type === "group") {
      const guestCount = dragData.guestCount || 0;
      return currentOccupancy + guestCount <= table.capacity;
    }

    return false;
  };

  // Detectar si estamos arrastrando una mesa
  const isDraggingTable = dragData?.type === "table-move";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Vista Normal */}
      {!isExpanded && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar de invitados */}
          <Suspense
            fallback={
              <div className="w-full lg:w-[360px] admin-card p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-[var(--admin-surface-elevated)] rounded" />
                  <div className="h-64 bg-[var(--admin-surface-elevated)] rounded" />
                </div>
              </div>
            }
          >
            <GuestsSidebar groups={groups} />
          </Suspense>

          {/* Canvas de mesas */}
          <div className="flex-1 min-w-0 admin-card p-6">
            {/* Header con botón de expandir */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--admin-text-primary)]">
                Canvas de Distribución
              </h3>
              <div className="flex items-center gap-2">
                {/* Botón de ordenamiento automático */}
                {onAutoArrange && (
                  <button
                    type="button"
                    onClick={onAutoArrange}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--admin-text-primary)] hover:text-[var(--gold)] bg-[var(--admin-surface-elevated)] hover:bg-[var(--admin-surface-raised)] border border-[var(--admin-border)] rounded transition-colors"
                    title="Ordenar mesas automáticamente en grid"
                  >
                    <IconGridSort size={14} />
                    <span>Ordenar Grid</span>
                  </button>
                )}
                
                {/* Botón expandir */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--admin-text-primary)] hover:text-[var(--gold)] bg-[var(--admin-surface-elevated)] hover:bg-[var(--admin-surface-raised)] border border-[var(--admin-border)] rounded transition-colors"
                  title={isExpanded ? "Vista normal" : "Vista expandida"}
                >
                  {isExpanded ? (
                    <>
                      <IconMinimize size={14} />
                      <span>Vista normal</span>
                    </>
                  ) : (
                    <>
                      <IconMaximize size={14} />
                      <span>Expandir</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Canvas scrollable */}
            <div
              className="relative overflow-auto rounded-lg border border-[var(--admin-border)]"
              style={{
                height: isExpanded ? "calc(100vh - 180px)" : "700px",
                maxWidth: "100%",
                backgroundImage: `
                  linear-gradient(to right, rgba(242, 240, 235, 0.03) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(242, 240, 235, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
                backgroundColor: "var(--admin-surface-sunken)",
              }}
            >
              {/* Contenedor de mesas con orientación vertical */}
              <div
                className="relative"
                style={{
                  width: "1000px",
                  height: "2000px",
                }}
              >
                {/* Renderizar mesas */}
                {tables.map((table) => {
                  const assignedGuests = getAssignedGuests(table.id);
                  const tableDropId = `table-${table.id}`;
                  const isDragOver = overId === tableDropId;
                  const canAcceptDrop = canTableAcceptDrop(table.id);

                  return (
                    <TableCard
                      key={table.id}
                      table={table}
                      assignedGuests={assignedGuests}
                      isDragOver={isDragOver}
                      canAcceptDrop={canAcceptDrop}
                      isDraggingTable={isDraggingTable}
                    />
                  );
                })}

                {/* Empty state si no hay mesas */}
                {tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[var(--admin-text-secondary)] mb-2">
                        No hay mesas creadas
                      </p>
                      <a href="/admin/tables/bulk" className="admin-link">
                        Crear mesas en lote
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="mt-4 p-3 bg-[var(--admin-surface-elevated)] rounded border border-[var(--admin-border)]">
              <p className="text-xs text-[var(--admin-text-secondary)]">
                <strong className="text-[var(--admin-text-primary)]">Instrucciones:</strong> Arrastra
                invitados o grupos desde el panel lateral y suéltalos sobre las mesas. 
                {!isExpanded && " Las mesas con espacio se resaltarán en dorado, las llenas en rojo."}
                {" "}Usa el icono <IconMove size={12} className="inline" /> en cada mesa para moverla y reorganizar el canvas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vista expandida */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden"
            style={{ 
              padding: "2rem",
              backgroundColor: "#0C0C0E", // --surface-base sólido
            }}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium text-[var(--admin-text-primary)]">
                  Vista Expandida - Distribución de Mesas
                </h2>
                <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                  Presiona ESC o haz clic en "Vista normal" para salir
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón de ordenamiento automático */}
                {onAutoArrange && (
                  <button
                    type="button"
                    onClick={onAutoArrange}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--admin-text-primary)] hover:text-[var(--gold)] bg-[var(--admin-surface-raised)] hover:bg-[var(--admin-surface-elevated)] border border-[var(--admin-border)] rounded transition-colors"
                    title="Ordenar mesas automáticamente en grid"
                  >
                    <IconGridSort size={16} />
                    <span>Ordenar Grid</span>
                  </button>
                )}
                
                {/* Botón cerrar */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--admin-text-primary)] hover:text-[var(--gold)] bg-[var(--admin-surface-raised)] hover:bg-[var(--admin-surface-elevated)] border border-[var(--admin-border)] rounded transition-colors"
                >
                  <IconMinimize size={16} />
                  Vista normal
                </button>
              </div>
            </div>

            {/* Contenido del modal: Sidebar y Canvas lado a lado */}
            <div className="flex-1 flex gap-6 min-h-0">
              {/* Sidebar en modal */}
              <Suspense
                fallback={
                  <div className="w-[360px] admin-card p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-[var(--admin-surface-elevated)] rounded" />
                      <div className="h-64 bg-[var(--admin-surface-elevated)] rounded" />
                    </div>
                  </div>
                }
              >
                <div style={{ width: "360px" }}>
                  <GuestsSidebar groups={groups} />
                </div>
              </Suspense>

              {/* Canvas en modal */}
              <div className="flex-1 min-w-0 admin-card p-6 flex flex-col">
                <div
                  className="flex-1 relative overflow-auto rounded-lg border border-[var(--admin-border)]"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(242, 240, 235, 0.03) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(242, 240, 235, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: "50px 50px",
                    backgroundColor: "var(--admin-surface-sunken)",
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: "1000px",
                      height: "2000px",
                    }}
                  >
                    {tables.map((table) => {
                      const assignedGuests = getAssignedGuests(table.id);
                      const tableDropId = `table-${table.id}`;
                      const isDragOver = overId === tableDropId;
                      const canAcceptDrop = canTableAcceptDrop(table.id);

                      return (
                        <TableCard
                          key={table.id}
                          table={table}
                          assignedGuests={assignedGuests}
                          isDragOver={isDragOver}
                          canAcceptDrop={canAcceptDrop}
                          isDraggingTable={isDraggingTable}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Instrucciones en modal */}
                <div className="mt-4 p-3 bg-[var(--admin-surface-elevated)] rounded border border-[var(--admin-border)]">
                  <p className="text-xs text-[var(--admin-text-secondary)]">
                    <strong className="text-[var(--admin-text-primary)]">Tip:</strong> En vista expandida
                    puedes ver ambos paneles completos. Arrastra invitados y mesas con mayor comodidad.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Overlay - muestra el elemento siendo arrastrado */}
      <DragOverlay>
        {activeId && dragData && (
          <div className="px-4 py-2 bg-[var(--admin-surface-raised)] border-2 border-[var(--gold)] rounded-lg shadow-lg">
            <p className="text-sm font-medium text-[var(--admin-text-primary)]">
              {dragData.type === "guest"
                ? dragData.name
                : dragData.type === "table-move"
                ? `Moviendo ${dragData.table.name}`
                : `${dragData.name} (${dragData.guestCount} personas)`}
            </p>
          </div>
        )}
      </DragOverlay>

      {/* Tooltip flotante con capacidad disponible */}
      {tooltipData && (
        <div
          className="fixed z-50 px-3 py-2 bg-[var(--admin-surface-overlay)] border border-[var(--gold)] rounded shadow-lg pointer-events-none"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-xs text-[var(--admin-text-primary)] whitespace-nowrap">
            {tooltipData.available > 0 ? (
              <>
                <span className="text-[var(--admin-status-confirmed)]">✓</span> Disponible:{" "}
                <strong>{tooltipData.available}</strong> espacio{tooltipData.available !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                <span className="text-[var(--admin-status-declined)]">✗</span> Mesa llena
              </>
            )}
          </p>
        </div>
      )}
    </DndContext>
  );
}
