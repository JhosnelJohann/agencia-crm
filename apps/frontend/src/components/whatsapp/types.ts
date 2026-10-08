export interface WhatsAppConexion {
  id: string;
  nombre: string;
  telefono: string | null;
  estado: "pendiente" | "conectando" | "conectado" | "desconectado" | "error" | "cerrada";
  ultimo_error: string | null;
  /** Nombre y foto de la cuenta de WhatsApp conectada (los del teléfono). */
  perfil_nombre?: string | null;
  perfil_foto_url?: string | null;
}

export interface WhatsAppPipelineStage {
  id: string;
  key: string;
  label: string;
  color: string;
  orden: number;
  es_terminal: boolean;
  es_ganado: boolean;
}

export interface WhatsAppTag {
  id: string;
  nombre: string;
  color: string;
}

export interface WhatsAppMensaje {
  id: string;
  conversacion_id: string;
  wa_message_id: string | null;
  direccion: "entrante" | "saliente";
  tipo: "texto" | "imagen" | "archivo" | "audio" | "video" | "sistema" | "sticker" | "ubicacion" | "contacto";
  contenido: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  archivo_tipo: string | null;
  archivo_tamanio: number | null;
  estado_entrega: "pendiente" | "enviado" | "entregado" | "leido" | "fallido";
  created_at: string;
  visto_at: string | null;
  visto_por: string | null;
  es_nota_voz?: boolean;
  duracion_seg?: number | null;
  /** Reacción del contacto y la nuestra (emoji) sobre este mensaje. */
  reaccion?: string | null;
  reaccion_propia?: string | null;
  editado_at?: string | null;
  borrado_at?: string | null;
  /** ubicacion: {lat,lng,nombre?,direccion?} · contacto: {nombre,telefono?,vcard?,lista?} */
  datos?: Record<string, any> | null;
}

export interface WhatsAppConversacionDetalle {
  id: string;
  conexion_id: string;
  wa_jid: string;
  nombre_whatsapp: string | null;
  foto_perfil_url: string | null;
  telefono_real: string | null;
  contacto_id: string | null;
  contacto_vinculo_estado: "sin_vincular" | "vinculado_auto" | "vinculado_manual";
  etapa_id: string | null;
  asignado_a: string | null;
  oportunidad_id: string | null;
  tags: WhatsAppTag[];
  /** "Info" (estado) del contacto en WhatsApp. */
  info_perfil?: string | null;
}
