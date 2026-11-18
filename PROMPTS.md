# PROMPTS.md — Building Nivela with Claude Code

Twenty prompts, run in order. Prompts 1–10 map to the milestones in `PRD.md` §14; prompts 11–20 add the v1.2 features (see **Phase 2** below). All of them assume `PRD.md`, `CLAUDE.md` and `DESIGN.md` are in the repo root.

**How to use them**
- Run one prompt per session: `/clear` between prompts so each starts with a clean context, since CLAUDE.md is reloaded automatically.
- For prompts 1, 7, 8, 9, 11, 13, 14, 15, 18 and 19, start in **plan mode**. Review the plan before letting it write code.
- After each prompt: review the diff, run the app on your phone (`npm run dev -- -H 0.0.0.0` and open your LAN IP), then commit.
- Manual steps you must do yourself are marked **⚠ Before this prompt**.

---

## Prompt 1 — Scaffold, tooling and design tokens (M1) - DONE

> **⚠ Before this prompt:** have Node 22+ installed. Optionally run `claude plugin marketplace add typesafe-ai/skills` and `claude plugin install typesafe@typesafe-ai`.

```text
Read PRD.md, CLAUDE.md and DESIGN.md completely before doing anything.

Scaffold the Nivela project in the current directory:
- Next.js latest stable (App Router, TypeScript strict, src/ directory, ESLint), no Tailwind config file — use Tailwind CSS v4 with the CSS-first setup.
- Check the installed Next.js major version and tell me whether request interception will live in src/proxy.ts (Next 16+) or middleware.ts. Use that consistently.
- Add Vitest (with jsdom for component tests) and Playwright with three projects: "iPhone 13" (WebKit), "Pixel 7" (Chromium) and a Firefox project at a 390x844 viewport.
- Add every npm script listed in CLAUDE.md → Commands (db:* and jev:evaluar can be stubs for now that print "pendiente").
- Create .env.example with every variable from CLAUDE.md → Environment variables, with comments in English.
- Create src/app/globals.css with exactly the @theme tokens and body styles from CLAUDE.md → Design tokens.
- Create the root layout: lang="es-CR", system font stack, canvas background, metadata title "Nivela", description "Evaluación de competencias entre pares", viewport with viewportFit "cover".
- Create the folder structure from CLAUDE.md → Project structure with placeholder files only where needed for the build to pass.
- Replace the default home page with a temporary centered "Nivela" heading.

Do not build features yet. Finish by running lint, typecheck, test and build, and report the results plus the Next.js version.
```

---

## Prompt 2 — Domain config and scoring (M1) - DONE

```text
Implement the static domain data and scoring logic. No UI in this step.

1. src/config/niveles.ts — the 4 levels (valor 1–4, clave basico|intermedio|avanzado|experto, etiqueta Básico|Intermedio|Avanzado|Experto).
2. src/config/competencias/ — types (Competencia, Indicador) in index.ts plus a registry. adaptabilidad.ts must contain the definition, source and the 4 indicators × 4 levels EXACTLY as written in PRD.md Appendix A (corrected text). Create the other 4 competencia files from PRD Appendix B with habilitada: false and indicadores: [].
3. src/config/equipos.ts — the 5 teams from PRD Appendix B, names only, each integrante with a stable slug id and curso ("AGRH 315 Psicología 2" | "AGRH 613 Seminario Integrado de RRHH").
4. src/config/participantes.ts — generated anonymous participants P01…PNN with etiqueta "Participante 01", count from CANTIDAD_PARTICIPANTES (default 20), readable on server and client.
5. src/config/textos.ts — shared Spanish strings from PRD Appendix C ("usted" form).
6. src/lib/puntajes.ts — pure functions implementing every rule in PRD §7 (evaluation score, per-indicator mean, general score, nivel general thresholds 1.5/2.5/3.5, SD and coincidencia buckets, cobertura).
7. src/lib/formato.ts — Intl es-CR helpers (decimal with 2 places, percent, date dd/mm/aaaa).

Tests:
- tests/unit/config.test.ts — unique ids, every indicator has exactly 4 non-empty levels, every enabled competencia has a team and ≥1 indicator, Adaptabilidad text matches Appendix A.
- tests/unit/puntajes.test.ts — all rules including exact boundary values (1.49/1.5, 2.49/2.5, 3.49/3.5) and empty inputs.

Run lint, typecheck and test.
```

---

## Prompt 3 — UI kit and app shell (M1) - DONE

```text
Build the reusable UI components in src/components/ui/ following CLAUDE.md → Design tokens and component conventions, and PRD §12. All text in Spanish, "usted".

Components:
- Boton (variants: primario = filled #0071e3, secundario = outlined #0066cc, texto = link style; sizes; loading state with "…" label; disabled state; min 44px tap target; renders as button or Next Link).
- Chip (status pill, 12px, grayscale variants plus "enviado" using #0066cc text).
- Campo (label + textarea/input with helper text, error text and a character counter; font-size ≥16px).
- Dialogo (accessible modal: focus trap, Escape closes, returns focus, aria-labelledby; used for confirmations).
- Toast (polite live region, auto-dismiss).
- SelectorNivel (role="radiogroup" of 4 full-width rows: level name + full description; selected = 2px #0066cc border + check icon + semibold label; keyboard arrows work).
- Nav (44px, frosted white with backdrop-filter AND -webkit-backdrop-filter, "Nivela" wordmark left, slot on the right for user name / "Reportes" / "Salir").
- BarraInferior (sticky bottom bar respecting env(safe-area-inset-bottom)).

Rules: no box-shadows, exactly one primary button per view, visible focus ring (#0066cc), no dark: variants, no Apple marks.

Add a dev-only page at /dev/ui (404 in production) that shows every component in every state so I can review them on my phone. Add component tests for SelectorNivel (keyboard + selection) and Dialogo (focus trap). Run lint, typecheck and test.
```

---

## Prompt 4 — Access codes and sessions (M2) - DONE

```text
Implement access control per CLAUDE.md → Sessions and access and PRD §5.1 / FR-1.

- src/lib/sesion.ts: sign/verify the nivela_sesion cookie with jose (HS256, SESSION_SECRET), payload { rol: "evaluador" | "docente", sid }, 12h expiry; constant-time code comparison with padding; helper getSesion() for route handlers and server components.
- POST /api/acceso: zod-validated { codigo }, compares with CODIGO_DOCENTE then CODIGO_ACCESO, ~400ms delay on failure, sets cookie (Secure in production, httpOnly, SameSite=Lax), returns { rol }. Spanish error bodies.
- POST /api/salir: clears the cookie.
- proxy.ts (or middleware.ts, per Prompt 1): redirect unauthenticated pages to /acceso, 401 JSON for unauthenticated /api/*, require docente for /reportes/** and /api/reportes/**; exclude /acceso, /api/acceso, static assets, manifest, sw.js, icons.
- /acceso page: centered hero layout, single code field, primary "Entrar" button, error "El código no es válido. Verifique con su docente.", client-side 30s cooldown after 5 consecutive failures, redirect to "/" (or to the "next" param if it is a safe relative path).
- Nav shows "Salir" when authenticated; expired session shows "Su sesión expiró. Ingrese el código nuevamente."

Tests: unit tests for sign/verify/expiry/tampering and code comparison; e2e test for wrong code, evaluador code, docente code reaching /reportes, evaluador blocked from /reportes. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 5 — Inicio, evaluator selection, participant list and drafts (M2) - DONE

```text
Implement PRD §5.2, §5.3, §5.4, §5.8 and §9.3.

- src/lib/borrador.ts: the Borrador type and key scheme from PRD §9.3; read/write wrapped in try/catch with an in-memory fallback and a one-time notice ("Este navegador no permite guardar borradores. No cierre la página hasta enviar."); 300ms debounced writes; flush on visibilitychange→hidden; borrarTodo() removes only keys prefixed "nivela:v1:"; a small React hook (useBorrador) for components. Include a version field and a migration hook.
- Inicio (/): centered hero on the #aad0f6 wash ("Nivela", "Evalúe con criterio, indicador por indicador.", primary "Comenzar"), then the 5 competencias from config. Enabled ones link to the evaluator step with a "Disponible" chip; disabled ones show "Próximamente", aria-disabled="true", not focusable as links.
- /[competencia]/evaluador: "¿Quién está evaluando?", team members grouped by curso, selection stored locally, then go to the participant list. Changing evaluator later asks for confirmation. 404 for unknown or disabled competencias.
- /[competencia]: participant list with status chips Pendiente / En progreso / Completado (Enviado comes in Prompt 7 — leave a clear extension point), "{n} de {total} enviadas" summary, "Borrar todo" (secondary button) with the confirmation dialog text from PRD §5.8. Redirect to the evaluator step if no evaluator is selected. Nav shows the evaluator's name.

Tests: unit tests for borrador.ts including a localStorage that throws; e2e: disabled competencias can't be opened, evaluator selection persists across reload, Borrar todo clears it. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 6 — Rating screen (M3) - DONE

```text
Implement the rating screen /[competencia]/[participante] per PRD §5.5, FR-5 and FR-6. Jev and submission are NOT part of this step — leave clearly marked slots for them.

- Collapsible header with the competencia definition and source; the "Nota técnica" text from PRD §5.5 always visible in caption size.
- components/calificacion/IndicadorSeccion: "Indicador {n}. {título}", SelectorNivel with the 4 level descriptions from config, "Observaciones (opcional)" field (max 1000 chars, helper "Anote únicamente comportamientos observables del indicador o del nivel de conducta."), and a collapsed "¿No está seguro del nivel?" slot for the AI panel.
- Every change saves to the draft immediately via useBorrador; manual level changes set origen "manual".
- components/calificacion/BarraEnvio: sticky bottom bar showing "Faltan {n} indicadores por calificar" or, when all 4 are set, the primary "Enviar evaluación" button (disabled placeholder handler for now).
- Previous / next participant navigation and a link back to the list.
- Status on the participant list now reflects En progreso / Completado correctly.
- 404 for unknown participants.

Check the layout at 375px in WebKit and Firefox: no horizontal scroll, the bar doesn't cover the last field, inputs don't trigger iOS zoom.

Tests: e2e — rate 3 of 4 indicators, reload, values persist, button disabled; rate the 4th, button enabled; status on the list is "Completado". Run lint, typecheck, test and test:e2e.
```

---

## Prompt 7 — Database and submission (M4) - DONE

> **⚠ Before this prompt:** create the Vercel project, add the **Neon** integration from the Vercel Marketplace, then run `vercel link` and `vercel env pull .env.local`. Add `CODIGO_ACCESO`, `CODIGO_DOCENTE` and `SESSION_SECRET` to `.env.local`.

```text
Use plan mode first. Implement the database and submission per PRD §9.2, §10, §5.7 and CLAUDE.md → Database.

- src/lib/db/schema.ts with Drizzle: evaluaciones, calificaciones, uso_jev exactly as in PRD §9.2 (constraints, checks, cascade, unique keys). Generate and apply the migration.
- src/lib/db/index.ts: pick neon-serverless (WebSocket) or neon-http + db.batch for the transactional upsert, explain the choice in a comment.
- src/lib/validacion.ts: zod schemas + config cross-checks from PRD §10 (competencia exists and habilitada, evaluador belongs to its team, participante exists, exactly the competencia's indicator ids, levels 1–4, observaciones ≤1000, well-formed ia_* fields).
- POST /api/evaluaciones: re-verify session, validate, transactional upsert (upsert evaluacion → replace its 4 calificaciones → puntaje from puntajes.ts → updated_at), return { id, actualizadoEn }. Spanish error bodies, no PII in logs.
- GET /api/evaluaciones?competencia=&evaluador=: participant ids already sent with updated_at.
- Wire "Enviar evaluación": loading state, success toast "Evaluación enviada" + set enviadoEn + back to list; failure message "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo." + "Reintentar".
- Participant list merges server status: Enviado when sent and local modificadoEn ≤ enviadoEn; Completado again when edited after sending.
- scripts/seed.ts (npm run db:seed): realistic fake evaluations for all 8 Adaptabilidad evaluators × all participants with varied levels, some origen "ia", some observations in Spanish; refuses to run when NODE_ENV=production; add a --limpiar flag that truncates the tables.

Tests: unit tests for every rejection case in validacion.ts; an integration test for the upsert (re-submission updates instead of duplicating) using a test database or a mocked db layer — tell me which you chose. e2e: full happy path to "Enviado". Run lint, typecheck, test and test:e2e.
```

---

## Prompt 8 — Jev suggestion (M5) - DONE

> **⚠ Before this prompt:** add `TYPESAFE_API_KEY` and `JEV_MODEL=jev-1.13.0` to `.env.local` and to Vercel's environment variables.

```text
Use plan mode first. If the TypeSafe skill is installed, use it to confirm the @typesafe-ai/sdk API (systemOne, score, noul, timeout option, error classes) before writing code.

Implement PRD §5.6 and §8 and CLAUDE.md → Jev integration.

- src/lib/jev.ts (import "server-only"): one request per analysis with the Score question over the 4 level descriptions in order and the Noul pertinence question, state built only from server config + the observation text. Map to the PRD §8.3 contract (nivelSugerido = argmax+1, probabilidades keyed "1"–"4", confianza, pertinencia, baja_confianza using UMBRAL_CONFIANZA=0.6 and MARGEN_MINIMO=0.15, alternativa, modelo). Validate answer types and that probabilities cover 4 keys summing to 1±0.02, else 502. 8s timeout. Map 429→429 with Retry-After, 5xx/529→502, timeout→504. Never log observation text.
- POST /api/jev: session required; zod { competenciaId, indicadorId, texto (trimmed, 20–1500) }; per-session cap of 60/hour via an atomic upsert-increment on uso_jev, checked before calling Jev; Spanish error bodies.
- components/calificacion/PanelSugerencia inside each IndicadorSeccion: textarea "Describa lo que observó" with hint "No incluya nombres en la descripción.", primary "Analizar" (this is the only filled primary button inside the open panel; the page's Enviar stays in the bottom bar — confirm with me if you see a design conflict), "Analizando…" state, and result states:
  - normal: "Nivel sugerido: {nivel} · {pct}", probability bars per level using the chart level colors, "Aplicar sugerencia", checkbox "Usar este texto como observación" (default on);
  - low confidence: "La IA no está segura entre dos niveles. Revise ambos:" with the top two levels, each with its own apply action;
  - off-topic (pertinencia < 0.5): warning "La descripción no parece relacionarse con este indicador. Agregue comportamientos observables." with the suggestion muted;
  - error: "No fue posible analizar el texto en este momento. Intente de nuevo o seleccione el nivel manualmente."
  Applying stores origen "ia" + ia metadata in the draft and in the submission; a later manual change switches origen to "manual" but keeps the ia metadata. Nothing is ever applied automatically.
- scripts/evaluar-jev.ts (npm run jev:evaluar) + scripts/fixtures/jev-adaptabilidad.json: write 16 realistic Spanish observations (one per indicator × level, no names) plus 4 off-topic texts; print exact-match %, within-±1 %, and pertinence results per item; exit non-zero below the PRD §8.5 targets.

Tests: unit tests for the mapping (normal, low-confidence, off-topic, malformed, timeout, 429) with the SDK mocked; route test for the session cap. e2e with /api/jev mocked covering all 4 UI states. Then run npm run jev:evaluar once against the live API and show me the results. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 9 — Reports, CSV and print (M6) - DONE

```text
Use plan mode first. Implement PRD §5.9 and §11 for the docente role.

- src/lib/reportes.ts: one aggregation function per competencia returning everything both reports need (per participant: indicator means, distribution counts, SD/coincidencia, general score and level, evaluation count, observations with evaluator name/level, % ia-assisted; general: KPIs, per-indicator distribution, sorted participant scores, coverage matrix evaluador × participante). All math via puntajes.ts. Unit-test it against a fixture dataset.
- GET /api/reportes/[competencia] (docente) and GET /api/reportes/[competencia]/csv (docente, UTF-8 with BOM, columns exactly as PRD §10, filename nivela-{competencia}-{fecha}.csv).
- /reportes: competencia picker (only Adaptabilidad enabled).
- /reportes/[competencia] Reporte general: KPI tiles; 100% stacked bars "Distribución de niveles por indicador"; horizontal bars "Puntaje por participante" sorted descending and colored by nivel general; sortable table linking to each participant; "Cobertura de evaluaciones" grid; empty state "Aún no hay evaluaciones enviadas para esta competencia."
- /reportes/[competencia]/[participante] Reporte individual: header with code, Nivel general (large), puntaje, evaluation count; radar chart (4 axes, 1–4); stacked bar per indicator; coincidencia chips; observations grouped by indicator; % ia-assisted.
- Charts: Recharts loaded with next/dynamic (ssr:false) only on report routes; palette 1 #d6d6d6, 2 #aad0f6, 3 #509be7, 4 #0066cc; values always labelled; each chart has a visually-hidden table equivalent; readable at 375px (switch to vertical layouts on small screens where needed).
- "Descargar CSV" and "Imprimir o guardar PDF" buttons; @media print stylesheet that hides nav/buttons, keeps charts on white, avoids page breaks inside charts and table rows.

Seed data with npm run db:seed and verify both reports on 375px WebKit and desktop. Check that rating pages' first-load JS didn't grow (Recharts must not be in their bundle) and report the numbers from next build. Tests: e2e for docente reaching both reports, sorting the table, and the CSV download containing accented names correctly. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 10 — PWA, hardening, cross-browser QA and deploy (M7)

```text
Finish the project per PRD §13, §15 and CLAUDE.md → PWA and Mobile checklist.

1. PWA: app/manifest.ts (name/short_name "Nivela", lang es-CR, standalone, start_url "/", background #f5f5f7, theme #ffffff); generate original icons (a simple "N" monogram in #1d1d1f on #f5f5f7 — no Apple-like marks) at 192, 512, maskable 512 and apple-touch-icon 180; appleWebApp metadata; public/sw.js cache-first only for /_next/static/* and /icons/*, network-only otherwise, never /api/* or session HTML; register it in production only; offline banner "Sin conexión. Sus respuestas se guardan en este dispositivo."
2. Security headers in next.config: a CSP that allows only self + required Next inline needs (use nonces if needed), X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denying camera/mic/geolocation. Confirm the TypeSafe API is only called server-side so it doesn't need to be in connect-src.
3. Audit: grep the client bundles for TYPESAFE, api.typesafe.ai and any team member name inside /api/jev payloads — report findings. Confirm no observation text or names reach logs.
4. Accessibility pass: contrast, radiogroup semantics, dialog focus, labelled charts, lang. Fix anything below WCAG 2.2 AA.
5. Copy pass: every user-facing string is Spanish with "usted" — list any "tú"/"vos" forms or English strings you find and fix them.
6. Run the full Playwright suite on all three mobile projects plus desktop Chromium, and walk through every item of PRD §15 Acceptance criteria, marking each pass/fail with evidence.
7. Write README.md in Spanish: what Nivela is, local setup, env vars, how to change codes, how to enable another competencia by editing config, how to run the Jev golden set, how to export results.
8. Deploy: run next build, then deploy to Vercel production (vercel --prod), run migrations against production, and smoke-test the production URL (access code, one rating with a Jev analysis, submission, report as docente). Do NOT run db:seed against production.

Report the production URL, the acceptance checklist results, bundle sizes and anything left open from PRD §16.
```

---

# Phase 2 — v1.2 features (Prompts 11–20)

Eight features requested after the first build:

| # | Feature | Prompts |
|---|---|---|
| 1 | "Volver" button at the top left | 12 |
| 2 | Evaluators log in with email + password (first visit: verify the email, create a password) | 13, 14 |
| 3 | Reports show how much each participant lacks to reach the next level | 16 |
| 4 | Each participant receives their personal results by email | 13, 19 |
| 5 | Reports show which evaluators are rating and which aren't | 16 |
| 6 | Evaluators mark each participant as present or absent | 15 |
| 7 | Simpler charts in the reports | 17 |
| 8 | A whole-group results report | 18 |

Prompt 11 writes all of them into PRD v1.2 first, so the later prompts can point at PRD sections, as Prompts 1–10 do.

**⚠ Before starting phase 2**
- `dia.jpeg` and `noche.png` (and `capture.png`, if it shows the roster) contain students' emails and phone numbers. Create a `privado/` folder, move them into it, and add `privado/` to `.gitignore` **before your next commit**. Never paste student emails into this file, `PRD.md`, `CLAUDE.md` or any other committed file.
- Commit the pending v1.1 (jornadas) work so phase 2 starts from a clean tree, and check `git status` that nothing in `privado/` is staged.
- Prompt 10 may run before or after this phase. Prompt 20 repeats its QA and deploy steps for v1.2.

**Team numbers depend on the jornada (applies to every prompt in this phase)**

| Equipo | Mañana | Noche |
|---|---|---|
| 1 | Pensamiento crítico y analítico | **Adaptabilidad** |
| 2 | Autorregulación emocional | Autorregulación emocional |
| 3 | Orientación al detalle | Pensamiento crítico y analítico |
| 4 | **Adaptabilidad** | Orientación al detalle |
| 5 | Orientación a resultados | Orientación a resultados |

Every team is identified by **jornada + competencia**. The team number is only a display label for that jornada, and team sizes also differ (the morning Adaptabilidad team has 8 members; the night one has 7). Code, tests, seed data and copy never assume a number or a size. They look the team up with `equipoDeCompetencia(jornada, competenciaId)` and read its `numero` and `integrantes` from there.

---

## Prompt 11 — PRD v1.2, night roster and decisions - DONE

```text
Use plan mode first. Read PRD.md, CLAUDE.md and DESIGN.md completely. In this step, change only PRD.md, CLAUDE.md, .env.example and src/config/equipos.ts (plus tests/unit/config.test.ts if it must follow). No other app code.

Update PRD.md to version 1.2 (today's date; list the changes in the Version row) and CLAUDE.md so the eight features below become the source of truth for Prompts 12–20. Where they contradict the current text, rewrite that text; never leave two versions. Known conflicts to resolve:
- §3 Non-goals excludes accounts, passwords and stored emails. New rule: evaluators have accounts (email + password); evaluator and participant emails live only in the DB, never in config, git, logs or Jev requests. Phone numbers are still never stored. Update CLAUDE.md rule 5, PRD §13 Privacy and CLAUDE.md "Out of scope".
- §5.1 class codes: CODIGO_ACCESO and CODIGO_ACCESO_NOCHE are retired. CODIGO_DOCENTE and CODIGO_ADMIN stay.
- §5.11 "the server always takes the jornada from the session": add the single docente-only exception from feature 8.
- Team numbering per jornada (see "Team numbers depend on the jornada" in PROMPTS.md Phase 2). §2 and §5.3 say "Equipo 4 (Adaptabilidad)" and "the 8 Equipo 4 names": rewrite them jornada-neutral ("the jornada's Adaptabilidad team: Equipo 4 in the morning, Equipo 1 at night"; "the members of that team"). Search PRD.md, CLAUDE.md, README.md, tests/ and scripts/ for any other "Equipo 4", "8 evaluadores/evaluators" or fixed team size (e.g. §15 item 7 "8 evaluators × N participants", CLAUDE.md's db:seed line, the comment in tests/e2e/participantes.spec.ts) and make them depend on the jornada's team. Add to PRD §9.1 and to CLAUDE.md rule 7: "A team is identified by jornada + competencia. Its number is a per-jornada display label and its size varies; never look a team up by number or hard-code a number or size."

Put the specs in: §2 roles, §5.1 rewrite, new §5.12–§5.14, §7, §11 (+ new §11.3), §12 Nav, §6 (FR-18 onward), §9.2, §10, §15, §16 and Appendix C. Keep cross-references consistent.

1. Back button (§12 Nav). A "Volver" link (chevron icon + the word "Volver", link color #0066cc, not a filled button, 44×44 px minimum) at the far left of the nav, before the wordmark. It goes to the logical parent screen, never history.back(): an installed PWA has no browser back button and the history can point outside the app. Parents: rating → participant list; participant list → Inicio; evaluator page → Inicio; /reportes/[c]/[p] → /reportes/[c]; /reportes/[c]/grupo → /reportes/[c]; /reportes/[c] → /reportes; /reportes → Inicio. Not shown on Inicio, /acceso or /admin, nor in print. aria-label names the destination ("Volver a Participantes").

2. Evaluator accounts (§5.1, §5.12).
   - Evaluadores log in with email + password. Each team member in config has one row in a new `cuentas` table (integrante_id pk, correo unique lowercase, password hash, activation date, last access, failed attempts, locked-until). Identity and jornada come from the account, so the session carries `integranteId`. Evaluadores skip "¿Quién está evaluando?" and only their own team's competencia is selectable on Inicio. The server rejects any evaluation whose evaluador isn't the session's integrante.
   - /acceso step 1: "Correo electrónico" + "Continuar". Activated account → step 2a: "Contraseña" + "Entrar" + "¿Olvidó su contraseña?". Not activated → step 2b: a 6-digit code is emailed ("Le enviamos un código de 6 dígitos a {correo}. Revise también la carpeta de correo no deseado."), then "Código de verificación", "Cree su contraseña", "Confirme su contraseña" (min 8 characters). The code is what stops someone who knows a classmate's email from claiming their account first.
   - An email that isn't in the roster gets the same "code sent" screen, but no email is sent (no way to probe which addresses exist).
   - Codes: stored hashed, expire in 10 min, 5 attempts, "Reenviar código" after 60 s, at most 5 codes per email per hour. "¿Olvidó su contraseña?" uses the same code flow.
   - Passwords: Node crypto.scrypt with a per-user salt; 5 wrong passwords lock the account for 15 min; ~400 ms delay on every failure.
   - A secondary link "Ingresar con código de docente o administración" shows the existing code form.
   - /admin gains "Cuentas de evaluadores" for the selected jornada: name, curso, team, email (editable), status (Sin correo / Pendiente de activar / Activa), last access, and "Restablecer acceso" (clears the password; the student re-activates with a code).
   - Real emails are imported from a gitignored CSV by a script (Prompt 14), never committed. Members without an email can't log in until the admin adds one.

3. Gap to the next level (§7). For a score s rounded to 2 decimals (puntaje general or an indicator mean): the next threshold is the first of 1.5 / 2.5 / 3.5 above s, and faltante = threshold − s, to 2 decimals. Experto → "Nivel máximo alcanzado". Copy: "Le faltan {x} puntos para {nivel}". Shown in the Reporte individual (general and per indicator, with the next level's behavior description from config), as a column in the participants table, in the group summary and in the results email.

4. Personal results by email (§5.14). `participantes` gains a nullable `correo`; the admin editor gets an optional email per participant (the "@" rejection stays for the name field only). On the Reporte general the docente opens "Enviar resultados por correo": a preview of the exact email for one participant, the recipients (email set and ≥ 1 evaluation) and the skipped ones with the reason (sin correo / sin evaluaciones / ausente), then a confirmation dialog. Content (Spanish, usted): name, competencia, jornada, nivel general, puntaje general, evaluations received, and per indicator the mean, level, gap and next-level description. Never included: evaluator names, individual ratings, AI metadata. Observations are excluded (open question in §16: they were written for the docente). Every send is recorded in `envios_resultados` (jornada, competencia, participante, estado enviado|error, timestamp, no email body). Sending again needs an explicit "Reenviar" with confirmation. Provider: Resend via the Vercel Marketplace; sender from CORREO_REMITENTE.

5. Evaluator progress (§11.2). A new Reporte general section "Avance de evaluadores": per team member name, curso, account status, last access, sent / expected (expected = active participants minus those they marked absent), absents marked, and a chip Sin iniciar / En progreso / Completo; incomplete first; summary "{n} de {total} evaluadores completaron". Drafts are local, so the server only knows sent evaluations; say so in a caption.

6. Attendance (§5.13). On the rating screen the evaluator can mark "Ausente" (and undo with "Marcar presente"), per evaluator, saved to the server immediately (new `asistencia` table keyed by jornada, competencia, evaluador, participante). An absent participant shows the chip "Ausente" in the list, can't be sent, and is left out of "{n} de {total} enviadas" ("· {m} ausentes"). Marking absent is refused if that evaluator already sent the evaluation ("Ya envió una evaluación para esta persona."). Reports: Ausente = ≥ 1 absent mark and no evaluations; absent pairs leave the coverage denominator; a KPI tile "Ausentes"; the coverage grid shows "Ausente".

7. Simpler charts (§11). One message per chart, titled by a plain sentence computed from the data ("La mayoría de los participantes está en nivel Avanzado (12 de 20)"). Horizontal bars with value labels, level thresholds as labelled reference lines, only the 4 level colors. Individual: radar → "Puntaje por indicador" bars on a 1–4 scale; per-indicator stacked bars → "{n} de {total} evaluadores eligieron {nivel}" lines. General: 100 % stacked → "Participantes por nivel" (4 bars counting participants per nivel general). The current detailed charts move into a collapsed "Ver gráficos detallados" section, so nothing is lost.

8. Group summary (§11.3). /reportes/[competencia]/grupo "Resumen del grupo", docente only, with a selector Mañana / Noche / Ambas jornadas (query param, validated; default = the session's jornada; this is the §5.11 exception and it is read-only). Content: group mean and nivel general, the group's gap to the next level, participants per nivel, mean per indicator with the strongest and weakest indicator named in a sentence, participation (evaluados, ausentes, cobertura, evaluadores completos) and, for "Ambas jornadas", a Mañana vs Noche comparison table. Linked from the Reporte general. Print-friendly.

Night roster (Appendix B "Noche" and src/config/equipos.ts): read privado/noche.png and copy names and courses only, never emails or phones. The night team numbering differs from the morning:
- Mañana: 1 Pensamiento crítico y analítico · 2 Autorregulación emocional · 3 Orientación al detalle · 4 Adaptabilidad · 5 Orientación a resultados (unchanged).
- Noche: 1 Adaptabilidad · 2 Autorregulación emocional · 3 Pensamiento crítico y analítico · 4 Orientación al detalle · 5 Orientación a resultados.
Today src/config/equipos.ts gives the night teams the morning mapping (equipo-noche-4 = adaptabilidad). First confirm team ids aren't stored in the DB or drafts (evaluaciones keys on competencia_id + evaluador_id), then fix the night teams' numero and competenciaId to the table above; keep the Appendix B "Noche" table ordered by the night numbers with the Habilitada column per competencia (Equipo 1 is the "Sí" row at night). Integrante ids are new slugs, unique across jornadas.
- Code audit: grep src/ for any lookup or label that uses a team number (`numero ===`, "Equipo 4", `equipo-4`) instead of equipoDeCompetencia(jornada, competenciaId), and list what you find. Fix anything in config or tests in this step; list app-code findings for me instead of changing them here.
- tests/unit/config.test.ts: the Appendix B tests already match each row by number per jornada, so they'll enforce the new mapping once the table is right. Add an explicit test that the night Adaptabilidad team is Equipo 1 with 7 members and the morning one is Equipo 4 with 8, and that the same competencia never appears twice within a jornada. Capitalize "Raquel vargas". The surname "Cristopher Martínez Renteri…" is cut off in the screenshot: ask me. Ask me too what the yellow and cyan highlights mean, in case they mark team coordinators.

§16 Open questions: remove item 6 (night roster) and add: the email sending domain, whether observations go into results emails, the missing evaluator emails, and the addresses that look mistyped (Prompt 14 lists them).

.env.example: remove CODIGO_ACCESO and CODIGO_ACCESO_NOCHE; add RESEND_API_KEY, CORREO_REMITENTE and CORREO_MODO (resend | consola), with English comments.

Finish by listing every decision you made that isn't written above. Run lint, typecheck and test.
```

---

## Prompt 12 — Back button (feature 1) - DONE

```text
Implement the "Volver" button per PRD §12 (Nav) v1.2.

- Add a `volverA?: { href: string; etiqueta: string }` prop to src/components/ui/Nav.tsx (or a small BotonVolver rendered in its left slot, before the wordmark). It is a Next Link, not a client component: chevron icon from iconos.tsx + the text "Volver", text-link color #0066cc, min 44×44 px, visible focus ring, aria-label "Volver a {etiqueta}". It must fit next to the wordmark and the right slot at 360 px without truncating the wordmark; if space runs out, hide the word "Volver" visually (keep it for screen readers) before anything else.
- Each layout/page passes its parent from the PRD table; the destinations are computed on the server from the route params (no history.back()). Not rendered on Inicio, /acceso, /admin, nor in print.
- The rating page's draft is already saved on every change (debounced 300 ms); make sure leaving through "Volver" flushes the pending write like visibilitychange does.
- Add the button to /dev/ui.

Check at 360, 375 and 390 px in WebKit, Chromium and Firefox: no horizontal scroll and the iOS notch padding still applies. Tests: e2e that "Volver" from the rating screen reaches the list, from the list reaches Inicio, and from the Reporte individual reaches the Reporte general; a rating saved immediately before tapping "Volver" survives a reload. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 13 — Email sending infrastructure (features 2 and 4) - DONE

> **⚠ Before this prompt:** you need a domain you control (with access to its DNS) to send from, e.g. `resultados.<sudominio>`. Without a verified domain, Resend only delivers to your own account's address, so codes would never reach the students. Have the domain's DNS panel open; the session will ask you to add the records Resend shows.

```text
Use plan mode first. Load the vercel:marketplace skill and follow it to add Resend through the Vercel Marketplace; confirm the env var names it provisions and run `vercel env pull .env.local`. Implement the email layer only; no login or results UI yet.

- src/lib/correo.ts (import "server-only"): enviarCorreo({ para, asunto, html, texto, idempotencia? }) with a 10 s timeout and typed errors (rechazado, limite, red, desconocido). Never log recipients, subjects or bodies: log only the template name, status and latency.
- Two transports chosen by CORREO_MODO: "resend" (production) and "consola" (the default in dev and tests). "consola" keeps the last 20 messages in memory; a dev-only page /dev/correos (404 in production) lists them rendered, and a dev-only GET /api/dev/correos?para= returns the latest one as JSON so Playwright can read verification codes without a real inbox.
- src/lib/correos/: templates as plain TS functions returning { asunto, html, texto }. HTML email-safe: table layout, inline styles, system font stack, DESIGN.md colors (#1d1d1f text, #f5f5f7 canvas, one #0071e3 button at most), no images, no Apple marks, a plain-text version always. Spanish, usted. Start with `codigoVerificacion({ codigo, minutos })` ("Su código de Nivela es {codigo}. Vence en {minutos} minutos. Si usted no lo solicitó, ignore este mensaje.").
- npm run correo:prueba -- --para <correo>: sends the verification template with a fake code through Resend so I can check delivery to a UTN student (est.utn.ac.cr) inbox and to Gmail, including the spam folder. Help me verify the sending domain (SPF, DKIM, DMARC) before that.
- CSP stays unchanged: Resend is only called server-side. Confirm it.

Tests: unit tests for correo.ts with the Resend client mocked (success, 429, timeout, rejected) and a snapshot of the template's text version. Run lint, typecheck and test. Then run correo:prueba once to my address and tell me the result.
```

---

## Prompt 14 — Evaluator accounts and email login (feature 2) - DONE

> **⚠ Before this prompt:** keep at hand the two emails that aren't in the screenshots (Ramsés Salas Vargas and Sebastian Chaves); you'll paste them when the session asks. Melany Parrales (mañana) and Yuleissy Vargas Corrales (noche) have no email yet: their accounts stay "Sin correo". Neither is on an Adaptabilidad team, so this doesn't block the demo.

```text
Use plan mode first. Implement PRD §5.1 and §5.12 (v1.2): evaluator accounts, email + password login, and the admin's account list. The email layer from Prompt 13 is ready.

Data
- Drizzle: `cuentas` and `codigos_verificacion` per PRD §9.2; generate migration 0003. Codes are stored as HMAC(SESSION_SECRET) hashes, never in plain text.
- src/lib/cuentas.ts (server-only): scrypt hash/verify with timingSafeEqual, code generation with crypto.randomInt, expiry, attempt counting, lockout, and the per-email hourly code limit.

Importing the real emails
- Build privado/correos-evaluadores.csv (gitignored, columns integranteId,correo) by reading privado/dia.jpeg and privado/noche.png and matching each row to the integrante ids in equipos.ts by name within that sheet's jornada, never by team number (the night sheet's Equipo 1 is Adaptabilidad; the morning sheet's is Pensamiento crítico). Ask me for the two emails not in the screenshots (Ramsés Salas Vargas, Sebastian Chaves). Leave Melany Parrales and Yuleissy Vargas Corrales empty.
- Don't fix addresses silently. List these for me to confirm: Wesnlyn García Pérez (domain "gmal.com", probably gmail.com), Andy Molina Castro and Karyme Varela Cantillano (domain "est.ac.cr", probably est.utn.ac.cr), plus any cell you can't read with certainty. Show me the full name → email table before importing.
- scripts/importar-cuentas.ts (npm run cuentas:importar -- --archivo <csv> [--produccion]): zod-validates every email (trimmed, lowercased), checks each integranteId exists in config and that no email repeats, upserts only the email (if an email changes, the account goes back to "Pendiente de activar"), prints counts but never the emails. It prints the target DB host (no credentials) and refuses production unless --produccion is passed and I confirm. Import into the dev branch only in this session.
- The dev seed and e2e use fake accounts (`<integranteId>@ejemplo.test`, password from E2E_CONTRASENA in .env.local), never real addresses.

API (zod everywhere, Spanish error bodies, ~400 ms delay on failures, no emails or codes in logs)
- POST /api/acceso/correo { correo } → { paso: "contrasena" | "codigo" }. Sends a code when the account isn't activated; for unknown emails returns "codigo" without sending anything.
- POST /api/acceso/activar { correo, codigo, contrasena } → validates the code, sets the password, signs the session.
- POST /api/acceso/contrasena { correo, contrasena } → session, or "Correo o contraseña incorrectos." / "Demasiados intentos. Intente de nuevo en 15 minutos."
- POST /api/acceso/recuperar { correo } → sends a code (same response for unknown emails).
- POST /api/acceso { codigo } now accepts only CODIGO_DOCENTE and CODIGO_ADMIN.
- Session payload gains integranteId for evaluadores; an evaluador token without it is treated as expired ("Su sesión expiró. Ingrese nuevamente."). proxy.ts lets /api/acceso/* through.
- Updates last access on every successful login.

UI
- /acceso as specified in PRD §5.12: step 1 email; step 2a password with "¿Olvidó su contraseña?"; step 2b code (inputmode="numeric", autocomplete="one-time-code") + "Cree su contraseña" + "Confirme su contraseña" + "Reenviar código" enabled after 60 s; the secondary link "Ingresar con código de docente o administración". Correct autocomplete attributes (username, current-password, new-password) so phone password managers offer to save. Exactly one primary button per step. Inline validation: "Debe tener al menos 8 caracteres.", "Las contraseñas no coinciden.", "El código no es válido o expiró."
- Evaluadores: /[competencia]/evaluador redirects to the list; the evaluator id comes from the session (drafts keep the same key scheme); Inicio enables only their own team's competencia; Nav shows their name. The docente keeps the evaluator picker.
- POST and GET /api/evaluaciones: for evaluadores, evaluadorId must equal session.integranteId, else 403.
- /admin: the "Cuentas de evaluadores" section (PUT /api/admin/cuentas for email edits and "Restablecer acceso", both with confirmation dialogs), scoped to the session's jornada like the participant editor. Members are grouped by that jornada's teams in their own number order, labelled "Equipo {numero} · {competencia}" from config (at night "Equipo 1 · Adaptabilidad", in the morning "Equipo 4 · Adaptabilidad").
- The evaluador's competencia always comes from their team in their jornada (equipoDeCompetencia / the integrante's team), never from a team number.
- Remove CODIGO_ACCESO / CODIGO_ACCESO_NOCHE from code, tests, .env.example (Prompt 11 left them marked "RETIRED"), CLAUDE.md and README; update tests/e2e/sesion.ts to log in with the fake accounts.

Tests: unit tests for hashing, code expiry/attempts/hourly limit, lockout, identical responses for unknown emails, and the importer's validation. e2e: first activation reading the code from /api/dev/correos, logout and login with the new password, a night Adaptabilidad member (Equipo 1) and a morning one (Equipo 4) each land on Adaptabilidad with their own jornada's participants, wrong-password lockout message, "¿Olvidó su contraseña?", an evaluador posting as another evaluator gets 403, docente and admin codes still work. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 15 — Attendance (feature 6) - DONE

```text
Use plan mode first. Implement PRD §5.13 (v1.2): evaluators mark participants as absent.

- Drizzle: the `asistencia` table per PRD §9.2 (jornada, competencia_id, evaluador_id, participante_id, ausente, updated_at; pk on the first four). Migration 0004.
- PUT /api/asistencia { competenciaId, participanteId, ausente }: the evaluador comes from the session; the participant must be active in the session's jornada; refuse with 409 "Ya envió una evaluación para esta persona." if that evaluator already sent one. GET /api/evaluaciones also returns that evaluator's absent ids, so the list loads both in one request.
- Rating screen: under the header, a secondary control "Marcar ausente" (outlined, not primary) → confirmation dialog "¿Marcar a {nombre} como ausente? No podrá enviar su evaluación mientras esté marcada así." When absent: a notice "Marcó a esta persona como ausente." with "Marcar presente", the level pickers stay visible but "Enviar evaluación" is replaced by that notice in the bottom bar. The local draft is kept untouched.
- Participant list: chip "Ausente" (grayscale, with text); summary "{n} de {total} enviadas · {m} ausentes", with absents out of the total.
- Network failure → toast "No se pudo guardar la asistencia. Intente de nuevo." Attendance is not stored offline.
- Reports (src/lib/reportes.ts, all math still in puntajes.ts): per participant attendance (Ausente = ≥ 1 absent mark and no evaluations; with marks and evaluations → "Asistencia en conflicto", shown in the table with the counts); absent pairs leave the coverage denominator; KPI tile "Ausentes"; the coverage grid shows "Ausente" in those cells. Add an `ausente_marcado_por` count column to the CSV only if PRD §10 v1.2 lists it; otherwise leave the CSV as is.
- Seed: mark 2 participants absent for most evaluators. The seed covers both jornadas and takes each jornada's evaluators from equipoDeCompetencia(jornada, competenciaId), so the night Adaptabilidad team (Equipo 1, 7 members) and the morning one (Equipo 4, 8 members) both get data; remove any hard-coded "8 evaluators".

Tests: unit for the attendance aggregation and the new coverage denominator; route tests for the 409 and for jornada scoping; e2e: mark absent → chip and summary update → reload persists → "Marcar presente" restores sending; an already-sent participant can't be marked absent. Check at 375 px in WebKit and Firefox. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 16 — Gap to the next level and evaluator progress (features 3 and 5) - DONE

```text
Implement PRD §7 (gap rule) and the "Avance de evaluadores" section of §11.2 (v1.2). Accounts (Prompt 14) and attendance (Prompt 15) are in place.

Gap to the next level
- puntajes.ts: brechaSiguienteNivel(puntaje) → { nivelActual, siguiente: NivelValor | null, umbral: number | null, faltante: number | null }, using UMBRALES_NIVEL and the same 2-decimal rounding as nivelGeneral, so the displayed score and the gap always agree (2,49 → faltan 0,01 para Avanzado; 2,50 → Avanzado, faltan 1,00 para Experto; ≥ 3,5 → null). Unit tests on every boundary and on floating-point cases like 2.4999.
- reportes.ts: add the gap for each participant's puntaje general and each indicator mean.
- Reporte individual: under Nivel general, "Le faltan {x} puntos para {nivel}" or "Nivel máximo alcanzado"; per indicator, the gap plus the next level's description from config ("Para llegar a Experto: {descripción}"). Participants table: a sortable column "Para el siguiente nivel". Include both in print.

Avance de evaluadores
- reportes.ts: per member of the session jornada's team for this competencia (equipoDeCompetencia; the section title names it, e.g. "Avance de evaluadores · Equipo 1" at night, "Equipo 4" in the morning): account status (Sin correo / Pendiente de activar / Activa), last access, sent count, absents marked, expected = active participants − their absents, estado Sin iniciar (0 sent) / En progreso / Completo (sent = expected).
- A new section on the Reporte general after the KPI tiles: "Avance de evaluadores" with the summary "{n} de {total} evaluadores completaron", then a table (name, curso, cuenta, último ingreso dd/mm/aaaa hh:mm, enviadas "{x} de {y}", ausentes, estado chip), incomplete ones first. Caption: "Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador." It must read well at 375 px (a stacked card per evaluator on small screens) and print.
- KPI tile "Evaluadores completos".

Tests: unit for the new aggregation with a fixture that has an evaluator with no account, one in progress, one complete with absents, run for both jornadas (the night team has a different number and size); e2e: the docente sees both the gap text and the progress section with seeded data. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 17 — Simpler charts (feature 7) - DONE

```text
Load the dataviz skill first and apply it within DESIGN.md's palette. Implement PRD §11 v1.2 "simpler charts" for both reports.

- Every chart gets a title that states its message, computed from the data in src/components/reportes/datosGraficos.ts (pure, unit-tested): e.g. "La mayoría de los participantes está en nivel Avanzado (12 de 20)", "El indicador más alto es «Actúa de manera rápida» (3,25)". Handle ties and empty data with neutral sentences.
- Reporte individual: replace the radar with "Puntaje por indicador": horizontal bars on a fixed 1–4 axis, value label at the bar end ("3,25 · Avanzado"), dashed reference lines at 1,5 / 2,5 / 3,5 labelled with the level they open. Replace the per-indicator stacked bars with one plain line per indicator: "{n} de {total} evaluadores eligieron {nivel}" (the most chosen level; list ties).
- Reporte general: replace "Distribución de niveles por indicador" with "Participantes por nivel": 4 horizontal bars (Básico → Experto) counting participants by nivel general, labelled with count and percent. "Puntaje por participante" stays, with the same reference lines.
- Move the radar, the stacked distributions and the 100 % bars into a collapsed "Ver gráficos detallados" disclosure (button with aria-expanded) at the end of each report. Recharts still loads only via next/dynamic on report routes; the detailed charts load only when opened.
- Rules: horizontal bars only in the default view, only the 4 level colors, every value labelled, no legend needed to read a chart, the visually hidden table equivalents stay, readable at 375 px and in print (charts on white, no page breaks inside).

Tests: unit for the title sentences; e2e: default view shows the simple charts, "Ver gráficos detallados" reveals the radar. Report the report routes' first-load JS before/after from next build. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 18 — Group summary report (feature 8) - DONE

```text
Use plan mode first. Implement PRD §11.3 (v1.2) "Resumen del grupo" at /reportes/[competencia]/grupo.

- Access: docente only (proxy.ts already gates /reportes/**; the page re-checks). Selector "Jornada" with Mañana / Noche / Ambas jornadas as a radio group styled like SelectorJornada, driving a `?jornada=manana|noche|ambas` param validated with zod; default = the session's jornada. This is the only place a jornada comes from the request (PRD §5.11 exception): it must never write, never change the session, and it must be documented in a comment.
- src/lib/reportes.ts: agregarResumenGrupo(...) reusing the per-participant aggregation (participants are keyed by jornada + id, since P01 exists in both jornadas). All math in puntajes.ts: group mean of puntajes generales, nivel general and gap to the next level for the group, participants per nivel, mean per indicator, strongest and weakest indicator, evaluados, ausentes, cobertura, evaluadores completos.
- Page: hero "Resumen del grupo" + "{competencia} · Jornada: {nombre}" (or "Ambas jornadas"); KPI tiles; a one-paragraph plain summary generated from the data ("El grupo alcanzó un nivel Avanzado (2,84). Le faltan 0,66 puntos para Experto. El indicador más fuerte es … y el que más necesita refuerzo es …"); "Participantes por nivel" and "Puntaje promedio por indicador" with the simple chart components from Prompt 17; with "Ambas jornadas", a Mañana vs Noche comparison table (each KPI and indicator mean in two columns). Jornadas are compared by competencia, never by team number: the Adaptabilidad columns compare morning Equipo 4 with night Equipo 1, and each column header names its own team from config ("Mañana · Equipo 4", "Noche · Equipo 1"). Evaluator counts come from each jornada's own team size. Empty state: "Aún no hay evaluaciones enviadas para esta competencia."
- Link "Resumen del grupo" from the Reporte general header (secondary button) and "Volver" goes back to the Reporte general. "Imprimir o guardar PDF" works here too.

Tests: unit for agregarResumenGrupo with fixtures for each jornada and both (no mixing of P01 across jornadas); route/page test that an invalid jornada param falls back to the session's; e2e: docente opens the summary, switches to "Ambas jornadas", sees the comparison table; an evaluador gets redirected. Run lint, typecheck, test and test:e2e.
```

---

## Prompt 19 — Personal results by email (feature 4) - DONE

> **⚠ Before this prompt:** the participants' (evaluados') emails will come later. You can build and test this now with fake addresses; the admin enters the real ones at `/admin` when you have them. Decide whether the peers' observations go into the email (the default is no).

```text
Use plan mode first. Implement PRD §5.14 (v1.2): the docente sends each participant their personal results by email. The email layer (Prompt 13) and the gap rule (Prompt 16) are ready.

- Drizzle: add nullable `correo` to `participantes` and the `envios_resultados` table per PRD §9.2. Migration 0006 (0005 is `participantes.carnet`, v1.4).
- Admin editor: an optional "Correo electrónico" field per participant, next to the name and the carnet (zod email, lowercased; the "@ / 7+ digits" rejection keeps applying to the name only). "Pegar lista" already splits carnet and name by tab or ";" (leerLineaPegada); extend it so a field with "@" is the email. The CSV and the reports never include participant emails or names (they show the carnet).
- Template src/lib/correos/resultados.ts: subject "Sus resultados de {competencia} · Nivela". Body per PRD §5.14: greeting by name (names are stored first name first), competencia and jornada, nivel general (large) and puntaje general, evaluations received, a table per indicator (mean, level, "Le faltan … para …" or "Nivel máximo alcanzado", and the next level's description), a closing line explaining that results are the average of peer evaluations. Never evaluator names, individual ratings, AI data or other participants. Text version included. Spanish, usted.
- /reportes/[competencia]/enviar (docente): recipient list (email set and ≥ 1 evaluation), skipped list with reasons (Sin correo / Sin evaluaciones / Ausente), a rendered preview for any selected participant, "Enviarme una prueba" to an address I type (not stored), and "Enviar a {n} participantes" (the primary button) behind a confirmation dialog. Already-sent participants show "Enviado el {fecha}" and are excluded unless I tick "Reenviar" for them.
- POST /api/reportes/[competencia]/enviar { participantes: string[], reenviar?: boolean }: docente only, session jornada only, recomputes the report on the server (the client never sends scores), sends one email per participant with an idempotency key (jornada-competencia-participante-updated_at), records each result in envios_resultados, returns { enviados, errores: [{ participanteId, motivo }] }. Pace requests to stay under Resend's rate limit; set the route's maxDuration accordingly. Never log emails or bodies.
- Reporte general: a secondary button "Enviar resultados por correo" and a column "Correo" in the table with Enviado / Error / Pendiente.

Tests: unit for the template (no evaluator names, gap text, Experto case) and for recipient selection; route tests for role, jornada scoping, idempotent re-send and partial failures with Resend mocked; e2e with CORREO_MODO=consola: preview, confirm, statuses become "Enviado", the message appears in /dev/correos. Run lint, typecheck, test and test:e2e. Finally, with CORREO_MODO=resend, use "Enviarme una prueba" once to my address and show me the result.
```

---

## Prompt 20 — v1.2 QA, privacy audit and deploy

```text
Finish v1.2 per PRD §13 and §15 (v1.2), repeating Prompt 10's QA for the new features.

1. Privacy audit: `git ls-files` must not contain privado/ or any screenshot with the roster; `git grep -nE "@(est\.utn\.ac\.cr|gmail\.com|hotmail\.com|icloud\.com)"` must return nothing outside tests' @ejemplo.test fixtures; no emails, codes, passwords or observation text in logs (grep the route handlers and lib for console.* calls). Confirm emails never reach /api/jev payloads or client bundles other than the admin's own editor and the docente's send page.
2. Security: login rate limits and lockout work, codes are single-use, session cookies carry integranteId only for evaluadores, every route re-checks role and jornada, the "ambas" summary is read-only. Update the CSP only if something actually needs it.
3. Accessibility and copy pass over every new screen (back button, login steps, attendance dialog, progress table, charts, group summary, send page): WCAG 2.2 AA, focus order, labelled controls, Spanish "usted" only.
4. Run the full Playwright suite on the three mobile projects plus desktop Chromium, and walk PRD §15 v1.2 marking each item pass/fail with evidence. Walk the evaluator flow in both jornadas: a morning Equipo 4 member and a night Equipo 1 member both rate Adaptabilidad, see only their jornada's participants, and appear in the right "Avance de evaluadores" section. Re-run the grep for team-number lookups (`numero ===` on teams, "Equipo 4", "8 evaluadores") and confirm none are left.
5. README.md (Spanish): how evaluators activate their account, how the admin edits emails and resets access, how to import the CSV, how to send results, the new env vars, and the email domain setup.
6. Deploy, asking me before each production step: set RESEND_API_KEY, CORREO_REMITENTE and CORREO_MODO=resend in Vercel and remove CODIGO_ACCESO / CODIGO_ACCESO_NOCHE; apply migrations 0003–0006 to production with the established procedure (DATABASE_URL_MIGRACION with the pg driver, check $LASTEXITCODE, verify with a read-only query); run cuentas:importar --produccion with privado/correos-evaluadores.csv; vercel --prod. Smoke test as docente (reports, group summary, a test results email to my address) and ask me which evaluator account to use for a login smoke test. Never run db:seed against production.

Report the production URL, the acceptance results, bundle sizes, and what's left open in PRD §16 (missing emails, observations in emails, etc.).
```
