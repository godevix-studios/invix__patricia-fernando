import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/tables-bulk";
import { getCloudflareContext } from "~/lib/cloudflare-context";
import { getCapacityStatus } from "~/lib/db.server";

export function meta() {
  return [{ title: "Crear Mesas en Lote - Panel de Administración" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;

  // Obtener capacidad del evento y mesas existentes
  const capacityStatus = await getCapacityStatus(db);
  
  const tablesResult = await db
    .prepare("SELECT COUNT(*) as count FROM tables")
    .first<{ count: number }>();
  
  const existingTablesCount = tablesResult?.count || 0;

  return {
    capacityStatus,
    existingTablesCount,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const formData = await request.formData();

  const quantity = parseInt(formData.get("quantity") as string, 10);
  const capacity = parseInt(formData.get("capacity") as string, 10);
  const prefix = (formData.get("prefix") as string) || "Mesa";
  const startNumber = parseInt(formData.get("startNumber") as string, 10) || 1;
  const separator = formData.get("separator") as string || "-";

  // Validaciones
  if (isNaN(quantity) || quantity < 1 || quantity > 100) {
    return { error: "La cantidad debe estar entre 1 y 100" };
  }

  if (isNaN(capacity) || capacity < 1) {
    return { error: "La capacidad debe ser al menos 1" };
  }

  // Validar capacidad del evento si está configurada
  const capacityStatus = await getCapacityStatus(db);
  if (capacityStatus) {
    const totalNewCapacity = quantity * capacity;
    const newTotal = capacityStatus.totalOccupied + totalNewCapacity;
    if (newTotal > capacityStatus.maxCapacity) {
      return {
        error: `La capacidad total excedería el límite del evento (${newTotal}/${capacityStatus.maxCapacity})`,
      };
    }
  }

  // Crear mesas en batch
  try {
    const statements: D1PreparedStatement[] = [];
    
    // Calcular posiciones en grid (5 columnas, espaciado de 250px horizontal y 220px vertical)
    const gridCols = 5;
    const spacingX = 250;
    const spacingY = 220;
    const startX = 50;
    const startY = 50;

    for (let i = 0; i < quantity; i++) {
      const tableNumber = startNumber + i;
      const name = `${prefix}${separator}${tableNumber}`;
      
      // Calcular posición en grid
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const posX = startX + (col * spacingX);
      const posY = startY + (row * spacingY);

      statements.push(
        db
          .prepare(
            "INSERT INTO tables (name, capacity, position_x, position_y) VALUES (?, ?, ?, ?)"
          )
          .bind(name, capacity, posX, posY)
      );
    }

    // Ejecutar todas las inserciones en batch
    await db.batch(statements);

    return redirect("/admin/tables");
  } catch (error) {
    console.error("Error creating tables:", error);
    return { error: "Error al crear las mesas" };
  }
}

export default function TablesBulkPage() {
  const { capacityStatus, existingTablesCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Estados para preview
  const [quantity, setQuantity] = useState(5);
  const [capacity, setCapacity] = useState(10);
  const [prefix, setPrefix] = useState("Mesa");
  const [startNumber, setStartNumber] = useState(1);
  const [separator, setSeparator] = useState("-");

  // Generar preview de nombres
  const previewNames = Array.from({ length: Math.min(quantity, 10) }, (_, i) => {
    const tableNumber = startNumber + i;
    return `${prefix}${separator}${tableNumber}`;
  });

  const totalNewCapacity = quantity * capacity;
  const wouldExceedCapacity = capacityStatus && 
    (capacityStatus.totalOccupied + totalNewCapacity) > capacityStatus.maxCapacity;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/tables" className="admin-back-link">
          ← Volver a mesas
        </Link>
        <h1 className="admin-page-title mt-2">Crear Mesas en Lote</h1>
        <p className="admin-page-subtitle">
          Genera múltiples mesas con nombres personalizados
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <Form method="post" className="space-y-6">
              {actionData?.error && (
                <div className="admin-alert-error">{actionData.error}</div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="quantity" className="admin-label">
                    Cantidad de mesas *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    required
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="admin-input"
                  />
                  <p className="admin-help-text">Máximo 100 mesas</p>
                </div>

                <div>
                  <label htmlFor="capacity" className="admin-label">
                    Capacidad por mesa *
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    required
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                    className="admin-input"
                  />
                  <p className="admin-help-text">Personas por mesa</p>
                </div>
              </div>

              <div>
                <label htmlFor="prefix" className="admin-label">
                  Prefijo del nombre
                </label>
                <input
                  type="text"
                  id="prefix"
                  name="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Mesa"
                  className="admin-input"
                />
                <p className="admin-help-text">
                  Texto que precede al número (ej: "VIP", "Jardín", "Salón A")
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="separator" className="admin-label">
                    Separador
                  </label>
                  <select
                    id="separator"
                    name="separator"
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="admin-select"
                  >
                    <option value="-">Guión (-)</option>
                    <option value=" ">Espacio ( )</option>
                    <option value="_">Guión bajo (_)</option>
                    <option value="">Sin separador</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="startNumber" className="admin-label">
                    Número inicial
                  </label>
                  <input
                    type="number"
                    id="startNumber"
                    name="startNumber"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                    className="admin-input"
                  />
                  <p className="admin-help-text">Comenzar numeración desde</p>
                </div>
              </div>

              {/* Warning de capacidad */}
              {capacityStatus && (
                <div
                  className={`p-4 rounded-lg border ${
                    wouldExceedCapacity
                      ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]"
                      : "bg-[var(--admin-surface-elevated)] border-[var(--admin-border)]"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-2">
                    Capacidad del evento
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[var(--admin-text-secondary)]">
                    <span>
                      Nueva capacidad total: <strong>{totalNewCapacity}</strong> espacios
                    </span>
                    <span>•</span>
                    <span>
                      Ocupación actual: <strong>{capacityStatus.totalOccupied}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Límite: <strong>{capacityStatus.maxCapacity}</strong>
                    </span>
                  </div>
                  {wouldExceedCapacity && (
                    <p className="text-xs text-[var(--admin-status-declined)] mt-2">
                      ⚠️ Excede el límite del evento. Reduce la cantidad o capacidad.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Link to="/admin/tables" className="admin-btn-secondary flex-1">
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || wouldExceedCapacity}
                  className="admin-btn-primary flex-1"
                >
                  {isSubmitting ? "Creando..." : `Crear ${quantity} mesa${quantity > 1 ? "s" : ""}`}
                </button>
              </div>
            </Form>
          </div>
        </div>

        {/* Panel de preview */}
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Vista Previa</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--admin-text-secondary)]">Mesas a crear:</span>
                <span className="font-medium text-[var(--admin-text-primary)]">{quantity}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-[var(--admin-text-secondary)]">Capacidad total:</span>
                <span className="font-medium text-[var(--admin-text-primary)]">
                  {totalNewCapacity} personas
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-[var(--admin-text-secondary)]">Mesas existentes:</span>
                <span className="font-medium text-[var(--admin-text-primary)]">
                  {existingTablesCount}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-[var(--admin-text-primary)] mb-3">
                Nombres generados:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {previewNames.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 bg-[var(--admin-surface-elevated)] rounded text-sm text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
                  >
                    {name}
                  </div>
                ))}
                {quantity > 10 && (
                  <p className="text-xs text-[var(--admin-text-secondary)] italic">
                    ... y {quantity - 10} más
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h2 className="admin-section-title mb-4">Posicionamiento</h2>
            <p className="text-sm text-[var(--admin-text-secondary)]">
              Las mesas se crearán en una cuadrícula automática de 5 columnas en el canvas de
              distribución. Podrás reposicionarlas manualmente después.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
