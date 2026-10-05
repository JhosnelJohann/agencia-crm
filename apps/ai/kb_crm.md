# KB · GOZZ — CRM de marketing (guía operativa)

GOZZ es el CRM de marketing de Sandro Gozz para gestionar una agencia: captar leads, calificarlos, convertirlos y medir lo que cada campaña deja. Este KB le da a CoPilot el mapa del producto para responder "¿cómo hago X?", "¿dónde está Y?" o "¿por qué pasó Z?". Responde con pasos numerados y precisos; si algo no está aquí, razona desde la arquitectura y dilo.

## Navegación (dock izquierdo, se expande al pasar el cursor)

**Comercial**
- **Panel** — resumen del día: contactos, oportunidades, tareas, SLA, cobranza, embudo por etapa, captación de marketing (30 días) y leads calientes.
- **Contactos** — base de leads y clientes (empresa, cargo, sitio web, industria, fuente/UTM). La ficha tiene pestañas: resumen, **marketing** (temperatura, origen, formularios, campañas, línea de eventos), documentos, notas, negociaciones, tareas, referidos.
- **Oportunidades** — pipeline en tablero (arrastrar entre etapas) o lista. Etapas por defecto: Nuevo lead → Contactado → Reunión agendada → Propuesta enviada → Negociación → Cliente ganado / Perdido. Se editan en Ajustes → Pipeline.
- **Servicios** — catálogo de lo que vende la agencia (código, precio base, plazo de entrega, color único que tiñe el pipeline).

**Marketing**
- **Embudos** — formularios públicos con URL propia `/f/<slug>` (también incrustables por iframe). Capturan UTM y fbclid, miden vistas/scroll/tiempo, crean o actualizan el contacto (sin duplicar por email/teléfono), abren una oportunidad y publican el evento `form_submitted`.
- **Campañas** — correo masivo a un **segmento** (filtro por etiqueta, fuente, tipo de cliente o puntos mínimos). Se envía desde un buzón con contraseña (Gmail/OAuth aún no). Mide aperturas y clics, incluye enlace de baja y respeta las bajas.
- **Anuncios** — cuentas de Meta Ads en solo lectura (token cifrado): gasto, clics, leads y CPL real cruzado con los leads del CRM por `utm_campaign`; devuelve conversiones (Lead / Schedule / Purchase) a Meta por Conversions API si hay píxel y token.
- **Scoring** — reglas evento→puntos (p. ej. llenó formulario +20, escribió por WhatsApp +5, avanzó de etapa +10, se dio de baja −25). Temperatura: ≥60 caliente, 25–59 tibio, <25 frío.
- **Redes** — panel de lectura de Metricool (marcas y redes conectadas).

**Operación**
- **Tareas** — lista/tablero/por fecha, chat por tarea, "Voz → Tarea" con IA.
- **Drive** — archivos con carpetas por usuario y por oportunidad; compartir, destacados, papelera (todo es archivado reversible).
- **Automatizaciones** — agentes de IA de WhatsApp (n8n), reglas y recordatorios, y la pestaña **Webhooks · n8n**: cada evento del CRM se reenvía a la URL de un workflow con el contacto, su puntaje y el detalle.
- **Reportes** — puntajes, asistencia y tareas con exportación a Excel/PDF.

**Comunicación**
- **WhatsApp** — bandeja compartida por número (conexión por QR con Baileys), lista y tablero por etapa, etiquetas, asignación y "convertir a oportunidad". La API oficial de Meta llegará después.
- **Correo** — buzones IMAP/SMTP por usuario, vinculación de correos a contactos.
- **Chat** — mensajes internos y CoPilot. (Las videollamadas están desactivadas en esta instalación.)

**Equipo**: directorio, organigrama y perfiles; **Asistencia** (clock in/out y descansos); **Ajustes**: usuarios, departamentos, pipeline, API keys, notificaciones y seguridad.

## Eventos que publica el CRM (bus interno)
`form_submitted`, `contact_created`, `stage_changed` (payload: desde, hacia, valor_total), `whatsapp_message_received`, `task_completed`, `campaign_sent`, `campaign_opened`, `campaign_clicked`, `campaign_unsubscribed`.
Cada evento: se guarda, suma/resta puntos según las reglas, se reenvía a los webhooks suscritos (cabeceras `X-Gozz-Event` y opcional `X-Gozz-Secret`) y, si aplica, se envía a Meta (Lead / Schedule al pasar a "reunion" / Purchase al ganar).

## Roles y permisos
Niveles `super_admin`, `admin` y `usuario`. Los permisos finos viven en la base (`user_permisos`), no en el token. Solo administradores crean webhooks, reglas de scoring, cuentas de anuncios y conexiones de redes.

## Infraestructura (para diagnóstico)
Producción en `agencia.sandrogozz.com` (VPS Contabo): PM2 `agencia-frontend` (3300), `agencia-api` (4300), `agencia-email-worker`, `agencia-whatsapp-worker`, `agencia-ai` (8300); PostgreSQL base `crm_agencia`, esquema `gozz`; nginx + Let's Encrypt. No reiniciar procesos `gozz-*` (es otro CRM). Logs en `/root/agencia-crm/logs/`.

## Problemas frecuentes
- **El formulario público no carga**: revisar que esté en estado *activo* y que el slug exista (`/api/public/forms/<slug>` debe devolver 200).
- **No llegan leads a una campaña de Meta**: comprobar que el enlace lleve `utm_campaign` igual al nombre o al ID de la campaña.
- **Una campaña de correo falla**: el buzón debe ser de contraseña (no OAuth) y con SMTP válido; el error de cada destinatario aparece en "Destinatarios".
- **Un webhook de n8n no dispara**: en Automatizaciones → Webhooks, pulsar *Probar* y mirar "Últimas ejecuciones" (código HTTP y error).
- **Efectos 3D lentos**: el botón ✨ de la barra los apaga; se desactivan solos si el equipo no llega a ~28 fps.
