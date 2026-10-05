// Límite de peticiones en memoria (ventana deslizante) para los endpoints PÚBLICOS de marketing.
// Es por proceso y por clave (IP hasheada): suficiente para frenar ráfagas y bots sencillos de un formulario
// abierto a internet, que es su único fin. No sustituye a un WAF.
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const cubetas = new Map<string, number[]>();

export function ipHash(req: Request): string {
  // nginx AÑADE la IP real al final de X-Forwarded-For: el primer valor lo controla el cliente (se podría falsear
  // para esquivar el límite), el último no.
  const xff = (req.headers["x-forwarded-for"] as string | undefined)?.split(",").map((x) => x.trim()).filter(Boolean);
  const ip = xff?.[xff.length - 1] || req.socket.remoteAddress || "?";
  return crypto.createHash("sha256").update(ip + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 16);
}

export function limitar(nombre: string, max: number, ventanaMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clave = `${nombre}:${ipHash(req)}`;
    const ahora = Date.now();
    const lista = (cubetas.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (lista.length >= max) {
      res.status(429).json({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos." });
      return;
    }
    lista.push(ahora);
    cubetas.set(clave, lista);
    next();
  };
}

// Limpieza periódica para que el mapa no crezca sin fin.
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of cubetas) if (v.every((t) => ahora - t > 3_600_000)) cubetas.delete(k);
}, 600_000).unref();
