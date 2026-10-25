# PRD — Nivela

**Evaluación de competencias entre pares** · Demo: competencia *Adaptabilidad*

| | |
|---|---|
| Version | 1.0 |
| Date | 2026-10-25 |
| Owner | Emmanuel (engineering) |
| Status | Approved for build (see §16 for open items) |
| UI language | Spanish (Costa Rica), "usted" form, light mode only |

---

## 1. Summary

Nivela is a mobile-first web app (installable as a PWA) used during a peer-assessment activity in the courses **AGRH 315 Psicología 2** and **AGRH 613 Seminario Integrado de Recursos Humanos**.

Students are grouped into five teams, one per *competencia*. Each team member rates anonymous participants from a **separate course** on that team's competencia. Each competencia has 4 indicators, and each indicator has 4 behavior levels: Básico (1), Intermedio (2), Avanzado (3), Experto (4).

When an evaluator is unsure which level applies, they can describe what they observed in Spanish. **Jev** (TypeSafe AI's System One decision model) then suggests the most likely level with a calibrated probability. The evaluator always confirms the level.

Submitted ratings go to a shared Postgres database. A protected report area shows per-participant and general charts.

The first demo enables only **Adaptabilidad**. The other four competencias appear in the UI as disabled ("Próximamente") and are defined as data, so enabling one later needs no code changes.

## 2. Context and users

| Role | Who | What they do |
|---|---|---|
| **Evaluador** | The 8 members of Equipo 4 (Adaptabilidad), from both courses (Appendix B) | Enter the class access code, pick their own name, rate every participant on the 4 indicators, submit. |
| **Evaluado / Participante** | Students from a separate course, **anonymous** | They do not use the app. Shown only by code (e.g., "Participante 07"). |
| **Docente** (or course coordinator) | Professor, or a designated student | Enter the docente code and view reports, export CSV, print. |

Rules:
- Evaluators never rate each other or themselves. This is structural: evaluados come from a different course and a different list.
- An evaluator rates **only** their team's competencia.

## 3. Goals and non-goals

### Goals
1. Evaluators can rate any participant on all 4 indicators from a phone in under 3 minutes.
2. When unsure, an evaluator gets a level suggestion from a free-text description in under 2 seconds (typical).
3. Work in progress survives refreshes and closed tabs on the same device.
4. The docente gets clear, printable reports: per participant and general.
5. Competencias, indicators, teams and participants live in plain config files that are easy to edit.

### Non-goals (v1)
- User accounts, passwords, or SSO. Access is by shared codes.
- Storing student emails or phone numbers. **Only names go into the app.**
- Activating competencias other than Adaptabilidad.
- Offline rating. Jev and submission both need network.
- Dark mode, native apps, multi-language UI.
- An admin UI for editing indicators. Indicators are edited in config files.

## 4. MVP scope

**In:** access code gate · competencia picker (Adaptabilidad enabled, 4 disabled) · evaluator selection · participant list with status · rating screen with 4 indicators × 4 levels plus observations · Jev suggestion per indicator · local drafts with "Borrar todo" · submission to Postgres (upsert) · docente report area (general + per participant) · CSV export · print view · PWA install.

**Out:** everything in §3 Non-goals.

## 5. User flows

### 5.1 Access
1. The user opens the app. If there is no valid session cookie, they are redirected to `/acceso`.
2. They enter the **class code**. The server compares it with `CODIGO_ACCESO` and sets a signed httpOnly cookie with role `evaluador`.
3. If they enter the **docente code** (`CODIGO_DOCENTE`) instead, the cookie gets role `docente`. That role can do everything an evaluator can, plus view reports.
4. After 5 failed attempts in a row, the client adds a 30 s delay. The server also enforces a small artificial delay on every failure.

### 5.2 Choose competencia (Inicio)
- Hero: app name, tagline, "Comenzar".
- A list of the 5 competencias. Only *Adaptabilidad* is selectable. The others show the badge "Próximamente", are not focusable as links, and have `aria-disabled="true"`.

### 5.3 Identify evaluator
- "¿Quién está evaluando?" followed by the 8 Equipo 4 names, grouped by course.
- The selection is stored in the local draft. Changing it later requires confirmation, because drafts are kept separately per evaluator.

### 5.4 Participant list
- Lists all participants (codes) with a status chip:
  - **Pendiente**: nothing rated.
  - **En progreso**: 1–3 indicators rated.
  - **Completado**: all 4 rated, not sent.
  - **Enviado**: on the server, and the local draft matches.
- A progress summary ("12 de 20 enviadas") and a "Borrar todo" button.
- Sent statuses come from `GET /api/evaluaciones?competencia&evaluador`, merged with the local drafts.

### 5.5 Rate a participant
- A collapsible header with the competencia definition and its source.
- The **Nota técnica**, always visible in small text: *"Recuerde enfocarse en la evaluación exclusiva de los indicadores y niveles asociados a la competencia. Lo que no está escrito en esta plantilla no se considera por ninguna circunstancia en la evaluación."*
- One section per indicator:
  - Title ("Indicador 1. Modifica su forma de actuar ante cambios.").
  - 4 selectable level options (a radio group), each showing the level name and its full description.
  - "Observaciones (opcional)" textarea. Helper text: *"Anote únicamente comportamientos observables del indicador o del nivel de conducta."*
  - "¿No está seguro del nivel?" opens the Jev panel (§5.6).
- Every change is saved to the local draft immediately (debounced 300 ms).
- A sticky bottom bar shows "Faltan N indicadores" or, once complete, the primary button **"Enviar evaluación"**.

### 5.6 Jev suggestion (per indicator)
1. The evaluator types a description in the textarea "Describa lo que observó" (20–1,500 characters) and taps **"Analizar"**.
2. The client sends `{competenciaId, indicadorId, texto}` to `POST /api/jev`. The participant code and all names are **never** sent.
3. The result card shows:
   - **"Nivel sugerido: Avanzado · 78 %"**, plus a small bar for each level's probability.
   - The button **"Aplicar sugerencia"**. Tapping it selects that level; nothing is selected automatically.
   - A checkbox **"Usar este texto como observación"**, checked by default. When the suggestion is applied, the text is copied into Observaciones, where it remains editable.
4. **Low confidence**: if the top probability is below `UMBRAL_CONFIANZA` (default 0.60), or the gap to the second level is below `MARGEN_MINIMO` (0.15), the card says *"La IA no está segura entre dos niveles. Revise ambos:"* and shows the top two levels, each with its own "Aplicar" button.
5. **Off-topic text**: if the pertinence check (Noul) is below 0.5, the card warns *"La descripción no parece relacionarse con este indicador. Agregue comportamientos observables."* The suggestion is still shown, with a muted style.
6. **Errors** (network, 429, 5xx, timeout): *"No fue posible analizar el texto en este momento. Intente de nuevo o seleccione el nivel manualmente."* Manual rating is never blocked.
7. The evaluator can always override the suggestion. The applied level is saved with `origen = "ia"` and the suggestion metadata. Any manual change afterwards switches the record to `origen = "manual"`, but the original suggestion metadata is kept.

### 5.7 Submit
- "Enviar evaluación" sends a `POST /api/evaluaciones` upsert, keyed by (competencia, evaluador, evaluado).
- Success: a toast *"Evaluación enviada"*, the status becomes **Enviado**, and the app returns to the list.
- Re-submission is allowed (the record is updated, and `updated_at` changes). If a sent evaluation is edited locally, its status goes back to **Completado** until it is sent again.
- Failure: *"No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo."* plus a "Reintentar" button.

### 5.8 Borrar todo
- A confirmation dialog: *"¿Desea borrar todas las evaluaciones guardadas en este dispositivo? Las evaluaciones ya enviadas no se eliminan del servidor."*
- It clears every local draft and the selected evaluator, then returns to Inicio.

### 5.9 Reports (docente only)
- `/reportes`: competencia picker (only Adaptabilidad has data) → **Reporte general**.
- From the ranking table, tap a participant → **Reporte individual**.
- "Descargar CSV" and "Imprimir o guardar PDF" are available in both views.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Access gate with a class code and a docente code. Signed httpOnly session cookie, 12 h expiry. | P0 |
| FR-2 | Competencia picker driven by config. `habilitada: false` renders disabled. | P0 |
| FR-3 | Evaluator selection limited to the members of the team assigned to the chosen competencia. | P0 |
| FR-4 | Participant list from config, with the four statuses from §5.4. | P0 |
| FR-5 | Rating UI: 4 indicators × 4 levels, one level per indicator, optional observation (max 1,000 chars). | P0 |
| FR-6 | All 4 indicators are required before a participant is "Completado" and can be sent. | P0 |
| FR-7 | Local drafts in `localStorage`, namespaced per competencia + evaluador, with versioned schema and try/catch fallback to memory. | P0 |
| FR-8 | "Borrar todo" clears local data only. | P0 |
| FR-9 | Jev suggestion per indicator via the server proxy (§8). | P0 |
| FR-10 | Submission upsert with server-side validation (§10). | P0 |
| FR-11 | Reporte general (§11.2). | P0 |
| FR-12 | Reporte individual (§11.1). | P0 |
| FR-13 | CSV export of raw rows. | P0 |
| FR-14 | Print-friendly report layout (`@media print`). | P1 |
| FR-15 | PWA: manifest, icons, iOS meta, minimal service worker, offline banner. | P1 |
| FR-16 | Jev usage cap per session (default 60 analyses per hour), enforced in Postgres. | P1 |
| FR-17 | Jev golden-set script to validate accuracy on Spanish samples (§8.5). | P1 |

## 7. Scoring rules

Level values: Básico = 1, Intermedio = 2, Avanzado = 3, Experto = 4.

| Metric | Definition |
|---|---|
| Puntaje de una evaluación | Mean of its 4 indicator levels (1.00–4.00). |
| Puntaje por indicador (participante) | Mean of that indicator's level across all evaluators who rated the participant. |
| Puntaje general (participante) | Mean of the 4 indicator means. |
| Nivel general | Mapped from a score: `< 1.5` Básico · `< 2.5` Intermedio · `< 3.5` Avanzado · `≥ 3.5` Experto. |
| Acuerdo (participante, indicador) | Range (min–max) and standard deviation across evaluators, shown as "Alta / Media / Baja" coincidencia: SD ≤ 0.5 / ≤ 1.0 / > 1.0. |
| Cobertura | Evaluations received ÷ (number of evaluators × number of participants). |

Numbers are displayed with `Intl.NumberFormat('es-CR')` and 2 decimals (e.g., "2,75"). All scoring lives in one pure, unit-tested module (`src/lib/puntajes.ts`).

## 8. Jev integration

### 8.1 Why Jev and which primitive
Jev takes a *state* and typed *questions* and returns typed answers with calibrated probabilities. It does not generate text. The 4 levels are an **ordered rubric**, so we use the **Score** primitive, with criteria = the 4 level descriptions in order. Score returns `score`, `probabilities` keyed `"0"`–`"3"`, `confidence` and a `legend`.

A second **Noul** question checks that the text is relevant to the indicator. Both questions go in the same request.

Fallback: if the golden set (§8.5) shows Score underperforming, switch to the **Choice** primitive with keys `basico | intermedio | avanzado | experto`. The proxy's output contract (§8.3) stays the same.

### 8.2 Request (server → TypeSafe)
`POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer $TYPESAFE_API_KEY`, using the official `@typesafe-ai/sdk` server-side.

```json
{
  "model": "jev-1.13.0",
  "state": {
    "competencia": "Adaptabilidad: La adaptabilidad es la capacidad de modificar ...",
    "indicador": "Modifica su forma de actuar ante cambios.",
    "observacion": "<texto escrito por el evaluador>"
  },
  "questions": {
    "nivel": {
      "type": "score",
      "instructions": "Nivel de conducta que mejor describe la observación para este indicador",
      "criteria": [
        "Básico: Identifica los cambios cuando se le indican, pero requiere supervisión constante para aplicarlos.",
        "Intermedio: ...",
        "Avanzado: ...",
        "Experto: ..."
      ]
    },
    "pertinente": {
      "type": "noul",
      "instructions": "La observación describe comportamientos observables relacionados con el indicador"
    }
  }
}
```

- The model is **pinned** through `JEV_MODEL` (default `jev-1.13.0`) so results are reproducible during the activity. Using `jev-latest` is a deliberate config change.
- The indicator text and criteria come from server-side config, looked up by `competenciaId` + `indicadorId`. The client never sends rubric text.

### 8.3 Proxy contract (`POST /api/jev`)
Request: `{ competenciaId: string, indicadorId: string, texto: string }`, validated with zod (texto 20–1,500 chars, trimmed).

Response 200:
```json
{
  "nivelSugerido": 3,
  "probabilidades": { "1": 0.05, "2": 0.17, "3": 0.78, "4": 0.0 },
  "confianza": 0.71,
  "pertinencia": 0.93,
  "baja_confianza": false,
  "alternativa": null,
  "modelo": "jev-1.13.0"
}
```

- `nivelSugerido` = argmax of `probabilities` + 1, converting the 0-based index to the 1-based level.
- `baja_confianza` and `alternativa` (the second-best level) follow the thresholds in §5.6.
- Errors: `401` no session · `400` validation · `429` session cap reached or upstream rate limit (`Retry-After` passed through) · `502` upstream error · `504` timeout (8 s). The body is always `{ error: "<mensaje en español>" }`.

### 8.4 Privacy
- Only the observation text and the rubric go to TypeSafe. No participant code, evaluator name, or session id is sent.
- The UI hint under the textarea reads *"No incluya nombres en la descripción."*

### 8.5 Golden set
`scripts/evaluar-jev.ts` runs fixture texts through the proxy logic: 16 Spanish observations, one per indicator × level, plus 4 off-topic texts. It prints accuracy, exact-match counts and adjacent-level counts. Target before the activity: ≥ 75 % exact, ≥ 95 % within ±1 level. Fixtures live in `scripts/fixtures/jev-adaptabilidad.json` and are written by hand. They are reviewed by the docente if possible.

## 9. Data

### 9.1 Static config (`src/config/`)
- `niveles.ts`: the 4 levels (value, key, label).
- `competencias/*.ts`: one file per competencia: `id`, `nombre`, `habilitada`, `definicion`, `fuente`, `indicadores[]`. Each indicator has `id`, `numero`, `titulo`, and `niveles` (1–4 → description). Adaptabilidad is fully filled in (Appendix A). The other 4 have `habilitada: false` and `indicadores: []` until their templates arrive.
- `equipos.ts`: 5 teams: `id`, `competenciaId`, `integrantes[]` with `{ id, nombre, curso }`. Names only (Appendix B).
- `participantes.ts`: anonymous evaluados `{ id: "P01", etiqueta: "Participante 01" }`. The count is set by `CANTIDAD_PARTICIPANTES` (placeholder 20, **see §16**).
- A config validation test fails the build if ids are duplicated, an indicator doesn't have exactly 4 levels, or an enabled competencia has no team.

### 9.2 Database (Neon Postgres via the Vercel Marketplace, Drizzle ORM)

```text
evaluaciones
  id               uuid pk default gen_random_uuid()
  competencia_id   text not null
  evaluador_id     text not null
  participante_id  text not null
  puntaje          numeric(3,2) not null         -- mean of 4 levels
  created_at       timestamptz not null default now()
  updated_at       timestamptz not null default now()
  unique (competencia_id, evaluador_id, participante_id)

calificaciones
  id                 uuid pk default gen_random_uuid()
  evaluacion_id      uuid not null references evaluaciones(id) on delete cascade
  indicador_id       text not null
  nivel              smallint not null check (nivel between 1 and 4)
  observacion        text null                    -- max 1000
  origen             text not null check (origen in ('manual','ia'))
  ia_nivel_sugerido  smallint null
  ia_probabilidades  jsonb null
  ia_confianza       real null
  ia_modelo          text null
  unique (evaluacion_id, indicador_id)

uso_jev
  sesion_id   text not null
  ventana     timestamptz not null                -- truncated to the hour
  conteo      integer not null default 0
  primary key (sesion_id, ventana)
```

IDs reference the static config. Names are never stored in the DB. The upsert runs in a single transaction: it upserts `evaluaciones`, deletes and reinserts that evaluation's `calificaciones`, and recomputes `puntaje`.

### 9.3 Local draft (`localStorage`)
Key: `nivela:v1:<competenciaId>:<evaluadorId>`, plus `nivela:v1:evaluador:<competenciaId>`.

```ts
type Borrador = {
  version: 1;
  participantes: Record<string, {
    calificaciones: Record<string, {      // indicadorId
      nivel?: 1 | 2 | 3 | 4;
      observacion?: string;
      origen?: "manual" | "ia";
      ia?: { nivelSugerido: number; probabilidades: Record<string, number>; confianza: number; modelo: string };
    }>;
    enviadoEn?: string;      // ISO, set on successful submit
    modificadoEn: string;    // ISO
  }>;
};
```

Every read and write is wrapped in try/catch. If storage is unavailable (Safari private mode, blocked storage), the app falls back to in-memory state and shows a one-time notice: *"Este navegador no permite guardar borradores. No cierre la página hasta enviar."*

## 10. API (Next.js route handlers, Node runtime)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/acceso` | — | Verify a code, set the session cookie, return `{ rol }`. |
| POST | `/api/salir` | any | Clear the cookie. |
| POST | `/api/jev` | evaluador, docente | Jev proxy (§8.3). |
| GET | `/api/evaluaciones?competencia=&evaluador=` | evaluador, docente | List of participant ids already sent by this evaluator, with `updated_at`. |
| POST | `/api/evaluaciones` | evaluador, docente | Upsert one evaluation. |
| GET | `/api/reportes/[competencia]` | docente | Aggregated report JSON (general + per participant). |
| GET | `/api/reportes/[competencia]/csv` | docente | CSV download (UTF-8 with BOM so Excel opens accents correctly). |

`POST /api/evaluaciones` validation (zod plus config checks):
- The competencia exists and is `habilitada`.
- The evaluador belongs to that competencia's team.
- The participante exists.
- It has exactly that competencia's indicator ids, each with a level from 1 to 4.
- Each observation is ≤ 1,000 chars, and `ia_*` fields are well-formed if present.

Errors use the same shape as §8.3, in Spanish.

CSV columns: `competencia, evaluador, curso_evaluador, participante, indicador, nivel, nivel_nombre, origen, ia_nivel_sugerido, ia_confianza, observacion, actualizado`.

## 11. Reports and charts (Recharts)

Chart palette: a monochrome blue ramp consistent with DESIGN.md. Básico `#d6d6d6`, Intermedio `#aad0f6`, Avanzado `#509be7`, Experto `#0066cc`. Grid lines `#d6d6d6`, labels `#707070`. Colors are never the only carrier of meaning; labels and values are always shown.

### 11.1 Reporte individual (per participant)
- Header: participant code, **Nivel general** (large), puntaje general, number of evaluations received.
- **Radar chart**: 4 axes (indicators), scale 1–4, showing the mean per indicator.
- **Stacked horizontal bar per indicator**: how many evaluators chose each level.
- **Coincidencia** chip per indicator (§7).
- **Observaciones**, grouped by indicator, each with the evaluator's name and level. Visible to the docente only.
- Share of levels that came from an applied AI suggestion.

### 11.2 Reporte general
- KPI tiles: participantes evaluados · evaluaciones recibidas / esperadas (cobertura %) · puntaje general promedio · % de niveles asistidos por IA.
- **Distribución de niveles por indicador**: 100 % stacked bars, one per indicator, across all ratings.
- **Puntaje por participante**: horizontal bars sorted descending, colored by nivel general.
- **Tabla de participantes**: code, the 4 indicator means, puntaje general, nivel general, number of evaluations. Sortable, and each row links to the individual report.
- **Cobertura**: an evaluador × participante grid (sent / not sent) so the docente sees who is missing.
- Empty state: *"Aún no hay evaluaciones enviadas para esta competencia."*

Reports are rendered from one server aggregation (`src/lib/reportes.ts`) that is unit-tested against fixtures.

## 12. UI and design system (from DESIGN.md)

Use DESIGN.md as the visual source of truth, with these adaptations:
- **Brand**: the original name "Nivela" with a simple custom wordmark or glyph. **No Apple logo, product names, imagery or SF Pro font files.** Use the system font stack (it renders as SF Pro on Apple devices).
- **Tokens**: copy the DESIGN.md color, type, spacing and radius tokens into Tailwind v4 `@theme` (see CLAUDE.md).
- **Canvas** `#f5f5f7`. Sections are separated by background tints (`#ffffff` / `#f5f5f7` / an `#aad0f6` wash on the Inicio hero). No borders between sections and **no shadows anywhere**.
- **Nav**: 44 px tall, white with `backdrop-filter: saturate(1.8) blur(20px)` (plus the `-webkit-` prefix). Wordmark on the left; on the right, the evaluator's name or "Reportes", and "Salir".
- **Buttons**: pill shape (980 px radius), 14 px text.
  - Primary: filled `#0071e3` with white text, and only one per view ("Comenzar", "Enviar evaluación", "Analizar", "Entrar").
  - Secondary: outlined `#0066cc`.
  - Tap targets are at least 44 × 44 px.
- **Level options**: full-width selectable rows with a 12 px radius, a 1 px `#d6d6d6` border on a white background. Selected: a 2 px `#0066cc` border, a check icon, and the level name in semibold. Not blue fill, since blue fill is reserved for the primary button.
- **Typography**:
  - Hero 56 px / 600 / 1.07 on desktop, 40 px on mobile.
  - Section heads 28–40 px / 600.
  - Body 17 px / 400 / 1.47.
  - Captions 12 px.
  - Hero and page headers are centered. Forms and lists are left-aligned for readability (a deliberate deviation for usability).
- **Inputs**: font-size ≥ 16 px to prevent iOS zoom; the 17 px body size satisfies this. Use `100dvh` and safe-area insets for the sticky bottom bar.
- Status chips: pill shape, 12 px, grayscale with a text label. "Enviado" uses `#0066cc` text.

## 13. Non-functional requirements

**Compatibility**:
- Safari iOS 16.4+, Chrome Android (last 2 versions), Firefox Android (last 2), Samsung Internet (last 2).
- Desktop Chrome, Edge, Firefox and Safari (last 2).
- Viewports from 360 px to 1440 px, with no horizontal scroll.

**Performance**:
- First load JS on rating pages under 200 kB gzipped. Recharts is only loaded on report routes, via dynamic import.
- LCP under 2.5 s on 4G mid-range Android.
- Jev round-trip p50 under 1.5 s.

**Accessibility**:
- WCAG 2.2 AA contrast.
- The level picker is a proper radio group with labels.
- Visible focus rings (`#0066cc`).
- Charts have text equivalents (tables and values).
- `lang="es-CR"`.

**Security**:
- The API key exists only server-side, in a `server-only` module.
- Session cookie: httpOnly, Secure, SameSite=Lax, HMAC-signed, 12 h.
- Codes are compared in constant time.
- zod validation on every route.
- No PII in logs; observation text is never logged.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`.

**Privacy**:
- Names live only in config.
- Participants are anonymous codes.
- The DB stores ids, levels, observations and AI metadata only.

**PWA**:
- `app/manifest.ts` with name "Nivela", `display: standalone`, `theme_color: #ffffff`, `background_color: #f5f5f7`, and 192/512/maskable icons.
- `apple-touch-icon` and Apple web-app meta.
- A minimal service worker that caches only static assets and never `/api/*`.
- An offline banner: *"Sin conexión. Sus respuestas se guardan en este dispositivo."*

## 14. Milestones

| # | Deliverable |
|---|---|
| M1 | Scaffold, design tokens, layout/nav, config files with Adaptabilidad and the teams, config validation test. |
| M2 | Access gate and session; Inicio; evaluator selection; participant list with local drafts and Borrar todo. |
| M3 | Rating screen, complete with validation and the sticky submit bar. |
| M4 | DB schema and migrations; `/api/evaluaciones`; sent-status sync. |
| M5 | `/api/jev` proxy, the suggestion UI (all states), usage cap, golden-set script. |
| M6 | Reports (aggregation, charts, table, coverage), CSV, print view. |
| M7 | PWA, cross-browser QA on real iOS and Android devices, Vercel production deploy. |

## 15. Acceptance criteria (demo)

1. On an iPhone (Safari) and an Android phone (Chrome and Firefox), an evaluator can do the whole flow without zooming or horizontal scrolling: enter the code → pick Adaptabilidad → pick their name → rate a participant on 4 indicators → send.
2. The other 4 competencias are visible but cannot be opened.
3. Refreshing mid-rating loses nothing. "Borrar todo" clears local drafts and does not delete sent evaluations.
4. "Enviar evaluación" is disabled until all 4 indicators have a level.
5. Analyzing a Spanish description returns a suggested level with a percentage. Nothing is applied until the evaluator taps "Aplicar sugerencia". Low-confidence and off-topic states render as specified. A Jev outage never blocks manual rating.
6. Network inspection shows no API key and no names in client requests to `/api/jev`.
7. With the docente code, the general and individual reports render correctly with 8 evaluators × N participants of seeded data. The CSV opens in Excel with correct accents.
8. All UI text is in Spanish and uses "usted".
9. `npm run lint`, `npm run typecheck`, `npm test` and the Playwright suite (WebKit, Chromium, Firefox mobile profiles) pass.

## 16. Open questions

1. **Participants**: how many evaluados are there, and how are they identified during the activity (number tags, seat numbers)? The app currently uses "Participante 01…N" with N = 20 as a placeholder.
2. **Indicador 4 wording**: "Propone soluciones **exigentes** y eficaces…". Should "exigentes" be "eficientes"? It is kept as written for now.
3. **Indicador 1 · Avanzado**: "Adopta de manera autónoma sus métodos…" was corrected to "**Adapta**…". Confirm.
4. **Who is the docente user**: the professor, the student coordinator, or both? This affects who gets `CODIGO_DOCENTE`.
5. **Activity date**: needed so the golden-set validation and device QA are scheduled before it.

---

## Appendix A — Adaptabilidad (corrected text, goes into `src/config/competencias/adaptabilidad.ts`)

**Definición:** La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.
**Fuente:** Govern de les Illes Balears, s. f.

**Indicador 1. Modifica su forma de actuar ante cambios.**
- Básico: Identifica los cambios cuando se le indican, pero requiere supervisión constante para aplicarlos.
- Intermedio: Aplica cambios en los procedimientos con poca ayuda, aunque ocasionalmente necesita orientación.
- Avanzado: Adapta de manera autónoma sus métodos de trabajo al recibir nuevos procedimientos o instrucciones.
- Experto: Se integra proactivamente a los cambios y facilita que otras personas comprendan y adopten la nueva forma de trabajo.

**Indicador 2. Actúa de manera rápida.**
- Básico: Reconoce los cambios, pero necesita ayuda para responder.
- Intermedio: Acepta nuevas instrucciones y las pone en práctica con poca ayuda.
- Avanzado: Actúa rápidamente ante situaciones nuevas siguiendo las indicaciones recibidas.
- Experto: Domina situaciones complejas con rapidez y buen criterio.

**Indicador 3. Ajusta las prioridades.**
- Básico: Identifica los cambios en sus actividades, pero necesita ayuda para reorganizarlas.
- Intermedio: Ajusta sus prioridades ante cambios sencillos, cumpliendo parcialmente los objetivos.
- Avanzado: Organiza sus actividades de manera autónoma para cumplir con los objetivos establecidos.
- Experto: Se desenvuelve proactivamente ante los cambios y facilita que otras personas los comprendan.

**Indicador 4. Propone soluciones exigentes y eficaces ante imprevistos, actuando con iniciativa.**
- Básico: Identifica los imprevistos, pero depende de las instrucciones de otros para darles solución.
- Intermedio: Brinda posibles soluciones con orientación y propone alternativas sencillas ante los imprevistos.
- Avanzado: Detecta posibles problemas antes de que ocurran y propone soluciones preventivas.
- Experto: Se anticipa a posibles imprevistos, propone soluciones innovadoras y ayuda al equipo a resolver situaciones inesperadas.

Corrections applied:
- Accents: Actúa, autónoma.
- Agreement: "necesitan" → "necesita", "reorganizarlos" → "reorganizarlas", "Se desenvuelven" → "Se desenvuelve".
- Commas in Indicador 2 · Básico and Indicador 3 · Intermedio.
- "Adopta" → "Adapta" (to confirm, see §16).

## Appendix B — Teams (names only, goes into `src/config/equipos.ts`)

| Equipo | Competencia | Habilitada | AGRH 315 Psicología 2 | AGRH 613 Seminario |
|---|---|---|---|---|
| 1 | Pensamiento crítico y analítico | No | Mariana Alfaro Núñez, Mariela Castillo Zamora, Angelica Ramirez | Felipe López, Adriana Pérez, Dorian Campos |
| 2 | Autorregulación emocional | No | Anny Varela, Kristel Rocha, Anyeli Segura, Tiffany Peña | Nancy Herrera Rojas, María Guadalupe Núñez Arguedas, Monserrat Céspedes Hidalgo |
| 3 | Orientación al detalle | No | Melany Parrales, Valeria Mena | Fiorella Valverde Solano, Anthony Jimenez Espinoza, Genesis Herrera Norori, Yuliana Villalobos Arroyo |
| **4** | **Adaptabilidad** | **Sí** | Wesnlyn García Pérez, Stacy Zamora Rodríguez, Ramsés Salas Vargas, Sebastian Chaves | Kristel Barrantes López, Angelina Mata Arguedas, Allison Campos Morera, Jimena Salgado |
| 5 | Orientación a resultados | No | Ariana Castillo Sánchez, Zury Castro Sandoval, Derroy Navas Valverde | Anyely Espinoza Mendoza, Génesis Ruiz Martínez, Nayeli Araya Solórzano |

## Appendix C — Copy deck (key strings)

| Context | Text |
|---|---|
| App name / tagline | **Nivela** · "Evaluación de competencias entre pares" |
| Inicio hero | "Evalúe con criterio, indicador por indicador." · button "Comenzar" |
| Acceso | "Ingrese el código de acceso de su clase" · "Entrar" · error "El código no es válido. Verifique con su docente." |
| Competencias | badges "Disponible" / "Próximamente" |
| Evaluador | "¿Quién está evaluando?" · "Seleccione su nombre" |
| Lista | "Participantes" · "Pendiente" · "En progreso" · "Completado" · "Enviado" · "Borrar todo" · "{n} de {total} enviadas" |
| Calificación | "Indicador {n}" · "Observaciones (opcional)" · "Faltan {n} indicadores por calificar" · "Enviar evaluación" |
| IA | "¿No está seguro del nivel?" · "Describa lo que observó" · "No incluya nombres en la descripción." · "Analizar" · "Analizando…" · "Nivel sugerido: {nivel} · {pct}" · "Aplicar sugerencia" · "Usar este texto como observación" |
| Envío | "Evaluación enviada" · "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo." · "Reintentar" |
| Reportes | "Reporte general" · "Reporte individual" · "Nivel general" · "Puntaje general" · "Evaluaciones recibidas" · "Distribución de niveles por indicador" · "Cobertura de evaluaciones" · "Descargar CSV" · "Imprimir o guardar PDF" |
| Sesión | "Salir" · "Su sesión expiró. Ingrese el código nuevamente." |
