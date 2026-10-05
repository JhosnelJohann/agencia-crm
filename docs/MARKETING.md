# GOZZ · Módulos de marketing — guía técnica

Implementación de `especificacion-tecnica-crm-marketing.md` sobre la base real del proyecto (**Node/Express + Next.js + PostgreSQL**, no
FastAPI). Un solo inquilino: no hay `org_id`. Tablas `mk_*` en el esquema `gozz` (migraciones `0011`, `0012`, `0013`).

| # | Módulo | Pantalla | API (`/api/marketing/…`) | Código |
|---|--------|----------|--------------------------|--------|
| 1 | Embudos / formularios | `/embudos`, público `/f/<slug>` | `forms`, `resumen`, público `/api/public/forms/*`, `/api/public/track/*` | `modules/marketing/forms.routes.ts` |
| 2 | Bus de eventos + webhooks (n8n) | Automatizaciones → *Webhooks · n8n* | `eventos`, `automatizaciones/*` | `lib/marketing/eventos.ts`, `modules/marketing/core.routes.ts` |
| 3 | WhatsApp (Baileys **y** API oficial de Meta) | `/whatsapp` | `/api/whatsapp/*`, `/api/whatsapp/conexiones/meta`, webhook `/api/public/webhooks/whatsapp` | `modules/whatsapp/**` |
| 4 | Anuncios + atribución + Conversions API | `/anuncios` | `anuncios/*` | `modules/marketing/ads.routes.ts`, `lib/marketing/capi.ts` |
| 5 | Campañas de correo | `/campanas` | `campanas`, `segmentos`, público `/api/public/t/*` | `modules/marketing/campaigns.routes.ts` |
| 6 | Lead scoring | `/scoring`, pestaña *marketing* del contacto | `scoring/*`, `contacto/:id` | `lib/marketing/eventos.ts` |
| 7 | Redes (Metricool, solo lectura, beta) | `/redes` | `redes/*` | `modules/marketing/social.routes.ts` |
| 8 | Orquestación n8n + Claude | — | (usa los webhooks del módulo 2) | ver abajo |

## Bus de eventos
`publicarEvento(tipo, { contactoId, oportunidadId, payload })` **nunca lanza** (no puede romper quien lo llama) y hace, sin esperar: guarda en
`mk_events`, aplica scoring, despacha webhooks y, si corresponde, envía la conversión a Meta.

Eventos publicados hoy: `form_submitted`, `contact_created`, `stage_changed` (`desde`, `hacia`, `valor_total`), `whatsapp_message_received`,
`task_completed`, `campaign_sent`, `campaign_opened`, `campaign_clicked`, `campaign_unsubscribed`.

### Webhook hacia n8n
`POST <url del trigger>` con cabeceras `X-Gozz-Event: <tipo>` y, si se configuró, `X-Gozz-Secret`. Cuerpo:
```json
{ "evento": "form_submitted", "evento_id": 42,
  "contacto": { "id": "…", "nombre_completo": "…", "email": "…", "telefono": "…", "whatsapp": null, "empresa": "…", "etiquetas": [], "fuente": "formulario", "score": 20 },
  "oportunidad_id": "…", "payload": { "formulario": "diagnostico-gratuito", "utm_source": "meta", "…": "…" }, "at": "2026-09-26T05:00:00.000Z" }
```
Timeout de 8 s; cada envío queda en `mk_automation_runs` (visible en la interfaz). n8n puede volver a llamar al CRM por el endpoint existente
`POST /api/automatizaciones/n8n/mensaje` (cabecera `X-N8N-Secret`) para responder por WhatsApp con un agente de IA.

## Formularios y tracking
- Público: `GET /api/public/forms/:slug`, `POST /api/public/forms/:slug/submit`, `POST /api/public/track/pageview|event`. Límites por IP (`lib/marketing/rate-limit.ts`),
  campo trampa `website_hp`, validación por campo. La IP se guarda solo como hash.
- Un envío: valida → `upsertContacto` (dedupe por email o últimos 10 dígitos del teléfono; solo rellena huecos) → opcional oportunidad en la etapa elegida →
  `mk_form_submissions` + `mk_lead_attribution` (`fbclid` = método fuerte, si no `utm_only`) → eventos `form_submitted` / `contact_created`.
- Incrustar: `<iframe src="https://agencia.sandrogozz.com/f/<slug>?embed=1">`. Parámetros: `utm_source|medium|campaign|content|term`, `fbclid`.

## Scoring
Reglas `mk_scoring_rules` (evento → puntos, condición opcional `{campo: valor}` sobre el payload). Temperatura: ≥ 60 caliente, 25–59 tibio, < 25 frío.

## Campañas
Solo **email**. Segmento = filtro (etiqueta, fuente, tipo, puntos mínimos); excluye archivados, bajas (`mk_opt_out`) y sin correo. Envío desde un buzón con contraseña (Gmail/OAuth
todavía no) a ~3 correos/s. Se reescriben los enlaces para medir clics, se añade píxel de apertura y enlace de baja (GET/POST `/api/public/t/u/:id`). Si la API se reinicia a mitad,
las campañas en estado `enviando` se reanudan solas al arrancar.

## Meta: anuncios, Conversions API y WhatsApp oficial
- **Anuncios**: token con `ads_read` + ID de cuenta `act_…` (se cifra con `APP_ENC_KEY`; nunca vuelve al navegador). Sincroniza cada 6 h y a demanda. CPL real = gasto de Meta ÷ leads del CRM con `utm_campaign` igual al nombre o ID de la campaña.
- **Conversions API**: con `pixel_id` + token CAPI en la cuenta, `form_submitted` → *Lead*, cambio a `reunion` → *Schedule*, a `ganado` → *Purchase*. Cada envío queda en `mk_conversion_events` (deduplicable por `event_id`).
- **WhatsApp Cloud API**: crear la conexión desde *WhatsApp → Conectar → API oficial de Meta* (Phone Number ID + token). En el panel de Meta registrar el webhook con la URL y el token de verificación que muestra la pantalla
  y suscribirse al campo `messages`. Variables del servidor: `META_WA_VERIFY_TOKEN` (ya generada) y **`META_APP_SECRET`** (la aporta el dueño de la app de Meta; sin ella el POST del webhook se rechaza con 503).
  Fuera de la ventana de 24 h Meta exige plantillas aprobadas: el error se muestra en claro en el chat (la gestión de plantillas queda pendiente).

## Pruebas
`pnpm --filter @gozz/api test:unit` (21 pruebas puras: condiciones, email, mapeo a eventos de Meta, IP tras nginx, firma del webhook). La suite completa `pnpm test` requiere la base desechable.

## Pendiente conocido
Plantillas de WhatsApp y campañas masivas por WhatsApp/SMS; tracking desde una landing externa con un `<script>` (hoy solo el formulario alojado en GOZZ); métricas de Metricool más allá de marcas/redes;
OAuth de Meta (hoy se pega un token); envío de campañas desde buzones Gmail/OAuth.
