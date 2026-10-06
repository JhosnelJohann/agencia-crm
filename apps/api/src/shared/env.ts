// Lectura centralizada de las variables de entorno que usa el bootstrap del servidor (kernel).
// Las variables propias de cada dominio (email, R2, LiveKit, etc.) se leen donde se usan, no aquí.

export const PORT = Number(process.env.PORT) || 4300;
export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
// Compartir la cookie de sesion entre subdominios (ej. ".sandrogozz.com") permite que el
// frontend y la API vivan en hosts distintos (crm.sandrogozz.com / api.sandrogozz.com) y el
// socket.io del navegador siga autenticando via cookie al conectar directo a la API. Sin
// domain, la cookie queda host-only y no se envia a un origen distinto. Vacio = comportamiento
// de siempre (mismo origen, como en el VPS original detras de nginx).
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
export const UPLOADS_DIR = process.env.UPLOADS_DIR || "/root/agencia-crm/data/uploads";

// Orígenes que pueden llamar a la API privada CON cookie de sesión (CORS con credenciales y
// socket.io). Antes era `origin: true` = cualquier web podía hacer peticiones autenticadas con la
// sesión del usuario. APP_URL (https://agencia.sandrogozz.com) + extras separados por coma en
// CORS_ORIGINS; fuera de producción también los localhost del entorno de desarrollo.
const DEV_ORIGINS = ["http://localhost:3300", "http://127.0.0.1:3300", "http://localhost:3000"];
// Perezoso: se calcula en el primer uso, cuando dotenv ya cargó APP_URL (no depende del orden de imports).
let allowed: string[] | null = null;
export function allowedOrigins(): string[] {
  return (allowed ??= [
    process.env.APP_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
    ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
  ]
    .map((o) => (o || "").trim().replace(/\/$/, ""))
    .filter(Boolean));
}

/** Peticiones sin cabecera Origin (mismo origen en GET, curl, servidor-a-servidor) se aceptan. */
export function isAllowedOrigin(origin: string | undefined): boolean {
  return !origin || allowedOrigins().includes(origin.replace(/\/$/, ""));
}
