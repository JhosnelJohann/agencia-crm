// Interpretación PURA de un mensaje de WhatsApp (el `msg.message` de Baileys): sin importar Baileys,
// para poder probarla con vitest. Antes, todo lo que no fuera texto/imagen/vídeo/audio/documento
// "plano" (reacciones, stickers, mensajes temporales o de "ver una vez", borrados, ediciones,
// ubicaciones…) se guardaba como una burbuja "sistema" vacía que además sumaba al contador de no leídos.
import type { WhatsAppMensajeTipo } from "@gozz/shared-types";

export interface MediaEntrante {
  tipo: "image" | "video" | "audio" | "document" | "sticker";
  nombre: string | null;
  mime: string | null;
  tamanio: number | null;
  esNotaVoz: boolean;
  duracionSeg: number | null;
}

export type ContenidoEntrante =
  | { kind: "mensaje"; tipo: WhatsAppMensajeTipo; contenido: string | null; media: MediaEntrante | null; datos: Record<string, any> | null }
  | { kind: "reaccion"; targetId: string; emoji: string | null }
  | { kind: "editado"; targetId: string; contenido: string | null }
  | { kind: "borrado"; targetId: string }
  | { kind: "ignorar" };

/** Valores de `proto.Message.ProtocolMessage.Type` que nos interesan. */
const PROTOCOLO_REVOCAR = 0;
const PROTOCOLO_EDITAR = 14;

/** Solo chats individuales: ni grupos, ni estados, ni canales (@newsletter), ni listas de difusión. */
export function esChatIndividual(jid: string | null | undefined): jid is string {
  if (!jid) return false;
  return !(jid.endsWith("@g.us") || jid.endsWith("@newsletter") || jid.endsWith("@broadcast"));
}

/** Quita las envolturas que WhatsApp pone alrededor del contenido real. */
export function desenvolver(m: any): any {
  let actual = m;
  for (let i = 0; i < 6 && actual; i++) {
    const siguiente =
      actual.ephemeralMessage?.message ||
      actual.viewOnceMessage?.message ||
      actual.viewOnceMessageV2?.message ||
      actual.viewOnceMessageV2Extension?.message ||
      actual.documentWithCaptionMessage?.message ||
      actual.deviceSentMessage?.message ||
      actual.editedMessage?.message;
    if (!siguiente) break;
    actual = siguiente;
  }
  return actual;
}

const num = (v: any): number | null => {
  if (v == null) return null;
  const n = typeof v === "object" && "low" in v ? Number(v.low) + Number(v.high || 0) * 2 ** 32 : Number(v);
  return Number.isFinite(n) ? n : null;
};

function textoDe(m: any): string | null {
  return m?.conversation || m?.extendedTextMessage?.text || null;
}

/** Teléfono de una vCard: preferimos `waid=` (el número de WhatsApp), si no el primer TEL. */
export function telefonoDeVcard(vcard: string | null | undefined): string | null {
  if (!vcard) return null;
  const waid = /waid=(\d{6,})/i.exec(vcard);
  if (waid) return `+${waid[1]}`;
  const tel = /TEL[^:]*:([+\d\s().-]{6,})/i.exec(vcard);
  return tel ? tel[1].trim() : null;
}

export function extraerContenido(raw: any): ContenidoEntrante {
  if (!raw) return { kind: "ignorar" };
  const m = desenvolver(raw);
  if (!m) return { kind: "ignorar" };

  if (m.reactionMessage?.key?.id) {
    return { kind: "reaccion", targetId: m.reactionMessage.key.id, emoji: m.reactionMessage.text || null };
  }
  if (m.protocolMessage) {
    const p = m.protocolMessage;
    const tipo = num(p.type);
    if (tipo === PROTOCOLO_REVOCAR && p.key?.id) return { kind: "borrado", targetId: p.key.id };
    if (tipo === PROTOCOLO_EDITAR && p.key?.id) return { kind: "editado", targetId: p.key.id, contenido: textoDe(p.editedMessage) };
    return { kind: "ignorar" }; // sincronización de claves, ajustes de chat temporal, etc.
  }

  const texto = textoDe(m);
  if (texto) return { kind: "mensaje", tipo: "texto", contenido: texto, media: null, datos: null };

  if (m.imageMessage) {
    const i = m.imageMessage;
    return { kind: "mensaje", tipo: "imagen", contenido: i.caption || null, datos: null,
      media: { tipo: "image", nombre: null, mime: i.mimetype || "image/jpeg", tamanio: num(i.fileLength), esNotaVoz: false, duracionSeg: null } };
  }
  if (m.videoMessage) {
    const v = m.videoMessage;
    return { kind: "mensaje", tipo: "video", contenido: v.caption || null, datos: null,
      media: { tipo: "video", nombre: null, mime: v.mimetype || "video/mp4", tamanio: num(v.fileLength), esNotaVoz: false, duracionSeg: num(v.seconds) } };
  }
  if (m.audioMessage) {
    const a = m.audioMessage;
    return { kind: "mensaje", tipo: "audio", contenido: null, datos: null,
      media: { tipo: "audio", nombre: null, mime: (a.mimetype || "audio/ogg").split(";")[0], tamanio: num(a.fileLength), esNotaVoz: !!a.ptt, duracionSeg: num(a.seconds) } };
  }
  if (m.documentMessage) {
    const d = m.documentMessage;
    return { kind: "mensaje", tipo: "archivo", contenido: d.caption || null, datos: null,
      media: { tipo: "document", nombre: d.fileName || d.title || "documento", mime: d.mimetype || null, tamanio: num(d.fileLength), esNotaVoz: false, duracionSeg: null } };
  }
  if (m.stickerMessage) {
    const s = m.stickerMessage;
    return { kind: "mensaje", tipo: "sticker", contenido: null, datos: null,
      media: { tipo: "sticker", nombre: null, mime: s.mimetype || "image/webp", tamanio: num(s.fileLength), esNotaVoz: false, duracionSeg: null } };
  }
  const ubic = m.locationMessage || m.liveLocationMessage;
  if (ubic) {
    return { kind: "mensaje", tipo: "ubicacion", contenido: ubic.name || ubic.address || null, media: null,
      datos: { lat: ubic.degreesLatitude, lng: ubic.degreesLongitude, nombre: ubic.name || null, direccion: ubic.address || null, enVivo: !!m.liveLocationMessage } };
  }
  if (m.contactMessage) {
    const c = m.contactMessage;
    return { kind: "mensaje", tipo: "contacto", contenido: c.displayName || null, media: null,
      datos: { nombre: c.displayName || null, telefono: telefonoDeVcard(c.vcard), vcard: c.vcard || null } };
  }
  if (m.contactsArrayMessage?.contacts?.length) {
    const lista = m.contactsArrayMessage.contacts.map((c: any) => ({ nombre: c.displayName || null, telefono: telefonoDeVcard(c.vcard), vcard: c.vcard || null }));
    return { kind: "mensaje", tipo: "contacto", contenido: lista.map((c: any) => c.nombre).filter(Boolean).join(", ") || null, media: null,
      datos: { ...lista[0], lista } };
  }
  const encuesta = m.pollCreationMessage || m.pollCreationMessageV2 || m.pollCreationMessageV3;
  if (encuesta) {
    const opciones = (encuesta.options || []).map((o: any) => o.optionName).filter(Boolean);
    return { kind: "mensaje", tipo: "texto", contenido: `📊 ${encuesta.name || "Encuesta"}${opciones.length ? "\n• " + opciones.join("\n• ") : ""}`, media: null, datos: null };
  }
  // Respuestas de botones/listas de cuentas de empresa: se guardan como texto.
  const respuesta = m.buttonsResponseMessage?.selectedDisplayText || m.listResponseMessage?.title || m.templateButtonReplyMessage?.selectedDisplayText;
  if (respuesta) return { kind: "mensaje", tipo: "texto", contenido: respuesta, media: null, datos: null };

  // Nada que mostrar (senderKeyDistribution, messageContextInfo suelto, llamadas, etc.).
  return { kind: "ignorar" };
}

/** Texto corto para la lista de conversaciones. */
export function previewDe(tipo: string, contenido: string | null | undefined, esNotaVoz = false): string {
  if (tipo === "texto" && contenido) return contenido;
  const base: Record<string, string> = {
    imagen: "📷 Foto", video: "🎥 Video", audio: esNotaVoz ? "🎤 Nota de voz" : "🎵 Audio",
    archivo: "📎 Documento", sticker: "💟 Sticker", ubicacion: "📍 Ubicación", contacto: "👤 Contacto",
  };
  const b = base[tipo] || "📎 Archivo";
  return contenido && tipo !== "contacto" && tipo !== "ubicacion" ? `${b} · ${contenido}` : contenido && tipo === "contacto" ? `👤 ${contenido}` : b;
}
