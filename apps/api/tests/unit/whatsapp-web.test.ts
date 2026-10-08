import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { extraerContenido, esChatIndividual, previewDe, telefonoDeVcard, desenvolver } from "../../src/modules/whatsapp/providers/baileys-contenido.js";
import { convertirANotaDeVoz } from "../../src/modules/whatsapp/providers/whatsapp-medios.js";
import { fotoNecesitaRefresco } from "../../src/modules/whatsapp/whatsapp.service.js";

describe("esChatIndividual", () => {
  it("acepta chats de teléfono y @lid", () => {
    expect(esChatIndividual("584121234567@s.whatsapp.net")).toBe(true);
    expect(esChatIndividual("123456789012345@lid")).toBe(true);
  });
  it("descarta grupos, estados, canales y difusiones", () => {
    for (const j of ["1203630@g.us", "status@broadcast", "120363282710744426@newsletter", "123@broadcast", null, undefined, ""]) {
      expect(esChatIndividual(j as any)).toBe(false);
    }
  });
});

describe("extraerContenido", () => {
  it("texto simple y extendido", () => {
    expect(extraerContenido({ conversation: "hola" })).toMatchObject({ kind: "mensaje", tipo: "texto", contenido: "hola" });
    expect(extraerContenido({ extendedTextMessage: { text: "link" } })).toMatchObject({ kind: "mensaje", tipo: "texto", contenido: "link" });
  });

  it("desenvuelve mensajes temporales, de ver una vez y documento con pie", () => {
    expect(extraerContenido({ ephemeralMessage: { message: { conversation: "temporal" } } })).toMatchObject({ tipo: "texto", contenido: "temporal" });
    expect(extraerContenido({ viewOnceMessageV2: { message: { imageMessage: { caption: "una vez", mimetype: "image/jpeg" } } } }))
      .toMatchObject({ tipo: "imagen", contenido: "una vez" });
    expect(extraerContenido({ documentWithCaptionMessage: { message: { documentMessage: { fileName: "a.pdf", caption: "mira", mimetype: "application/pdf" } } } }))
      .toMatchObject({ tipo: "archivo", contenido: "mira", media: { nombre: "a.pdf", mime: "application/pdf" } });
    expect(desenvolver({ ephemeralMessage: { message: { viewOnceMessage: { message: { conversation: "x" } } } } })).toEqual({ conversation: "x" });
  });

  it("nota de voz con duración y MIME sin parámetros", () => {
    const r = extraerContenido({ audioMessage: { ptt: true, seconds: 7, mimetype: "audio/ogg; codecs=opus", fileLength: 1234 } });
    expect(r).toMatchObject({ kind: "mensaje", tipo: "audio", media: { esNotaVoz: true, duracionSeg: 7, mime: "audio/ogg", tamanio: 1234 } });
  });

  it("tamaño en formato Long de protobuf", () => {
    const r: any = extraerContenido({ videoMessage: { fileLength: { low: 10, high: 0 }, mimetype: "video/mp4" } });
    expect(r.media.tamanio).toBe(10);
  });

  it("sticker, ubicación y contacto", () => {
    expect(extraerContenido({ stickerMessage: { mimetype: "image/webp" } })).toMatchObject({ tipo: "sticker", media: { tipo: "sticker" } });
    expect(extraerContenido({ locationMessage: { degreesLatitude: 10.5, degreesLongitude: -66.9, name: "Oficina" } }))
      .toMatchObject({ tipo: "ubicacion", contenido: "Oficina", datos: { lat: 10.5, lng: -66.9 } });
    const vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nTEL;type=CELL;waid=584121112233:+58 412-1112233\nEND:VCARD";
    expect(extraerContenido({ contactMessage: { displayName: "Ana", vcard } }))
      .toMatchObject({ tipo: "contacto", contenido: "Ana", datos: { nombre: "Ana", telefono: "+584121112233" } });
  });

  it("reacción, edición y borrado se aplican sobre el mensaje original (no son burbujas)", () => {
    expect(extraerContenido({ reactionMessage: { key: { id: "ABC" }, text: "❤️" } })).toEqual({ kind: "reaccion", targetId: "ABC", emoji: "❤️" });
    expect(extraerContenido({ reactionMessage: { key: { id: "ABC" }, text: "" } })).toEqual({ kind: "reaccion", targetId: "ABC", emoji: null });
    expect(extraerContenido({ protocolMessage: { type: 0, key: { id: "X1" } } })).toEqual({ kind: "borrado", targetId: "X1" });
    expect(extraerContenido({ protocolMessage: { type: 14, key: { id: "X2" }, editedMessage: { conversation: "corregido" } } }))
      .toEqual({ kind: "editado", targetId: "X2", contenido: "corregido" });
  });

  it("lo que no se muestra se ignora (nada de burbujas 'sistema' vacías)", () => {
    expect(extraerContenido({ protocolMessage: { type: 3 } })).toEqual({ kind: "ignorar" });
    expect(extraerContenido({ senderKeyDistributionMessage: {} })).toEqual({ kind: "ignorar" });
    expect(extraerContenido({})).toEqual({ kind: "ignorar" });
    expect(extraerContenido(null)).toEqual({ kind: "ignorar" });
  });
});

describe("telefonoDeVcard", () => {
  it("prefiere waid y cae al primer TEL", () => {
    expect(telefonoDeVcard("TEL;waid=5491122334455:+54 9 11")).toBe("+5491122334455");
    expect(telefonoDeVcard("BEGIN:VCARD\nTEL:+1 (305) 555-0100\nEND:VCARD")).toBe("+1 (305) 555-0100");
    expect(telefonoDeVcard(null)).toBeNull();
  });
});

describe("previewDe", () => {
  it("textos de la lista de conversaciones", () => {
    expect(previewDe("texto", "hola")).toBe("hola");
    expect(previewDe("audio", null, true)).toBe("🎤 Nota de voz");
    expect(previewDe("imagen", "mira esto")).toBe("📷 Foto · mira esto");
    expect(previewDe("ubicacion", "Oficina")).toBe("📍 Ubicación");
    expect(previewDe("contacto", "Ana")).toBe("👤 Ana");
  });
});

describe("fotoNecesitaRefresco", () => {
  it("refresca si nunca se descargó, si es del CDN o si tiene más de 7 días", () => {
    expect(fotoNecesitaRefresco({ foto_perfil_url: null, foto_actualizada_at: null })).toBe(true);
    expect(fotoNecesitaRefresco({ foto_perfil_url: "https://pps.whatsapp.net/x", foto_actualizada_at: new Date() })).toBe(true);
    expect(fotoNecesitaRefresco({ foto_perfil_url: "/uploads/a.jpg", foto_actualizada_at: new Date() })).toBe(false);
    expect(fotoNecesitaRefresco({ foto_perfil_url: "/uploads/a.jpg", foto_actualizada_at: new Date(Date.now() - 8 * 86400_000) })).toBe(true);
  });
});

describe("convertirANotaDeVoz (ffmpeg-static)", () => {
  it("convierte un audio a OGG/Opus", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require("ffmpeg-static") as string;
    // 1 s de tono de 440 Hz en WAV, generado por el propio ffmpeg (no hace falta un archivo de prueba).
    const wav = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-f", "wav", "pipe:1"], { maxBuffer: 10 * 1024 * 1024 });
    expect(wav.status).toBe(0);
    const ogg = await convertirANotaDeVoz(wav.stdout as Buffer);
    expect(ogg.subarray(0, 4).toString("ascii")).toBe("OggS");
    expect(ogg.includes(Buffer.from("OpusHead"))).toBe(true);
  }, 30_000);
});
