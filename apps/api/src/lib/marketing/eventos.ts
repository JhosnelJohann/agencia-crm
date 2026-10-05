// Bus de eventos de marketing (Módulo 2 de la spec).
//
// Cada acción relevante del CRM publica un evento con `publicarEvento(...)`. Eso hace tres cosas, en este
// orden y SIN que nunca falle quien publica (un fallo aquí jamás debe romper el alta de un contacto o el
// cambio de etapa que lo originó):
//   1. lo persiste en `mk_events` (historial auditable),
//   2. aplica las reglas de lead scoring (`mk_scoring_rules`) al contacto,
//   3. reenvía el evento a los webhooks suscritos (`mk_automation_triggers`), normalmente workflows de n8n,
//      y deja el resultado en `mk_automation_runs`.
import { query } from "../../shared/db.js";
import { enviarConversion, eventoMeta } from "./capi.js";

export interface DatosEvento {
  contactoId?: string | null;
  oportunidadId?: string | null;
  payload?: Record<string, any>;
}

/** ¿Cumple `payload` la condición `{campo: valor}`? Igualdad estricta por texto; vacío = siempre. */
export function cumpleCondicion(condicion: Record<string, any> | null | undefined, payload: Record<string, any>): boolean {
  if (!condicion) return true;
  for (const [k, v] of Object.entries(condicion)) {
    if (v === "" || v === null || v === undefined) continue;
    const actual = k.split(".").reduce<any>((o, p) => (o == null ? undefined : o[p]), payload);
    if (String(actual ?? "") !== String(v)) return false;
  }
  return true;
}

export async function publicarEvento(tipo: string, datos: DatosEvento = {}): Promise<number | null> {
  try {
    const payload = datos.payload ?? {};
    const rows = await query<{ id: string }>(
      `INSERT INTO gozz.mk_events (tipo, contacto_id, oportunidad_id, payload)
       VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
      [tipo, datos.contactoId ?? null, datos.oportunidadId ?? null, JSON.stringify(payload)]
    );
    const id = Number(rows[0].id);
    // Scoring y webhooks van aparte y sin esperar: el llamador no debe pagar su latencia.
    void aplicarScoring(tipo, datos.contactoId ?? null, payload).catch((e) => console.error("[mk scoring]", e?.message));
    void despacharWebhooks(id, tipo, datos).catch((e) => console.error("[mk webhooks]", e?.message));
    const meta = eventoMeta(tipo, payload);
    if (meta && datos.contactoId) {
      void enviarConversion({ contactoId: datos.contactoId, evento: meta, valor: Number(payload.valor_total) || undefined, eventId: `${tipo}-${id}` })
        .catch((e) => console.error("[mk capi]", e?.message));
    }
    return id;
  } catch (e: any) {
    console.error("[mk publicarEvento]", tipo, e?.message);
    return null;
  }
}

async function aplicarScoring(tipo: string, contactoId: string | null, payload: Record<string, any>) {
  if (!contactoId) return;
  const reglas = await query<{ id: string; puntos: number; condicion: any }>(
    "SELECT id, puntos, condicion FROM gozz.mk_scoring_rules WHERE activo = true AND evento = $1",
    [tipo]
  );
  let delta = 0;
  for (const r of reglas) {
    if (!cumpleCondicion(r.condicion, payload)) continue;
    delta += r.puntos;
    await query("INSERT INTO gozz.mk_score_log (contacto_id, regla_id, evento, puntos) VALUES ($1,$2,$3,$4)", [contactoId, r.id, tipo, r.puntos]);
  }
  if (delta === 0) return;
  await query(
    `INSERT INTO gozz.mk_contact_scores (contacto_id, score) VALUES ($1, $2)
     ON CONFLICT (contacto_id) DO UPDATE SET score = gozz.mk_contact_scores.score + EXCLUDED.score, updated_at = now()`,
    [contactoId, delta]
  );
}

async function despacharWebhooks(eventoId: number, tipo: string, datos: DatosEvento) {
  const triggers = await query<{ id: string; webhook_url: string; secreto: string | null; filtro: any; nombre: string }>(
    `SELECT id, webhook_url, secreto, filtro, nombre FROM gozz.mk_automation_triggers
      WHERE estado = 'activo' AND (evento = $1 OR evento = '*')`,
    [tipo]
  );
  if (triggers.length === 0) return;

  let contacto: any = null;
  if (datos.contactoId) {
    const c = await query<any>(
      `SELECT c.id, c.nombre_completo, c.email, c.telefono, c.whatsapp, c.empresa, c.etiquetas, c.fuente,
              COALESCE(s.score, 0) AS score
         FROM gozz.contactos_cache c LEFT JOIN gozz.mk_contact_scores s ON s.contacto_id = c.id
        WHERE c.id = $1`,
      [datos.contactoId]
    );
    contacto = c[0] ?? null;
  }
  const cuerpo = JSON.stringify({ evento: tipo, evento_id: eventoId, contacto, oportunidad_id: datos.oportunidadId ?? null, payload: datos.payload ?? {}, at: new Date().toISOString() });

  await Promise.all(triggers.map(async (t) => {
    if (!cumpleCondicion(t.filtro, datos.payload ?? {})) return;
    const t0 = Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(t.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Gozz-Event": tipo, ...(t.secreto ? { "X-Gozz-Secret": t.secreto } : {}) },
        body: cuerpo,
        signal: ctl.signal,
      });
      await query(
        "INSERT INTO gozz.mk_automation_runs (trigger_id, evento_id, estado, status_code, duracion_ms, error) VALUES ($1,$2,$3,$4,$5,$6)",
        [t.id, eventoId, r.ok ? "enviado" : "fallido", r.status, Date.now() - t0, r.ok ? null : `HTTP ${r.status}`]
      );
    } catch (e: any) {
      await query(
        "INSERT INTO gozz.mk_automation_runs (trigger_id, evento_id, estado, duracion_ms, error) VALUES ($1,$2,'fallido',$3,$4)",
        [t.id, eventoId, Date.now() - t0, String(e?.name === "AbortError" ? "Tiempo de espera agotado (8 s)" : e?.message || e).slice(0, 300)]
      );
    } finally {
      clearTimeout(timer);
    }
  }));
}
