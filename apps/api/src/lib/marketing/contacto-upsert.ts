// Alta o actualización de un contacto a partir de datos capturados (formularios públicos, WhatsApp, etc.).
// Deduplica por email (sin distinguir mayúsculas) y, si no hay email, por los últimos 10 dígitos del teléfono.
import { query } from "../../shared/db.js";

export interface DatosContacto {
  nombre?: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  sitio_web?: string;
  industria?: string;
  fuente?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  etiqueta?: string | null;
}

const soloDigitos = (s?: string | null) => (s || "").replace(/\D+/g, "");
const limpio = (s?: string | null, max = 200) => (s ?? "").toString().trim().slice(0, max) || null;

export function emailValido(s?: string | null): boolean {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export async function upsertContacto(d: DatosContacto): Promise<{ id: string; creado: boolean }> {
  const email = emailValido(d.email) ? d.email!.trim().toLowerCase() : null;
  const tel = limpio(d.telefono, 40);
  const cola = soloDigitos(tel).slice(-10);

  let existente: { id: string } | undefined;
  if (email) {
    existente = (await query<{ id: string }>("SELECT id FROM gozz.contactos_cache WHERE lower(email) = $1 AND archivado IS NOT TRUE LIMIT 1", [email]))[0];
  }
  if (!existente && cola.length >= 8) {
    existente = (await query<{ id: string }>(
      `SELECT id FROM gozz.contactos_cache
        WHERE archivado IS NOT TRUE AND right(regexp_replace(coalesce(telefono,''), '\\D', '', 'g'), 10) = $1
           OR right(regexp_replace(coalesce(whatsapp,''), '\\D', '', 'g'), 10) = $1
        LIMIT 1`, [cola]
    ))[0];
  }

  if (existente) {
    // Solo se RELLENAN huecos: nunca se pisa lo que el equipo ya editó a mano.
    await query(
      `UPDATE gozz.contactos_cache SET
         email     = COALESCE(NULLIF(email, ''), $2),
         telefono  = COALESCE(NULLIF(telefono, ''), $3),
         empresa   = COALESCE(NULLIF(empresa, ''), $4),
         cargo     = COALESCE(NULLIF(cargo, ''), $5),
         sitio_web = COALESCE(NULLIF(sitio_web, ''), $6),
         industria = COALESCE(NULLIF(industria, ''), $7),
         updated_at = now()
       WHERE id = $1`,
      [existente.id, email, tel, limpio(d.empresa), limpio(d.cargo), limpio(d.sitio_web), limpio(d.industria)]
    );
    if (d.etiqueta) await agregarEtiqueta(existente.id, d.etiqueta);
    return { id: existente.id, creado: false };
  }

  const nombre = limpio(d.nombre) || (email ? email.split("@")[0] : "Sin nombre");
  const etiquetas = d.etiqueta ? [d.etiqueta] : [];
  const rows = await query<{ id: string }>(
    `INSERT INTO gozz.contactos_cache
       (nombre_completo, nombre, email, telefono, empresa, cargo, sitio_web, industria, fuente,
        utm_source, utm_medium, utm_campaign, etiquetas, tipo_cliente)
     VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'lead') RETURNING id`,
    [nombre, email, tel, limpio(d.empresa), limpio(d.cargo), limpio(d.sitio_web), limpio(d.industria), limpio(d.fuente, 60) || "formulario",
     limpio(d.utm_source, 120), limpio(d.utm_medium, 120), limpio(d.utm_campaign, 160), JSON.stringify(etiquetas)]
  );
  return { id: rows[0].id, creado: true };
}

export async function agregarEtiqueta(contactoId: string, etiqueta: string) {
  await query(
    `UPDATE gozz.contactos_cache
        SET etiquetas = CASE WHEN etiquetas @> to_jsonb($2::text) THEN etiquetas ELSE COALESCE(etiquetas, '[]'::jsonb) || to_jsonb($2::text) END
      WHERE id = $1`,
    [contactoId, etiqueta]
  );
}
