-- WhatsApp como WhatsApp Web (2026-10-08).
--  · Mapa persistente @lid → teléfono real (Baileys 7): antes vivía solo en memoria del worker y se
--    perdía en cada reinicio, así que muchos chats se quedaban para siempre en "Número no disponible".
--  · Tipos de mensaje que antes se guardaban como "sistema" vacío (sticker, ubicación, tarjeta de
--    contacto) y metadatos de reacción / edición / borrado / duración de notas de voz.
--  · Perfil: foto descargada (la URL del CDN de WhatsApp caduca), fecha de refresco e "info" del
--    contacto; nombre y foto de la cuenta conectada.
-- Idempotente: re-ejecutarla no cambia nada.

CREATE TABLE IF NOT EXISTS gozz.whatsapp_lid_map (
    conexion_id uuid NOT NULL REFERENCES gozz.whatsapp_conexiones(id) ON DELETE CASCADE,
    lid text NOT NULL,          -- "<n>@lid"
    pn text NOT NULL,           -- "<n>@s.whatsapp.net"
    actualizado_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (conexion_id, lid)
);
CREATE INDEX IF NOT EXISTS whatsapp_lid_map_pn_idx ON gozz.whatsapp_lid_map (conexion_id, pn);

ALTER TABLE gozz.whatsapp_mensajes DROP CONSTRAINT IF EXISTS whatsapp_mensajes_tipo_check;
ALTER TABLE gozz.whatsapp_mensajes ADD CONSTRAINT whatsapp_mensajes_tipo_check
    CHECK (tipo = ANY (ARRAY['texto','imagen','archivo','audio','video','sistema','sticker','ubicacion','contacto']::text[]));

ALTER TABLE gozz.whatsapp_mensajes
    ADD COLUMN IF NOT EXISTS es_nota_voz boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS duracion_seg integer,
    ADD COLUMN IF NOT EXISTS reaccion text,             -- emoji de la última reacción del contacto
    ADD COLUMN IF NOT EXISTS reaccion_propia text,      -- emoji de nuestra reacción
    ADD COLUMN IF NOT EXISTS editado_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS borrado_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS datos jsonb;               -- ubicación {lat,lng,nombre}, contacto {nombre,telefono,vcard}

ALTER TABLE gozz.whatsapp_conversaciones
    ADD COLUMN IF NOT EXISTS foto_actualizada_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS info_perfil text;          -- "info" (estado) del contacto en WhatsApp

ALTER TABLE gozz.whatsapp_conexiones
    ADD COLUMN IF NOT EXISTS perfil_nombre text,
    ADD COLUMN IF NOT EXISTS perfil_foto_url text;

-- Las fotos guardadas hasta hoy son URLs del CDN de WhatsApp (caducan): marcarlas como "a refrescar".
UPDATE gozz.whatsapp_conversaciones SET foto_actualizada_at = NULL
 WHERE foto_perfil_url LIKE 'http%' AND foto_actualizada_at IS NOT NULL;
