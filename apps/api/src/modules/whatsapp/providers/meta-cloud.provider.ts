// Proveedor de la API OFICIAL de WhatsApp (Meta Cloud API). Convive con Baileys (QR): cada conexión declara su
// `proveedor` y el gestor (whatsapp-connection-manager.ts) enruta a uno u otro.
//
// Diferencias de fondo con Baileys:
//  · No hay sesión ni QR: la conexión son un `phone_number_id` y un token de acceso (cifrado en BD).
//  · Lo ENTRANTE no llega por este proveedor sino por el webhook de Meta (`meta-webhook.routes.ts`, en el proceso de
//    la API), que llama a whatsapp.service directamente. Aquí solo se valida la credencial y se ENVÍA.
//  · Fuera de la ventana de 24 h desde el último mensaje del cliente, Meta solo admite plantillas aprobadas
//    (código 131047): el error se traduce a un mensaje claro en vez de un "fallo genérico".
import path from "path";
import type {
  WhatsAppProvider, WhatsAppOutgoingMessage, WhatsAppConnectionUpdate, WhatsAppIncomingMessage,
} from "./whatsapp-provider.interface.js";
import type { WhatsAppMensajeEstado } from "@gozz/shared-types";
import { query } from "../../../shared/db.js";
import { decrypt } from "../../../lib/crypto.js";
import { readUploadedFileBytes } from "../../../lib/storage.js";

const GRAPH = "https://graph.facebook.com/v20.0";

export const soloDigitos = (s: string) => s.replace(/\D+/g, "");

interface Creds { phoneNumberId: string; token: string; }

async function credenciales(conexionId: string): Promise<Creds> {
  const r = (await query<any>(
    "SELECT meta_cloud_phone_number_id, meta_cloud_access_token_enc FROM gozz.whatsapp_conexiones WHERE id = $1 AND proveedor = 'meta_cloud'", [conexionId]
  ))[0];
  if (!r?.meta_cloud_phone_number_id || !r?.meta_cloud_access_token_enc) throw new Error("La conexión no tiene credenciales de Meta");
  return { phoneNumberId: r.meta_cloud_phone_number_id, token: decrypt(r.meta_cloud_access_token_enc) };
}

/** Traduce los errores de Meta a algo que una persona del equipo pueda actuar. */
function errorLegible(j: any, status: number): string {
  const e = j?.error;
  const code = e?.code, sub = e?.error_subcode;
  if (code === 131047 || sub === 2494010) return "Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp solo permite enviar una plantilla aprobada.";
  if (code === 131026) return "El número no tiene WhatsApp o no aceptó el mensaje.";
  if (code === 190) return "El token de acceso de Meta caducó o es inválido. Genera uno nuevo (usuario del sistema) y vuelve a conectar.";
  if (code === 131030) return "Número no autorizado: en modo de pruebas Meta solo permite enviar a números registrados.";
  return e?.message ? `Meta: ${e.message}` : `Meta respondió HTTP ${status}`;
}

function mimeDe(nombre: string): string {
  const ext = path.extname(nombre).toLowerCase();
  const m: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".pdf": "application/pdf" };
  return m[ext] || "application/octet-stream";
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  private stateCbs: Array<(id: string, u: WhatsAppConnectionUpdate) => void> = [];

  async connect(conexionId: string): Promise<void> {
    try {
      const { phoneNumberId, token } = await credenciales(conexionId);
      const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(errorLegible(j, r.status));
      const tel = soloDigitos(String(j.display_phone_number || "")) || null;
      this.stateCbs.forEach((cb) => cb(conexionId, { estado: "conectado", telefono: tel }));
    } catch (e: any) {
      this.stateCbs.forEach((cb) => cb(conexionId, { estado: "error", motivoError: e?.message || String(e) }));
    }
  }

  async disconnect(conexionId: string): Promise<void> {
    this.stateCbs.forEach((cb) => cb(conexionId, { estado: "desconectado" }));
  }

  async sendMessage(conexionId: string, msg: WhatsAppOutgoingMessage): Promise<{ waMessageId: string }> {
    const { phoneNumberId, token } = await credenciales(conexionId);
    const to = soloDigitos(msg.jid.split("@")[0]);
    if (!to) throw new Error("Destinatario sin número de teléfono");

    let body: any;
    if (msg.tipo === "texto") {
      body = { messaging_product: "whatsapp", to, type: "text", text: { body: msg.contenido || "", preview_url: true } };
    } else if (msg.archivoUrl) {
      // Meta necesita el archivo en SUS servidores: se sube (POST /media) y se referencia por id. Un enlace público
      // no sirve porque /uploads exige sesión.
      const bytes = await readUploadedFileBytes(msg.archivoUrl);
      const nombre = msg.archivoNombre || path.basename(msg.archivoUrl);
      const mime = mimeDe(nombre);
      const fd = new FormData();
      fd.append("messaging_product", "whatsapp");
      fd.append("type", mime);
      fd.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), nombre);
      const up = await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd, signal: AbortSignal.timeout(60_000) });
      const uj: any = await up.json().catch(() => ({}));
      if (!up.ok || !uj.id) throw new Error(errorLegible(uj, up.status));
      const kind = msg.tipo === "imagen" ? "image" : msg.tipo === "video" ? "video" : msg.tipo === "audio" ? "audio" : "document";
      body = { messaging_product: "whatsapp", to, type: kind, [kind]: { id: uj.id, ...(kind === "document" ? { filename: nombre } : {}), ...(msg.contenido && kind !== "audio" ? { caption: msg.contenido } : {}) } };
    } else {
      throw new Error("Mensaje sin contenido ni archivo");
    }

    const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
    const j: any = await r.json().catch(() => ({}));
    const id = j?.messages?.[0]?.id;
    if (!r.ok || !id) throw new Error(errorLegible(j, r.status));
    return { waMessageId: id };
  }

  onConnectionUpdate(cb: (conexionId: string, update: WhatsAppConnectionUpdate) => void): void { this.stateCbs.push(cb); }

  // Sin QR ni eventos propios: lo entrante llega por el webhook (proceso de la API).
  onQr(): void {}
  onMessage(_cb: (conexionId: string, msg: WhatsAppIncomingMessage) => void): void {}
  onMessageStatusUpdate(_cb: (conexionId: string, waMessageId: string, estado: WhatsAppMensajeEstado) => void): void {}
  onContactoResuelto(): void {}
  async resolverFotoPerfil(): Promise<string | null> { return null; } // la Cloud API no expone fotos de perfil
  async resolverInfoPerfil(): Promise<string | null> { return null; }
  async resolverPnDeLid(): Promise<string | null> { return null; }
  async marcarLeidos(): Promise<void> {} // la Cloud API marca leído por mensaje vía webhook propio (fuera de alcance)
  onLidMapping(): void {}
  onCambioMensaje(): void {}
  onPerfilPropio(): void {}
}
