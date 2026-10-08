// Costura para poder enchufar la API oficial de Meta Cloud más adelante sin rehacer el resto
// del módulo. Ninguna parte fuera de este directorio (ni whatsapp.service.ts, ni las rutas, ni
// las pruebas) debe importar `@whiskeysockets/baileys` directamente — solo `baileys.provider.ts`
// y `whatsapp-connection-manager.ts` lo hacen. Así `vitest run` nunca abre una conexión real.
import type { WhatsAppConexionEstado, WhatsAppMensajeEstado, WhatsAppMensajeTipo } from "@gozz/shared-types";

export interface WhatsAppOutgoingMessage {
  jid: string;
  tipo: WhatsAppMensajeTipo;
  contenido?: string | null;
  archivoUrl?: string | null;
  archivoNombre?: string | null;
  /** MIME real del archivo subido (antes se adivinaba por la extensión y un .webm salía como binario). */
  archivoTipo?: string | null;
  /** Audio grabado en el CRM → se envía como NOTA DE VOZ (ptt, ogg/opus), no como archivo. */
  esNotaVoz?: boolean;
  duracionSeg?: number | null;
}

export interface WhatsAppIncomingMessage {
  /** Chat al que pertenece: el JID de TELÉFONO (`…@s.whatsapp.net`) cuando se conoce; si WhatsApp solo
   * dio el identificador opaco, el `…@lid`. */
  jid: string;
  /** El `@lid` de ese contacto, si el mensaje llegó por LID (para fusionar conversaciones duplicadas). */
  jidLid?: string | null;
  waMessageId: string;
  tipo: WhatsAppMensajeTipo;
  contenido?: string | null;
  archivoUrl?: string | null;
  archivoNombre?: string | null;
  archivoTipo?: string | null;
  archivoTamanio?: number | null;
  esNotaVoz?: boolean;
  duracionSeg?: number | null;
  /** ubicacion: {lat,lng,nombre?,direccion?} · contacto: {nombre,telefono?,vcard?} */
  datos?: Record<string, any> | null;
  timestamp: Date;
  nombrePerfil?: string | null;
  /** true si lo envió el número conectado (desde el teléfono físico, fuera de GOZZ) — no es un
   * mensaje del lead/cliente. Whaticket y WhatsApp Web tratan esto como parte normal del hilo. */
  fromMe?: boolean;
  /** URL de la foto de perfil — null si no hay o es privada, undefined si ni se intentó. */
  fotoPerfilUrl?: string | null;
  /** El número real (`...@s.whatsapp.net`) detrás de un `jid` que llegó como `@lid`, cuando ya se
   * conoce — null/undefined si `jid` ya es un número real o si WhatsApp todavía no lo comparte. */
  jidReal?: string | null;
}

export interface WhatsAppConnectionUpdate {
  estado: WhatsAppConexionEstado;
  telefono?: string | null;
  motivoError?: string | null;
}

/** Cambio sobre un mensaje YA existente: reacción, edición o borrado ("Eliminado para todos"). */
export interface WhatsAppCambioMensaje {
  waMessageId: string;
  reaccion?: { emoji: string | null; fromMe: boolean };
  editado?: { contenido: string | null };
  borrado?: boolean;
}

export interface WhatsAppProvider {
  connect(conexionId: string): Promise<void>;
  disconnect(conexionId: string): Promise<void>;
  sendMessage(conexionId: string, msg: WhatsAppOutgoingMessage): Promise<{ waMessageId: string }>;
  onQr(cb: (conexionId: string, qr: string) => void): void;
  onConnectionUpdate(cb: (conexionId: string, update: WhatsAppConnectionUpdate) => void): void;
  onMessage(cb: (conexionId: string, msg: WhatsAppIncomingMessage) => void): void;
  /** Confirmaciones de entrega/lectura de WhatsApp para un mensaje YA enviado, identificado por su
   * `waMessageId` — la única forma de que el doble-check gris y el azul de "leído" avancen. */
  onMessageStatusUpdate(cb: (conexionId: string, waMessageId: string, estado: WhatsAppMensajeEstado) => void): void;
  /** Resolver la foto de perfil (URL del CDN de WhatsApp, que caduca) bajo demanda. */
  resolverFotoPerfil(conexionId: string, jid: string): Promise<string | null>;
  /** "Info" (estado) del contacto en WhatsApp, si es visible. */
  resolverInfoPerfil(conexionId: string, jid: string): Promise<string | null>;
  /** Teléfono real de un @lid si el proveedor ya lo conoce (WhatsApp no permite pedirlo bajo demanda:
   * llega con mensajes nuevos, la sincronización de contactos o el historial). */
  resolverPnDeLid(conexionId: string, lid: string): Promise<string | null>;
  /** Envía a WhatsApp la confirmación de lectura (palomitas azules) de estos mensajes entrantes. */
  marcarLeidos(conexionId: string, jid: string, waMessageIds: string[]): Promise<void>;
  /** WhatsApp sincroniza su directorio de contactos (nombre guardado en el teléfono, y a veces el
   * número real detrás de un `@lid`) de forma asíncrona, no bajo pedido. */
  onContactoResuelto(cb: (conexionId: string, jid: string, info: { jidReal?: string | null; nombre?: string | null }) => void): void;
  /** Par `@lid` ↔ teléfono descubierto (Baileys 7: remoteJidAlt, contactos, `lid-mapping.update`). */
  onLidMapping(cb: (conexionId: string, lid: string, pn: string) => void): void;
  onCambioMensaje(cb: (conexionId: string, cambio: WhatsAppCambioMensaje) => void): void;
  /** Nombre y foto de la cuenta conectada (al abrir la sesión). */
  onPerfilPropio(cb: (conexionId: string, perfil: { nombre: string | null; fotoUrl: string | null }) => void): void;
}
