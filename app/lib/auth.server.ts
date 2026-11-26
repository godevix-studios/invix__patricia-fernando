/**
 * Utilidades de autenticación para el panel de administración
 * Usa Web Crypto API (disponible en Cloudflare Workers)
 */

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_SECRET = "patricia-fernando-2027-secret-key"; // En producción usar variable de entorno

/**
 * Genera un hash SHA-256 de una contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SESSION_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifica si una contraseña coincide con el hash almacenado
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/**
 * Crea un token de sesión
 */
function createSessionToken(userId: number): string {
  const payload = {
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
  };
  // Codificar en base64
  return btoa(JSON.stringify(payload) + "." + SESSION_SECRET);
}

/**
 * Verifica y decodifica un token de sesión
 */
function verifySessionToken(token: string): { userId: number } | null {
  try {
    const decoded = atob(token);
    const [payloadStr] = decoded.split("." + SESSION_SECRET);
    const payload = JSON.parse(payloadStr);

    if (payload.exp < Date.now()) {
      return null; // Token expirado
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * Crea una cookie de sesión
 */
export function createSessionCookie(userId: number): string {
  const token = createSessionToken(userId);
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
}

/**
 * Crea una cookie para cerrar sesión
 */
export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Obtiene el usuario de la sesión desde las cookies
 */
export function getSessionFromCookie(
  cookieHeader: string | null
): { userId: number } | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) return null;

  return verifySessionToken(sessionToken);
}

/**
 * Verifica las credenciales contra la base de datos
 */
export async function verifyCredentials(
  db: D1Database,
  username: string,
  password: string
): Promise<{ id: number; username: string; is_superadmin: number } | null> {
  const user = await db
    .prepare("SELECT id, username, password_hash, is_superadmin FROM admin_users WHERE username = ?")
    .bind(username)
    .first<{ id: number; username: string; password_hash: string; is_superadmin: number }>();

  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  return { id: user.id, username: user.username, is_superadmin: user.is_superadmin };
}

/**
 * Verifica si el usuario está autenticado
 */
export async function requireAuth(
  request: Request,
  db: D1Database
): Promise<{ id: number; username: string; is_superadmin: number }> {
  const session = getSessionFromCookie(request.headers.get("Cookie"));

  if (!session) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/admin/login" },
    });
  }

  const user = await db
    .prepare("SELECT id, username, is_superadmin FROM admin_users WHERE id = ?")
    .bind(session.userId)
    .first<{ id: number; username: string; is_superadmin: number }>();

  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/login",
        "Set-Cookie": createLogoutCookie(),
      },
    });
  }

  return user;
}

/**
 * Verifica si hay sesión activa (sin redirigir)
 */
export function getSession(request: Request): { userId: number } | null {
  return getSessionFromCookie(request.headers.get("Cookie"));
}
