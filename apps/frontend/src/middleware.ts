import { NextResponse, type NextRequest } from "next/server";

// /f/<slug> son los formularios públicos de captación (Módulo 1): deben abrirse sin sesión, también incrustados.
const PUBLIC_ROUTES = ["/login", "/api", "/f"];

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const payload = JSON.parse(atob(b64 + pad));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = req.cookies.get("access_token")?.value;
  const exp = token ? decodeJwtExp(token) : null;
  const tokenValid = !!exp && exp * 1000 > Date.now();

  if (!isPublic && !tokenValid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete("access_token");
    return res;
  }

  if (pathname === "/login" && tokenValid) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Los archivos estáticos de /public (iconos 3D, textura de grano, favicon…) deben poder cargarse
  // SIN sesión: los usa la propia pantalla de login.
  matcher: ["/((?!_next/static|_next/image|favicon\.(?:ico|svg)|logo-gozz\.(?:png|svg)|chat-bg\.jpg|login-bg\.(?:mp4|jpg)|sw\.js).*)"]
};
