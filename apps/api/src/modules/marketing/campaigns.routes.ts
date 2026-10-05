// M5 · Segmentos y campañas de email, con seguimiento de aperturas/clics y baja obligatoria.
// (WhatsApp/SMS masivos quedan fuera de esta versión: WhatsApp exige plantillas aprobadas por Meta → Módulo 3.)
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { enviarEmailSimple } from "../../lib/enviar-email-simple.js";
import { publicarEvento } from "../../lib/marketing/eventos.js";
import { limitar } from "../../lib/marketing/rate-limit.js";

const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

const ReglasSchema = z.object({
  etiqueta: z.string().max(80).optional(),
  fuente: z.string().max(60).optional(),
  tipo_cliente: z.string().max(40).optional(),
  score_min: z.number().int().min(0).max(1000).optional(),
});
const SegmentoSchema = z.object({ nombre: z.string().min(2).max(120), reglas: ReglasSchema });
const CampanaSchema = z.object({
  nombre: z.string().min(2).max(140),
  segmento_id: z.string().uuid().nullable().optional(),
  asunto: z.string().min(1).max(200).optional(),
  contenido: z.string().max(60_000).optional(),
  buzon_id: z.string().uuid().nullable().optional(),
});

/** Condiciones SQL de un segmento. Siempre excluye archivados, bajas y contactos sin email. */
function whereSegmento(reglas: z.infer<typeof ReglasSchema> | null | undefined) {
  const w = ["c.archivado IS NOT TRUE", "c.mk_opt_out = false", "c.email IS NOT NULL", "c.email <> ''"];
  const p: any[] = [];
  const r = reglas || {};
  if (r.etiqueta) { p.push(r.etiqueta); w.push(`c.etiquetas @> to_jsonb($${p.length}::text)`); }
  if (r.fuente) { p.push(r.fuente); w.push(`c.fuente = $${p.length}`); }
  if (r.tipo_cliente) { p.push(r.tipo_cliente); w.push(`c.tipo_cliente = $${p.length}`); }
  if (r.score_min) { p.push(r.score_min); w.push(`COALESCE(s.score, 0) >= $${p.length}`); }
  return { where: w.join(" AND "), params: p };
}
const FROM_SEG = "FROM gozz.contactos_cache c LEFT JOIN gozz.mk_contact_scores s ON s.contacto_id = c.id";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Sustituye {{nombre}} {{empresa}} {{email}} y envuelve enlaces para medir clics. */
function renderizar(html: string, c: { nombre: string; empresa: string | null; email: string }, rid: string): string {
  let out = html
    .replace(/\{\{\s*nombre\s*\}\}/gi, esc(c.nombre.split(" ")[0] || "hola"))
    .replace(/\{\{\s*empresa\s*\}\}/gi, esc(c.empresa || ""))
    .replace(/\{\{\s*email\s*\}\}/gi, esc(c.email));
  out = out.replace(/href="(https?:\/\/[^"]+)"/gi, (_m, url) => `href="${APP_URL}/api/public/t/c/${rid}?u=${encodeURIComponent(url)}"`);
  const baja = `${APP_URL}/api/public/t/u/${rid}`;
  return `${out}
<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e5e5;font:12px/1.5 Arial,sans-serif;color:#888">
  Recibes este correo porque estás en nuestra lista de contactos. <a href="${baja}" style="color:#888">Darme de baja</a>.
</div>
<img src="${APP_URL}/api/public/t/o/${rid}.gif" width="1" height="1" alt="" style="display:block;border:0" />`;
}

const enviando = new Set<string>();

async function procesarEnvio(campaignId: string) {
  if (enviando.has(campaignId)) return;
  enviando.add(campaignId);
  try {
    const camp = (await query<any>("SELECT * FROM gozz.mk_campaigns WHERE id = $1", [campaignId]))[0];
    if (!camp) return;
    for (;;) {
      const lote = await query<any>(
        `SELECT r.id, r.destino, c.nombre_completo, c.empresa
           FROM gozz.mk_campaign_recipients r JOIN gozz.contactos_cache c ON c.id = r.contacto_id
          WHERE r.campaign_id = $1 AND r.estado = 'pendiente' ORDER BY r.id LIMIT 20`, [campaignId]
      );
      if (lote.length === 0) break;
      const estado = (await query<{ estado: string }>("SELECT estado FROM gozz.mk_campaigns WHERE id = $1", [campaignId]))[0]?.estado;
      if (estado === "pausada") return;
      for (const r of lote) {
        try {
          await enviarEmailSimple(camp.buzon_id, {
            to: r.destino,
            subject: camp.asunto || camp.nombre,
            html: renderizar(camp.contenido, { nombre: r.nombre_completo || "", empresa: r.empresa, email: r.destino }, r.id),
          });
          await query("UPDATE gozz.mk_campaign_recipients SET estado='enviado', enviado_at=now() WHERE id=$1", [r.id]);
          await query("UPDATE gozz.mk_campaigns SET enviados = enviados + 1 WHERE id=$1", [campaignId]);
        } catch (e: any) {
          await query("UPDATE gozz.mk_campaign_recipients SET estado='fallido', error=$2 WHERE id=$1", [r.id, String(e?.message || e).slice(0, 300)]);
          await query("UPDATE gozz.mk_campaigns SET fallidos = fallidos + 1 WHERE id=$1", [campaignId]);
        }
        await new Promise((ok) => setTimeout(ok, 350)); // ritmo suave: no quemar la reputación del buzón
      }
    }
    await query("UPDATE gozz.mk_campaigns SET estado='enviada', enviada_at=now() WHERE id=$1 AND estado='enviando'", [campaignId]);
    await publicarEvento("campaign_sent", { payload: { campana: camp.nombre, campana_id: campaignId } });
  } finally {
    enviando.delete(campaignId);
  }
}

// El envío es una tarea en el proceso de la API. Si se reinicia a mitad, se reanuda al arrancar.
export async function reanudarEnvios() {
  const pend = await query<{ id: string }>("SELECT id FROM gozz.mk_campaigns WHERE estado = 'enviando'");
  for (const c of pend) void procesarEnvio(c.id).catch((e) => console.error("[campañas] reanudar:", e?.message));
}

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export function registerCampaignsRoutes(app: Express) {
  // ─────────── Segmentos ───────────
  app.get("/api/marketing/segmentos", requireAuth, async (_req, res) => {
    const segs = await query<any>("SELECT * FROM gozz.mk_segments ORDER BY created_at DESC");
    for (const sg of segs) {
      const { where, params } = whereSegmento(sg.reglas);
      sg.total = (await query<{ n: number }>(`SELECT count(*)::int AS n ${FROM_SEG} WHERE ${where}`, params))[0].n;
    }
    res.json({ segmentos: segs });
  });

  app.post("/api/marketing/segmentos", requireAuth, async (req, res) => {
    const p = SegmentoSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const r = await query("INSERT INTO gozz.mk_segments (nombre, reglas) VALUES ($1,$2::jsonb) RETURNING *", [p.data.nombre, JSON.stringify(p.data.reglas)]);
    res.json({ segmento: r[0] });
  });

  app.delete("/api/marketing/segmentos/:id", requireAuth, async (req, res) => {
    await query("DELETE FROM gozz.mk_segments WHERE id = $1", [req.params.id]); // las campañas ya enviadas conservan su historial (segmento_id → NULL)
    res.json({ ok: true });
  });

  app.post("/api/marketing/segmentos/vista-previa", requireAuth, async (req, res) => {
    const p = ReglasSchema.safeParse(req.body?.reglas || {});
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const { where, params } = whereSegmento(p.data);
    const total = (await query<{ n: number }>(`SELECT count(*)::int AS n ${FROM_SEG} WHERE ${where}`, params))[0].n;
    const muestra = await query(`SELECT c.nombre_completo, c.email, c.empresa, COALESCE(s.score,0) AS score ${FROM_SEG} WHERE ${where} ORDER BY c.created_at DESC LIMIT 6`, params);
    res.json({ total, muestra });
  });

  // ─────────── Campañas ───────────
  app.get("/api/marketing/campanas", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT k.*, sg.nombre AS segmento_nombre,
              (SELECT count(*) FROM gozz.mk_campaign_recipients r WHERE r.campaign_id = k.id AND r.abierto_at IS NOT NULL)::int AS abiertos,
              (SELECT count(*) FROM gozz.mk_campaign_recipients r WHERE r.campaign_id = k.id AND r.clic_at IS NOT NULL)::int AS clics,
              (SELECT count(*) FROM gozz.mk_campaign_recipients r WHERE r.campaign_id = k.id AND r.estado = 'baja')::int AS bajas
         FROM gozz.mk_campaigns k LEFT JOIN gozz.mk_segments sg ON sg.id = k.segmento_id
        ORDER BY k.created_at DESC`
    );
    res.json({ campanas: rows });
  });

  app.get("/api/marketing/campanas/:id", requireAuth, async (req, res) => {
    const k = (await query<any>("SELECT * FROM gozz.mk_campaigns WHERE id = $1", [req.params.id]))[0];
    if (!k) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
    const dest = await query(
      `SELECT r.id, r.destino, r.estado, r.error, r.enviado_at, r.abierto_at, r.clic_at, c.nombre_completo
         FROM gozz.mk_campaign_recipients r JOIN gozz.contactos_cache c ON c.id = r.contacto_id
        WHERE r.campaign_id = $1 ORDER BY r.enviado_at DESC NULLS LAST LIMIT 200`, [req.params.id]
    );
    res.json({ campana: k, destinatarios: dest });
  });

  app.post("/api/marketing/campanas", requireAuth, async (req, res) => {
    const p = CampanaSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data; const u = (req as any).user;
    const r = await query(
      `INSERT INTO gozz.mk_campaigns (nombre, canal, segmento_id, asunto, contenido, buzon_id, creado_por)
       VALUES ($1,'email',$2,$3,$4,$5,$6) RETURNING *`,
      [d.nombre, d.segmento_id ?? null, d.asunto ?? d.nombre, d.contenido ?? "", d.buzon_id ?? null, u?.sub ?? null]
    );
    res.json({ campana: r[0] });
  });

  app.patch("/api/marketing/campanas/:id", requireAuth, async (req, res) => {
    const p = CampanaSchema.partial().safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const k = (await query<any>("SELECT estado FROM gozz.mk_campaigns WHERE id = $1", [req.params.id]))[0];
    if (!k) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
    if (k.estado !== "borrador") { res.status(409).json({ error: "Solo se puede editar una campaña en borrador." }); return; }
    const d = p.data as any; const sets: string[] = []; const vals: any[] = [];
    for (const c of ["nombre", "segmento_id", "asunto", "contenido", "buzon_id"]) if (d[c] !== undefined) { vals.push(d[c]); sets.push(`${c} = $${vals.length}`); }
    if (!sets.length) { res.json({ ok: true }); return; }
    vals.push(req.params.id);
    await query(`UPDATE gozz.mk_campaigns SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  });

  // Envío de prueba a la persona que lo pide.
  app.post("/api/marketing/campanas/:id/prueba", requireAuth, async (req, res) => {
    const k = (await query<any>("SELECT * FROM gozz.mk_campaigns WHERE id = $1", [req.params.id]))[0];
    if (!k) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
    if (!k.buzon_id) { res.status(400).json({ error: "Elige el buzón desde el que se envía." }); return; }
    const to = String((req as any).user?.email || "");
    try {
      await enviarEmailSimple(k.buzon_id, { to, subject: `[PRUEBA] ${k.asunto || k.nombre}`, html: k.contenido.replace(/\{\{\s*\w+\s*\}\}/g, "(dato)") });
      res.json({ ok: true, enviado_a: to });
    } catch (e: any) {
      res.status(502).json({ error: `No se pudo enviar: ${e?.message || e}` });
    }
  });

  app.post("/api/marketing/campanas/:id/enviar", requireAuth, async (req, res) => {
    const k = (await query<any>("SELECT * FROM gozz.mk_campaigns WHERE id = $1", [req.params.id]))[0];
    if (!k) { res.status(404).json({ error: "Campaña no encontrada" }); return; }
    if (!["borrador", "pausada"].includes(k.estado)) { res.status(409).json({ error: "Esta campaña ya se envió o se está enviando." }); return; }
    if (!k.buzon_id) { res.status(400).json({ error: "Elige el buzón desde el que se envía." }); return; }
    if (!k.asunto || !k.contenido.trim()) { res.status(400).json({ error: "Falta el asunto o el contenido." }); return; }
    const seg = k.segmento_id ? (await query<any>("SELECT reglas FROM gozz.mk_segments WHERE id = $1", [k.segmento_id]))[0] : null;
    const { where, params } = whereSegmento(seg?.reglas);
    await query(
      `INSERT INTO gozz.mk_campaign_recipients (campaign_id, contacto_id, destino)
       SELECT $${params.length + 1}, c.id, c.email ${FROM_SEG} WHERE ${where}
       ON CONFLICT (campaign_id, contacto_id) DO NOTHING`, [...params, k.id]
    );
    const total = (await query<{ n: number }>("SELECT count(*)::int AS n FROM gozz.mk_campaign_recipients WHERE campaign_id = $1", [k.id]))[0].n;
    if (total === 0) { res.status(400).json({ error: "El segmento no tiene contactos con correo." }); return; }
    await query("UPDATE gozz.mk_campaigns SET estado = 'enviando', total = $2 WHERE id = $1", [k.id, total]);
    void procesarEnvio(k.id).catch((e) => console.error("[campañas] envío:", e?.message));
    res.json({ ok: true, total });
  });

  app.post("/api/marketing/campanas/:id/pausar", requireAuth, async (req, res) => {
    await query("UPDATE gozz.mk_campaigns SET estado = 'pausada' WHERE id = $1 AND estado = 'enviando'", [req.params.id]);
    res.json({ ok: true });
  });

  app.delete("/api/marketing/campanas/:id", requireAuth, async (req, res) => {
    const k = (await query<any>("SELECT estado FROM gozz.mk_campaigns WHERE id = $1", [req.params.id]))[0];
    if (k && k.estado !== "borrador") { res.status(409).json({ error: "Solo se pueden eliminar borradores." }); return; }
    await query("DELETE FROM gozz.mk_campaigns WHERE id = $1 AND estado = 'borrador'", [req.params.id]);
    res.json({ ok: true });
  });

  // ─────────── Seguimiento público (aperturas, clics, baja) ───────────
  app.get("/api/public/t/o/:rid.gif", limitar("t-open", 300, 60_000), async (req: Request, res: Response) => {
    const r = (await query<any>(
      `UPDATE gozz.mk_campaign_recipients SET abierto_at = COALESCE(abierto_at, now()) WHERE id = $1 RETURNING contacto_id, (abierto_at > now() - interval '2 seconds') AS nuevo`, [req.params.rid]
    ).catch(() => []))[0];
    if (r?.nuevo) void publicarEvento("campaign_opened", { contactoId: r.contacto_id, payload: { recipient: req.params.rid } });
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" }).send(GIF);
  });

  app.get("/api/public/t/c/:rid", limitar("t-click", 300, 60_000), async (req: Request, res: Response) => {
    const url = String(req.query.u || "");
    if (!/^https?:\/\//i.test(url)) { res.status(400).send("Enlace no válido"); return; }
    // Anti "open redirect": solo se redirige a un enlace que de verdad está en el contenido de ESA campaña.
    const dueña = (await query<{ contenido: string }>(
      `SELECT k.contenido FROM gozz.mk_campaign_recipients r JOIN gozz.mk_campaigns k ON k.id = r.campaign_id WHERE r.id = $1`, [req.params.rid]
    ).catch(() => []))[0];
    if (!dueña || !dueña.contenido.includes(url)) { res.status(400).send("Enlace no válido"); return; }
    const r = (await query<any>(
      `UPDATE gozz.mk_campaign_recipients SET clic_at = COALESCE(clic_at, now()) WHERE id = $1 RETURNING contacto_id, (clic_at > now() - interval '2 seconds') AS nuevo`, [req.params.rid]
    ).catch(() => []))[0];
    if (r?.nuevo) void publicarEvento("campaign_clicked", { contactoId: r.contacto_id, payload: { recipient: req.params.rid, url } });
    res.redirect(302, url.replace(/&amp;/g, "&")); // el href del HTML trae &amp; en vez de &
  });

  const bajaHandler = async (req: Request, res: Response) => {
    const r = (await query<any>(
      `UPDATE gozz.mk_campaign_recipients SET estado = 'baja' WHERE id = $1 RETURNING contacto_id`, [req.params.rid]
    ).catch(() => []))[0];
    if (r) {
      await query("UPDATE gozz.contactos_cache SET mk_opt_out = true WHERE id = $1", [r.contacto_id]);
      await publicarEvento("campaign_unsubscribed", { contactoId: r.contacto_id, payload: { recipient: req.params.rid } });
    }
    res.set("Content-Type", "text/html; charset=utf-8").send(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja confirmada</title>
       <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0c;color:#f0ede8;font-family:Arial,sans-serif">
       <div style="text-align:center;max-width:420px;padding:24px"><div style="font-size:42px">✅</div>
       <h1 style="margin:12px 0 6px;letter-spacing:1px">Listo, te diste de baja</h1>
       <p style="color:#9b9490;line-height:1.5">No volverás a recibir correos de campañas. Si fue un error, escríbenos y te reactivamos.</p></div></body>`
    );
  };
  app.get("/api/public/t/u/:rid", limitar("t-unsub", 60, 60_000), bajaHandler);
  app.post("/api/public/t/u/:rid", limitar("t-unsub", 60, 60_000), bajaHandler); // baja con un clic (RFC 8058)
}
