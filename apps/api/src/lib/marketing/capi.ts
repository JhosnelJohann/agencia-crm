// Meta Conversions API (server-side). Devuelve a Meta las conversiones del CRM (Lead / Schedule / Purchase)
// para que optimice los anuncios aunque el pixel del navegador quede bloqueado (iOS 14+, bloqueadores).
// Se activa solo si hay una cuenta con `pixel_id` y token de Conversions API configurados.
import crypto from "crypto";
import { query } from "../../shared/db.js";
import { decrypt } from "../crypto.js";

const GRAPH = "https://graph.facebook.com/v20.0";
const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Nombre del evento de Meta para un evento interno, o null si no aplica. */
export function eventoMeta(tipo: string, payload: Record<string, any>): "Lead" | "Schedule" | "Purchase" | null {
  if (tipo === "form_submitted") return "Lead";
  if (tipo === "stage_changed") {
    if (payload.hacia === "ganado") return "Purchase";
    if (payload.hacia === "reunion") return "Schedule";
  }
  return null;
}

export async function enviarConversion(opts: { contactoId: string; evento: "Lead" | "Schedule" | "Purchase"; valor?: number; eventId?: string }) {
  const cuenta = (await query<any>(
    `SELECT * FROM gozz.mk_ad_accounts WHERE estado = 'activa' AND pixel_id IS NOT NULL AND pixel_id <> '' AND capi_token_enc IS NOT NULL ORDER BY connected_at LIMIT 1`
  ))[0];
  if (!cuenta) return { estado: "omitido" as const, motivo: "Sin cuenta con pixel y token de Conversions API" };

  const c = (await query<any>("SELECT email, telefono, whatsapp, nombre_completo FROM gozz.contactos_cache WHERE id = $1", [opts.contactoId]))[0];
  if (!c) return { estado: "omitido" as const, motivo: "Contacto no encontrado" };
  const fb = (await query<any>("SELECT fbclid FROM gozz.mk_lead_attribution WHERE contacto_id = $1 AND fbclid IS NOT NULL ORDER BY created_at DESC LIMIT 1", [opts.contactoId]))[0];

  const eventId = opts.eventId || `${opts.evento}-${opts.contactoId}-${Date.now()}`;
  const user_data: Record<string, any> = {};
  if (c.email) user_data.em = [sha(String(c.email).trim().toLowerCase())];
  const tel = String(c.telefono || c.whatsapp || "").replace(/\D+/g, "");
  if (tel) user_data.ph = [sha(tel)];
  if (fb?.fbclid) user_data.fbc = `fb.1.${Date.now()}.${fb.fbclid}`;

  const reg = (await query<{ id: string }>(
    "INSERT INTO gozz.mk_conversion_events (contacto_id, ad_account_id, evento, event_id, estado) VALUES ($1,$2,$3,$4,'pendiente') RETURNING id",
    [opts.contactoId, cuenta.id, opts.evento, eventId]
  ))[0];

  try {
    const body: any = {
      data: [{
        event_name: opts.evento,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "system_generated",
        user_data,
        ...(opts.valor ? { custom_data: { currency: cuenta.moneda || "USD", value: opts.valor } } : {}),
      }],
    };
    const r = await fetch(`${GRAPH}/${encodeURIComponent(cuenta.pixel_id)}/events?access_token=${encodeURIComponent(decrypt(cuenta.capi_token_enc))}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    });
    const txt = (await r.text()).slice(0, 400);
    await query("UPDATE gozz.mk_conversion_events SET estado = $2, respuesta = $3 WHERE id = $1", [reg.id, r.ok ? "enviado" : "fallido", txt]);
    return { estado: r.ok ? ("enviado" as const) : ("fallido" as const), respuesta: txt };
  } catch (e: any) {
    await query("UPDATE gozz.mk_conversion_events SET estado = 'fallido', respuesta = $2 WHERE id = $1", [reg.id, String(e?.message || e).slice(0, 300)]);
    return { estado: "fallido" as const, respuesta: String(e?.message || e) };
  }
}
