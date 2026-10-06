-- Paleta corporativa pizarra (2026-10-05): el gris neutro de los seeds pasa del gris cálido de la
-- landing (#9b9490) al gris pizarra (#94a3b8) que usa ahora la interfaz.
-- Solo toca filas que conservan el valor por defecto: si alguien ya eligió otro color, se respeta.
-- Idempotente: re-ejecutarla no cambia nada.
UPDATE gozz.pipeline_stages          SET color = '#94a3b8' WHERE lower(color) = '#9b9490';
UPDATE gozz.whatsapp_pipeline_stages SET color = '#94a3b8' WHERE lower(color) = '#9b9490';
UPDATE gozz.tramites_config          SET color = '#94a3b8' WHERE lower(color) = '#9b9490';
