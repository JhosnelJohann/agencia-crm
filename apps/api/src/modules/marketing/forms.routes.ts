// M1 · Formularios / embudos: administración (autenticada) y captura pública con tracking UTM.
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { limitar, ipHash } from "../../lib/marketing/rate-limit.js";
import { publicarEvento } from "../../lib/marketing/eventos.js";
import { upsertContacto, emailValido } from "../../lib/marketing/contacto-upsert.js";
import * as oportunidades from "../oportunidades/oportunidades.service.js";

const TIPOS = ["text", "email", "tel", "textarea", "select", "checkbox", "url"] as const;
const CampoSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(120),
  type: z.enum(TIPOS),
  required: z.boolean().default(false),
  placeholder: z.string().max(160).optional(),
  options: z.array(z.string().max(120)).max(30).optional(),
});
const FormSchema = z.object({
  nombre: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  descripcion: z.string().max(400).nullable().optional(),
  titulo_publico: z.string().max(160).nullable().optional(),
  boton_texto: z.string().min(1).max(40).optional(),
  campos: z.array(CampoSchema).min(1).max(30),
  mensaje_gracias: z.string().max(400).optional(),
  redirect_url: z.string().url().max(400).nullable().or(z.literal("")).optional(),
  estado: z.enum(["borrador", "activo", "pausado"]).optional(),
  crear_oportunidad: z.boolean().optional(),
  etapa_key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/).optional(),
  etiqueta: z.string().max(60).nullable().optional(),
});

/** Campos que el formulario mapea directamente a columnas del contacto. */
const CAMPOS_CONTACTO = ["nombre", "email", "telefono", "empresa", "cargo", "sitio_web", "industria"] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "formulario";

async function slugLibre(base: string, exceptoId?: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 20; i++) {
    const cand = i === 0 ? slug : `${slug}-${i + 1}`;
    const r = await query("SELECT 1 FROM gozz.mk_forms WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2)", [cand, exceptoId ?? null]);
    if (r.length === 0) return cand;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

const s = (v: any, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "") || null;

export function registerFormsRoutes(app: Express) {
  // ─────────────────────────────── Administración ───────────────────────────────
  app.get("/api/marketing/forms", requireAuth, async (_req, res) => {
    const rows = await query(
      `SELECT f.*,
              (SELECT count(*) FROM gozz.mk_page_views v WHERE v.form_id = f.id)::int AS vistas,
              (SELECT count(*) FROM gozz.mk_form_submissions x WHERE x.form_id = f.id)::int AS envios,
              (SELECT count(*) FROM gozz.mk_form_submissions x WHERE x.form_id = f.id AND x.created_at > now() - interval '7 days')::int AS envios_7d
         FROM gozz.mk_forms f WHERE f.archivado = false ORDER BY f.created_at DESC`
    );
    res.json({ formularios: rows });
  });

  app.get("/api/marketing/forms/:id", requireAuth, async (req, res) => {
    const f = (await query("SELECT * FROM gozz.mk_forms WHERE id = $1 AND archivado = false", [req.params.id]))[0];
    if (!f) { res.status(404).json({ error: "Formulario no encontrado" }); return; }
    const serie = await query(
      `SELECT d::date AS dia,
              (SELECT count(*) FROM gozz.mk_page_views v WHERE v.form_id = $1 AND v.viewed_at::date = d::date)::int AS vistas,
              (SELECT count(*) FROM gozz.mk_form_submissions x WHERE x.form_id = $1 AND x.created_at::date = d::date)::int AS envios
         FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d`,
      [req.params.id]
    );
    const fuentes = await query(
      `SELECT COALESCE(utm_source, 'directo') AS fuente, count(*)::int AS envios
         FROM gozz.mk_form_submissions WHERE form_id = $1 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      [req.params.id]
    );
    res.json({ formulario: f, serie, fuentes });
  });

  app.post("/api/marketing/forms", requireAuth, async (req, res) => {
    const p = FormSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data;
    const slug = await slugLibre(d.slug || d.nombre);
    const u = (req as any).user;
    const r = await query(
      `INSERT INTO gozz.mk_forms (nombre, slug, descripcion, titulo_publico, boton_texto, campos, mensaje_gracias, redirect_url,
                                  estado, crear_oportunidad, etapa_key, etiqueta, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [d.nombre, slug, d.descripcion ?? null, d.titulo_publico ?? null, d.boton_texto ?? "Enviar", JSON.stringify(d.campos),
       d.mensaje_gracias ?? "¡Gracias! Te contactaremos muy pronto.", d.redirect_url || null, d.estado ?? "borrador",
       d.crear_oportunidad ?? true, d.etapa_key ?? "nuevo", d.etiqueta ?? null, u?.sub ?? null]
    );
    res.json({ formulario: r[0] });
  });

  app.patch("/api/marketing/forms/:id", requireAuth, async (req, res) => {
    const p = FormSchema.partial().safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const d = p.data as any;
    const sets: string[] = []; const vals: any[] = [];
    const add = (col: string, v: any, cast = "") => { vals.push(v); sets.push(`${col} = $${vals.length}${cast}`); };
    if (d.nombre !== undefined) add("nombre", d.nombre);
    if (d.slug !== undefined) add("slug", await slugLibre(d.slug, String(req.params.id)));
    for (const k of ["descripcion", "titulo_publico", "boton_texto", "mensaje_gracias", "estado", "crear_oportunidad", "etapa_key", "etiqueta"]) {
      if (d[k] !== undefined) add(k, d[k]);
    }
    if (d.redirect_url !== undefined) add("redirect_url", d.redirect_url || null);
    if (d.campos !== undefined) add("campos", JSON.stringify(d.campos), "::jsonb");
    if (sets.length === 0) { res.json({ ok: true }); return; }
    sets.push("updated_at = now()");
    vals.push(req.params.id);
    const r = await query(`UPDATE gozz.mk_forms SET ${sets.join(", ")} WHERE id = $${vals.length} AND archivado = false RETURNING *`, vals);
    if (!r[0]) { res.status(404).json({ error: "Formulario no encontrado" }); return; }
    res.json({ formulario: r[0] });
  });

  // Nada se borra: archivar es reversible (regla de la casa).
  app.delete("/api/marketing/forms/:id", requireAuth, async (req, res) => {
    await query("UPDATE gozz.mk_forms SET archivado = true, estado = 'pausado', updated_at = now() WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  });

  app.post("/api/marketing/forms/:id/duplicar", requireAuth, async (req, res) => {
    const f = (await query<any>("SELECT * FROM gozz.mk_forms WHERE id = $1", [req.params.id]))[0];
    if (!f) { res.status(404).json({ error: "Formulario no encontrado" }); return; }
    const u = (req as any).user;
    const slug = await slugLibre(`${f.slug}-copia`);
    const r = await query(
      `INSERT INTO gozz.mk_forms (nombre, slug, descripcion, titulo_publico, boton_texto, campos, mensaje_gracias, redirect_url,
                                  estado, crear_oportunidad, etapa_key, etiqueta, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'borrador',$9,$10,$11,$12) RETURNING *`,
      [`${f.nombre} (copia)`, slug, f.descripcion, f.titulo_publico, f.boton_texto, JSON.stringify(f.campos), f.mensaje_gracias,
       f.redirect_url, f.crear_oportunidad, f.etapa_key, f.etiqueta, u?.sub ?? null]
    );
    res.json({ formulario: r[0] });
  });

  app.get("/api/marketing/forms/:id/envios", requireAuth, async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const rows = await query(
      `SELECT x.id, x.payload, x.utm_source, x.utm_medium, x.utm_campaign, x.fbclid, x.landing_url, x.created_at,
              x.contacto_id, x.oportunidad_id, c.nombre_completo AS contacto_nombre, c.email AS contacto_email
         FROM gozz.mk_form_submissions x LEFT JOIN gozz.contactos_cache c ON c.id = x.contacto_id
        WHERE x.form_id = $1 ORDER BY x.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, size, (page - 1) * size]
    );
    const total = (await query<{ n: number }>("SELECT count(*)::int AS n FROM gozz.mk_form_submissions WHERE form_id = $1", [req.params.id]))[0].n;
    res.json({ envios: rows, total, page, pageSize: size });
  });

  // Resumen de marketing: alimenta el panel del módulo.
  app.get("/api/marketing/resumen", requireAuth, async (_req, res) => {
    const kpis = (await query<any>(
      `SELECT
         (SELECT count(*) FROM gozz.mk_page_views WHERE viewed_at > now() - interval '30 days')::int AS vistas_30d,
         (SELECT count(*) FROM gozz.mk_form_submissions WHERE created_at > now() - interval '30 days')::int AS envios_30d,
         (SELECT count(*) FROM gozz.mk_forms WHERE archivado = false AND estado = 'activo')::int AS formularios_activos,
         (SELECT count(*) FROM gozz.contactos_cache WHERE archivado IS NOT TRUE AND created_at > now() - interval '30 days')::int AS contactos_30d`
    ))[0];
    const fuentes = await query(
      `SELECT COALESCE(utm_source, 'directo') AS fuente, count(*)::int AS envios
         FROM gozz.mk_form_submissions WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`
    );
    const serie = await query(
      `SELECT d::date AS dia,
              (SELECT count(*) FROM gozz.mk_page_views v WHERE v.viewed_at::date = d::date)::int AS vistas,
              (SELECT count(*) FROM gozz.mk_form_submissions x WHERE x.created_at::date = d::date)::int AS envios
         FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d`
    );
    res.json({ kpis, fuentes, serie });
  });

  // ─────────────────────────────── Públicos (sin sesión) ───────────────────────────────
  app.get("/api/public/forms/:slug", limitar("form-get", 120, 60_000), async (req, res) => {
    const f = (await query<any>(
      `SELECT id, nombre, slug, titulo_publico, descripcion, boton_texto, campos, mensaje_gracias, redirect_url
         FROM gozz.mk_forms WHERE slug = $1 AND estado = 'activo' AND archivado = false`, [req.params.slug]
    ))[0];
    if (!f) { res.status(404).json({ error: "Este formulario no está disponible." }); return; }
    res.json({ formulario: f });
  });

  app.post("/api/public/forms/:slug/submit", limitar("form-submit", 12, 10 * 60_000), async (req: Request, res: Response) => {
    const f = (await query<any>("SELECT * FROM gozz.mk_forms WHERE slug = $1 AND estado = 'activo' AND archivado = false", [req.params.slug]))[0];
    if (!f) { res.status(404).json({ error: "Este formulario no está disponible." }); return; }

    const b = req.body || {};
    // Cebo para bots: el campo `website_hp` está oculto para las personas. Si viene relleno, se responde "ok" sin guardar.
    if (typeof b.website_hp === "string" && b.website_hp.trim() !== "") { res.json({ ok: true, mensaje: f.mensaje_gracias }); return; }

    const datos: Record<string, any> = b.datos && typeof b.datos === "object" ? b.datos : {};
    const payload: Record<string, any> = {};
    const errores: Record<string, string> = {};
    for (const c of f.campos as any[]) {
      let v = datos[c.key];
      if (c.type === "checkbox") v = v === true || v === "true" || v === "on";
      else v = typeof v === "string" ? v.trim().slice(0, c.type === "textarea" ? 2000 : 300) : "";
      if (c.required && (v === "" || v === false)) { errores[c.key] = "Este campo es obligatorio"; continue; }
      if (v && c.type === "email" && !emailValido(String(v))) errores[c.key] = "Correo no válido";
      if (c.type === "select" && v && c.options?.length && !c.options.includes(v)) errores[c.key] = "Opción no válida";
      payload[c.key] = v;
    }
    if (Object.keys(errores).length) { res.status(400).json({ error: "Revisa los campos marcados.", errores }); return; }

    const utm = b.utm && typeof b.utm === "object" ? b.utm : {};
    const contactoIn: any = { fuente: "formulario", etiqueta: f.etiqueta, utm_source: s(utm.source), utm_medium: s(utm.medium), utm_campaign: s(utm.campaign) };
    for (const k of CAMPOS_CONTACTO) if (typeof payload[k] === "string") contactoIn[k] = payload[k];
    if (!contactoIn.email && !contactoIn.telefono) {
      res.status(400).json({ error: "Necesitamos un correo o un teléfono para poder contactarte.", errores: { email: "Indica al menos un medio de contacto" } });
      return;
    }

    const { id: contactoId, creado } = await upsertContacto(contactoIn);

    let oportunidadId: string | null = null;
    if (f.crear_oportunidad) {
      try {
        const nombre = contactoIn.nombre || contactoIn.email || "Nuevo lead";
        const op: any = await oportunidades.crear(
          { contacto_id: contactoId, nombre_caso: `${nombre} · ${f.nombre}`.slice(0, 150), etapa: f.etapa_key, notas: `Lead capturado por el formulario "${f.nombre}".` } as any,
          null, []
        );
        oportunidadId = op?.id ?? null;
      } catch (e: any) { console.error("[form submit] oportunidad:", e?.message); }
    }

    const sub = (await query<{ id: string }>(
      `INSERT INTO gozz.mk_form_submissions
         (form_id, contacto_id, oportunidad_id, payload, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, landing_url, referrer, session_id, ip_hash, user_agent)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [f.id, contactoId, oportunidadId, JSON.stringify(payload), s(utm.source, 120), s(utm.medium, 120), s(utm.campaign, 160), s(utm.content, 160), s(utm.term, 160),
       s(b.fbclid, 200), s(b.landing_url, 500), s(b.referrer, 500), s(b.session_id, 80), ipHash(req), s(req.headers["user-agent"] as string, 300)]
    ))[0];

    // Atribución lead → origen (fbclid es la señal fuerte; sin ella, solo UTM).
    await query(
      `INSERT INTO gozz.mk_lead_attribution (contacto_id, submission_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, metodo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [contactoId, sub.id, s(utm.source, 120), s(utm.medium, 120), s(utm.campaign, 160), s(utm.content, 160), s(utm.term, 160), s(b.fbclid, 200), b.fbclid ? "fbclid" : "utm_only"]
    ).catch(() => {});
    if (b.session_id) {
      await query("UPDATE gozz.mk_page_views SET contacto_id = $1 WHERE session_id = $2 AND contacto_id IS NULL", [contactoId, s(b.session_id, 80)]).catch(() => {});
    }

    await publicarEvento("form_submitted", { contactoId, oportunidadId, payload: { formulario: f.slug, formulario_nombre: f.nombre, utm_source: s(utm.source), utm_campaign: s(utm.campaign), ...payload } });
    if (creado) await publicarEvento("contact_created", { contactoId, payload: { origen: "formulario", formulario: f.slug } });

    res.json({ ok: true, mensaje: f.mensaje_gracias, redirect_url: f.redirect_url || null });
  });

  app.post("/api/public/track/pageview", limitar("track-pv", 90, 60_000), async (req, res) => {
    const b = req.body || {};
    const sessionId = s(b.session_id, 80);
    const landing = s(b.landing_url, 500);
    if (!sessionId || !landing) { res.status(400).json({ error: "session_id y landing_url requeridos" }); return; }
    const form = b.slug ? (await query<{ id: string }>("SELECT id FROM gozz.mk_forms WHERE slug = $1", [String(b.slug)]))[0] : undefined;
    const utm = b.utm && typeof b.utm === "object" ? b.utm : {};
    const r = await query<{ id: string }>(
      `INSERT INTO gozz.mk_page_views (form_id, session_id, landing_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [form?.id ?? null, sessionId, landing, s(b.referrer, 500), s(utm.source, 120), s(utm.medium, 120), s(utm.campaign, 160), s(utm.content, 160), s(utm.term, 160), s(b.fbclid, 200)]
    );
    res.json({ id: r[0].id });
  });

  app.post("/api/public/track/event", limitar("track-ev", 240, 60_000), async (req, res) => {
    const b = req.body || {};
    const tipo = s(b.tipo, 40);
    if (!b.page_view_id || !tipo || !/^[a-z0-9_]+$/.test(tipo)) { res.status(400).json({ error: "page_view_id y tipo requeridos" }); return; }
    await query("INSERT INTO gozz.mk_page_events (page_view_id, tipo, datos) VALUES ($1,$2,$3::jsonb)", [b.page_view_id, tipo, JSON.stringify(b.datos && typeof b.datos === "object" ? b.datos : {})]).catch(() => {});
    res.json({ ok: true });
  });
}
