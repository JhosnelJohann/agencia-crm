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
};

provider.onQr((conexionId, qr) => {
  service.registrarQr(conexionId, qr).catch((e) => console.error(`[whatsapp-cm] registrarQr(${conexionId}):`, e?.message));
});
provider.onConnectionUpdate((conexionId, update) => {
  service.registrarActualizacionEstado(conexionId, update).catch((e) => console.error(`[whatsapp-cm] registrarActualizacionEstado(${conexionId}):`, e?.message));
});
provider.onMessage((conexionId, msg) => {
  service.registrarMensajeEntrante(conexionId, msg).catch((e) => console.error(`[whatsapp-cm] registrarMensajeEntrante(${conexionId}):`, e?.message));
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

/** Pedido bajo demanda (al listar/abrir una conversación sin foto) — solo hace algo si la
 * conexión dueña sigue activa en este proceso; si no, no pasa nada (se reintentará la próxima
 * vez que se liste/abra). */
export async function actualizarFotoConversacion(conversacionId: string): Promise<void> {
  const conversacion = await repo.getConversacion(conversacionId);
  if (!conversacion || conversacion.foto_perfil_url) return;
  const url = await (await proveedorDe(conversacion.conexion_id)).resolverFotoPerfil(conversacion.conexion_id, conversacion.wa_jid);
  if (url) await service.registrarFotoPerfilResuelta(conversacionId, url);
}
