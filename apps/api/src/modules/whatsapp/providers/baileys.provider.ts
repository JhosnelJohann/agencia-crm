// Implementación real con Baileys 7 (WhatsApp Web multi-device, QR). Vive SOLO en el proceso
// gozz-whatsapp-worker (whatsapp-worker.ts / whatsapp-connection-manager.ts) — ni las rutas HTTP
// ni whatsapp.service.ts ni las pruebas importan este archivo ni `@whiskeysockets/baileys`.
// Baileys 7 es solo-ESM: se carga con `cargarBaileys()` (import dinámico), ver baileys-lib.ts.
import type { WASocket, WAMessage } from "@whiskeysockets/baileys" with { "resolution-mode": "import" };
import pino from "pino";
import path from "path";
import fs from "fs";
import type { WhatsAppMensajeEstado } from "@gozz/shared-types";
import { UPLOADS_ROOT, shard, readUploadedFileBytes, putUploadedBytesToR2 } from "../../../lib/storage.js";
import { usePostgresAuthState, clearAuthState } from "./postgres-auth-state.js";
import { cargarBaileys } from "./baileys-lib.js";
import { extraerContenido, esChatIndividual, type MediaEntrante } from "./baileys-contenido.js";
import { convertirANotaDeVoz } from "./whatsapp-medios.js";
import type {
  WhatsAppProvider,
  WhatsAppOutgoingMessage,
  WhatsAppIncomingMessage,
  WhatsAppConnectionUpdate,
  WhatsAppCambioMensaje,
} from "./whatsapp-provider.interface.js";

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "silent" });

/** Mayor que el timeout de 25s del modal del frontend y que el connectTimeoutMs interno de
 * Baileys (20s) — si ninguno de los dos disparó un evento (qr/open/close) para entonces, algo se
 * colgó silenciosamente (p. ej. el handshake con los servidores de WhatsApp) y hay que forzar el
 * cierre para no dejar `connect()` bloqueado para siempre en esa conexión. */
const CONNECT_WATCHDOG_MS = 40_000;

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".opus": "audio/ogg", ".wav": "audio/wav",
  ".pdf": "application/pdf",
};
function guessMime(filename: string): string {
  return EXT_MIME[path.extname(filename).toLowerCase()] || "application/octet-stream";
}
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  "video/mp4": ".mp4", "video/quicktime": ".mov", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a",
  "application/pdf": ".pdf",
};
function extensionPara(media: MediaEntrante): string {
  const deNombre = path.extname(media.nombre || "");
  if (deNombre) return deNombre;
  if (media.mime && MIME_EXT[media.mime]) return MIME_EXT[media.mime];
  return media.tipo === "image" ? ".jpg" : media.tipo === "video" ? ".mp4" : media.tipo === "audio" ? ".ogg" : media.tipo === "sticker" ? ".webp" : ".bin";
}

/** Valores de proto.WebMessageInfo.Status (estables entre versiones). */
const STATUS_DELIVERY_ACK = 3;
const STATUS_READ = 4;
const STATUS_PLAYED = 5;
function estadoDesdeStatus(status: number | null | undefined): WhatsAppMensajeEstado | null {
  if (status === STATUS_DELIVERY_ACK) return "entregado";
  if (status === STATUS_READ || status === STATUS_PLAYED) return "leido";
  return null;
}

const esLid = (jid: string | null | undefined): jid is string => !!jid && jid.endsWith("@lid");
const esPn = (jid: string | null | undefined): jid is string => !!jid && jid.endsWith("@s.whatsapp.net");
/** "1234:5@s.whatsapp.net" → "1234@s.whatsapp.net" (quita el número de dispositivo). */
const normalizar = (jid: string): string => {
  const [user, server] = jid.split("@");
  return `${user.split(":")[0]}@${server}`;
};

export class BaileysWhatsAppProvider implements WhatsAppProvider {
  private sockets = new Map<string, WASocket>();
  /** Watchdog por conexión (ver CONNECT_WATCHDOG_MS) — se cancela en cuanto llega el primer
   * evento definitivo (qr/open/close) o si `disconnect()` se adelanta. */
  private connectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private qrCbs: ((conexionId: string, qr: string) => void)[] = [];
  private stateCbs: ((conexionId: string, update: WhatsAppConnectionUpdate) => void)[] = [];
  private msgCbs: ((conexionId: string, msg: WhatsAppIncomingMessage) => void)[] = [];
  private statusCbs: ((conexionId: string, waMessageId: string, estado: WhatsAppMensajeEstado) => void)[] = [];
  private contactoCbs: ((conexionId: string, jid: string, info: { jidReal?: string | null; nombre?: string | null }) => void)[] = [];
  private lidCbs: ((conexionId: string, lid: string, pn: string) => void)[] = [];
  private cambioCbs: ((conexionId: string, cambio: WhatsAppCambioMensaje) => void)[] = [];
  private perfilCbs: ((conexionId: string, perfil: { nombre: string | null; fotoUrl: string | null }) => void)[] = [];
  /** Nombre guardado en el teléfono por jid (lid o pn) — solo como mejora del pushName; el par
   * lid↔teléfono, que es lo importante, se persiste en BD vía onLidMapping. */
  private nombres = new Map<string, Map<string, string>>();

  private nombresDe(conexionId: string): Map<string, string> {
    let m = this.nombres.get(conexionId);
    if (!m) { m = new Map(); this.nombres.set(conexionId, m); }
    return m;
  }

  private emitirLid(conexionId: string, lid: string | null | undefined, pn: string | null | undefined): void {
    if (!esLid(lid) || !esPn(pn)) return;
    const l = normalizar(lid), p = normalizar(pn);
    this.lidCbs.forEach((cb) => cb(conexionId, l, p));
  }

  private registrarContacto(conexionId: string, c: { id?: string; lid?: string; phoneNumber?: string; name?: string; notify?: string }): void {
    const ids = [c.id, c.lid, c.phoneNumber].filter(Boolean) as string[];
    if (!ids.length) return;
    const lid = [c.lid, c.id].find(esLid);
    const pn = [c.phoneNumber, c.id].find(esPn);
    this.emitirLid(conexionId, lid, pn);
    const nombre = c.name || c.notify || null;
    if (nombre) ids.forEach((id) => this.nombresDe(conexionId).set(normalizar(id), nombre));
    if (nombre || pn) {
      const destino = pn ? normalizar(pn) : lid ? normalizar(lid) : normalizar(ids[0]);
      this.contactoCbs.forEach((cb) => cb(conexionId, destino, { jidReal: pn ? normalizar(pn) : null, nombre }));
    }
  }

  async connect(conexionId: string): Promise<void> {
    if (this.sockets.has(conexionId)) return;
    const B = await cargarBaileys();
    const { state, saveCreds } = await usePostgresAuthState(conexionId);
    // Timeout acotado: sin él, la consulta de versión puede colgarse indefinidamente y dejar
    // "Conectar WhatsApp" atascado; ante cualquier error la librería cae a su versión empaquetada.
    const { version } = await B.fetchLatestBaileysVersion({ signal: AbortSignal.timeout(5000) } as any).catch(() => ({ version: undefined as any }));

    const sock = B.makeWASocket({
      ...(version ? { version } : {}),
      logger: logger as any,
      auth: { creds: state.creds, keys: B.makeCacheableSignalKeyStore(state.keys, logger as any) },
      browser: B.Browsers.appropriate("Chrome"),
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });
    this.sockets.set(conexionId, sock);

    const watchdog = setTimeout(() => {
      this.connectTimers.delete(conexionId);
      if (this.sockets.get(conexionId) !== sock) return; // ya se resolvió, se reemplazó o se desconectó
      sock.end(new Error("Tiempo de espera agotado esperando respuesta de WhatsApp"));
    }, CONNECT_WATCHDOG_MS);
    this.connectTimers.set(conexionId, watchdog);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr || connection === "open" || connection === "close") {
        const t = this.connectTimers.get(conexionId);
        if (t) { clearTimeout(t); this.connectTimers.delete(conexionId); }
      }
      if (qr) this.qrCbs.forEach((cb) => cb(conexionId, qr));

      if (connection === "open") {
        const telefono = sock.user?.id ? sock.user.id.split(":")[0].split("@")[0] : undefined;
        this.stateCbs.forEach((cb) => cb(conexionId, { estado: "conectado", telefono }));
        this.publicarPerfilPropio(conexionId, sock).catch(() => {});
      } else if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === B.DisconnectReason.loggedOut;
        this.sockets.delete(conexionId);
        if (loggedOut) {
          clearAuthState(conexionId).catch(() => {});
          this.stateCbs.forEach((cb) => cb(conexionId, { estado: "desconectado", motivoError: "Dispositivo desvinculado desde el teléfono" }));
        } else {
          const motivo = lastDisconnect?.error?.message || "Conexión cerrada";
          this.stateCbs.forEach((cb) => cb(conexionId, { estado: "error", motivoError: motivo }));
          // Reconexión automática ante un corte de red (no ante un logout explícito) — la
          // sesión sigue siendo válida, solo se cayó el socket.
          setTimeout(() => { this.connect(conexionId).catch((e) => console.error(`[baileys ${conexionId}] reconexión falló:`, e?.message)); }, 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;
      for (const msg of messages) {
        try {
          await this.handleIncoming(conexionId, sock, msg);
        } catch (e: any) {
          console.error(`[baileys ${conexionId}] error procesando mensaje entrante:`, e?.message);
        }
      }
    });

    // Confirmaciones de entrega/lectura de mensajes YA enviados (doble check gris y azul).
    sock.ev.on("messages.update", (updates) => {
      for (const u of updates) {
        const waMessageId = u.key.id;
        const estado = estadoDesdeStatus(u.update.status as unknown as number);
        if (waMessageId && estado) this.statusCbs.forEach((cb) => cb(conexionId, waMessageId, estado));
      }
    });

    // Directorio de contactos (nombre guardado en el teléfono) y pares lid ↔ teléfono.
    const onContactos = (cs: any[]) => { cs.forEach((c) => this.registrarContacto(conexionId, c)); };
    sock.ev.on("contacts.upsert", onContactos);
    sock.ev.on("contacts.update", onContactos as any);
    sock.ev.on("messaging-history.set", ({ contacts }) => { if (contacts) onContactos(contacts); });
    sock.ev.on("lid-mapping.update", ({ lid, pn }) => this.emitirLid(conexionId, lid, pn));
  }

  private async publicarPerfilPropio(conexionId: string, sock: WASocket): Promise<void> {
    const B = await cargarBaileys();
    const yo = sock.user;
    if (!yo?.id) return;
    const fotoUrl = await sock.profilePictureUrl(B.jidNormalizedUser(yo.id), "image").catch(() => undefined);
    this.perfilCbs.forEach((cb) => cb(conexionId, { nombre: (yo as any).name || (yo as any).notify || null, fotoUrl: fotoUrl ?? null }));
  }

  /** Teléfono real detrás de un @lid: lo que trae el mensaje (remoteJidAlt) o el mapa de Baileys. */
  private async pnDeLid(sock: WASocket, lid: string, alt?: string | null): Promise<string | null> {
    if (esPn(alt)) return normalizar(alt);
    try {
      const pn = await (sock as any).signalRepository?.lidMapping?.getPNForLID(lid);
      return esPn(pn) ? normalizar(pn) : null;
    } catch { return null; }
  }

  async resolverFotoPerfil(conexionId: string, jid: string): Promise<string | null> {
    const sock = this.sockets.get(conexionId);
    if (!sock) return null;
    const url = await sock.profilePictureUrl(jid, "image").catch(() => undefined);
    return url ?? null;
  }

  async resolverInfoPerfil(conexionId: string, jid: string): Promise<string | null> {
    const sock = this.sockets.get(conexionId);
    if (!sock) return null;
    try {
      const r: any = await sock.fetchStatus(jid);
      const st = Array.isArray(r) ? r[0]?.status : r?.status;
      const texto = typeof st === "string" ? st : st?.status;
      return typeof texto === "string" && texto.trim() ? texto.trim() : null;
    } catch { return null; }
  }

  async marcarLeidos(conexionId: string, jid: string, waMessageIds: string[]): Promise<void> {
    const sock = this.sockets.get(conexionId);
    if (!sock || !waMessageIds.length) return;
    await sock.readMessages(waMessageIds.map((id) => ({ remoteJid: jid, id, fromMe: false })));
  }

  private async handleIncoming(conexionId: string, sock: WASocket, msg: WAMessage): Promise<void> {
    const remoto = msg.key.remoteJid;
    if (!esChatIndividual(remoto) || !msg.message) return; // grupos, estados, canales y difusiones fuera de alcance
    const waMessageId = msg.key.id;
    if (!waMessageId) return;
    const fromMe = !!msg.key.fromMe;

    const contenido = extraerContenido(msg.message);
    if (contenido.kind === "ignorar") return;
    if (contenido.kind === "reaccion") {
      this.cambioCbs.forEach((cb) => cb(conexionId, { waMessageId: contenido.targetId, reaccion: { emoji: contenido.emoji, fromMe } }));
      return;
    }
    if (contenido.kind === "editado") {
      this.cambioCbs.forEach((cb) => cb(conexionId, { waMessageId: contenido.targetId, editado: { contenido: contenido.contenido } }));
      return;
    }
    if (contenido.kind === "borrado") {
      this.cambioCbs.forEach((cb) => cb(conexionId, { waMessageId: contenido.targetId, borrado: true }));
      return;
    }

    // Número real: si el chat llegó por @lid, se busca el teléfono (Baileys 7 lo trae en
    // remoteJidAlt o lo conoce por su mapa) y la conversación se guarda con el JID de TELÉFONO.
    const alt = (msg.key as any).remoteJidAlt as string | undefined;
    let jid = normalizar(remoto);
    let jidLid: string | null = null;
    if (esLid(jid)) {
      jidLid = jid;
      const pn = await this.pnDeLid(sock, jid, alt);
      if (pn) { this.emitirLid(conexionId, jid, pn); jid = pn; }
    } else if (esLid(alt)) {
      jidLid = normalizar(alt);
      this.emitirLid(conexionId, jidLid, jid);
    }

    const { tipo, media, datos } = contenido;
    let archivoUrl: string | null = null;
    let archivoNombre: string | null = null;
    let archivoTipo: string | null = null;
    let archivoTamanio: number | null = media?.tamanio ?? null;

    if (media) {
      try {
        const B = await cargarBaileys();
        const buffer = await B.downloadMediaMessage(msg, "buffer", {});
        // Los adjuntos entrantes se archivan por conexión (la conversación puede no existir aún).
        const dirRel = `whatsapp/entrantes/${shard(conexionId)}/${conexionId}`;
        const dirAbs = path.join(UPLOADS_ROOT, dirRel);
        // Async a propósito: este worker sostiene TODAS las conexiones activas en un solo proceso.
        await fs.promises.mkdir(dirAbs, { recursive: true });
        const filename = `${Date.now()}_${waMessageId.replace(/[^a-zA-Z0-9]/g, "")}${extensionPara(media)}`;
        await fs.promises.writeFile(path.join(dirAbs, filename), buffer);
        archivoUrl = `/uploads/${dirRel}/${filename}`;
        archivoNombre = media.nombre || filename;
        archivoTipo = media.mime || guessMime(filename);
        archivoTamanio = buffer.length;
        // Best-effort: si R2 falla NO se descarta el mensaje (queda en disco local).
        putUploadedBytesToR2(archivoUrl, buffer, archivoTipo).catch((e: any) =>
          console.error(`[baileys ${conexionId}] no se pudo subir el adjunto a R2 (queda solo en disco local):`, e?.message)
        );
      } catch (e: any) {
        console.error(`[baileys ${conexionId}] no se pudo descargar el adjunto de ${waMessageId}:`, e?.message);
      }
    }

    // OJO: `msg.pushName` en un mensaje `fromMe` es el nombre de la CUENTA CONECTADA, no el del
    // contacto. El nombre guardado en el teléfono (directorio) es siempre más confiable.
    const dir = this.nombresDe(conexionId);
    const nombrePerfil = dir.get(jid) || (jidLid ? dir.get(jidLid) : undefined) || (!fromMe ? msg.pushName || null : null) || null;

    this.msgCbs.forEach((cb) => cb(conexionId, {
      jid, jidLid, waMessageId, tipo, contenido: contenido.contenido,
      archivoUrl, archivoNombre, archivoTipo, archivoTamanio,
      esNotaVoz: media?.esNotaVoz ?? false, duracionSeg: media?.duracionSeg ?? null, datos,
      timestamp: new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000),
      nombrePerfil, fromMe,
      jidReal: esPn(jid) && jidLid ? jid : null,
    }));
  }

  async disconnect(conexionId: string): Promise<void> {
    const t = this.connectTimers.get(conexionId);
    if (t) { clearTimeout(t); this.connectTimers.delete(conexionId); }
    const sock = this.sockets.get(conexionId);
    this.sockets.delete(conexionId);
    if (!sock) return;
    try {
      // Acotado: sock.logout() puede colgarse si el transporte ya está en mal estado.
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Tiempo de espera agotado cerrando sesión")), 7000);
        sock.logout().then(() => { clearTimeout(timer); resolve(); }, (e) => { clearTimeout(timer); reject(e); });
      });
    } catch { /* ya pudo estar cerrado, o no respondió a tiempo */ }
    try { sock.end(undefined); } catch {}
    await clearAuthState(conexionId);
  }

  async sendMessage(conexionId: string, msg: WhatsAppOutgoingMessage): Promise<{ waMessageId: string }> {
    const sock = this.sockets.get(conexionId);
    if (!sock) throw new Error("La conexión de WhatsApp no está activa");

    let content: any;
    if (msg.tipo === "texto") {
      content = { text: msg.contenido || "" };
    } else if (msg.archivoUrl) {
      // R2 primero (el adjunto lo pudo subir el proceso `api`), disco local como respaldo.
      const buffer = await readUploadedFileBytes(msg.archivoUrl);
      const filename = path.basename(msg.archivoUrl);
      const mime = msg.archivoTipo || guessMime(filename);
      const caption = msg.contenido || undefined;
      if (msg.tipo === "imagen") content = { image: buffer, caption, mimetype: mime };
      else if (msg.tipo === "video") content = { video: buffer, caption, mimetype: mime };
      else if (msg.tipo === "sticker") content = { sticker: buffer };
      else if (msg.tipo === "audio" && msg.esNotaVoz) {
        // Nota de voz: WhatsApp exige OGG/Opus para mostrarla como tal (con onda y "escuchada").
        const ogg = await convertirANotaDeVoz(buffer);
        content = { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true, ...(msg.duracionSeg ? { seconds: msg.duracionSeg } : {}) };
      } else if (msg.tipo === "audio") content = { audio: buffer, mimetype: mime, ptt: false };
      else content = { document: buffer, fileName: msg.archivoNombre || filename, mimetype: mime, caption };
    } else {
      throw new Error("Mensaje sin contenido ni archivo");
    }

    const sent = await sock.sendMessage(msg.jid, content);
    if (!sent?.key?.id) throw new Error("WhatsApp no confirmó el envío");
    return { waMessageId: sent.key.id };
  }

  onQr(cb: (conexionId: string, qr: string) => void): void { this.qrCbs.push(cb); }
  onConnectionUpdate(cb: (conexionId: string, update: WhatsAppConnectionUpdate) => void): void { this.stateCbs.push(cb); }
  onMessage(cb: (conexionId: string, msg: WhatsAppIncomingMessage) => void): void { this.msgCbs.push(cb); }
  onMessageStatusUpdate(cb: (conexionId: string, waMessageId: string, estado: WhatsAppMensajeEstado) => void): void { this.statusCbs.push(cb); }
  onContactoResuelto(cb: (conexionId: string, jid: string, info: { jidReal?: string | null; nombre?: string | null }) => void): void { this.contactoCbs.push(cb); }
  onLidMapping(cb: (conexionId: string, lid: string, pn: string) => void): void { this.lidCbs.push(cb); }
  onCambioMensaje(cb: (conexionId: string, cambio: WhatsAppCambioMensaje) => void): void { this.cambioCbs.push(cb); }
  onPerfilPropio(cb: (conexionId: string, perfil: { nombre: string | null; fotoUrl: string | null }) => void): void { this.perfilCbs.push(cb); }
}
