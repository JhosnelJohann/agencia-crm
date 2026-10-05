// Webhook de Meta (WhatsApp Cloud API): la firma es lo único que impide que cualquiera inyecte mensajes falsos.
import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { firmaValida } from "../../src/modules/whatsapp/meta.routes.js";
import { soloDigitos } from "../../src/modules/whatsapp/providers/meta-cloud.provider.js";

const firmar = (raw: Buffer, secret: string) => "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
const req = (raw: Buffer | undefined, firma: string | undefined) => ({ rawBody: raw, headers: firma ? { "x-hub-signature-256": firma } : {} }) as any;

describe("firmaValida", () => {
  afterEach(() => { delete process.env.META_APP_SECRET; });
  const cuerpo = Buffer.from('{"entry":[{"changes":[]}]}');

  it("acepta la firma correcta", () => {
    process.env.META_APP_SECRET = "secreto";
    expect(firmaValida(req(cuerpo, firmar(cuerpo, "secreto")))).toBe(true);
  });
  it("rechaza una firma hecha con otro secreto o sobre otro cuerpo", () => {
    process.env.META_APP_SECRET = "secreto";
    expect(firmaValida(req(cuerpo, firmar(cuerpo, "otro")))).toBe(false);
    expect(firmaValida(req(Buffer.from("{}"), firmar(cuerpo, "secreto")))).toBe(false);
  });
  it("rechaza si falta la firma, el cuerpo crudo o el secreto configurado", () => {
    process.env.META_APP_SECRET = "secreto";
    expect(firmaValida(req(cuerpo, undefined))).toBe(false);
    expect(firmaValida(req(undefined, firmar(cuerpo, "secreto")))).toBe(false);
    delete process.env.META_APP_SECRET;
    expect(firmaValida(req(cuerpo, firmar(cuerpo, "secreto")))).toBe(false); // sin secreto NUNCA se acepta
  });
  it("rechaza una firma de distinta longitud sin lanzar", () => {
    process.env.META_APP_SECRET = "secreto";
    expect(firmaValida(req(cuerpo, "sha256=abc"))).toBe(false);
  });
});

describe("soloDigitos", () => {
  it("deja solo el número", () => {
    expect(soloDigitos("+34 600-111 222")).toBe("34600111222");
    expect(soloDigitos("34600111222@s.whatsapp.net".split("@")[0])).toBe("34600111222");
  });
});
