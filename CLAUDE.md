# CLAUDE.md — Nivela

Peer competency-rating PWA for AGRH 315 Psicología 2 / AGRH 613. **Read `PRD.md` first.** It is the source of truth for scope, flows, scoring, the Jev contract, the DB schema and the Spanish copy. `DESIGN.md` is the source of truth for visual tokens. If code and PRD disagree, follow the PRD and flag the conflict. Don't silently invent behavior.

## Non-negotiable rules

1. **All UI text is Spanish (Costa Rica), "usted" form.** Never "tú" or "vos". Use the strings from PRD Appendix C. Code identifiers may be Spanish domain terms (`evaluador`, `participante`, `indicador`, `nivel`). Comments may be in English.
2. **Light mode only.** Don't add `dark:` variants.
3. **The TypeSafe API key never reaches the client.** All Jev calls go through `src/lib/jev.ts` (`import "server-only"`), called only from `app/api/jev/route.ts`.
4. **Never send names or participant codes to Jev.** Send only the competencia/indicator text from server config plus the evaluator's observation.
5. **Only names; never emails or phone numbers.** Evaluator names live in config. Participant names are entered by the admin and stored in the `participantes` table (PRD §5.10); they are never sent to Jev or logged. Otherwise the DB stores ids, levels, observations and AI metadata.
6. **Jev suggests, the human decides.** A suggestion is never applied without a tap on "Aplicar sugerencia". A Jev failure must never block manual rating or submission.
7. **Competencias, indicators, teams and participants are data** in `src/config/`. No competencia-specific logic in components. Enabling a competencia means editing config only.
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
- **Recharts** for charts. Report routes only, loaded with `next/dynamic` (`ssr: false`) inside client components.
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
npm run db:migrate     # drizzle-kit migrate
npm run db:seed        # dev only: fake evaluations for 8 evaluators x N participants (refuses if NODE_ENV=production)
npm run jev:evaluar    # golden-set accuracy check against live Jev (PRD §8.5)
```

Before declaring a task done, run `lint`, `typecheck` and `test`. Also run `test:e2e` for UI changes.

## Environment variables

| Var | Notes |
|---|---|
| `TYPESAFE_API_KEY` | Server only. |
| `JEV_MODEL` | Default `jev-1.13.0` (pinned). Don't switch to `jev-latest` without being asked. |
| `DATABASE_URL` | Set by the Neon integration. |
| `CODIGO_ACCESO` | Class code (role `evaluador`). |
| `CODIGO_DOCENTE` | Report code (role `docente`). |
| `SESSION_SECRET` | ≥ 32 random bytes, used for HMAC. |
| `CODIGO_ADMIN` | Admin code (role `admin`, `/admin` only). Never commit its value. |
| `CANTIDAD_PARTICIPANTES` | Default 20. Fallback list only, until the admin saves the real one. |

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
    admin/page.tsx + EditorParticipantes.tsx       # admin: participant count and names
    api/acceso/route.ts
    api/admin/participantes/route.ts
    api/salir/route.ts
    api/jev/route.ts
    api/evaluaciones/route.ts
    api/reportes/[competencia]/route.ts
    api/reportes/[competencia]/csv/route.ts
  proxy.ts                  # session check + role gating (middleware.ts on Next < 16)
  config/
    niveles.ts
    equipos.ts
    participantes.ts        # id/label scheme + fallback list; the real list is in the DB
    competencias/index.ts   # registry
    competencias/adaptabilidad.ts
    competencias/{pensamiento-critico,autorregulacion-emocional,orientacion-detalle,orientacion-resultados}.ts
  lib/
    jev.ts                  # server-only Jev client + mapping to proxy contract
    sesion.ts               # sign/verify cookie, constant-time code compare
    db/{index.ts,schema.ts,participantes.ts}  # participantes.ts: the admin's list, read at request time
    puntajes.ts             # pure scoring (PRD §7)
    reportes.ts             # aggregation for report routes
    borrador.ts             # localStorage drafts (client), try/catch + memory fallback
    validacion.ts           # zod schemas + config cross-checks
    formato.ts              # Intl es-CR number/percent/date helpers
  components/
    ui/                     # Boton, Chip, Campo, Dialogo, Toast, Nav, SelectorNivel
    calificacion/           # IndicadorSeccion, PanelSugerencia, BarraEnvio
    reportes/               # RadarIndicadores, DistribucionNiveles, PuntajesParticipantes, TablaParticipantes, MatrizCobertura
scripts/
  seed.ts
  evaluar-jev.ts
  fixtures/jev-adaptabilidad.json
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

- `POST /api/acceso` compares the code with `CODIGO_ADMIN` / `CODIGO_DOCENTE` / `CODIGO_ACCESO` (in that priority) using `crypto.timingSafeEqual` (pad to equal length first). Add a ~400 ms delay on failure.
- The cookie is `nivela_sesion`: a JWT (HS256, jose) with `{ rol, sid }`. httpOnly, Secure (in prod), SameSite=Lax, `maxAge` 12 h. `sid` is a random id used only for the Jev cap.
- `proxy.ts`:
  - Unauthenticated page requests redirect to `/acceso`. Unauthenticated `/api/*` requests get 401 JSON.
  - `/reportes/**` and `/api/reportes/**` require `rol === "docente"`.
  - `/admin/**` and `/api/admin/**` require `rol === "admin"`, and the admin role is confined there: other pages redirect to `/admin`, other APIs answer 403.
  - Excluded from the check: `/acceso`, `/api/acceso`, static assets, `manifest.webmanifest`, `sw.js`, icons.
- Route handlers re-verify the session themselves. Don't rely on `proxy.ts` alone.

## Database

- The schema in `src/lib/db/schema.ts` matches PRD §9.2 exactly: `evaluaciones`, `calificaciones`, `uso_jev`, `participantes`.
- **Participants are runtime data** (`src/lib/db/participantes.ts`), not config. Never import a static list. Pages read them behind Suspense after `connection()` (`cargarParticipantes`), so the build never needs the DB. Route handlers read them uncached (`obtenerParticipantes`). Rows are never deleted; `activo = false` hides them.
- Migrations go through `drizzle-kit`, committed under `drizzle/`.
- **Upsert flow** (`POST /api/evaluaciones`), all in one transaction:
  1. Validate with zod plus config cross-checks (PRD §10).
  2. Upsert `evaluaciones` on `(competencia_id, evaluador_id, participante_id)`.
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
  - The **config validation test**: unique ids, exactly 4 levels per indicator, enabled competencias have a team and indicators.
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

User accounts, editing indicators through a UI, dark mode, i18n, offline rating, other competencias' content, storing emails or phones, analytics or trackers.
