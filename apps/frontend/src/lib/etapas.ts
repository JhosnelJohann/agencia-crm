// Etapas por defecto del pipeline de una agencia de marketing. Es un respaldo para pintar
// colores/etiquetas: la fuente de verdad son las etapas configurables (Configuración → Pipeline).
// Las claves heredadas del CRM de inmigración se conservan al final para no romper datos viejos.
const NEUTRAL = { bg: "bg-white/[0.06]", text: "text-ink-sub" };
const ORANGE = { bg: "bg-brand-primary/10", text: "text-brand-primary" };
const AMBER = { bg: "bg-amber-400/10", text: "text-amber-400" };
const GREEN = { bg: "bg-brand-green/10", text: "text-brand-green" };
const RED = { bg: "bg-brand-red/10", text: "text-brand-red" };
const BLUE = { bg: "bg-brand-blue/10", text: "text-brand-blue" };

export const ETAPAS = [
  { key: "nuevo",       label: "Nuevo lead",        color: "#9b9490", ...NEUTRAL },
  { key: "contactado",  label: "Contactado",        color: "#5d8fa8", ...BLUE },
  { key: "reunion",     label: "Reunión agendada",  color: "#c96a3d", ...ORANGE },
  { key: "propuesta",   label: "Propuesta enviada", color: "#e8581a", ...ORANGE },
  { key: "negociacion", label: "Negociación",       color: "#f0b040", ...AMBER },
  { key: "ganado",      label: "Cliente ganado",    color: "#16b91a", ...GREEN },
  { key: "perdido",     label: "Perdido",           color: "#e30b0b", ...RED },
  // — heredadas —
  { key: "calificacion",    label: "Calificación",      color: "#5d8fa8", ...BLUE },
  { key: "en_proceso",      label: "En proceso",        color: "#e8581a", ...ORANGE },
  { key: "documentos",      label: "Documentos",        color: "#e8581a", ...ORANGE },
  { key: "preparacion",     label: "Preparación",       color: "#e8581a", ...ORANGE },
  { key: "revision",        label: "Revisión",          color: "#f0b040", ...AMBER },
  { key: "impresion_envio", label: "Impresión y envío", color: "#c96a3d", ...ORANGE },
  { key: "radicado",        label: "Radicado",          color: "#5d8fa8", ...BLUE },
  { key: "aprobado",        label: "Aprobado",          color: "#16b91a", ...GREEN },
  { key: "completado",      label: "Completado",        color: "#16b91a", ...GREEN },
  { key: "cancelado",       label: "Cancelado",         color: "#e30b0b", ...RED }
] as const;

export type EtapaKey = typeof ETAPAS[number]["key"];
