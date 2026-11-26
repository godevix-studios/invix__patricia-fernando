import { useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/confirm";
import type { GuestGroup, Guest } from "~/lib/db.server";
import { getCloudflareContext } from "~/lib/cloudflare-context";

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data?.group
        ? `Confirmar asistencia - ${data.group.name}`
        : "Confirmar asistencia",
    },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const { token } = params;

  const group = await db
    .prepare("SELECT * FROM guest_groups WHERE token = ?")
    .bind(token)
    .first<GuestGroup>();

  if (!group) {
    throw new Response("Invitación no encontrada", { status: 404 });
  }

  const guestsResult = await db
    .prepare(
      "SELECT * FROM guests WHERE group_id = ? ORDER BY is_representative DESC, id"
    )
    .bind(group.id)
    .all<Guest>();

  return {
    group,
    guests: guestsResult.results || [],
    token,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const { env } = getCloudflareContext(context);
  const db = env.DB;
  const { token } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const group = await db
    .prepare("SELECT * FROM guest_groups WHERE token = ?")
    .bind(token)
    .first<GuestGroup>();

  if (!group) {
    return { error: "Invitación no encontrada" };
  }

  if (group.status !== "pending") {
    return { error: "Esta invitación ya fue respondida" };
  }

  if (intent === "decline") {
    await db
      .prepare(
        "UPDATE guest_groups SET status = 'declined', confirmed_count = 0, confirmed_at = datetime('now') WHERE id = ?"
      )
      .bind(group.id)
      .run();

    return { success: "declined" };
  }

  // Confirmar asistencia
  const attendingCount = parseInt(formData.get("attendingCount") as string, 10);

  if (isNaN(attendingCount) || attendingCount < 1 || attendingCount > group.max_guests) {
    return { error: "Número de asistentes inválido" };
  }

  // Obtener los nombres de los asistentes
  const attendeeNames: string[] = [];
  for (let i = 0; i < attendingCount; i++) {
    const name = formData.get(`attendee_${i}`) as string;
    if (!name || name.trim() === "") {
      return { error: `El nombre del asistente ${i + 1} es requerido` };
    }
    attendeeNames.push(name.trim());
  }

  // Actualizar el grupo
  await db
    .prepare(
      "UPDATE guest_groups SET status = 'confirmed', confirmed_count = ?, confirmed_at = datetime('now') WHERE id = ?"
    )
    .bind(attendingCount, group.id)
    .run();

  // Eliminar guests existentes y crear los nuevos
  await db.prepare("DELETE FROM guests WHERE group_id = ?").bind(group.id).run();

  for (let i = 0; i < attendeeNames.length; i++) {
    await db
      .prepare(
        "INSERT INTO guests (group_id, name, is_representative, confirmed) VALUES (?, ?, ?, 1)"
      )
      .bind(group.id, attendeeNames[i], i === 0 ? 1 : 0)
      .run();
  }

  // Si confirmaron menos que el máximo, agregar al pool
  const unusedPasses = group.max_guests - attendingCount;
  if (unusedPasses > 0) {
    await db
      .prepare(
        "INSERT INTO pass_pool (source_group_id, quantity) VALUES (?, ?)"
      )
      .bind(group.id, unusedPasses)
      .run();
  }

  return { success: "confirmed", confirmedCount: attendingCount };
}

// Wrapper component with invitation styling
function ConfirmWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="confirm-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&display=swap');
        
        .confirm-page {
          --paper: #feebd8;
          --paper-light: #fbf6ee;
          --paper-deep: #ebd9c2;
          --ink: #011835;
          --ink-soft: #394d66;
          --gold: #a47b56;
          --gold-light: #c8aa87;
          --gold-pale: #d6b18a;
          --success: #2d5a3d;
          
          min-height: 100vh;
          background: var(--paper-light);
          font-family: 'Cormorant Garamond', Georgia, serif;
          color: var(--ink);
        }
        
        .confirm-page ::selection {
          background: #c7a47e;
          color: var(--ink);
        }
        
        .confirm-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        
        .confirm-card {
          width: 100%;
          max-width: 480px;
          background: linear-gradient(145deg, #f1e2ce, #e9d3b9);
          padding: clamp(40px, 8vw, 60px) clamp(24px, 6vw, 48px);
          text-align: center;
        }
        
        .confirm-card-simple {
          width: 100%;
          max-width: 480px;
          background: var(--paper-light);
          border: 1px solid var(--gold-light);
          padding: clamp(40px, 8vw, 60px) clamp(24px, 6vw, 48px);
          text-align: center;
        }
        
        .confirm-rule {
          width: 48px;
          height: 1px;
          margin: 0 auto 32px;
          background: var(--gold);
        }
        
        .confirm-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .confirm-icon.success {
          background: rgba(45, 90, 61, 0.12);
          color: var(--success);
        }
        
        .confirm-icon.neutral {
          background: rgba(164, 123, 86, 0.12);
          color: var(--gold);
        }
        
        .confirm-icon.error {
          background: rgba(180, 60, 60, 0.12);
          color: #b43c3c;
        }
        
        .confirm-title {
          margin: 0 0 16px;
          font-family: 'Pinyon Script', cursive;
          font-size: clamp(2.8rem, 8vw, 3.8rem);
          font-weight: 400;
          line-height: 1.1;
          color: var(--ink);
        }
        
        .confirm-subtitle {
          margin: 0 0 32px;
          font-size: clamp(1.15rem, 3vw, 1.35rem);
          line-height: 1.5;
          color: var(--ink-soft);
        }
        
        .confirm-subtitle strong {
          color: var(--ink);
          font-weight: 500;
        }
        
        .confirm-name {
          color: var(--gold);
          font-weight: 500;
        }
        
        .confirm-info-box {
          background: rgba(164, 123, 86, 0.1);
          border: 1px solid var(--gold-light);
          padding: 16px 20px;
          margin-bottom: 32px;
        }
        
        .confirm-info-box p {
          margin: 0;
          font-size: 1rem;
          color: var(--ink-soft);
          font-style: italic;
        }
        
        .confirm-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 56px;
          padding: 0 32px;
          border: 1px solid var(--ink);
          border-radius: 999px;
          color: var(--paper-light);
          background: var(--ink);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        
        .confirm-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #0a2847;
        }
        
        .confirm-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .confirm-btn-primary.success {
          background: var(--success);
          border-color: var(--success);
        }
        
        .confirm-btn-primary.success:hover:not(:disabled) {
          background: #3d7a52;
        }
        
        .confirm-btn-secondary {
          display: block;
          width: 100%;
          min-height: 52px;
          padding: 0 24px;
          margin-top: 12px;
          border: 1px solid var(--gold-light);
          border-radius: 999px;
          color: var(--ink-soft);
          background: transparent;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.68rem;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        
        .confirm-btn-secondary:hover:not(:disabled) {
          background: rgba(164, 123, 86, 0.08);
          color: var(--ink);
        }
        
        .confirm-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .confirm-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--gold);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .confirm-link:hover {
          color: var(--ink);
        }
        
        .confirm-link svg {
          width: 16px;
          height: 16px;
        }
        
        .confirm-form-section {
          margin-bottom: 32px;
          text-align: left;
        }
        
        .confirm-label {
          display: block;
          margin-bottom: 16px;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        
        .confirm-count-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .confirm-count-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--gold-light);
          background: var(--paper-light);
          color: var(--ink-soft);
        }
        
        .confirm-count-btn:hover {
          border-color: var(--gold);
          color: var(--ink);
        }
        
        .confirm-count-btn.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--paper-light);
        }
        
        .confirm-input {
          width: 100%;
          background: var(--paper-light);
          border: 1px solid var(--gold-light);
          padding: 14px 18px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.1rem;
          color: var(--ink);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .confirm-input::placeholder {
          color: var(--ink-soft);
          opacity: 0.6;
        }
        
        .confirm-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(164, 123, 86, 0.15);
        }
        
        .confirm-input + .confirm-input {
          margin-top: 12px;
        }
        
        .confirm-input-hint {
          margin-top: 8px;
          font-size: 0.85rem;
          color: var(--ink-soft);
          font-style: italic;
        }
        
        .confirm-alert-error {
          background: rgba(180, 60, 60, 0.1);
          border: 1px solid rgba(180, 60, 60, 0.3);
          padding: 14px 18px;
          margin-bottom: 24px;
          color: #8b3030;
          font-size: 1rem;
          text-align: center;
        }
        
        .confirm-guest-list {
          background: var(--paper-light);
          border: 1px solid var(--gold-light);
          padding: 20px 24px;
          margin-bottom: 32px;
          text-align: left;
        }
        
        .confirm-guest-list-title {
          margin: 0 0 16px;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        
        .confirm-guest-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(164, 123, 86, 0.2);
          font-size: 1.1rem;
          color: var(--ink-soft);
        }
        
        .confirm-guest-item:last-child {
          border-bottom: none;
        }
        
        .confirm-guest-check {
          color: var(--success);
        }
        
        .confirm-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          background: rgba(164, 123, 86, 0.15);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.55rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold);
        }
        
        .confirm-footer {
          margin-top: 40px;
          font-size: 0.95rem;
          color: var(--ink-soft);
          font-style: italic;
        }
        
        .confirm-back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          color: var(--gold);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .confirm-back-link:hover {
          color: var(--ink);
        }
        
        .confirm-back-link svg {
          width: 14px;
          height: 14px;
        }
        
        @media (max-width: 500px) {
          .confirm-card,
          .confirm-card-simple {
            padding: 32px 20px;
          }
          
          .confirm-title {
            font-size: 2.5rem;
          }
          
          .confirm-btn-primary {
            width: 100%;
            min-height: 52px;
            font-size: 0.65rem;
          }
          
          .confirm-count-btn {
            width: 46px;
            height: 46px;
            font-size: 1.2rem;
          }
        }
        
        /* Modal styles */
        .confirm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(1, 24, 53, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .confirm-modal {
          width: 100%;
          max-width: 400px;
          background: var(--paper-light);
          padding: 32px 28px;
          text-align: center;
          animation: slideUp 0.25s ease;
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .confirm-modal-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(164, 123, 86, 0.12);
          color: var(--gold);
        }
        
        .confirm-modal-title {
          margin: 0 0 16px;
          font-family: 'Pinyon Script', cursive;
          font-size: 2rem;
          font-weight: 400;
          color: var(--ink);
        }
        
        .confirm-modal-text {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.5;
          color: var(--ink-soft);
        }
        
        .confirm-modal-text strong {
          color: var(--ink);
        }
        
        .confirm-modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }
        
        .confirm-modal-btn-cancel {
          flex: 1;
          min-height: 48px;
          padding: 0 20px;
          border: 1px solid var(--gold-light);
          border-radius: 999px;
          background: transparent;
          color: var(--ink-soft);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.65rem;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        
        .confirm-modal-btn-cancel:hover {
          background: rgba(164, 123, 86, 0.08);
          color: var(--ink);
        }
        
        .confirm-modal-btn-confirm {
          flex: 1;
          min-height: 48px;
          padding: 0 20px;
          border: 1px solid var(--ink);
          border-radius: 999px;
          background: var(--ink);
          color: var(--paper-light);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .confirm-modal-btn-confirm:hover {
          background: #0a2847;
        }
        
        @media (max-width: 500px) {
          .confirm-modal {
            padding: 28px 20px;
          }
          
          .confirm-modal-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ConfirmationSuccess({
  group,
  confirmedCount,
  token,
}: {
  group: GuestGroup;
  confirmedCount: number;
  token: string;
}) {
  // Usar nombre del grupo si existe, sino el nombre del representante
  const displayName = group.group_name || group.name;
  
  return (
    <ConfirmWrapper>
      <div className="confirm-container">
        <div className="confirm-card">
          <div className="confirm-rule" />
          <div className="confirm-icon success">
            <CheckIcon />
          </div>
          <h1 className="confirm-title">¡Gracias por confirmar!</h1>
          <p className="confirm-subtitle">
            <span className="confirm-name">{displayName}</span>, te esperamos con{" "}
            <strong>
              {confirmedCount} pase{confirmedCount > 1 ? "s" : ""}
            </strong>{" "}
            el 23 de enero de 2027 en Hacienda la Victoria.
          </p>
          <div className="confirm-info-box">
            <p>
              Guarda este enlace para ver tu invitación personalizada y los
              detalles del evento.
            </p>
          </div>
          <Link to={`/i/${token}`} className="confirm-btn-primary success">
            Ver mi invitación
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </ConfirmWrapper>
  );
}

function DeclinedMessage({ group, token }: { group: GuestGroup; token: string }) {
  // Usar nombre del grupo si existe, sino el nombre del representante
  const displayName = group.group_name || group.name;
  
  return (
    <ConfirmWrapper>
      <div className="confirm-container">
        <div className="confirm-card-simple">
          <div className="confirm-rule" />
          <div className="confirm-icon neutral">
            <HeartIcon />
          </div>
          <h1 className="confirm-title">Lamentamos que no puedas asistir</h1>
          <p className="confirm-subtitle">
            <span className="confirm-name">{displayName}</span>, agradecemos que nos hayas hecho saber. Te tendremos
            presente ese día tan especial.
          </p>
          <Link to={`/i/${token}`} className="confirm-link">
            Ver invitación
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </ConfirmWrapper>
  );
}

function AlreadyConfirmed({
  group,
  guests,
  token,
}: {
  group: GuestGroup;
  guests: Guest[];
  token: string;
}) {
  // Usar nombre del grupo si existe, sino el nombre del representante
  const displayName = group.group_name || group.name;
  
  if (group.status === "declined") {
    return <DeclinedMessage group={group} token={token} />;
  }

  return (
    <ConfirmWrapper>
      <div className="confirm-container">
        <div className="confirm-card">
          <div className="confirm-rule" />
          <div className="confirm-icon success">
            <CheckIcon />
          </div>
          <h1 className="confirm-title">Asistencia confirmada</h1>
          <p className="confirm-subtitle">
            <span className="confirm-name">{displayName}</span>, ya confirmaste tu asistencia el{" "}
            {group.confirmed_at
              ? new Date(group.confirmed_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                })
              : ""}
            .
          </p>

          <div className="confirm-guest-list">
            <h2 className="confirm-guest-list-title">
              Asistentes confirmados ({group.confirmed_count})
            </h2>
            {guests
              .filter((g) => g.confirmed)
              .map((guest) => (
                <div key={guest.id} className="confirm-guest-item">
                  <span className="confirm-guest-check">✓</span>
                  <span style={{ flex: 1 }}>{guest.name}</span>
                  {guest.is_representative === 1 && (
                    <span className="confirm-chip">Representante</span>
                  )}
                </div>
              ))}
          </div>

          <Link to={`/i/${token}`} className="confirm-btn-primary success">
            Ver mi invitación
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </ConfirmWrapper>
  );
}

function ConfirmationForm({
  group,
  guests,
  token,
}: {
  group: GuestGroup;
  guests: Guest[];
  token: string;
}) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  // Usar nombre del grupo si existe, sino el nombre del representante
  const displayName = group.group_name || group.name;

  const [attendingCount, setAttendingCount] = useState(group.max_guests);
  const [attendeeNames, setAttendeeNames] = useState<string[]>(() => {
    const names: string[] = [];
    for (let i = 0; i < group.max_guests; i++) {
      names.push(guests[i]?.name || "");
    }
    return names;
  });
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  if (actionData?.success === "confirmed") {
    return (
      <ConfirmationSuccess
        group={group}
        confirmedCount={actionData.confirmedCount || group.max_guests}
        token={token}
      />
    );
  }

  if (actionData?.success === "declined") {
    return <DeclinedMessage group={group} token={token} />;
  }

  return (
    <ConfirmWrapper>
      <div className="confirm-container">
        <div className="confirm-card" style={{ maxWidth: 520 }}>
          <Link to={`/i/${token}`} className="confirm-back-link">
            <ArrowLeftIcon />
            Volver a la invitación
          </Link>
          
          <div className="confirm-rule" />
          <h1 className="confirm-title">Confirmar asistencia</h1>
          <p className="confirm-subtitle">
            <span className="confirm-name">{displayName}</span>, tienes{" "}
            <strong>
              {group.max_guests} pase{group.max_guests > 1 ? "s" : ""}
            </strong>{" "}
            disponible{group.max_guests > 1 ? "s" : ""}.
          </p>

          <Form method="post">
            {actionData?.error && (
              <div className="confirm-alert-error">
                {actionData.error}
              </div>
            )}

            <div className="confirm-form-section">
              <label className="confirm-label">
                ¿Cuántas personas asistirán?
              </label>
              <div className="confirm-count-grid">
                {Array.from({ length: group.max_guests }, (_, i) => i + 1).map(
                  (num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setAttendingCount(num);
                        setAttendeeNames((prev) => {
                          const newNames = [...prev];
                          while (newNames.length < num) {
                            newNames.push("");
                          }
                          return newNames;
                        });
                      }}
                      className={`confirm-count-btn ${
                        attendingCount === num ? "active" : ""
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
              <input type="hidden" name="attendingCount" value={attendingCount} />
            </div>

            <div className="confirm-form-section">
              <label className="confirm-label">
                Nombres de los asistentes
              </label>
              {Array.from({ length: attendingCount }, (_, i) => (
                <div key={i}>
                  <input
                    type="text"
                    name={`attendee_${i}`}
                    required
                    placeholder={
                      i === 0 ? "Tu nombre completo" : `Nombre del acompañante ${i}`
                    }
                    value={attendeeNames[i] || ""}
                    onChange={(e) => {
                      const newNames = [...attendeeNames];
                      newNames[i] = e.target.value;
                      setAttendeeNames(newNames);
                    }}
                    className="confirm-input"
                  />
                  {i === 0 && (
                    <p className="confirm-input-hint">
                      El primer nombre será el representante del grupo
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40 }}>
              <button
                type="submit"
                name="intent"
                value="confirm"
                disabled={isSubmitting}
                className="confirm-btn-primary"
                style={{ width: '100%' }}
              >
                {isSubmitting ? "Confirmando..." : "Confirmar asistencia"}
              </button>

              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                disabled={isSubmitting}
                className="confirm-btn-secondary"
              >
                No podré asistir
              </button>
            </div>
          </Form>

          <p className="confirm-footer">
            Patricia y Fernando agradecen tu respuesta
          </p>
        </div>
      </div>

      {/* Modal de confirmación para declinar */}
      {showDeclineModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="confirm-modal-title">¿Confirmar inasistencia?</h2>
            <p className="confirm-modal-text">
              Estás a punto de confirmar que <strong>ninguno de los {group.max_guests} invitado{group.max_guests > 1 ? "s" : ""}</strong> podrá asistir a la boda.
            </p>
            <p className="confirm-modal-text" style={{ marginTop: 8, fontSize: '0.95rem' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="confirm-modal-btn-cancel"
              >
                Cancelar
              </button>
              <Form method="post">
                <button
                  type="submit"
                  name="intent"
                  value="decline"
                  className="confirm-modal-btn-confirm"
                >
                  Sí, no podré asistir
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </ConfirmWrapper>
  );
}

export default function ConfirmPage() {
  const { group, guests, token } = useLoaderData<typeof loader>();

  if (group.status !== "pending") {
    return <AlreadyConfirmed group={group} guests={guests} token={token} />;
  }

  return <ConfirmationForm group={group} guests={guests} token={token} />;
}

export function ErrorBoundary() {
  return (
    <ConfirmWrapper>
      <div className="confirm-container">
        <div className="confirm-card-simple">
          <div className="confirm-rule" />
          <div className="confirm-icon error">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="confirm-title">Enlace no válido</h1>
          <p className="confirm-subtitle">
            No pudimos encontrar tu invitación. Por favor verifica el enlace o
            contacta a los novios.
          </p>
          <Link to="/" className="confirm-btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </ConfirmWrapper>
  );
}
