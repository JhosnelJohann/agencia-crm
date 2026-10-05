// M4 · Cuentas publicitarias de Meta, gasto sincronizado, atribución lead→campaña y Conversions API.
// Solo lectura sobre Meta (no edita campañas ni presupuestos). Los tokens se guardan cifrados (APP_ENC_KEY)
// y NUNCA vuelven al navegador.
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { esAdminEnBase } from "../../lib/permisos.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { enviarConversion } from "../../lib/marketing/capi.js";

const GRAPH = "https://graph.facebook.com/v20.0";

async function soloAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(await esAdminEnBase((req as any).user?.sub))) { res.status(403).json({ error: "Solo un administrador puede hacer esto" }); return; }
  next();
}

const CuentaSchema = z.object({
  nombre: z.string().min(2).max(120),
  external_account_id: z.string().min(3).max(60).regex(/^(act_)?\d+$/, "Formato: act_1234567890 o solo los dígitos"),
  access_token: z.string().min(20).max(1000).optional(),
  pixel_id: z.string().max(40).regex(/^\d*$/).optional(),
  capi_token: z.string().max(1000).optional(),
  moneda: z.string().length(3).optional(),
});

async function graph(path: string, token: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${GRAPH}${path}${sep}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20_000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.message || `Meta respondió HTTP ${r.status}`);
  return j;
}

async function sincronizar(cuentaId: string) {
  const c = (await query<any>("SELECT * FROM gozz.mk_ad_accounts WHERE id = $1", [cuentaId]))[0];
  if (!c) throw new Error("Cuenta no encontrada");
  if (!c.access_token_enc) throw new Error("La cuenta no tiene token de acceso");
  const token = decrypt(c.access_token_enc);
  const act = c.external_account_id.startsWith("act_") ? c.external_account_id : `act_${c.external_account_id}`;
  try {
    const camps = await graph(`/${act}/campaigns?fields=id,name,objective,status&limit=200`, token);
    const ins = await graph(`/${act}/insights?level=campaign&fields=campaign_id,spend,impressions,clicks,actions&date_preset=last_30d&limit=500`, token);
    const porId = new Map<string, any>((ins.data || []).map((x: any) => [x.campaign_id, x]));
    for (const k of camps.data || []) {
      const i = porId.get(k.id) || {};
      const leads = (i.actions || []).filter((a: any) => /lead/i.test(a.action_type)).reduce((n: number, a: any) => n + Number(a.value || 0), 0);
      await query(
        `INSERT INTO gozz.mk_ad_campaigns (ad_account_id, external_id, nombre, objetivo, estado, gasto, impresiones, clics, leads, last_synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
         ON CONFLICT (ad_account_id, external_id) DO UPDATE SET nombre=EXCLUDED.nombre, objetivo=EXCLUDED.objetivo, estado=EXCLUDED.estado,
           gasto=EXCLUDED.gasto, impresiones=EXCLUDED.impresiones, clics=EXCLUDED.clics, leads=EXCLUDED.leads, last_synced_at=now()`,
        [cuentaId, k.id, k.name, k.objective, k.status, Number(i.spend || 0), Number(i.impressions || 0), Number(i.clicks || 0), Math.round(leads)]
      );
    }
    await query("UPDATE gozz.mk_ad_accounts SET ultima_sync = now(), ultimo_error = NULL WHERE id = $1", [cuentaId]);
    return { campanas: (camps.data || []).length };
  } catch (e: any) {
    await query("UPDATE gozz.mk_ad_accounts SET ultimo_error = $2 WHERE id = $1", [cuentaId, String(e?.message || e).slice(0, 300)]);
    throw e;
  }
}

// Meta no avisa por webhook del gasto: se sincroniza cada 6 h en el proceso de la API.
export function iniciarSyncAnuncios() {
  const t = setInterval(async () => {
    try {
      const cs = await query<{ id: string }>("SELECT id FROM gozz.mk_ad_accounts WHERE estado = 'activa' AND access_token_enc IS NOT NULL");
      for (const c of cs) await sincronizar(c.id).catch((e) => console.error("[ads sync]", e?.message));
    } catch (e: any) { console.error("[ads sync]", e?.message); }
  }, 6 * 3600_000);
  t.unref();
}

export function registerAdsRoutes(app: Express) {
  app.get("/api/marketing/anuncios/cuentas", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT id, proveedor, nombre, external_account_id, pixel_id, moneda, estado, ultima_sync, ultimo_error, connected_at,
              (access_token_enc IS NOT NULL) AS tiene_token, (capi_token_enc IS NOT NULL) AS tiene_capi
         FROM gozz.mk_ad_accounts WHERE estado <> 'desconectada' ORDER BY connected_at DESC`
    );
    res.json({ cuentas: rows });
  });

  app.post("/api/marketing/anuncios/cuentas", requireAuth, soloAdmin, async (req, res) => {
    const p = CuentaSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data;
    const ext = d.external_account_id.startsWith("act_") ? d.external_account_id : `act_${d.external_account_id}`;
    const r = await query(
      `INSERT INTO gozz.mk_ad_accounts (nombre, external_account_id, access_token_enc, pixel_id, capi_token_enc, moneda)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (proveedor, external_account_id) DO UPDATE SET nombre=EXCLUDED.nombre, estado='activa',
         access_token_enc = COALESCE(EXCLUDED.access_token_enc, gozz.mk_ad_accounts.access_token_enc),
         pixel_id = COALESCE(NULLIF(EXCLUDED.pixel_id,''), gozz.mk_ad_accounts.pixel_id),
         capi_token_enc = COALESCE(EXCLUDED.capi_token_enc, gozz.mk_ad_accounts.capi_token_enc)
       RETURNING id`,
      [d.nombre, ext, d.access_token ? encrypt(d.access_token) : null, d.pixel_id || null, d.capi_token ? encrypt(d.capi_token) : null, d.moneda || "USD"]
    );
    res.json({ id: r[0].id });
  });

  app.delete("/api/marketing/anuncios/cuentas/:id", requireAuth, soloAdmin, async (req, res) => {
    await query("UPDATE gozz.mk_ad_accounts SET estado = 'desconectada', access_token_enc = NULL, capi_token_enc = NULL WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  });

  app.post("/api/marketing/anuncios/cuentas/:id/sincronizar", requireAuth, soloAdmin, async (req, res) => {
    try { res.json({ ok: true, ...(await sincronizar(String(req.params.id))) }); }
    catch (e: any) { res.status(502).json({ error: `Meta: ${e?.message || e}` }); }
  });

  // Campañas sincronizadas + atribución: cuántos leads del CRM llegaron de cada una y cuánto valen ya.
  app.get("/api/marketing/anuncios/campanas", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT k.id, k.external_id, k.nombre, k.objetivo, k.estado, k.gasto, k.impresiones, k.clics, k.leads AS leads_meta, k.last_synced_at,
              a.nombre AS cuenta, a.moneda,
              (SELECT count(DISTINCT x.contacto_id) FROM gozz.mk_lead_attribution x
                WHERE x.utm_campaign IS NOT NULL AND (lower(x.utm_campaign) = lower(k.nombre) OR x.utm_campaign = k.external_id))::int AS leads_crm
         FROM gozz.mk_ad_campaigns k JOIN gozz.mk_ad_accounts a ON a.id = k.ad_account_id
        WHERE a.estado <> 'desconectada' ORDER BY k.gasto DESC`
    );
    res.json({ campanas: rows });
  });

  app.get("/api/marketing/anuncios/atribucion", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT COALESCE(a.utm_campaign, '(sin campaña)') AS campana, COALESCE(a.utm_source, 'directo') AS fuente,
              count(DISTINCT a.contacto_id)::int AS leads,
              count(DISTINCT o.id) FILTER (WHERE o.etapa = 'ganado')::int AS ganadas,
              COALESCE(sum(o.valor_total) FILTER (WHERE o.etapa = 'ganado'), 0)::float AS ingresos,
              COALESCE((SELECT sum(k.gasto) FROM gozz.mk_ad_campaigns k WHERE lower(k.nombre) = lower(a.utm_campaign) OR k.external_id = a.utm_campaign), 0)::float AS gasto
         FROM gozz.mk_lead_attribution a LEFT JOIN gozz.oportunidades o ON o.contacto_id = a.contacto_id
        GROUP BY 1, 2, a.utm_campaign ORDER BY leads DESC LIMIT 50`
    );
    res.json({ atribucion: rows });
  });

  app.get("/api/marketing/anuncios/conversiones", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT e.id, e.evento, e.estado, e.respuesta, e.created_at, c.nombre_completo
         FROM gozz.mk_conversion_events e LEFT JOIN gozz.contactos_cache c ON c.id = e.contacto_id ORDER BY e.created_at DESC LIMIT 50`
    );
    res.json({ conversiones: rows });
  });

  app.post("/api/marketing/anuncios/conversiones/enviar", requireAuth, soloAdmin, async (req, res) => {
    const ev = String(req.body?.evento || "");
    if (!["Lead", "Schedule", "Purchase"].includes(ev) || !req.body?.contacto_id) { res.status(400).json({ error: "contacto_id y evento (Lead|Schedule|Purchase) requeridos" }); return; }
    res.json(await enviarConversion({ contactoId: String(req.body.contacto_id), evento: ev as any, valor: Number(req.body.valor) || undefined }));
  });
}
