-- 0013_seed_agencia.sql
-- Contenido inicial para que GOZZ no arranque vacío: un catálogo de servicios típico de agencia y un formulario
-- de captación de ejemplo (en borrador). Solo se siembra si las tablas están vacías, así que nunca pisa datos reales
-- y se puede editar o archivar todo desde la interfaz.

INSERT INTO gozz.tramites_config (nombre, codigo, descripcion, valor_base, sla_dias, color, es_tramite_administrativo, activo)
SELECT * FROM (VALUES
  ('Gestión de Meta Ads',            'ADS',    'Estrategia, creativos y optimización mensual de campañas en Facebook e Instagram.',            1200.00, 30, '#e8581a', false, true),
  ('Branding e identidad visual',    'BRAND',  'Logo, paleta, tipografías y manual de marca listo para usar.',                                  2400.00, 21, '#c96a3d', false, true),
  ('Contenido para redes',           'CONT',   'Calendario mensual, reels, carruseles e historias con guion y diseño.',                          900.00, 30, '#f0b040', false, true),
  ('Embudo de ventas',               'EMB',    'Landing, formulario, secuencia de seguimiento y medición de conversiones.',                     1800.00, 25, '#5d8fa8', false, true),
  ('Automatización con IA',          'IA',     'Agentes de WhatsApp y flujos en n8n que califican y agendan leads.',                            1500.00, 20, '#16b91a', false, true),
  ('Consultoría 1:1',                'CONS',   'Sesión estratégica para ordenar tu marketing y definir el plan de 90 días.',                     250.00,  7, '#9b9490', false, true)
) AS v(nombre, codigo, descripcion, valor_base, sla_dias, color, es_tramite_administrativo, activo)
WHERE NOT EXISTS (SELECT 1 FROM gozz.tramites_config);

INSERT INTO gozz.mk_forms (nombre, slug, titulo_publico, descripcion, boton_texto, campos, mensaje_gracias, estado, crear_oportunidad, etapa_key, etiqueta)
SELECT 'Diagnóstico gratuito', 'diagnostico-gratuito', 'Recibe tu diagnóstico de marketing',
       'Cuéntanos de tu negocio y te respondemos en menos de 24 horas.', 'Quiero mi diagnóstico',
       '[
          {"key":"nombre","label":"Nombre","type":"text","required":true},
          {"key":"email","label":"Correo electrónico","type":"email","required":true},
          {"key":"telefono","label":"WhatsApp","type":"tel","required":false},
          {"key":"empresa","label":"Empresa","type":"text","required":false},
          {"key":"sitio_web","label":"Sitio web o Instagram","type":"text","required":false},
          {"key":"presupuesto","label":"Presupuesto mensual de marketing","type":"select","required":false,"options":["Aún no invierto","Menos de $500","$500 – $2.000","Más de $2.000"]},
          {"key":"mensaje","label":"¿Qué quieres lograr?","type":"textarea","required":false}
        ]'::jsonb,
       '¡Gracias! Revisamos tu caso y te escribimos muy pronto.', 'borrador', true, 'nuevo', 'lead-web'
WHERE NOT EXISTS (SELECT 1 FROM gozz.mk_forms);
