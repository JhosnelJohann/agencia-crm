-- 0002_seed_pipeline_stages.sql
-- Etapas de pipeline por defecto para una AGENCIA DE MARKETING. Son solo la semilla inicial:
-- se editan, reordenan y amplían desde Configuración → Pipeline sin tocar código.
-- (`key` es el slug estable; `label` es el texto visible.)

INSERT INTO gozz.pipeline_stages (key, label, color, orden, es_terminal, es_ganado, activa)
VALUES
  ('nuevo', 'Nuevo lead', '#9b9490', 1, false, false, true),
  ('contactado', 'Contactado', '#5d8fa8', 2, false, false, true),
  ('reunion', 'Reunión agendada', '#c96a3d', 3, false, false, true),
  ('propuesta', 'Propuesta enviada', '#e8581a', 4, false, false, true),
  ('negociacion', 'Negociación', '#f0b040', 5, false, false, true),
  ('ganado', 'Cliente ganado', '#16b91a', 6, true, true, true),
  ('perdido', 'Perdido', '#e30b0b', 7, true, false, true)
ON CONFLICT (key) DO NOTHING;
