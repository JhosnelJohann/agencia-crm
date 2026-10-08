// Orquesta el proveedor de WhatsApp (Baileys hoy; Meta Cloud API mañana, vía la misma interfaz)
// y conecta sus eventos con whatsapp.service.ts. Vive SOLO en el proceso gozz-whatsapp-worker
// (whatsapp-worker.ts) — es el único punto, junto con providers/baileys.provider.ts, que importa
// `@whiskeysockets/baileys`.
import { BaileysWhatsAppProvider } from "./providers/baileys.provider.js";
import { MetaCloudWhatsAppProvider } from "./providers/meta-cloud.provider.js";
import { query } from "../../shared/db.js";
import type { WhatsAppProvider } from "./providers/whatsapp-provider.interface.js";
import * as service from "./whatsapp.service.js";
import * as repo from "./whatsapp.repository.js";
import { guardarFotoPerfil } from "./providers/whatsapp-medios.js";

const baileys: WhatsAppProvider = new BaileysWhatsAppProvider();
const metaCloud: WhatsAppProvider = new MetaCloudWhatsAppProvider();
const proveedores: WhatsAppProvider[] = [baileys, metaCloud];

/** Cada conexión declara su proveedor (`baileys` por QR, `meta_cloud` por la API oficial); se enruta por él. */
const cacheProveedor = new Map<string, "baileys" | "meta_cloud">();
async function proveedorDe(conexionId: string): Promise<WhatsAppProvider> {
  let p = cacheProveedor.get(conexionId);
  if (!p) {
    const r = await query<{ proveedor: string }>("SELECT proveedor FROM gozz.whatsapp_conexiones WHERE id = $1", [conexionId]);
    p = r[0]?.proveedor === "meta_cloud" ? "meta_cloud" : "baileys";
    cacheProveedor.set(conexionId, p);
  }
  return p === "meta_cloud" ? metaCloud : baileys;
}

// Los callbacks de eventos se registran en AMBOS proveedores (el de Meta solo emite cambios de estado).
type CB<K extends keyof WhatsAppProvider> = Parameters<WhatsAppProvider[K]>[0];
const provider = {
  onQr: (cb: CB<"onQr">) => proveedores.forEach((x) => x.onQr(cb)),
  onConnectionUpdate: (cb: CB<"onConnectionUpdate">) => proveedores.forEach((x) => x.onConnectionUpdate(cb)),
  onMessage: (cb: CB<"onMessage">) => proveedores.forEach((x) => x.onMessage(cb)),
  onMessageStatusUpdate: (cb: CB<"onMessageStatusUpdate">) => proveedores.forEach((x) => x.onMessageStatusUpdate(cb)),
  onContactoResuelto: (cb: CB<"onContactoResuelto">) => proveedores.forEach((x) => x.onContactoResuelto(cb)),
  onLidMapping: (cb: CB<"onLidMapping">) => proveedores.forEach((x) => x.onLidMapping(cb)),
  onCambioMensaje: (cb: CB<"onCambioMensaje">) => proveedores.forEach((x) => x.onCambioMensaje(cb)),
  onPerfilPropio: (cb: CB<"onPerfilPropio">) => proveedores.forEach((x) => x.onPerfilPropio(cb)),
};

provider.onQr((conexionId, qr) => {
  service.registrarQr(conexionId, qr).catch((e) => console.error(`[whatsapp-cm] registrarQr(${conexionId}):`, e?.message));
});
provider.onConnectionUpdate((conexionId, update) => {
  service.registrarActualizacionEstado(conexionId, update).catch((e) => console.error(`[whatsapp-cm] registrarActualizacionEstado(${conexionId}):`, e?.message));
});
provider.onMessage((conexionId, msg) => {
  service.registrarMensajeEntrante(conexionId, msg)
    .then(() => asegurarFoto(conexionId, msg.jid))
    .catch((e) => console.error(`[whatsapp-cm] registrarMensajeEntrante(${conexionId}):`, e?.message));
});
provider.onLidMapping((conexionId, lid, pn) => {
  service.registrarLidMapping(conexionId, lid, pn).catch((e) => console.error(`[whatsapp-cm] registrarLidMapping(${lid}):`, e?.message));
});
provider.onCambioMensaje((conexionId, cambio) => {
  service.registrarCambioMensaje(conexionId, cambio).catch((e) => console.error(`[whatsapp-cm] registrarCambioMensaje(${cambio.waMessageId}):`, e?.message));
});
provider.onPerfilPropio((conexionId, perfil) => {
  (async () => {
    const yo = await query<{ telefono: string | null }>("SELECT telefono FROM gozz.whatsapp_conexiones WHERE id = $1", [conexionId]);
    const fotoLocal = perfil.fotoUrl ? await guardarFotoPerfil(conexionId, `yo:${yo[0]?.telefono || conexionId}`, perfil.fotoUrl) : null;
    await service.registrarPerfilPropio(conexionId, { nombre: perfil.nombre, fotoUrl: fotoLocal });
  })().catch((e) => console.error(`[whatsapp-cm] registrarPerfilPropio(${conexionId}):`, e?.message));
});
provider.onMessageStatusUpdate((_conexionId, waMessageId, estado) => {
  if (estado !== "entregado" && estado !== "leido") return;
  service.registrarActualizacionEntrega(waMessageId, estado).catch((e) => console.error(`[whatsapp-cm] registrarActualizacionEntrega(${waMessageId}):`, e?.message));
});
provider.onContactoResuelto((conexionId, jid, info) => {
  service.registrarContactoResuelto(conexionId, jid, info).catch((e) => console.error(`[whatsapp-cm] registrarContactoResuelto(${jid}):`, e?.message));
});

export async function iniciarConexion(conexionId: string): Promise<void> {
  await (await proveedorDe(conexionId)).connect(conexionId);
}

export async function detenerConexion(conexionId: string): Promise<void> {
  await (await proveedorDe(conexionId)).disconnect(conexionId);
  cacheProveedor.delete(conexionId);
}

/** Reconecta todas las conexiones activas al arrancar el worker (con sesión guardada, sin pedir QR de nuevo). */
export async function reconectarActivas(): Promise<void> {
  const conexiones = await repo.listConexionesActivas();
  for (const c of conexiones) {
    try {
      await (await proveedorDe(c.id)).connect(c.id);
      console.log(`[whatsapp-worker] reconectando ${c.nombre} (${c.id})`);
    } catch (e: any) {
      console.error(`[whatsapp-worker] no se pudo reconectar ${c.id}:`, e?.message);
    }
  }
}

/** Procesa un mensaje saliente en estado 'pendiente' (recién insertado o sobreviviente de un reinicio). */
export async function enviarMensajePendiente(mensajeId: string): Promise<void> {
  const mensaje = await repo.getMensaje(mensajeId);
  if (!mensaje || mensaje.estado_entrega !== "pendiente") return;
  const conversacion = await repo.getConversacion(mensaje.conversacion_id);
  if (!conversacion) return;

  try {
    const { waMessageId } = await (await proveedorDe(conversacion.conexion_id)).sendMessage(conversacion.conexion_id, {
      jid: conversacion.wa_jid,
      tipo: mensaje.tipo,
      contenido: mensaje.contenido,
      archivoUrl: mensaje.archivo_url,
      archivoNombre: mensaje.archivo_nombre,
      archivoTipo: mensaje.archivo_tipo,
      esNotaVoz: !!(mensaje as any).es_nota_voz,
      duracionSeg: (mensaje as any).duracion_seg ?? null,
    });
    await service.registrarConfirmacionEnvio(mensajeId, waMessageId);
  } catch (e: any) {
    await service.registrarFalloEnvio(mensajeId, e?.message || "Error enviando el mensaje");
  }
}

/** Barrido al arrancar: reintenta mensajes 'pendiente' que se quedaron a medias si el worker cayó. */
export async function reenviarPendientesAlArrancar(): Promise<void> {
  const pendientes = await service.mensajesPendientesDeEnvio();
  for (const m of pendientes) {
    await enviarMensajePendiente(m.id).catch((e) => console.error(`[whatsapp-worker] pendiente ${m.id}:`, e?.message));
  }
}

/** Evita pedir la misma foto una y otra vez (cada listado pide las que faltan o caducaron). */
const fotoPedidaAt = new Map<string, number>();
const ESPERA_ENTRE_PEDIDOS_MS = 30 * 60 * 1000;

/**
 * Descarga la foto de perfil (la URL del CDN caduca) y la "info" del contacto, y las guarda. Solo hace
 * algo si la conexión dueña sigue activa en este proceso; si no, se reintentará en otro listado.
 */
export async function actualizarFotoConversacion(conversacionId: string, forzar = false): Promise<void> {
  const ultimo = fotoPedidaAt.get(conversacionId) || 0;
  if (!forzar && Date.now() - ultimo < ESPERA_ENTRE_PEDIDOS_MS) return;
  fotoPedidaAt.set(conversacionId, Date.now());
  const conversacion = await repo.getConversacion(conversacionId);
  if (!conversacion || !service.fotoNecesitaRefresco(conversacion)) return;
  const p = await proveedorDe(conversacion.conexion_id);
  const urlCdn = await p.resolverFotoPerfil(conversacion.conexion_id, conversacion.wa_jid);
  const local = urlCdn ? await guardarFotoPerfil(conversacion.conexion_id, conversacion.wa_jid, urlCdn) : null;
  const info = await p.resolverInfoPerfil(conversacion.conexion_id, conversacion.wa_jid);
  await service.registrarFotoPerfilResuelta(conversacionId, local, info);
}

/** Tras un mensaje entrante: si la conversación aún no tiene foto (o caducó), se descarga. */
async function asegurarFoto(conexionId: string, jid: string): Promise<void> {
  const c = await repo.getConversacionPorJid(conexionId, jid);
  if (c && service.fotoNecesitaRefresco(c)) await actualizarFotoConversacion(c.id);
}

/** Palomitas azules: el equipo abrió la conversación en el CRM. */
export async function marcarLeidosEnWhatsApp(conversacionId: string, waIds: string[]): Promise<void> {
  const conversacion = await repo.getConversacion(conversacionId);
  if (!conversacion || !waIds.length) return;
  await (await proveedorDe(conversacion.conexion_id)).marcarLeidos(conversacion.conexion_id, conversacion.wa_jid, waIds);
}
