// M2 (eventos + webhooks a n8n) y M6 (lead scoring): administración.
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { esAdminEnBase } from "../../lib/permisos.js";
import { publicarEvento } from "../../lib/marketing/eventos.js";

async function soloAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(await esAdminEnBase((req as any).user?.sub))) { res.status(403).json({ error: "Solo un administrador puede hacer esto" }); return; }
  next();
}

/** Catálogo de eventos que el CRM publica hoy (para los desplegables de la interfaz). */
export const TIPOS_EVENTO = [
  { tipo: "form_submitted", nombre: "Formulario enviado", descripcion: "Alguien llenó un formulario público." },
  { tipo: "contact_created", nombre: "Contacto creado", descripcion: "Se dio de alta un contacto nuevo." },
  { tipo: "stage_changed", nombre: "Cambio de etapa", descripcion: "Una oportunidad cambió de etapa (payload: desde, hacia)." },
  { tipo: "whatsapp_message_received", nombre: "WhatsApp recibido", descripcion: "Entró un mensaje de un contacto por WhatsApp." },
  { tipo: "task_completed", nombre: "Tarea completada", descripcion: "Se marcó como completada una tarea." },
  { tipo: "campaign_sent", nombre: "Campaña enviada", descripcion: "Terminó el envío de una campaña." },
  { tipo: "campaign_opened", nombre: "Correo abierto", descripcion: "Un contacto abrió un correo de campaña." },
  { tipo: "campaign_clicked", nombre: "Clic en correo", descripcion: "Un contacto hizo clic en un enlace de campaña." },
  { tipo: "campaign_unsubscribed", nombre: "Baja de campañas", descripcion: "Un contacto se dio de baja." },
];

const TriggerSchema = z.object({
  nombre: z.string().min(2).max(120),
  evento: z.string().min(1).max(60),
  webhook_url: z.string().url().max(500),
  secreto: z.string().max(200).nullable().optional(),
  filtro: z.record(z.string()).optional(),
  estado: z.enum(["activo", "pausado"]).optional(),
});

const ReglaSchema = z.object({
  nombre: z.string().min(2).max(140),
  evento: z.string().min(1).max(60),
  puntos: z.number().int().min(-500).max(500),
  condicion: z.record(z.string()).optional(),
  activo: z.boolean().optional(),
});

export function registerMarketingCoreRoutes(app: Express) {
  // ───────────── Eventos y webhooks ─────────────
  app.get("/api/marketing/eventos/tipos", requireAuth, (_req, res) => { res.json({ tipos: TIPOS_EVENTO }); });

  app.get("/api/marketing/eventos", requireAuth, async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await query(
      `SELECT e.id, e.tipo, e.payload, e.created_at, e.contacto_id, c.nombre_completo AS contacto_nombre
         FROM gozz.mk_events e LEFT JOIN gozz.contactos_cache c ON c.id = e.contacto_id
        ORDER BY e.id DESC LIMIT $1`, [limit]
    );
    res.json({ eventos: rows });
  });

  app.get("/api/marketing/automatizaciones/triggers", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT t.id, t.nombre, t.evento, t.webhook_url, (t.secreto IS NOT NULL AND t.secreto <> '') AS tiene_secreto, t.filtro, t.estado, t.created_at,
              (SELECT count(*) FROM gozz.mk_automation_runs r WHERE r.trigger_id = t.id)::int AS ejecuciones,
              (SELECT count(*) FROM gozz.mk_automation_runs r WHERE r.trigger_id = t.id AND r.estado = 'fallido')::int AS fallos,
              (SELECT max(r.triggered_at) FROM gozz.mk_automation_runs r WHERE r.trigger_id = t.id) AS ultima
         FROM gozz.mk_automation_triggers t ORDER BY t.created_at DESC`
    );
    res.json({ triggers: rows });
  });

  app.post("/api/marketing/automatizaciones/triggers", requireAuth, soloAdmin, async (req, res) => {
    const p = TriggerSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data;
    const r = await query(
      `INSERT INTO gozz.mk_automation_triggers (nombre, evento, webhook_url, secreto, filtro, estado) VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING id`,
      [d.nombre, d.evento, d.webhook_url, d.secreto || null, JSON.stringify(d.filtro ?? {}), d.estado ?? "activo"]
    );
    res.json({ id: r[0].id });
  });

  app.patch("/api/marketing/automatizaciones/triggers/:id", requireAuth, soloAdmin, async (req, res) => {
    const p = TriggerSchema.partial().safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data as any;
    const sets: string[] = []; const vals: any[] = [];
    for (const k of ["nombre", "evento", "webhook_url", "estado"]) if (d[k] !== undefined) { vals.push(d[k]); sets.push(`${k} = $${vals.length}`); }
    if (d.secreto !== undefined) { vals.push(d.secreto || null); sets.push(`secreto = $${vals.length}`); }
    if (d.filtro !== undefined) { vals.push(JSON.stringify(d.filtro)); sets.push(`filtro = $${vals.length}::jsonb`); }
    if (!sets.length) { res.json({ ok: true }); return; }
    vals.push(req.params.id);
    await query(`UPDATE gozz.mk_automation_triggers SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  });

  // Es configuración, no datos de negocio: se elimina; las ejecuciones pasadas se conservan (trigger_id → NULL).
  app.delete("/api/marketing/automatizaciones/triggers/:id", requireAuth, soloAdmin, async (req, res) => {
    await query("DELETE FROM gozz.mk_automation_triggers WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  });

  app.get("/api/marketing/automatizaciones/ejecuciones", requireAuth, async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await query(
      `SELECT r.id, r.estado, r.status_code, r.error, r.duracion_ms, r.triggered_at, t.nombre AS trigger_nombre, e.tipo AS evento
         FROM gozz.mk_automation_runs r
         LEFT JOIN gozz.mk_automation_triggers t ON t.id = r.trigger_id
         LEFT JOIN gozz.mk_events e ON e.id = r.evento_id
        ORDER BY r.triggered_at DESC LIMIT $1`, [limit]
    );
    res.json({ ejecuciones: rows });
  });

  // Publica un evento de prueba (sin contacto) para verificar el webhook desde la interfaz.
  app.post("/api/marketing/automatizaciones/probar", requireAuth, soloAdmin, async (req, res) => {
    const tipo = String(req.body?.evento || "");
    if (!tipo) { res.status(400).json({ error: "evento requerido" }); return; }
    const id = await publicarEvento(tipo, { payload: { prueba: true, enviado_por: (req as any).user?.email } });
    res.json({ ok: true, evento_id: id });
  });

  // ───────────── Lead scoring ─────────────
  app.get("/api/marketing/scoring/reglas", requireAuth, async (_req, res) => {
    res.json({ reglas: await query("SELECT * FROM gozz.mk_scoring_rules ORDER BY puntos DESC, nombre") });
  });

  app.post("/api/marketing/scoring/reglas", requireAuth, soloAdmin, async (req, res) => {
    const p = ReglaSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data;
    const r = await query(
      "INSERT INTO gozz.mk_scoring_rules (nombre, evento, puntos, condicion, activo) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING *",
      [d.nombre, d.evento, d.puntos, JSON.stringify(d.condicion ?? {}), d.activo ?? true]
    );
    res.json({ regla: r[0] });
  });

  app.patch("/api/marketing/scoring/reglas/:id", requireAuth, soloAdmin, async (req, res) => {
    const p = ReglaSchema.partial().safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data as any;
    const sets: string[] = []; const vals: any[] = [];
    for (const k of ["nombre", "evento", "puntos", "activo"]) if (d[k] !== undefined) { vals.push(d[k]); sets.push(`${k} = $${vals.length}`); }
    if (d.condicion !== undefined) { vals.push(JSON.stringify(d.condicion)); sets.push(`condicion = $${vals.length}::jsonb`); }
    if (!sets.length) { res.json({ ok: true }); return; }
    vals.push(req.params.id);
    await query(`UPDATE gozz.mk_scoring_rules SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  });

  app.delete("/api/marketing/scoring/reglas/:id", requireAuth, soloAdmin, async (req, res) => {
    await query("UPDATE gozz.mk_scoring_rules SET activo = false WHERE id = $1", [req.params.id]); // archivar: el historial de puntos sigue apuntando a ella
    res.json({ ok: true });
  });

  app.get("/api/marketing/scoring/ranking", requireAuth, async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const rows = await query(
      `SELECT s.contacto_id, s.score, s.updated_at, c.nombre_completo, c.email, c.empresa, c.fuente, c.etiquetas
         FROM gozz.mk_contact_scores s JOIN gozz.contactos_cache c ON c.id = s.contacto_id
        WHERE c.archivado IS NOT TRUE ORDER BY s.score DESC, s.updated_at DESC LIMIT $1`, [limit]
    );
    const dist = (await query<any>(
      `SELECT count(*) FILTER (WHERE score >= 60)::int AS calientes,
              count(*) FILTER (WHERE score >= 25 AND score < 60)::int AS tibios,
              count(*) FILTER (WHERE score < 25)::int AS frios
         FROM gozz.mk_contact_scores`
    ))[0];
    res.json({ ranking: rows, distribucion: dist });
  });

  // Ficha de marketing de UN contacto: puntaje, origen, envíos de formularios y línea de eventos.
  app.get("/api/marketing/contacto/:id", requireAuth, async (req, res) => {
    const id = req.params.id;
    const [score, hist, attr, envios, eventos, camp] = await Promise.all([
      query<{ score: number }>("SELECT score FROM gozz.mk_contact_scores WHERE contacto_id = $1", [id]),
      query(`SELECT l.puntos, l.evento, l.created_at, r.nombre AS regla FROM gozz.mk_score_log l LEFT JOIN gozz.mk_scoring_rules r ON r.id = l.regla_id WHERE l.contacto_id = $1 ORDER BY l.created_at DESC LIMIT 15`, [id]),
      query(`SELECT utm_source, utm_medium, utm_campaign, utm_content, fbclid, metodo, created_at FROM gozz.mk_lead_attribution WHERE contacto_id = $1 ORDER BY created_at ASC LIMIT 5`, [id]),
      query(`SELECT x.id, x.created_at, f.nombre AS formulario, x.payload FROM gozz.mk_form_submissions x JOIN gozz.mk_forms f ON f.id = x.form_id WHERE x.contacto_id = $1 ORDER BY x.created_at DESC LIMIT 10`, [id]),
      query(`SELECT id, tipo, payload, created_at FROM gozz.mk_events WHERE contacto_id = $1 ORDER BY id DESC LIMIT 20`, [id]),
      query(`SELECT k.nombre, r.estado, r.enviado_at, r.abierto_at, r.clic_at FROM gozz.mk_campaign_recipients r JOIN gozz.mk_campaigns k ON k.id = r.campaign_id WHERE r.contacto_id = $1 ORDER BY r.enviado_at DESC NULLS LAST LIMIT 10`, [id]),
    ]);
    res.json({ score: score[0]?.score ?? 0, historial: hist, atribucion: attr, envios, eventos, campanas: camp });
  });

  app.get("/api/marketing/scoring/contacto/:id", requireAuth, async (req, res) => {
    const s = (await query<{ score: number }>("SELECT score FROM gozz.mk_contact_scores WHERE contacto_id = $1", [req.params.id]))[0];
    const log = await query(
      `SELECT l.puntos, l.evento, l.created_at, r.nombre AS regla FROM gozz.mk_score_log l LEFT JOIN gozz.mk_scoring_rules r ON r.id = l.regla_id
        WHERE l.contacto_id = $1 ORDER BY l.created_at DESC LIMIT 30`, [req.params.id]
    );
    res.json({ score: s?.score ?? 0, historial: log });
  });
}
