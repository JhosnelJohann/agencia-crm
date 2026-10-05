-- 0011_marketing_core.sql
-- Núcleo de marketing de GOZZ (spec: especificacion-tecnica-crm-marketing.md).
-- Idempotente. Un solo inquilino (no hay org_id: cada instalación de GOZZ es de una agencia).
--
--   M1  Formularios / embudos + tracking (vistas, eventos, envíos, UTM)
--   M2  Bus de eventos + webhooks hacia n8n (triggers y ejecuciones)
--   M4  Cuentas publicitarias (Meta), campañas sincronizadas, atribución y conversiones
--   M5  Segmentos y campañas (email / whatsapp / sms)
--   M6  Lead scoring
--   M7  Redes sociales (Metricool) con caché
--   +   Campos de agencia en contactos

-- ── Contactos: campos de agencia ─────────────────────────────────────────────────────────────
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS empresa text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS sitio_web text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS industria text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS fuente text;                 -- 'formulario', 'whatsapp', 'manual', 'anuncio'…
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS utm_source text;             -- primer contacto (first touch)
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE gozz.contactos_cache ADD COLUMN IF NOT EXISTS mk_opt_out boolean NOT NULL DEFAULT false;  -- se dio de baja de campañas

-- ── M1 · Formularios / embudos ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_forms (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre             text NOT NULL,
    slug               text NOT NULL UNIQUE,
    descripcion        text,
    titulo_publico     text,
    boton_texto        text NOT NULL DEFAULT 'Enviar',
    campos             jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{key,label,type,required,options?}]
    mensaje_gracias    text NOT NULL DEFAULT '¡Gracias! Te contactaremos muy pronto.',
    redirect_url       text,
    estado             text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','activo','pausado')),
    crear_oportunidad  boolean NOT NULL DEFAULT true,
    etapa_key          text NOT NULL DEFAULT 'nuevo',
    etiqueta           text,                                  -- se agrega al contacto
    creado_por         uuid,
    archivado          boolean NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_form_submissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         uuid NOT NULL REFERENCES gozz.mk_forms(id) ON DELETE CASCADE,
    contacto_id     uuid,
    oportunidad_id  uuid,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    utm_source      text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
    fbclid          text,
    landing_url     text,
    referrer        text,
    session_id      text,
    ip_hash         text,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_form_submissions_form_idx ON gozz.mk_form_submissions (form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mk_form_submissions_contacto_idx ON gozz.mk_form_submissions (contacto_id);

CREATE TABLE IF NOT EXISTS gozz.mk_page_views (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id      uuid REFERENCES gozz.mk_forms(id) ON DELETE SET NULL,
    session_id   text NOT NULL,
    contacto_id  uuid,
    landing_url  text NOT NULL,
    referrer     text,
    utm_source   text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
    fbclid       text,
    viewed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_page_views_form_idx ON gozz.mk_page_views (form_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS mk_page_views_session_idx ON gozz.mk_page_views (session_id);

CREATE TABLE IF NOT EXISTS gozz.mk_page_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_view_id  uuid NOT NULL REFERENCES gozz.mk_page_views(id) ON DELETE CASCADE,
    tipo          text NOT NULL,                              -- scroll_50 | scroll_90 | time_30s | cta_click | field_focus
    datos         jsonb NOT NULL DEFAULT '{}'::jsonb,
    ocurrio_en    timestamptz NOT NULL DEFAULT now()
);

-- ── M2 · Bus de eventos + webhooks (n8n) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_events (
    id              bigserial PRIMARY KEY,
    tipo            text NOT NULL,        -- form_submitted | contact_created | stage_changed | whatsapp_message_received | task_completed | score_changed | campaign_sent …
    contacto_id     uuid,
    oportunidad_id  uuid,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_events_tipo_idx ON gozz.mk_events (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS mk_events_contacto_idx ON gozz.mk_events (contacto_id, created_at DESC);

CREATE TABLE IF NOT EXISTS gozz.mk_automation_triggers (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       text NOT NULL,
    evento       text NOT NULL,           -- tipo de mk_events al que se suscribe ('*' = todos)
    webhook_url  text NOT NULL,           -- normalmente el webhook de un workflow de n8n
    secreto      text,                    -- se manda en X-Gozz-Secret
    filtro       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {campo: valor} contra el payload
    estado       text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pausado')),
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_automation_runs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id    uuid REFERENCES gozz.mk_automation_triggers(id) ON DELETE SET NULL,
    evento_id     bigint REFERENCES gozz.mk_events(id) ON DELETE SET NULL,
    estado        text NOT NULL CHECK (estado IN ('enviado','fallido')),
    status_code   integer,
    error         text,
    duracion_ms   integer,
    triggered_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_automation_runs_idx ON gozz.mk_automation_runs (triggered_at DESC);

-- ── M6 · Lead scoring ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_scoring_rules (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     text NOT NULL,
    evento     text NOT NULL,             -- tipo de mk_events
    puntos     integer NOT NULL,          -- puede ser negativo
    condicion  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {campo: valor} contra el payload
    activo     boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_contact_scores (
    contacto_id uuid PRIMARY KEY,
    score       integer NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_score_log (
    id          bigserial PRIMARY KEY,
    contacto_id uuid NOT NULL,
    regla_id    uuid REFERENCES gozz.mk_scoring_rules(id) ON DELETE SET NULL,
    evento      text NOT NULL,
    puntos      integer NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_score_log_contacto_idx ON gozz.mk_score_log (contacto_id, created_at DESC);

-- ── M5 · Segmentos y campañas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_segments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     text NOT NULL,
    reglas     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {etiqueta?, fuente?, tipo_cliente?, score_min?, con_email?}
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_campaigns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          text NOT NULL,
    canal           text NOT NULL DEFAULT 'email' CHECK (canal IN ('email','whatsapp','sms')),
    segmento_id     uuid REFERENCES gozz.mk_segments(id) ON DELETE SET NULL,
    asunto          text,
    contenido       text NOT NULL DEFAULT '',            -- admite {{nombre}} {{empresa}}
    buzon_id        uuid,                                -- buzón desde el que se envía (email)
    estado          text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','programada','enviando','enviada','pausada')),
    programada_para timestamptz,
    total           integer NOT NULL DEFAULT 0,
    enviados        integer NOT NULL DEFAULT 0,
    fallidos        integer NOT NULL DEFAULT 0,
    creado_por      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    enviada_at      timestamptz
);

CREATE TABLE IF NOT EXISTS gozz.mk_campaign_recipients (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  uuid NOT NULL REFERENCES gozz.mk_campaigns(id) ON DELETE CASCADE,
    contacto_id  uuid NOT NULL,
    destino      text NOT NULL,
    estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviado','fallido','baja')),
    error        text,
    enviado_at   timestamptz,
    abierto_at   timestamptz,
    clic_at      timestamptz,
    UNIQUE (campaign_id, contacto_id)
);
CREATE INDEX IF NOT EXISTS mk_campaign_recipients_idx ON gozz.mk_campaign_recipients (campaign_id, estado);

-- ── M4 · Anuncios (Meta), atribución y conversiones ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_ad_accounts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor           text NOT NULL DEFAULT 'meta',
    nombre              text NOT NULL,
    external_account_id text NOT NULL,                   -- act_XXXX
    access_token_enc    text,                            -- cifrado (APP_ENC_KEY)
    pixel_id            text,
    capi_token_enc      text,                            -- token de Conversions API (cifrado)
    moneda              text NOT NULL DEFAULT 'USD',
    estado              text NOT NULL DEFAULT 'activa',
    ultima_sync         timestamptz,
    ultimo_error        text,
    connected_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (proveedor, external_account_id)
);

CREATE TABLE IF NOT EXISTS gozz.mk_ad_campaigns (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_id    uuid NOT NULL REFERENCES gozz.mk_ad_accounts(id) ON DELETE CASCADE,
    external_id      text NOT NULL,
    nombre           text,
    objetivo         text,
    estado           text,
    gasto            numeric(14,2) NOT NULL DEFAULT 0,
    impresiones      bigint NOT NULL DEFAULT 0,
    clics            bigint NOT NULL DEFAULT 0,
    leads            integer NOT NULL DEFAULT 0,
    last_synced_at   timestamptz,
    UNIQUE (ad_account_id, external_id)
);

CREATE TABLE IF NOT EXISTS gozz.mk_lead_attribution (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contacto_id    uuid NOT NULL,
    submission_id  uuid,
    utm_source     text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
    fbclid         text,
    ad_campaign_id uuid REFERENCES gozz.mk_ad_campaigns(id) ON DELETE SET NULL,
    metodo         text NOT NULL DEFAULT 'utm_only' CHECK (metodo IN ('fbclid','utm_only','manual')),
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mk_lead_attribution_contacto_idx ON gozz.mk_lead_attribution (contacto_id);
CREATE INDEX IF NOT EXISTS mk_lead_attribution_campana_idx ON gozz.mk_lead_attribution (utm_campaign);

CREATE TABLE IF NOT EXISTS gozz.mk_conversion_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contacto_id   uuid NOT NULL,
    ad_account_id uuid REFERENCES gozz.mk_ad_accounts(id) ON DELETE SET NULL,
    evento        text NOT NULL,                          -- Lead | Purchase | Schedule
    enviado_via   text NOT NULL DEFAULT 'conversions_api',
    event_id      text NOT NULL,                          -- deduplicación pixel ↔ CAPI
    estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviado','fallido','omitido')),
    respuesta     text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── M7 · Redes sociales (Metricool) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gozz.mk_social_accounts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor   text NOT NULL DEFAULT 'metricool',
    nombre      text NOT NULL,
    blog_id     text,                                     -- id de marca en Metricool
    token_enc   text,                                     -- userToken cifrado
    conectado   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gozz.mk_social_cache (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id   uuid NOT NULL REFERENCES gozz.mk_social_accounts(id) ON DELETE CASCADE,
    tipo        text NOT NULL,                            -- metricas | publicaciones | menciones
    payload     jsonb NOT NULL,
    fetched_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (cuenta_id, tipo)
);

-- ── Semilla: reglas de scoring razonables (editables desde la interfaz) ───────────────────────
INSERT INTO gozz.mk_scoring_rules (nombre, evento, puntos, condicion)
SELECT * FROM (VALUES
  ('Llenó un formulario',                    'form_submitted',            20, '{}'::jsonb),
  ('Escribió por WhatsApp',                  'whatsapp_message_received',  5, '{}'::jsonb),
  ('Avanzó de etapa en el pipeline',         'stage_changed',             10, '{}'::jsonb),
  ('Completó una tarea vinculada',           'task_completed',             5, '{}'::jsonb),
  ('Abrió una campaña de email',             'campaign_opened',            3, '{}'::jsonb),
  ('Hizo clic en una campaña de email',      'campaign_clicked',           6, '{}'::jsonb),
  ('Se dio de baja de las campañas',         'campaign_unsubscribed',    -25, '{}'::jsonb)
) AS v(nombre, evento, puntos, condicion)
WHERE NOT EXISTS (SELECT 1 FROM gozz.mk_scoring_rules);
