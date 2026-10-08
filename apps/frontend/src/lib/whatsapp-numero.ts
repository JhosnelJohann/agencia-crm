import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface NumeroFormateado {
  /** Lo que hay que mostrar: el número formateado, o un texto claro cuando no hay número real. */
  texto: string;
  /** Emoji de bandera del país, o null si no se pudo determinar (o no hay número real). */
  bandera: string | null;
}

/** Emoji de bandera a partir de un código ISO de 2 letras — fórmula estándar de indicadores
 * regionales Unicode, no hace falta ninguna librería para esto. */
function banderaDesdeISO(iso2?: string): string | null {
  if (!iso2 || iso2.length !== 2) return null;
  const puntos = [...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...puntos);
}

/**
 * Formatea un número de WhatsApp con bandera del país — o dice claramente que no hay número real
 * cuando no lo hay.
 *
 * Acepta un JID completo (`584121073787@s.whatsapp.net`) o solo los dígitos. Los `@lid`
 * ("Linked ID") de WhatsApp NO son números de teléfono — son un identificador opaco que WhatsApp
 * usa cuando el contacto tiene cierta privacidad activada, y no existe ninguna forma (confirmado
 * contra la propia librería de WhatsApp que usa este CRM) de recuperar el número real detrás de
 * uno. Mostrarlo como si fuera un teléfono sería mentir con más precisión, no menos — por eso este
 * caso devuelve un texto explícito en vez de un número inventado.
 */
export function formatearNumeroWhatsApp(jidODigitos: string): NumeroFormateado {
  const [parte, servidor] = jidODigitos.split("@");
  if (servidor === "lid" || servidor === "g.us") {
    return { texto: "Número no disponible", bandera: null };
  }
  const digitos = parte.replace(/\D/g, "");
  if (!digitos) return { texto: jidODigitos, bandera: null };

  const parsed = parsePhoneNumberFromString(`+${digitos}`);
  if (!parsed || !parsed.isValid()) return { texto: `+${digitos}`, bandera: null };
  return { texto: parsed.formatInternational(), bandera: banderaDesdeISO(parsed.country) };
}

/**
 * Nombre visible de una conversación: el nombre de WhatsApp si existe; si no, el teléfono formateado; y si
 * el JID es un `@lid` (identificador opaco, no un teléfono), "Contacto de WhatsApp" en lugar de los dígitos.
 */
export function nombreConversacion(c: { nombre_whatsapp?: string | null; wa_jid: string }): string {
  const n = (c.nombre_whatsapp || "").trim();
  if (n) return n;
  const [, servidor] = c.wa_jid.split("@");
  if (servidor === "lid") return "Contacto de WhatsApp";
  if (servidor === "g.us") return "Grupo de WhatsApp";
  if (servidor === "newsletter" || servidor === "broadcast") return "Canal de WhatsApp";
  // Un teléfono E.164 tiene como mucho 15 dígitos: algo más largo es un identificador interno.
  const digitos = c.wa_jid.split("@")[0].replace(/\D/g, "");
  if (digitos.length > 15) return "Contacto de WhatsApp";
  return formatearNumeroWhatsApp(c.wa_jid).texto;
}
