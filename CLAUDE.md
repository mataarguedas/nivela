# CLAUDE.md — Nivela

Peer competency-rating PWA for AGRH 315 Psicología 2 / AGRH 613. **Read `PRD.md` first.** It is the source of truth for scope, flows, scoring, the Jev contract, the DB schema and the Spanish copy. `DESIGN.md` is the source of truth for visual tokens. If code and PRD disagree, follow the PRD and flag the conflict. Don't silently invent behavior.

## Non-negotiable rules

1. **All UI text is Spanish (Costa Rica), "usted" form.** Never "tú" or "vos". Use the strings from PRD Appendix C. Code identifiers may be Spanish domain terms (`evaluador`, `participante`, `indicador`, `nivel`). Comments may be in English.
2. **Light mode only.** Don't add `dark:` variants.
3. **The TypeSafe API key never reaches the client.** All Jev calls go through `src/lib/jev.ts` (`import "server-only"`), called only from `app/api/jev/route.ts`.
4. **Never send names or participant codes to Jev.** Send only the competencia/indicator text from server config plus the evaluator's observation.
5. **Names in config; emails and carnets only in the DB; never phone numbers.** Evaluator names live in config. Participant names and carnets are entered by the admin and stored in the `participantes` table (PRD §5.10). **Reports and the CSV identify participants by carnet (`etiquetaReporte`), never by name** (PRD §11, v1.4); evaluators, the admin and the results email use the name (`etiqueta`). Carnets follow the email rules below (DB only, never committed, logged or sent to Jev), except that reports and the CSV show them. Since v1.2, evaluator emails live only in `cuentas` and participant emails only in `participantes.correo` (PRD §5.12, §5.14). Emails are never in config, never committed (the import file and the roster screenshots stay in the gitignored `privado/`), never sent to Jev, never logged, and never shown in reports or the CSV. Names are never sent to Jev or logged either. Never write a real student email into code, tests, docs or prompts; tests use `@ejemplo.test`.
6. **Jev suggests, the human decides.** A suggestion is never applied without a tap on "Aplicar sugerencia". A Jev failure must never block manual rating or submission.
7. **Competencias, indicators and teams are data** in `src/config/`; participants are runtime data in the DB. No competencia-specific logic in components. Enabling a competencia means editing config only.
   - **A rubric belongs to jornada + competencia** (PRD §9.1, Appendix A): each jornada's team writes its own template. A competencia is enabled in a jornada exactly when its config has a rubric for that jornada. Always resolve it with the session's jornada: `obtenerCompetenciaHabilitada(jornada, id)` / `competenciasDeJornada(jornada)`; `obtenerDefinicionCompetencia(id)` is for names only. A new rubric gets new indicator ids (they are stored in the DB), its Appendix A section and a golden-set fixture.
   - **A team is identified by jornada + competencia.** Its number is a per-jornada display label and its size varies: Adaptabilidad is Equipo 4 (8 members) in the morning and Equipo 1 (7 members) at night. Never look a team up by number, and never hard-code a team number or size in code, tests, seed data or copy. Use `equipoDeCompetencia(jornada, competenciaId)` and read `numero` and `integrantes` from it.
8. **Design**: DESIGN.md tokens only.
   - Pill buttons (980 px radius).
   - Exactly one filled `#0071e3` primary button per view. Links and outlines use `#0066cc`.
   - **No box-shadows anywhere.** Separate sections with background tints, not borders.
   - No Apple logo, product names, imagery, or SF Pro font files; use the system font stack.
9. **Mobile Safari and Firefox Android are first-class.** Every feature is checked at 375 px in WebKit and Firefox before it's done.

## Stack

- **Next.js (latest stable, App Router)**, TypeScript `strict`, React Server Components by default. Add `"use client"` only where interaction needs it.
  - On Next 16+, request interception lives in `src/proxy.ts`; on older versions it's `middleware.ts`.
  - `params` and `searchParams` are Promises in page and route props, so `await` them.
- **Tailwind CSS v4** (CSS-first `@theme` in `src/app/globals.css`, no `tailwind.config.js`).
- **Charts**: the default report view uses simple horizontal bars drawn on the server in plain HTML (`components/reportes/BarrasHorizontales.tsx`, PRD §11 v1.2). **Recharts** draws only the detailed charts under "Ver gráficos detallados": report routes only, loaded with `next/dynamic` (`ssr: false`) inside client components, mounted only when that section opens.
- **Neon Postgres** (Vercel Marketplace integration) + **Drizzle ORM** (`drizzle-orm/neon-http`) + `drizzle-kit` migrations.
- **zod** for every request body and query.
- **jose** for HMAC-signed session cookies. It's Edge-compatible, so it works in `proxy.ts`.
- **@typesafe-ai/sdk** for Jev (server only).
- **Vitest** for unit tests, **Playwright** for e2e.
- Deploy on **Vercel**. Route handlers use `export const runtime = "nodejs"`.

Recommended: install the official TypeSafe skill before working on the Jev integration, and check SDK option names against it:
```bash
claude plugin marketplace add typesafe-ai/skills
claude plugin install typesafe@typesafe-ai
```

## Commands

```bash
npm run dev            # next dev
npm run build          # next build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest run
npm run test:e2e       # playwright test (mobile WebKit, Chromium, Firefox projects)
npm run db:generate    # drizzle-kit generate
npm run db:migrate     # drizzle-kit migrate via scripts/migrar.ts; refuses the production host unless `-- --produccion`
npm run db:seed        # dev only: fake evaluations for every rubric's team x N participants in each jornada, plus the fake accounts (refuses unless DATABASE_URL is .env.local's)
npm run jev:evaluar    # golden-set accuracy check against live Jev, every rubric (PRD §8.5); `-- --competencia <id>` for one
npm run correo:prueba -- --para <correo>   # v1.2 (Prompt 13): send a sample email through Resend
npm run cuentas:importar -- --archivo privado/correos-evaluadores.csv [--produccion]   # v1.2: load evaluator emails (prints counts and host, never emails)
npm run cuentas:prueba # dev/e2e: reset every evaluator account to <id>@ejemplo.test + E2E_CONTRASENA, and give every stored participant participante-NN.<jornada>@ejemplo.test except P02 (the e2e global setup runs it)
```

Before declaring a task done, run `lint`, `typecheck` and `test`. Also run `test:e2e` for UI changes.

## Environment variables

| Var | Notes |
|---|---|
| `TYPESAFE_API_KEY` | Server only. |
| `JEV_MODEL` | Default `jev-1.13.0` (pinned). Don't switch to `jev-latest` without being asked. |
| `DATABASE_URL` | Set by the Neon integration. |
| `CODIGO_DOCENTE` | Report code (role `docente`). |
| `SESSION_SECRET` | ≥ 32 random bytes, used for HMAC. |
| `CODIGO_ADMIN` | Admin code (role `admin`, `/admin` only). Never commit its value. |
| `CANTIDAD_PARTICIPANTES` | Default 20. Fallback list only, until the admin saves the real one. |
| `RESEND_API_KEY` | Server only. A "Sending access" key from the owner's existing Resend team, set by hand in Vercel (not the Marketplace install, which needed a paid plan; PRD §13 Email). Locally it comes from `.env`. Never run `vercel env pull .env.local`: it would overwrite the dev-branch `DATABASE_URL`. |
| `CORREO_REMITENTE` | `Nivela <no-responder@correo.nivela.snhware.lat>`; the domain must be verified in Resend. |
| `CORREO_MODO` | `consola` (default outside production) keeps messages in memory for `/dev/correos`; `resend` sends. Production always sends through Resend. |
| `E2E_CONTRASENA` | Dev/e2e only, in `.env.local`: password of the fake accounts `<integranteId>@ejemplo.test`. Never in Vercel. |

Keep `.env.example` in sync. Never commit `.env*` except the example.

## Project structure

```
src/
  app/
    layout.tsx              # lang="es-CR", nav, metadata, apple web-app meta
    manifest.ts             # PWA manifest
    globals.css             # Tailwind v4 + @theme tokens
    acceso/page.tsx
    page.tsx                # Inicio: competencia picker
    [competencia]/evaluador/page.tsx
    [competencia]/page.tsx              # participant list
    [competencia]/[participante]/page.tsx  # rating screen
    reportes/page.tsx
    reportes/[competencia]/page.tsx              # Reporte general
    reportes/[competencia]/[participante]/page.tsx  # Reporte individual
    reportes/[competencia]/grupo/page.tsx           # v1.2: Resumen del grupo (PRD §11.3)
    reportes/[competencia]/enviar/page.tsx          # v1.2: send results by email (PRD §5.14)
    admin/page.tsx + EditorParticipantes.tsx       # admin: participants (names, emails) and evaluator accounts
    api/acceso/route.ts                             # docente/admin codes
    api/acceso/{correo,activar,contrasena,recuperar}/route.ts  # v1.2: evaluator email login
    api/asistencia/route.ts                         # v1.2: attendance
    api/admin/participantes/route.ts
    api/admin/cuentas/route.ts                      # v1.2
    api/reportes/[competencia]/grupo/route.ts       # v1.2
    api/reportes/[competencia]/enviar/route.ts      # v1.2
    api/salir/route.ts
    api/jornada/route.ts      # docente/admin switch jornada (re-signs the cookie)
    api/jev/route.ts
    api/evaluaciones/route.ts
    api/reportes/[competencia]/route.ts
    api/reportes/[competencia]/csv/route.ts
  proxy.ts                  # session check + role gating (middleware.ts on Next < 16)
  config/
    jornadas.ts             # manana | noche (PRD §5.11)
    niveles.ts
    equipos.ts
    participantes.ts        # id/label scheme + fallback list; the real list is in the DB
    competencias/index.ts   # registry; rubrics per jornada (obtenerCompetenciaHabilitada(jornada, id))
    competencias/adaptabilidad.ts
    competencias/{pensamiento-critico,autorregulacion-emocional,orientacion-detalle,orientacion-resultados}.ts
  lib/
    jev.ts                  # server-only Jev client + mapping to proxy contract
    sesion.ts               # sign/verify cookie, constant-time code compare
    cuentas.ts              # v1.2, server-only: scrypt, verification codes, lockout, sign-in flows
    acceso.ts               # v1.2: shared by /api/acceso/* (schemas, failure delay, code email after the response)
    importarCuentas.ts      # v1.2: CSV validation for cuentas:importar
    correo.ts               # v1.2, server-only: send email (Resend | consola)
    correos/                # v1.2: email templates { asunto, html, texto } (codigoVerificacion, resultados)
    resultados.ts           # v1.2: pure parts of the results email (data, recipients, idempotency key)
    envioResultados.ts      # v1.2, server-only: load, preview and send results (paced, recorded)
    db/{index.ts,schema.ts,participantes.ts,cuentas.ts,envios.ts}  # participantes.ts: the admin's list per jornada (emails read apart); cuentas.ts: account statements; envios.ts: envios_resultados
    jornadaActual.ts        # the session's jornada (and contextoEvaluacion: team + evaluador id) for Server Components
    puntajes.ts             # pure scoring (PRD §7)
    reportes.ts             # aggregation for report routes
    borrador.ts             # localStorage drafts (client), try/catch + memory fallback
    validacion.ts           # zod schemas + config cross-checks
    formato.ts              # Intl es-CR number/percent/date helpers
  components/
    ui/                     # Boton, Chip, Campo, Dialogo, Toast, Nav, SelectorNivel
    calificacion/           # IndicadorSeccion, PanelSugerencia, BarraEnvio
    reportes/               # datosGraficos (chart data + title sentences), BarrasHorizontales, GraficosDetallados (RadarIndicadores, DistribucionNiveles), TablaParticipantes, MatrizCobertura
scripts/
  seed.ts
  evaluar-jev.ts
  importar-cuentas.ts       # v1.2
  cuentas-prueba.ts         # v1.2, dev/e2e: fake accounts (cuentasPrueba.ts); entornoDesarrollo.ts guards dev-only writes
  fixtures/jev-{competencia}.json   # one golden set per rubric (its `jornada`, default manana)
privado/                    # gitignored: roster screenshots and the evaluator email CSV (PII)
public/
  sw.js
  icons/
tests/
  unit/  e2e/
```

## Design tokens (`src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-canvas: #f5f5f7;       /* Fog White */
  --color-surface: #ffffff;
  --color-ink: #1d1d1f;          /* Obsidian, primary text */
  --color-ink-2: #707070;        /* Pewter, secondary text */
  --color-ink-3: #505050;        /* Slate */
  --color-chrome: #333333;       /* Iron, nav icons */
  --color-hairline: #d6d6d6;     /* Pale Mist */
  --color-primary: #0071e3;      /* Iris Blue, filled primary button ONLY */
  --color-link: #0066cc;         /* Sapphire, links, outlines, selected state */
  --color-link-hover: #509be7;
  --color-wash: #aad0f6;         /* Ice Wash, hero tint, chart level 2 */

  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --text-caption: 12px;   --text-caption--line-height: 1.33;
  --text-body: 17px;      --text-body--line-height: 1.47;
  --text-sub: 21px;       --text-sub--line-height: 1.19;
  --text-h3: 28px;        --text-h3--line-height: 1.14;
  --text-h2: 40px;        --text-h2--line-height: 1.1;
  --text-display: 56px;   --text-display--line-height: 1.07;

  --radius-pill: 980px;
  --radius-tile: 12px;
}

body { background: var(--color-canvas); color: var(--color-ink); font-size: 17px; letter-spacing: -0.022em; }
```

Component conventions:
- **Primary button**: `rounded-pill bg-primary text-white text-[14px] px-[21px] py-[11px] min-h-11`.
- **Secondary button**: the same shape with `border border-link text-link bg-transparent`.
- **Nav**: `h-11 bg-white/80 backdrop-blur-[20px] backdrop-saturate-[1.8]`, plus `-webkit-backdrop-filter` for iOS 16.
- **Level option**: `rounded-tile border border-hairline bg-surface`. Selected: `border-2 border-link`, a check icon, and the label in semibold.
- **Hero**: 40 px on mobile, 56 px at `md:` and up, weight 600, centered.
- **Forms and lists**: left-aligned (deliberate deviation for readability).
- **Chart level colors**: 1 `#d6d6d6`, 2 `#aad0f6`, 3 `#509be7`, 4 `#0066cc`. Always label values too.
- **Focus ring**: `outline-2 outline-link outline-offset-2`. Never remove focus styles.

## Jev integration (`src/lib/jev.ts`)

Endpoint: `POST https://api.typesafe.ai/v1/systemone` (the SDK handles it). One request per "Analizar" carries two questions: a **Score** over the 4 level descriptions in order (0-based indexes), and a **Noul** pertinence check.

```ts
import "server-only";
import { noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient({ defaultModel: process.env.JEV_MODEL ?? "jev-1.13.0" }); // reads TYPESAFE_API_KEY

export async function sugerirNivel(comp: Competencia, ind: Indicador, texto: string) {
  const res = await client.systemOne({
    state: {
      competencia: `${comp.nombre}: ${comp.definicion}`,
      indicador: ind.titulo,
      observacion: texto,
    },
    questions: {
      nivel: score(
        "Nivel de conducta que mejor describe la observación para este indicador",
        NIVELES.map((n) => `${n.etiqueta}: ${ind.niveles[n.valor]}`), // Básico..Experto, in order
      ),
      pertinente: noul("La observación describe comportamientos observables relacionados con el indicador"),
    },
  });
  // res.answers.nivel: { score, confidence, probabilities: {"0".."3"}, legend }
  // res.answers.pertinente: { noul: 0..1 }
  return mapear(res); // -> PRD §8.3 contract: nivelSugerido = argmax(prob)+1, baja_confianza, alternativa, ...
}
```

Rules for this module:
- Thresholds are named constants: `UMBRAL_CONFIANZA = 0.6`, `MARGEN_MINIMO = 0.15`, `UMBRAL_PERTINENCIA = 0.5`.
- **Validate the response.** The answer types must match. The probabilities must cover exactly the 4 keys and sum to 1 ± 0.02. Otherwise return `502`.
- **Timeout 8 s.** Use the SDK timeout option if it exists; otherwise use `AbortController`. Map 429 to 429 with `Retry-After`, 5xx/529 to 502, and timeout to 504. Every error body is `{ error: "<Spanish message>" }`.
- **Per-session cap**: 60 analyses per hour, using the `uso_jev` table with an atomic upsert-increment. Check it before calling Jev.
- **Never log the observation text or the raw request.** Log only status, latency and model.
- The proxy route takes only `{ competenciaId, indicadorId, texto }`. It looks up the rubric text from config, so the client cannot inject criteria.
- In unit tests, mock the SDK client. Don't hit the network. Only `npm run jev:evaluar` calls live Jev.
- If the golden set shows Score underperforming, switch the primitive to `choice` (keys `basico|intermedio|avanzado|experto`) inside `jev.ts` only. The proxy contract must not change.

## Sessions and access (`src/lib/sesion.ts`, `src/proxy.ts`)

- **Evaluadores sign in with email + password** (PRD §5.12, v1.2): `POST /api/acceso/correo`, `/activar`, `/contrasena`, `/recuperar`. The first visit verifies the email with a 6-digit code before a password is created. Passwords use `scrypt` with a per-account salt; codes are stored as HMAC hashes, expire in 10 min, allow 5 attempts, and are limited to 5 per email per hour; 5 wrong passwords lock the account for 15 min. An email outside the roster gets the same response and no email. Never log emails, codes or passwords.
- `POST /api/acceso` compares the code with `CODIGO_ADMIN` / `CODIGO_DOCENTE` using `crypto.timingSafeEqual` (pad to equal length first). Add a ~400 ms delay on failure. There are no class codes since v1.2.
- The cookie is `nivela_sesion`: a JWT (HS256, jose) with `{ rol, sid, jornada }`, plus `integranteId` for evaluadores. httpOnly, Secure (in prod), SameSite=Lax, `maxAge` 12 h. `sid` is a random id used only for the Jev cap. A token without `jornada` (signed before v1.1) reads as `manana`. An evaluador token without a known `integranteId`, or whose jornada isn't that integrante's team's, is invalid (it reads as expired).
- **Identity**: for an evaluador, the evaluator id is the session's `integranteId`. Any evaluation or attendance write for another evaluator gets `403`. Only the docente picks an evaluator.
- **Jornadas** (PRD §5.11): every read and write is scoped by `sesion.jornada`, taken from the session and never from the request. The single exception is the docente-only, read-only group summary (`?jornada=manana|noche|ambas`, PRD §11.3). An evaluador's jornada comes from their account (their team's jornada). Docente and admin switch it with `POST /api/jornada`; `proxy.ts` lets every role through to that route, and the route refuses evaluadores.
- `proxy.ts`:
  - Unauthenticated page requests redirect to `/acceso`. Unauthenticated `/api/*` requests get 401 JSON.
  - `/reportes/**` and `/api/reportes/**` require `rol === "docente"`.
  - `/admin/**` and `/api/admin/**` require `rol === "admin"`, and the admin role is confined there: other pages redirect to `/admin`, other APIs answer 403.
  - Excluded from the check: `/acceso`, `/api/acceso` and `/api/acceso/*`, static assets, `manifest.webmanifest`, `sw.js`, icons.
- Route handlers re-verify the session themselves. Don't rely on `proxy.ts` alone.

## Database

- The schema in `src/lib/db/schema.ts` matches PRD §9.2 exactly: `evaluaciones`, `calificaciones`, `uso_jev`, `participantes`, and since v1.2 `cuentas`, `codigos_verificacion`, `asistencia`, `envios_resultados` (plus `participantes.correo`), and since v1.4 `participantes.carnet`. Participant ids P01…P99 repeat across jornadas, so every query on `participantes`, `evaluaciones`, `asistencia` or `envios_resultados` filters by `jornada`. Team ids and numbers are never stored.
- Before any DB-writing command (migrate, seed, import), check which host `DATABASE_URL` points to: `.env.local` is the Neon dev branch and `.env` is production. Production writes only happen deliberately, with the owner's go-ahead. `scripts/baseProduccion.ts` enforces it: migrate and `cuentas:importar` refuse a host that matches `.env`'s production endpoint unless `--produccion` is passed; `db:seed` and `cuentas:prueba` refuse it always.
- **Participants are runtime data** (`src/lib/db/participantes.ts`), not config. Never import a static list. Pages read them behind Suspense after `connection()` (`cargarParticipantes`), so the build never needs the DB. Route handlers read them uncached (`obtenerParticipantes`). Rows are never deleted; `activo = false` hides them.
- Migrations go through `drizzle-kit`, committed under `drizzle/`.
- **Upsert flow** (`POST /api/evaluaciones`), all in one transaction:
  1. Validate with zod plus config cross-checks (PRD §10).
  2. Upsert `evaluaciones` on `(jornada, competencia_id, evaluador_id, participante_id)`.
  3. Delete that evaluation's `calificaciones` and insert the 4 new rows.
  4. Set `puntaje` from `puntajes.ts` and `updated_at = now()`.
- The neon-http driver doesn't support interactive transactions. Use `db.batch([...])` or the `neon-serverless` (WebSocket) driver for this route. Pick one and document it in `db/index.ts`.
- Reports read through `src/lib/reportes.ts`. Aggregation happens in SQL or TS, but **all scoring math lives in `puntajes.ts`** so it's unit-tested once.

## Client state (`src/lib/borrador.ts`)

- The key scheme and the `Borrador` type follow PRD §9.3. Include a `version` field and a migration hook.
- Wrap every `localStorage` access in try/catch. If it fails, fall back to an in-memory store and show the one-time notice.
- Debounce writes by 300 ms. Flush on `visibilitychange` → hidden. iOS doesn't reliably fire `beforeunload`.
- "Borrar todo" removes only keys prefixed `nivela:v1:`.
- Server "sent" status is merged by participant id. A local `modificadoEn` later than `enviadoEn` means status "Completado" (re-send needed).

## PWA

- `app/manifest.ts`: name/short_name "Nivela", `lang: "es-CR"`, `display: "standalone"`, `start_url: "/"`, `background_color: "#f5f5f7"`, `theme_color: "#ffffff"`, icons 192/512 + maskable.
- `layout.tsx` metadata: `appleWebApp: { capable: true, title: "Nivela", statusBarStyle: "default" }`, apple-touch-icon 180 px, `viewport` with `viewportFit: "cover"`.
- `public/sw.js`: cache-first only for `/_next/static/*` and `/icons/*`; network-only for everything else. **Never cache `/api/*` or HTML that depends on the session.** Register it in a small client component in production only.
- Offline banner via `navigator.onLine` + `online`/`offline` events.

## Mobile and cross-browser checklist (run per UI change)

- [ ] 375 × 667 and 390 × 844 in WebKit (Playwright `iPhone 13`), Chromium (`Pixel 7`), and Firefox (mobile viewport).
- [ ] No horizontal scroll. Tap targets ≥ 44 px. Inputs ≥ 16 px font, so iOS doesn't zoom.
- [ ] The sticky bottom bar respects `env(safe-area-inset-bottom)` and uses `100dvh`, not `100vh`.
- [ ] `backdrop-filter` has the `-webkit-` prefix.
- [ ] Works with `localStorage` unavailable (simulate by throwing in a test).
- [ ] Keyboard and screen reader: the level picker is a `role="radiogroup"` with labelled radios, and dialogs trap focus.

## Testing expectations

- **Unit (Vitest)**:
  - `puntajes.ts`: every PRD §7 rule, including the boundaries 1.5 / 2.5 / 3.5 and the SD buckets.
  - `jev.ts` mapping: normal, low-confidence, off-topic, malformed response, timeout.
  - `validacion.ts`: every rejection case in PRD §10.
  - `borrador.ts`: storage failures.
  - The **config validation test**: unique ids (indicator ids across rubrics too), exactly 4 levels per indicator, every rubric has a team in its jornada, every rubric matches its PRD Appendix A section word for word, the teams match PRD Appendix B for each jornada (including the per-jornada numbering).
  - v1.2: account hashing, codes, lockout and enumeration-safe responses; attendance aggregation; the gap rule's boundaries; evaluator progress for both jornadas; email templates with the provider mocked.
- **E2E (Playwright)**: the full happy path (PRD §15.1), disabled competencias, refresh persistence, Borrar todo, Jev suggestion with the `/api/jev` route mocked, docente report rendering with seeded data, and CSV download.
- Use `npm run db:seed` data for report development. Never seed production.

## Coding conventions

- Server Components fetch data; client components handle interaction only. Keep `"use client"` boundaries small.
- Every user-facing string lives in the component or in `src/config/textos.ts` for shared strings. Always Spanish, always "usted".
- Format with `Intl` using `es-CR`: decimals "2,75", percent "78 %", dates `dd/mm/aaaa`.
- No new dependencies without a clear reason. Prefer platform APIs.
- No `any`. Use zod-inferred types at the boundaries.
- Small, focused commits following the PRD milestones (M1–M7).

## Out of scope (don't build unless asked)

Accounts for anyone other than the evaluators in config (and self-registration or SSO), editing indicators through a UI, dark mode, i18n, offline rating, writing rubric content the teams didn't send, storing phone numbers, storing emails anywhere except the DB, analytics or trackers.
