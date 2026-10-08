// Medios del worker de WhatsApp que no dependen de Baileys:
//  · Notas de voz: WhatsApp solo reproduce como nota de voz un audio OGG/Opus mono. El navegador graba
//    webm/opus (Chrome) o mp4 (Safari), así que se convierte con el ffmpeg empaquetado en `ffmpeg-static`
//    (binario por npm: no hay que instalar nada a mano en el VPS).
//  · Fotos de perfil: la URL del CDN de WhatsApp caduca en horas/días → se descarga y se sirve desde
//    /uploads (y R2), y se refresca periódicamente.
import { spawn } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { UPLOADS_ROOT, shard, putUploadedBytesToR2 } from "../../../lib/storage.js";

function rutaFfmpeg(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require("ffmpeg-static") as string | null;
  if (!p) throw new Error("ffmpeg-static no tiene binario para esta plataforma");
  return p;
}

/** Convierte cualquier audio a OGG/Opus mono 48 kHz (formato de nota de voz de WhatsApp). */
export function convertirANotaDeVoz(entrada: Buffer, timeoutMs = 60_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn(rutaFfmpeg(), [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-vn", "-ac", "1", "-ar", "48000",
      "-c:a", "libopus", "-b:a", "32k", "-application", "voip",
      "-f", "ogg", "pipe:1",
    ]);
    const partes: Buffer[] = [];
    let errores = "";
    const timer = setTimeout(() => { ff.kill("SIGKILL"); reject(new Error("La conversión de la nota de voz tardó demasiado")); }, timeoutMs);
    ff.stdout.on("data", (d: Buffer) => partes.push(d));
    ff.stderr.on("data", (d: Buffer) => { errores += d.toString(); });
    ff.on("error", (e) => { clearTimeout(timer); reject(e); });
    ff.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && partes.length) resolve(Buffer.concat(partes));
      else reject(new Error(`ffmpeg terminó con código ${code}: ${errores.slice(0, 300)}`));
    });
    ff.stdin.on("error", () => { /* ffmpeg puede cerrar stdin antes si la entrada es inválida; lo reporta 'close' */ });
    ff.stdin.end(entrada);
  });
}

/**
 * Descarga una foto de perfil del CDN de WhatsApp y la guarda en /uploads (y R2). Devuelve la URL local
 * con `?v=` para que el navegador no muestre una versión vieja en caché. null si no se pudo descargar.
 */
export async function guardarFotoPerfil(conexionId: string, jid: string, urlCdn: string): Promise<string | null> {
  try {
    const r = await fetch(urlCdn, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) return null;
    const dirRel = `whatsapp/perfiles/${shard(conexionId)}/${conexionId}`;
    const nombre = `${createHash("sha1").update(jid).digest("hex").slice(0, 20)}.jpg`;
    const dirAbs = path.join(UPLOADS_ROOT, dirRel);
    await fs.promises.mkdir(dirAbs, { recursive: true });
    await fs.promises.writeFile(path.join(dirAbs, nombre), buf);
    const url = `/uploads/${dirRel}/${nombre}`;
    putUploadedBytesToR2(url, buf, "image/jpeg").catch(() => { /* queda en disco local */ });
    return `${url}?v=${Date.now()}`;
  } catch {
    return null;
  }
}
