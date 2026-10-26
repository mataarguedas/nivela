# PROMPTS.md — Building Nivela with Claude Code

Ten prompts, run in order. Each one maps to the milestones in `PRD.md` §14 and assumes `PRD.md`, `CLAUDE.md` and `DESIGN.md` are in the repo root.

**How to use them**
- Run one prompt per session: `/clear` between prompts so each starts with a clean context, since CLAUDE.md is reloaded automatically.
- For prompts 1, 7, 8 and 9, start in **plan mode**. Review the plan before letting it write code.
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

## Prompt 8 — Jev suggestion (M5)

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

## Prompt 9 — Reports, CSV and print (M6)

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
