// M7 · Redes sociales / reputación vía Metricool. Panel de SOLO LECTURA: no se construye gestión de redes
// desde cero (spec). El userToken se guarda cifrado y no vuelve al navegador. Estado: beta — la API de
// Metricool exige token de un plan que la incluya; los errores se muestran tal cual para poder diagnosticarlos.
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { esAdminEnBase } from "../../lib/permisos.js";
import { encrypt, decrypt } from "../../lib/crypto.js";

const BASE = "https://app.metricool.com/api";

async function soloAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(await esAdminEnBase((req as any).user?.sub))) { res.status(403).json({ error: "Solo un administrador puede hacer esto" }); return; }
  next();
}

const CuentaSchema = z.object({
  nombre: z.string().min(2).max(120),
  user_token: z.string().min(10).max(500),
  external_user_id: z.string().max(40).regex(/^\d+$/, "El userId de Metricool es numérico"),
  blog_id: z.string().max(40).regex(/^\d*$/).optional(),
});

async function metricool(path: string, token: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}${path}?${qs}`, { headers: { "X-Mc-Auth": token, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  const txt = await r.text();
  let j: any = null; try { j = JSON.parse(txt); } catch {}
  if (!r.ok) throw new Error(`Metricool respondió HTTP ${r.status}${txt ? `: ${txt.slice(0, 160)}` : ""}`);
  return j ?? txt;
}

async function refrescar(id: string) {
  const c = (await query<any>("SELECT * FROM gozz.mk_social_accounts WHERE id = $1", [id]))[0];
  if (!c?.token_enc) throw new Error("La cuenta no tiene token");
  const perfiles = await metricool("/admin/simpleProfiles", decrypt(c.token_enc), { userId: c.external_user_id });
  await query(
    `INSERT INTO gozz.mk_social_cache (cuenta_id, tipo, payload) VALUES ($1,'perfiles',$2::jsonb)
     ON CONFLICT (cuenta_id, tipo) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()`,
    [id, JSON.stringify(perfiles)]
  );
  return perfiles;
}

export function registerSocialRoutes(app: Express) {
  app.get("/api/marketing/redes/cuentas", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT a.id, a.proveedor, a.nombre, a.external_user_id, a.blog_id, a.conectado, (a.token_enc IS NOT NULL) AS tiene_token,
              (SELECT payload FROM gozz.mk_social_cache k WHERE k.cuenta_id = a.id AND k.tipo = 'perfiles') AS perfiles,
              (SELECT fetched_at FROM gozz.mk_social_cache k WHERE k.cuenta_id = a.id AND k.tipo = 'perfiles') AS actualizado
         FROM gozz.mk_social_accounts a ORDER BY a.conectado DESC`
    );
    res.json({ cuentas: rows });
  });

  app.post("/api/marketing/redes/cuentas", requireAuth, soloAdmin, async (req, res) => {
    const p = CuentaSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data;
    const r = await query<{ id: string }>(
      "INSERT INTO gozz.mk_social_accounts (nombre, token_enc, external_user_id, blog_id) VALUES ($1,$2,$3,$4) RETURNING id",
      [d.nombre, encrypt(d.user_token), d.external_user_id, d.blog_id || null]
    );
    try { await refrescar(r[0].id); res.json({ id: r[0].id, conexion: "ok" }); }
    catch (e: any) { res.json({ id: r[0].id, conexion: "error", detalle: e?.message || String(e) }); }
  });

  app.post("/api/marketing/redes/cuentas/:id/actualizar", requireAuth, soloAdmin, async (req, res) => {
    try { await refrescar(String(req.params.id)); res.json({ ok: true }); }
    catch (e: any) { res.status(502).json({ error: e?.message || String(e) }); }
  });

  app.delete("/api/marketing/redes/cuentas/:id", requireAuth, soloAdmin, async (req, res) => {
    await query("DELETE FROM gozz.mk_social_accounts WHERE id = $1", [req.params.id]); // credencial: se elimina de verdad (el caché cae en cascada)
    res.json({ ok: true });
  });
}
