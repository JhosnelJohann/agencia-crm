-- 0006_whatsapp_inbox_seed_pipeline_stages.sql
-- Embudo por defecto para conversaciones de WhatsApp, independiente del pipeline de Oportunidades
-- (gozz.pipeline_stages). Ver 0005_whatsapp_inbox_schema.sql y docs/ROADMAP.md §0 para el porqué
-- de una tabla propia.

INSERT INTO gozz.whatsapp_pipeline_stages (key, label, color, orden, es_terminal, es_ganado, activa)
VALUES
  ('apertura', 'Apertura', '#9b9490', 1, false, false, true),
  ('activa', 'Conversación activa', '#5d8fa8', 2, false, false, true),
  ('oferta', 'Oferta presentada', '#e8581a', 3, false, false, true),
  ('decision', 'Tomando decisión', '#f0b040', 4, false, false, true),
  ('ganado', 'Cliente ganado', '#16b91a', 5, true, true, true),
  ('perdido', 'Perdido', '#e30b0b', 6, true, false, true)
ON CONFLICT (key) DO NOTHING;
