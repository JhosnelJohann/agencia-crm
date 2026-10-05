// Lógica pura del módulo de marketing (sin base de datos): condiciones de reglas/webhooks, validación de email,
// mapeo de eventos internos a eventos de Meta y detección de IP del cliente detrás de nginx.
import { describe, expect, it } from "vitest";
import { cumpleCondicion } from "../../src/lib/marketing/eventos.js";
import { emailValido } from "../../src/lib/marketing/contacto-upsert.js";
import { eventoMeta } from "../../src/lib/marketing/capi.js";
import { ipHash } from "../../src/lib/marketing/rate-limit.js";

describe("cumpleCondicion", () => {
  it("sin condición (o vacía) siempre cumple", () => {
    expect(cumpleCondicion(undefined, { a: 1 })).toBe(true);
    expect(cumpleCondicion({}, { a: 1 })).toBe(true);
    expect(cumpleCondicion({ hacia: "" }, {})).toBe(true); // valor vacío = se ignora
  });
  it("compara por texto y exige TODAS las claves", () => {
    expect(cumpleCondicion({ hacia: "ganado" }, { hacia: "ganado", desde: "propuesta" })).toBe(true);
    expect(cumpleCondicion({ hacia: "ganado", desde: "nuevo" }, { hacia: "ganado", desde: "propuesta" })).toBe(false);
    expect(cumpleCondicion({ n: "5" }, { n: 5 })).toBe(true);
  });
  it("soporta rutas con punto y no rompe con ausentes", () => {
    expect(cumpleCondicion({ "a.b": "x" }, { a: { b: "x" } })).toBe(true);
    expect(cumpleCondicion({ "a.b": "x" }, {})).toBe(false);
  });
});

describe("emailValido", () => {
  it.each(["a@b.co", "laura@studio.test", "x.y+z@dominio.com"])("acepta %s", (e) => expect(emailValido(e)).toBe(true));
  it.each(["", "mal", "a@b", "a b@c.com", null, undefined])("rechaza %s", (e) => expect(emailValido(e as any)).toBe(false));
});

describe("eventoMeta (Conversions API)", () => {
  it("formulario → Lead; reunión → Schedule; ganado → Purchase", () => {
    expect(eventoMeta("form_submitted", {})).toBe("Lead");
    expect(eventoMeta("stage_changed", { hacia: "reunion" })).toBe("Schedule");
    expect(eventoMeta("stage_changed", { hacia: "ganado" })).toBe("Purchase");
  });
  it("el resto no se envía a Meta", () => {
    expect(eventoMeta("stage_changed", { hacia: "propuesta" })).toBeNull();
    expect(eventoMeta("task_completed", {})).toBeNull();
  });
});

describe("ipHash — cliente detrás de nginx", () => {
  const req = (xff: string | undefined, remote = "10.0.0.1") => ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: remote } }) as any;
  it("usa la ÚLTIMA IP de X-Forwarded-For (la que añade nginx), no la que envía el cliente", () => {
    expect(ipHash(req("6.6.6.6, 1.2.3.4"))).toBe(ipHash(req("9.9.9.9, 1.2.3.4")));
    expect(ipHash(req("6.6.6.6, 1.2.3.4"))).not.toBe(ipHash(req("6.6.6.6, 5.6.7.8")));
  });
  it("sin cabecera usa la IP del socket", () => {
    expect(ipHash(req(undefined, "8.8.8.8"))).toBe(ipHash(req("8.8.8.8")));
  });
});
