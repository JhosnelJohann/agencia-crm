// WhatsApp · API oficial de Meta (Cloud API): alta de la conexión y webhook público.
//
// Meta manda TODO (mensajes entrantes y estados de entrega) a UNA sola URL por app:
//   GET  /api/public/webhooks/whatsapp   → verificación (hub.challenge) con META_WA_VERIFY_TOKEN
//   POST /api/public/webhooks/whatsapp   → eventos, firmados con X-Hub-Signature-256 (HMAC-SHA256 con META_APP_SECRET)
// Sin META_APP_SECRET el POST se RECHAZA: sin firma cualquiera podría inyectar mensajes falsos en el CRM.
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { query } from "../../shared/db.js";
import { requireAuth } from "../../shared/auth-middleware.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { esAdminEnBase } from "../../lib/permisos.js";
import { UPLOADS_ROOT, shard, putUploadedBytesToR2 } from "../../lib/storage.js";
import * as service from "./whatsapp.service.js";
import * as repo from "./whatsapp.repository.js";
import type { WhatsAppIncomingMessage } from "./providers/whatsapp-provider.interface.js";

const GRAPH = "https://graph.facebook.com/v20.0";
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

const CrearMetaSchema = z.object({
  nombre: z.string().min(2).max(80),
  phone_number_id: z.string().regex(/^\d{6,25}$/, "El Phone Number ID es numérico"),
  access_token: z.string().min(20).max(1000),
});

export function firmaValida(req: Request): boolean {
  const secret = process.env.META_APP_SECRET;
  const raw: Buffer | undefined = (req as any).rawBody;
  const got = String(req.headers["x-hub-signature-256"] || "");
  if (!secret || !raw || !got.startsWith("sha256=")) return false;
  const esperado = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(got), b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Descarga un adjunto entrante de Meta (id → URL temporal → bytes) y lo guarda como hace Baileys. */
async function descargarAdjunto(conexionId: string, token: string, mediaId: string, waId: string, tipo: string, nombre?: string) {
  const meta: any = await (await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) })).json();
  if (!meta?.url) throw new Error("Meta no devolvió la URL del adjunto");
  const r = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar el adjunto`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = String(meta.mime_type || "");
  const ext = mime.includes("jpeg") ? ".jpg" : mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : mime.includes("mp4") ? ".mp4" : mime.includes("ogg") ? ".ogg" : mime.includes("mpeg") ? ".mp3" : mime.includes("pdf") ? ".pdf" : path.extname(nombre || "") || ".bin";
  const dirRel = `whatsapp/entrantes/${shard(conexionId)}/${conexionId}`;
  const dirAbs = path.join(UPLOADS_ROOT, dirRel);
  await fs.promises.mkdir(dirAbs, { recursive: true });
  const filename = `${Date.now()}_${waId.replace(/[^a-zA-Z0-9]/g, "")}${ext}`;
  await fs.promises.writeFile(path.join(dirAbs, filename), buf);
  const url = `/uploads/${dirRel}/${filename}`;
  putUploadedBytesToR2(url, buf).catch(() => {});
  return { archivoUrl: url, archivoNombre: nombre || filename, archivoTipo: mime || null };
}

async function procesar(body: any) {
  for (const entry of body?.entry || []) {
    for (const ch of entry?.changes || []) {
      const v = ch?.value; if (!v) continue;
      const pnid = v.metadata?.phone_number_id; if (!pnid) continue;
      const cx = (await query<any>(
        "SELECT id, meta_cloud_access_token_enc FROM gozz.whatsapp_conexiones WHERE meta_cloud_phone_number_id = $1 AND proveedor = 'meta_cloud' AND activo = true LIMIT 1", [pnid]
      ))[0];
      if (!cx) continue;
      const token = cx.meta_cloud_access_token_enc ? decrypt(cx.meta_cloud_access_token_enc) : "";
      const nombres = new Map<string, string>((v.contacts || []).map((c: any) => [c.wa_id, c.profile?.name]));

      for (const m of v.messages || []) {
        try {
          let tipo: WhatsAppIncomingMessage["tipo"] = "texto";
          let contenido: string | null = null;
          let media: { id: string; nombre?: string } | null = null;
          switch (m.type) {
            case "text": contenido = m.text?.body ?? ""; break;
            case "image": tipo = "imagen"; contenido = m.image?.caption ?? null; media = { id: m.image?.id }; break;
            case "video": tipo = "video"; contenido = m.video?.caption ?? null; media = { id: m.video?.id }; break;
            case "audio": tipo = "audio"; media = { id: m.audio?.id }; break;
            case "sticker": tipo = "imagen"; media = { id: m.sticker?.id }; break;
            case "document": tipo = "archivo"; contenido = m.document?.caption ?? null; media = { id: m.document?.id, nombre: m.document?.filename }; break;
            case "button": contenido = m.button?.text ?? ""; break;
            case "interactive": contenido = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? ""; break;
            case "location": contenido = `📍 Ubicación: https://maps.google.com/?q=${m.location?.latitude},${m.location?.longitude}`; break;
            default: contenido = `[Mensaje de tipo «${m.type}» no soportado todavía]`;
          }
          let extra: any = {};
          if (media?.id && token) { try { extra = await descargarAdjunto(cx.id, token, media.id, m.id, tipo, media.nombre); } catch (e: any) { console.error("[meta-wa] adjunto:", e?.message); } }
          await service.registrarMensajeEntrante(cx.id, {
            jid: `${m.from}@s.whatsapp.net`, waMessageId: m.id, tipo, contenido, timestamp: new Date(Number(m.timestamp) * 1000),
            nombrePerfil: nombres.get(m.from) ?? null, ...extra,
          });
        } catch (e: any) { console.error("[meta-wa] mensaje:", e?.message); }
      }

      for (const st of v.statuses || []) {
        try {
          if (st.status === "delivered") await service.registrarActualizacionEntrega(st.id, "entregado");
          else if (st.status === "read") await service.registrarActualizacionEntrega(st.id, "leido");
          else if (st.status === "failed") {
            const msg = await repo.getMensajePorWaId(st.id);
            if (msg) await service.registrarFalloEnvio(msg.id, st.errors?.[0]?.title || st.errors?.[0]?.message || "Meta no pudo entregar el mensaje");
          }
        } catch (e: any) { console.error("[meta-wa] estado:", e?.message); }
      }
    }
  }
}

export function registerMetaWhatsAppRoutes(app: Express) {
  app.get("/api/public/webhooks/whatsapp", (req: Request, res: Response) => {
    const ok = req.query["hub.mode"] === "subscribe" && !!process.env.META_WA_VERIFY_TOKEN && req.query["hub.verify_token"] === process.env.META_WA_VERIFY_TOKEN;
    if (ok) res.status(200).send(String(req.query["hub.challenge"] || "")); else res.status(403).send("forbidden");
  });

  app.post("/api/public/webhooks/whatsapp", (req: Request, res: Response) => {
    if (!process.env.META_APP_SECRET) { res.status(503).json({ error: "Webhook sin configurar: falta META_APP_SECRET" }); return; }
    if (!firmaValida(req)) { res.status(401).json({ error: "Firma no válida" }); return; }
    res.status(200).json({ ok: true }); // Meta exige responder rápido; se procesa después
    void procesar(req.body).catch((e) => console.error("[meta-wa] webhook:", e?.message));
  });

  // Datos para configurar el webhook en el panel de Meta (el token de verificación solo lo ven administradores).
  app.get("/api/whatsapp/meta/config", requireAuth, async (req, res) => {
    const admin = await esAdminEnBase((req as any).user?.sub);
    res.json({
      webhook_url: `${APP_URL}/api/public/webhooks/whatsapp`,
      verify_token: admin ? process.env.META_WA_VERIFY_TOKEN || null : null,
      firma_configurada: !!process.env.META_APP_SECRET,
      verify_configurado: !!process.env.META_WA_VERIFY_TOKEN,
    });
  });

  app.post("/api/whatsapp/conexiones/meta", requireAuth, async (req, res) => {
    const p = CrearMetaSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues }); return; }
    const u = (req as any).user;
    const r = await query<any>(
      `INSERT INTO gozz.whatsapp_conexiones (nombre, owner_user_id, proveedor, meta_cloud_phone_number_id, meta_cloud_access_token_enc)
       VALUES ($1,$2,'meta_cloud',$3,$4) RETURNING id, nombre, proveedor, estado`,
      [p.data.nombre, u.sub, p.data.phone_number_id, encrypt(p.data.access_token)]
    );
    await service.iniciarConexion(r[0].id); // el worker valida credenciales y reporta estado por socket
    res.json({ conexion: r[0] });
  });
}
