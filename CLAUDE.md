# CLAUDE.md — GOZZ (CRM de marketing) · agencia.sandrogozz.com

GOZZ es el CRM de marketing de Sandro Gozz. Nació como copia del CRM de inmigración (`crm.sandrogozz.com`,
repo `gozz-crm`) y ahora es un producto **separado**: código, base de datos, procesos, dominio y
diseño propios. Monorepo pnpm: `apps/api` (Express + TS), `apps/frontend` (Next.js 14 + Tailwind),
`apps/ai` (FastAPI: Claude/Whisper), `packages/db` (migraciones), `packages/shared-types`.

> La especificación funcional de los 8 módulos nuevos (Embudos, Automatizaciones, WhatsApp
> avanzado, Ads/UTM/Pixel, Campañas, Lead Scoring, Redes, n8n) está en
> `Downloads\especificacion-tecnica-crm-marketing.md`. Ojo: la spec supone FastAPI; el backend real es
> **Node/Express**. Los módulos nuevos se construyen como *vertical slice* siguiendo
> `apps/api/src/modules/oportunidades/` (routes → service → repository → schemas).

## ⛔ Aislamiento del servidor (VPS 5.189.156.172)

En el mismo VPS viven: la landing `sandrogozz.com`, el CRM de inmigración (`gozz-*`, puertos
3100/4100/8100/LiveKit), Cal.diy (`calcom`, 3200) y Postgres (`crm_gozz`, `caldb`).

- GOZZ usa **solo**: `/root/agencia-crm`, base `crm_agencia` (rol `agencia_crm`), puertos **3300 / 4300 / 8300**,
  procesos PM2 `agencia-*` y el vhost `/etc/nginx/sites-available/agencia.sandrogozz.com`.
- **Nunca** reiniciar/parar/editar procesos `gozz-*` ni `calcom`, ni sus vhosts, ni tocar `crm_gozz`/`caldb`.
- Los secretos de producción son propios (`/root/agencia-crm/.env`, chmod 600). No se copian del CRM de
  inmigración ni se muestran en chat.
- Videollamadas (LiveKit) están **apagadas** en GOZZ: el LiveKit de inmigración ocupa los puertos.
- La landing `C:\Users\Jhosnel\Projects\sandro-gozz-landing` es **solo referencia de identidad visual**:
  no se edita ni se despliega desde aquí.

## Despliegue

`scripts/deploy-vps.sh` (sube por tar+ssh, compila en el VPS, migra y reinicia solo `agencia-*`):

- `scripts/deploy-vps.sh --frontend` → cambios visuales (compila el frontend y reinicia `agencia-frontend`).
- `scripts/deploy-vps.sh` → completo (API + frontend + migraciones + reinicio de `agencia-*`).

Sandro **no da por bueno nada que solo se probó en local**: tras desplegar, verificar en
`https://agencia.sandrogozz.com` (curl y navegador) y comprobar que `crm.` y `sandrogozz.com` siguen igual.
El puerto 22 saliente puede estar bloqueado por el ISP (Venezuela): ProtonVPN funciona.

## Identidad visual (tomada de sandrogozz.com, NO idéntica al CRM de inmigración)

- **Híbrido claro/oscuro (desde 2026-10-04):** el dock, el navbar y los modales (`.modal-surface`) siguen
  carbón cálido `#0c0c0c / #111009 / #161310 / #1c1915` con acento **naranja `#e8581a`** (gradiente a `#b8460f`).
  El CONTENIDO de página (dentro de `.app-main`, el `<main>` de `AppShell.tsx`) ahora es **claro** (perla
  `#f6f4f1` de fondo, tarjetas blancas, texto `#1c1915`). Mecanismo: `tailwind.config.ts` define `ink`/`bg.dark`/
  `bg.darkcard`/`line` como `var(--token)` en vez de hex fijo; `globals.css` declara esos tokens oscuros en
  `:root` (para dock/navbar/fuera de `.app-main`) y los vuelve a declarar claros dentro de `.app-main` — así
  `.glass-3d`/`.glass-blur` dentro de `.app-main` salen como tarjeta blanca con sombra suave (sin blur), y
  `.modal-surface` se re-ancla a los valores oscuros aunque esté anidado dentro de `.app-main`. `Scene3D`/aurora
  solo se montan en `/login` (`SceneHost.tsx`) — en el resto quedarían tapados por el contenido claro de todos modos.
  ⚠️ Cualquier elemento SIN su propia clase de color hereda `color` del ancestro más cercano que lo defina:
  `.app-main` y `.modal-surface` ahora fijan `color: var(--ink)` explícitamente para evitar que algo herede el
  `color: var(--text)` del `body` (que nunca cambia) y quede invisible.
  ⚠️ Deuda conocida: quedan ~96 usos del patrón viejo `text-X dark:text-Y` (gris claro fijo, pensado para fondo
  oscuro) sin convertir a los tokens `text-ink`/`text-ink-sub`/`text-ink-muted` — sobre todo en el módulo **Chat**
  (65, complicado porque las burbujas de mensaje tienen su propio fondo de color y NO deben tocarse, solo el
  "chrome" del chat sí) y en `app/view/page.tsx` (visor de documentos/hojas con su propio modo "nativo", revisar
  con cuidado antes de tocar).
- Tipografía autoalojada (`@fontsource`): **Inter** (titulares y cuerpo, pesos 400–800) + **JetBrains Mono**
  para cifras. *(Hasta 2026-10-04 era Barlow Condensed + DM Sans; cambiado a pedido explícito de Sandro.)*
- Marca: wordmark **GOZZ.** + isotipo "G." (`MoonMark`/`BrandMark`). Voz: español, "tú", directa
  ("No es suerte. Es sistema.").
- Estructura propia: **dock** flotante de cristal con iconos 3D (`components/Sidebar.tsx`), **navbar** flotante
  con la identidad del módulo (`components/Topbar.tsx`), **panel bento** (`app/dashboard/page.tsx`).
- Capa 2026 en `app/globals.css` (final del archivo): cristal 3D (`.glass-3d`, `.glass-blur`), botones con
  gradiente animado (`.btn-aurora`), aurora, `rise-in` global, `.kicker`, `.text-shimmer`, `.halo-ring`.
- Iconos 3D: **Fluent Emoji 3D de Microsoft (MIT)**, en `public/3d/*.webp` (160 px). Componente `Icon3D`.
  Escena de fondo Three.js/react-three-fiber (`components/magic/Scene3D.tsx`, procedural, sin assets; solo en `/login`).
- **Rendimiento primero**: `useFx` / `useFpsGuard` (`components/magic/fx.ts`) apagan los efectos en equipos
  modestos o si los fps caen; el usuario los alterna con el botón ✨ de la barra. `backdrop-filter` solo en
  dock/navbar/menús (`.glass-blur`); las tarjetas de página son cristal plano. No añadir blurs ni filtros animados
  en listas largas. Respetar `prefers-reduced-motion`.
- ⚠️ En CSS, **no usar `.replace()` con marcadores que puedan no encontrarse** (un patrón vacío inserta el
  texto entre cada carácter: ya corrompió `globals.css` una vez). Verificar índices/cuentas antes de escribir.
- ⚠️ `position` en utilidades propias: usar `:where(...)` para no pisar `.fixed/.absolute/.sticky` de Tailwind.
- `middleware.ts` protege todo salvo `/login`, `/api` y los estáticos de `/public` (3d, noise.png, favicon…).
  Un estático nuevo en `public/` debe añadirse a su `matcher`.

## Antes de CADA despliegue (lecciones de incidentes)

- Probar la interfaz con efectos **activados y desactivados**: `?fx=on` / `?fx=off` en la URL (persiste en
  `localStorage`). Un fallo solo visible con efectos activos ya tumbó el login en producción.
- **No mezclar `@react-three/fiber` 9 / `drei` 10 con React 18** (exigen React 19). El fondo 3D usa `three` directo
  (`Scene3D.tsx`) y va envuelto en un `SilentBoundary`: un adorno nunca debe tumbar la app. Antes de añadir una
  librería, comprobar sus `peerDependencies`.
- `scripts/deploy-vps.sh` termina con `scripts/smoke-prod.sh` (rutas, estáticos, procesos, otros sitios). Si falla, no
  se da por desplegado.

## Estado del producto

**En producción** (`agencia.sandrogozz.com`): copia aislada del CRM con identidad y estructura visual propias (dock, navbar, panel,
escena 3D, iconos 3D, cristal), módulos de inmigración podados o reconvertidos (*Trámites* → **Servicios**, catálogo y formulario de ejemplo sembrados
en `0013`), etapas de pipeline de agencia y los **módulos de marketing de la spec**: Embudos/formularios públicos con UTM, bus de eventos + webhooks a n8n,
scoring, campañas de correo con aperturas/clics/baja, anuncios de Meta (lectura + atribución + Conversions API), redes (Metricool, beta) y WhatsApp por
**Baileys y por la API oficial de Meta**. Guía técnica: `docs/MARKETING.md`. Pruebas puras: `pnpm --filter @gozz/api test:unit`.

Barrido de superficies "planas" (modales, dropdowns, popovers, paneles deslizantes) a `.modal-surface` (cristal 3D con blur, la clase ya no tiene
variante de tema claro) hecho en 33 archivos + `CommandPalette`, la barra de selección de `/chat` y el drawer de correo; desplegado a producción
con `deploy-vps.sh --frontend` y `tsc --noEmit` limpio.

Pendiente / deuda conocida (ver la nota del proyecto en la bóveda):
- Faltan **credenciales del dueño** para activar lo externo: `META_APP_SECRET` (webhook de WhatsApp Cloud), tokens de Meta Ads/Conversions API, token de Metricool,
  `ANTHROPIC_API_KEY` propia para `agencia-ai`, un buzón de correo (para enviar campañas).
- Modelo de datos con restos de inmigración aún presentes en columnas (SSN, USCIS, estatus migratorio en `contactos_cache`; roles `preparador/vendedor/managers` en
  `oportunidades`; puntajes por cargo en `tramites_config`; flujos de aprobación de monto/pago/descuento). La UI ya no los muestra, la BD los conserva (nada se borra).
- WhatsApp: plantillas aprobadas de Meta y campañas masivas por WhatsApp/SMS; landing externa con `<script>` de tracking.
- ~~Rediseño interior profundo de Tareas, Oportunidades (ficha), Drive, Chat y Reportes~~ → **completo** (hero con `Icon3D`, tarjetas/paneles
  `glass-3d`, estados vacíos ilustrados; Chat y Drive tenían restos de la paleta azul/magenta de inmigración con `backdrop-filter` en listas
  largas, corregido por la regla de rendimiento del proyecto; Drive se tocó solo a nivel visual, sin cambiar su lógica de archivos/drag-drop).
  `tsc --noEmit` limpio en todo el proyecto, desplegado a producción (`deploy-vps.sh --frontend`), verificado por IP directa con header `Host:`
  (el dominio sigue sin resolver, ver incidente externo arriba).
- Videollamadas apagadas (LiveKit de inmigración ocupa los puertos).

## ⚠️ Incidente externo abierto (no es de código)

`sandrogozz.com` y TODOS sus subdominios (`agencia.`, `crm.`, `agenda.`) dejaron de resolver en DNS (confirmado contra el resolver local Y contra
8.8.8.8: "Non-existent domain" para el ápex y cada subdominio). El servidor sigue sano — verificado por IP directa con cabecera `Host:` (`agencia`
y `crm` responden 200, PM2 sin reinicios) — así que es un problema de registrador/zona DNS, no del despliegue. Hay que revisarlo con el proveedor de
dominio/DNS de `sandrogozz.com` cuanto antes: mientras no se resuelva, nadie puede entrar por nombre a ningún sitio del servidor.

## Reglas de trabajo (heredadas y vigentes)

- Nada se borra físicamente: "borrar" = archivar de forma lógica y reversible. `gozz.auditoria` es intocable.
- SQL siempre con el helper `query` y placeholders `$1,$2`. Permisos por consulta a BD (`gozz.user_permisos`),
  no por el JWT (ver `docs/CONVENCIONES.md`).
- Migraciones `NNNN_descripcion.sql`, idempotentes. **Siguiente número: `0011`**. En producción
  `pnpm migrate` corre desde `scripts/deploy-vps.sh` (modo completo).
- No hacer `git push`, merge, rebase ni PRs sin que Sandro/Jhosnel lo pidan expresamente. Commit local solo si se pide.
- Evidencia, no afirmaciones: si algo se probó, decir cómo; si no se ejecutó, decirlo.

## Registro histórico en la bóveda de Obsidian

Al cerrar una sesión de trabajo en este proyecto (`C:\Users\Jhosnel\Documents\Sandro Gozz - Vault`):

1. Actualiza `01 - Proyectos/CRM GOZZ (Marketing).md` (Historial de cambios y Tareas pendientes).
2. Añade entrada en `05 - Registro Diario/AAAA-MM-DD.md` (plantilla en `03 - Plantillas/`) resumiendo el día.
3. Enlázalo desde `00 - Dashboard.md`. En `04 - Accesos` nunca van contraseñas reales.
