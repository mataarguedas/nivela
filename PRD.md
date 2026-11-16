# PRD — Nivela

**Evaluación de competencias entre pares** · Demo: competencia *Adaptabilidad*

| | |
|---|---|
| Version | 1.2: evaluator accounts with email login (§5.1, §5.12), attendance (§5.13), personal results by email (§5.14), gap to the next level (§7), evaluator progress (§11.2), simpler charts (§11), group summary (§11.3), back button (§12), night roster and per-jornada team numbering (Appendix B), and the Adaptabilidad rubric from the team template plantilla.xlsx (Appendix A). 1.1 added the night cohort (§5.11). |
| Date | 2026-11-16 |
| Owner | Emmanuel (engineering) |
| Status | Approved for build (see §16 for open items) |
| UI language | Spanish (Costa Rica), "usted" form, light mode only |

---

## 1. Summary

Nivela is a mobile-first web app (installable as a PWA) used during a peer-assessment activity in the courses **AGRH 315 Psicología 2** and **AGRH 613 Seminario Integrado de Recursos Humanos**.

Students are grouped into five teams, one per *competencia*. Each team member rates participants from a **separate course** on that team's competencia. An admin sets how many participants there are and their names (§5.10). Each competencia has 4 indicators, and each indicator has 4 behavior levels: Básico (1), Intermedio (2), Avanzado (3), Experto (4).

When an evaluator is unsure which level applies, they can describe what they observed in Spanish. **Jev** (TypeSafe AI's System One decision model) then suggests the most likely level with a calibrated probability. The evaluator always confirms the level.

Submitted ratings go to a shared Postgres database. A protected report area shows per-participant, general and whole-group results, the gap each participant has to the next level, and which evaluators have finished. At the end of the activity the docente sends each participant their personal results by email (§5.14).

Evaluators sign in with their own email and a password they create on their first visit, after confirming a code sent to that email (§5.12). Evaluators mark whether each participant is present or absent (§5.13).

The activity runs in two **jornadas** (cohorts): the morning students (*Mañana*) and the night students (*Noche*). Each jornada has its own five teams, its own participant list and its own evaluations and reports. Night students rate night participants only, and the two cohorts never see each other's names. An evaluator's account decides their jornada: it is the jornada of their team in Appendix B. The docente and the admin switch jornada inside the app (§5.11).

Team numbers are per jornada: the morning Adaptabilidad team is Equipo 4 and the night one is Equipo 1 (Appendix B). A team is always identified by jornada + competencia.

The first demo enables only **Adaptabilidad**. The other four competencias appear in the UI as disabled ("Próximamente") and are defined as data, so enabling one later needs no code changes.

## 2. Context and users

| Role | Who | What they do |
|---|---|---|
| **Evaluador** | The members of their jornada's team for the competencia, from both courses (Appendix B). For Adaptabilidad: Equipo 4 in the morning, Equipo 1 at night. | Sign in with their email and password (§5.12), mark each participant present or absent (§5.13), rate every present participant of that jornada on the 4 indicators, submit. |
| **Evaluado / Participante** | Students from a separate course | They do not use the app. Shown by the name the admin entered, with their number ("Participante 07") as a secondary label; without a name, by number only. They receive their personal results by email if the admin entered their email (§5.14). |
| **Docente** (or course coordinator) | Professor, or a designated student | Enter the docente code, pick the jornada, view reports (including evaluator progress and the group summary), export CSV, print, and send results by email (§5.14). |
| **Admin** | Whoever prepares the activity | Enter the admin code (`CODIGO_ADMIN`), pick the jornada, set the participants (count, names and optional emails, §5.10) and manage evaluator accounts (§5.12). Nothing else: no rating, no reports. |

Rules:
- Evaluators never rate each other or themselves. This is structural: evaluados come from a different course and a different list.
- An evaluator rates **only** their team's competencia.
- An evaluator rates **only** participants of their own jornada. An evaluator's jornada comes from their account and can't be changed in the app.
- An evaluator acts only as themselves: their identity comes from the account, never from a choice in the UI.
- A team is identified by jornada + competencia. Its number is a per-jornada display label (Appendix B), and its size varies.

## 3. Goals and non-goals

### Goals
1. Evaluators can rate any participant on all 4 indicators from a phone in under 3 minutes.
2. When unsure, an evaluator gets a level suggestion from a free-text description in under 2 seconds (typical).
3. Work in progress survives refreshes and closed tabs on the same device.
4. The docente gets clear, printable reports: per participant and general.
5. Competencias, indicators and teams live in plain config files that are easy to edit; participants are set by the admin (§5.10).
6. Each participant receives a clear personal summary of their results, including what they need to reach the next level.
7. The docente sees at a glance who has evaluated, who was absent, and how the group did as a whole.

### Non-goals
- Accounts for anyone other than evaluators, self-registration, or SSO. Evaluator accounts exist only for the roster in config; the docente and the admin keep shared codes.
- Storing phone numbers. Emails (evaluators' and participants') are stored **only in the DB**: never in config, git, logs or Jev requests (§13 Privacy).
- Activating competencias other than Adaptabilidad.
- Offline rating. Jev and submission both need network.
- Dark mode, native apps, multi-language UI.
- An admin UI for editing indicators. Indicators are edited in config files.

## 4. MVP scope

**In:** access gate (§5.1) · competencia picker (Adaptabilidad enabled, 4 disabled) · evaluator selection · participant list with status · rating screen with 4 indicators × 4 levels plus observations · Jev suggestion per indicator · local drafts with "Borrar todo" · submission to Postgres (upsert) · docente report area (general + per participant) · CSV export · print view · PWA install.

**Added in v1.2:** "Volver" button · evaluator accounts with email verification and passwords · attendance · gap to the next level · evaluator progress · simpler charts · group summary (one jornada or both) · personal results by email.

**Out:** everything in §3 Non-goals.

## 5. User flows

### 5.1 Access
1. The user opens the app. If there is no valid session cookie, they are redirected to `/acceso`.
2. **Evaluadores** sign in with their email and password (§5.12). Their account sets the role `evaluador`, their `jornada` (the jornada of their team in Appendix B) and their `integranteId`. The server sets a signed httpOnly cookie with `{ rol, sid, jornada, integranteId }`.
3. The secondary link *"Ingresar con código de docente o administración"* shows a single code field:
   - The **docente code** (`CODIGO_DOCENTE`) gives role `docente`, starting in the morning jornada. That role can do everything an evaluator can (choosing which team member it rates as, §5.3), plus view reports and send results, and can switch jornada (§5.11).
   - The **admin code** (`CODIGO_ADMIN`) gives role `admin`, which lands on `/admin` and can open nothing else (other pages redirect there; other APIs answer 403).
4. Code form: after 5 failed attempts in a row, the client adds a 30 s delay. The server also enforces a small artificial delay on every failure. The email login has its own limits (§5.12).
5. The class codes of v1.1 (`CODIGO_ACCESO`, `CODIGO_ACCESO_NOCHE`) are **retired**. They keep working only until the email login ships (PROMPTS.md Prompt 14), which removes them. A session signed for an evaluador without `integranteId` then counts as expired.

### 5.2 Choose competencia (Inicio)
- Hero: app name, tagline, "Comenzar".
- A list of the 5 competencias. Only *Adaptabilidad* is selectable. The others show the badge "Próximamente", are not focusable as links, and have `aria-disabled="true"`.
- For an evaluador, only **their own team's** competencia is selectable, if it is enabled. Another enabled competencia renders disabled the same way, with the badge "No asignada". If their own competencia isn't enabled yet, a notice under the list reads *"La competencia de su equipo aún no está disponible."*

### 5.3 Identify evaluator
- **Evaluadores** don't choose: their identity comes from the account (§5.12), and `/[competencia]/evaluador` redirects them to the participant list. The nav shows their name.
- **Docente** (rating as a team member, e.g. to test or to help): "¿Quién está evaluando?" followed by the members of the jornada's team for that competencia, grouped by course (for Adaptabilidad: Equipo 4 in the morning, Equipo 1 at night).
- The docente's selection is stored in the local draft. Changing it later requires confirmation, because drafts are kept separately per evaluator.

### 5.4 Participant list
- Lists all participants (codes) with a status chip:
  - **Pendiente**: nothing rated.
  - **En progreso**: 1–3 indicators rated.
  - **Completado**: all 4 rated, not sent.
  - **Enviado**: on the server, and the local draft matches.
  - **Ausente**: this evaluator marked the participant absent (§5.13). It overrides the other statuses.
- A progress summary ("12 de 20 enviadas") and a "Borrar todo" button. Participants this evaluator marked absent leave the total and are counted apart: "12 de 18 enviadas · 2 ausentes".
- Sent statuses and absent marks come from `GET /api/evaluaciones?competencia&evaluador`, merged with the local drafts.

### 5.5 Rate a participant
- A collapsible header with the competencia definition and its source.
- Under the header, the secondary control "Marcar ausente" (§5.13).
- The **Nota técnica**, always visible in small text: *"Recuerde enfocarse en la evaluación exclusiva de los indicadores y niveles asociados a la competencia. Lo que no está escrito en esta plantilla no se considera por ninguna circunstancia en la evaluación."*
- One section per indicator:
  - Title ("Indicador 1. Actúa de manera rápida y flexible.").
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
- From the Reporte general: **Resumen del grupo** (§11.3) and **"Enviar resultados por correo"** (§5.14).
- "Descargar CSV" and "Imprimir o guardar PDF" are available in both views. Printing is also available in the group summary.

### 5.10 Participants (admin only)
- Each jornada has its own list. `/admin` shows the jornada switch (§5.11) and edits the selected jornada's list. Both jornadas number their participants from P01, and the two lists are independent.
- `/admin`: "Cantidad de participantes" (1–99), then one row per participant ("Participante 01", "Participante 02"…) with a name field and an optional "Correo electrónico" field (§5.14). "Pegar lista" fills the rows from one-per-line text and sets the count to the number of lines; each line is a name alone, or `Nombre<TAB>correo`, or `Nombre;correo`.
- Name field: no emails or phone numbers (anything with "@" or 7+ digits is rejected), at most 80 characters. A blank name shows as "Participante NN".
- Email field: optional; a valid address, trimmed and lowercased, at most 254 characters. Used only to send results (§5.14); never shown in the reports or the CSV.
- `/admin` also has the **"Cuentas de evaluadores"** section (§5.12), for the selected jornada.
- **"Guardar cambios"** saves; success shows the toast *"Cambios guardados"*. Evaluators and reports see the new list on their next page load.
- Lowering the count **hides** the participants above it; nothing is deleted. If any of them already have evaluations, a confirmation says how many: *"Se ocultarán N participantes con M evaluaciones enviadas. Las evaluaciones no se eliminan y vuelven a aparecer si aumenta la cantidad de nuevo."* Hidden participants leave the lists, the rating routes (404) and the reports, and can't receive new evaluations; their stored evaluations and names come back if the count is raised again. The CSV keeps all rows.
- Until the admin saves a jornada's list for the first time, that jornada shows `CANTIDAD_PARTICIPANTES` (default 20) unnamed participants.
- If the jornada was switched in another tab after the editor loaded, saving is refused with *"La jornada cambió en otra pestaña. Recargue la página."*, so one cohort's list never overwrites the other's.

### 5.11 Jornadas (mañana / noche)
- The session carries a `jornada`. Every list, rating, submission and report is scoped to it, and the server always takes it from the session, never from the request.
  - **The one exception** is the docente-only group summary (§11.3): it reads a validated `?jornada=manana|noche|ambas` parameter. It is read-only, never writes, and never changes the session.
- **Evaluador**: the jornada is fixed by the account (the jornada of their team). Inicio shows *"Jornada: Noche"* (or *Mañana*) under the tagline, so students can confirm they're in the right group. A competencia is selectable in a jornada only if it is enabled and that jornada's team for it has members. Otherwise it shows "Próximamente".
- **Team numbers differ per jornada** (Appendix B): the Adaptabilidad team is Equipo 4 in the morning and Equipo 1 at night. Anything that shows a team number reads it from that jornada's team; nothing looks a team up by number.
- **Docente** and **admin**: `/reportes` and `/admin` show a "Jornada" switch with *Mañana* and *Noche* (a radio group; the selected option is outlined, not filled). Switching re-signs the session cookie through `POST /api/jornada` and reloads the view. Report headers name the jornada ("Adaptabilidad · Jornada: Noche").
- Local drafts keep their keys (§9.3): evaluator ids are unique across jornadas. A stored evaluator who isn't in the current jornada's team counts as no selection.

### 5.12 Evaluator accounts and email login
**Roster and accounts**
- Every team member in config (Appendix B) has one row in the `cuentas` table (§9.2), keyed by their integrante id. Its email is set by an import script from a gitignored file, or by the admin. A member without an email can't sign in yet ("Sin correo").
- The account decides who the evaluator is and their jornada. The client never sends an evaluator id that the server trusts: for an evaluador, any evaluation or attendance write whose evaluador isn't the session's `integranteId` gets `403`.

**`/acceso` flow** (one primary button per step)
1. *"Ingrese con su correo electrónico"*: field "Correo electrónico" + **"Continuar"**.
2. If the account is **activated**: field "Contraseña" + **"Entrar"** + the link "¿Olvidó su contraseña?".
3. If it is **not activated yet**: a 6-digit code is emailed, and the screen says *"Le enviamos un código de 6 dígitos a {correo}. Revise también la carpeta de correo no deseado."* Fields: "Código de verificación", "Cree su contraseña", "Confirme su contraseña" + **"Crear contraseña y entrar"**. "Reenviar código" becomes available after 60 s.
4. "¿Olvidó su contraseña?" sends a code the same way; entering it lets the evaluator set a new password.
5. An email that isn't in the roster gets exactly the same "code sent" screen, but no email is sent, so nobody can probe which addresses exist.
6. On success the session cookie is set (§5.1) and the evaluator lands on Inicio.

The code is what stops someone who knows a classmate's email from claiming that account first: only the owner of the mailbox can read it.

**Rules**
- Codes: 6 digits from a CSPRNG, stored only as an HMAC hash, valid for 10 minutes, at most 5 attempts each, single use, and at most 5 codes per email per hour. A new code invalidates the previous one.
- Passwords: at least 8 characters, hashed with `scrypt` and a per-account salt, never logged or returned.
- 5 wrong passwords in a row lock the account for 15 minutes (*"Demasiados intentos. Intente de nuevo en 15 minutos."*). Every failure adds a ~400 ms server delay. A wrong email or password always reads *"Correo o contraseña incorrectos."*
- Each successful sign-in updates the account's last access.

**Admin: "Cuentas de evaluadores"** (`/admin`, selected jornada)
- Members grouped by that jornada's teams in their own number order, each group titled "Equipo {numero} · {competencia}" (at night "Equipo 1 · Adaptabilidad"; in the morning "Equipo 4 · Adaptabilidad").
- Per member: name, curso, email (editable), status chip **Sin correo** / **Pendiente de activar** / **Activa**, last access.
- "Restablecer acceso" (with confirmation) clears the password; the student activates again with a new code. Changing an email also returns the account to "Pendiente de activar".

### 5.13 Attendance
- On the rating screen, the secondary control **"Marcar ausente"** opens a confirmation: *"¿Marcar a {nombre} como ausente? No podrá enviar su evaluación mientras esté marcada así."*
- While absent: the notice *"Marcó a esta persona como ausente."* with **"Marcar presente"** replaces "Enviar evaluación" in the bottom bar. The level pickers stay visible and the local draft is kept.
- Marks are **per evaluator** and saved to the server immediately (`asistencia`, §9.2). Without network: the toast *"No se pudo guardar la asistencia. Intente de nuevo."*; nothing is stored offline.
- Marking absent is refused if that evaluator already sent the evaluation: *"Ya envió una evaluación para esta persona."*
- In the list, the chip "Ausente" and the summary in §5.4.
- In the reports (§11), a participant is **Ausente** when at least one evaluator marked them absent and they have no evaluations. Absent marks plus evaluations show as **"Asistencia en conflicto"** with the counts. Absent evaluator × participant pairs leave the coverage denominator (§7).

### 5.14 Personal results by email
- At the end of the activity the docente opens **"Enviar resultados por correo"** from the Reporte general (`/reportes/[competencia]/enviar`), for the session's jornada.
- The page lists:
  - **Recipients**: participants with an email and at least 1 evaluation.
  - **Skipped**, each with its reason: *Sin correo* · *Sin evaluaciones* · *Ausente*.
  - Already sent: "Enviado el {fecha}". They are excluded unless the docente ticks "Reenviar" for them.
- A rendered **preview** of the exact email for any selected participant, and **"Enviarme una prueba"** to an address the docente types (not stored).
- **"Enviar a {n} participantes"** (the primary button) opens a confirmation dialog, then sends one email per participant. The server recomputes every result; the client never sends scores.
- **Email content** (Spanish, "usted"), subject *"Sus resultados de {competencia} · Nivela"*:
  - Greeting by name; competencia and jornada.
  - Nivel general (large) and puntaje general; evaluations received.
  - Per indicator: mean, level, the gap ("Le faltan {x} puntos para {nivel}" or "Nivel máximo alcanzado", §7) and the description of the next level's behavior.
  - A closing line: the results are the average of the peer evaluations.
  - **Never included**: evaluator names, individual ratings, AI metadata, other participants. Peer observations are **excluded** (open question, §16).
- Every send is recorded in `envios_resultados` (status `enviado` or `error`, timestamp; never the address or the body). The Reporte general table shows a "Correo" column: Enviado / Error / Pendiente.
- Delivery: §13 Email.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Access gate: email + password for evaluadores (§5.12); codes for docente and admin. Signed httpOnly session cookie, 12 h expiry. | P0 |
| FR-2 | Competencia picker driven by config. `habilitada: false` renders disabled; an evaluador can open only their own team's competencia. | P0 |
| FR-3 | Evaluator identity from the account for evaluadores; the docente picks among the members of the jornada's team for the competencia. | P0 |
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
| FR-18 | "Volver" button to the logical parent screen (§12 Nav). | P0 |
| FR-19 | Evaluator accounts: email verification code, password creation, sign-in, password recovery, lockout and code limits (§5.12). | P0 |
| FR-20 | Admin "Cuentas de evaluadores": edit email, reset access, see status and last access (§5.12). Email import script from a gitignored file. | P0 |
| FR-21 | Attendance marks per evaluator, saved to the server; absent participants can't be sent and leave the progress totals (§5.13). | P0 |
| FR-22 | Gap to the next level, per participant and per indicator (§7, §11.1). | P0 |
| FR-23 | "Avance de evaluadores" in the Reporte general (§11.2). | P0 |
| FR-24 | Simpler charts with message titles; the detailed charts move into a collapsed section (§11). | P1 |
| FR-25 | Group summary for one jornada or both (§11.3). | P1 |
| FR-26 | Personal results by email with preview, test send, confirmation and send tracking (§5.14). | P0 |
| FR-27 | Email delivery through Resend, with a "consola" transport for development and tests (§13 Email). | P0 |

## 7. Scoring rules

Level values: Básico = 1, Intermedio = 2, Avanzado = 3, Experto = 4.

| Metric | Definition |
|---|---|
| Puntaje de una evaluación | Mean of its 4 indicator levels (1.00–4.00). |
| Puntaje por indicador (participante) | Mean of that indicator's level across all evaluators who rated the participant. |
| Puntaje general (participante) | Mean of the 4 indicator means. |
| Nivel general | Mapped from a score: `< 1.5` Básico · `< 2.5` Intermedio · `< 3.5` Avanzado · `≥ 3.5` Experto. |
| Acuerdo (participante, indicador) | Range (min–max) and standard deviation across evaluators, shown as "Alta / Media / Baja" coincidencia: SD ≤ 0.5 / ≤ 1.0 / > 1.0. |
| Cobertura | Evaluations received ÷ expected evaluations. Expected = (number of evaluators × number of active participants) − the evaluator × participant pairs marked absent (§5.13). |
| Brecha al siguiente nivel | For a score `s` (a puntaje general, an indicator mean or the group mean) rounded to 2 decimals: the next threshold is the first of 1.5 / 2.5 / 3.5 above `s`, and *faltante* = threshold − `s`, to 2 decimals. Uses the same rounding as Nivel general, so the shown score and the gap always agree: 2,49 → "Le faltan 0,01 puntos para Avanzado"; 2,50 → Avanzado, "Le faltan 1,00 puntos para Experto"; ≥ 3,50 → "Nivel máximo alcanzado". |
| Puntaje del grupo | Mean of the puntajes generales of the participants with at least 1 evaluation. Its nivel and brecha use the same rules. |
| Avance de un evaluador | Expected = active participants − those this evaluator marked absent. Status: **Sin iniciar** (0 sent) · **En progreso** · **Completo** (sent = expected). |

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
    "indicador": "Actúa de manera rápida y flexible.",
    "observacion": "<texto escrito por el evaluador>"
  },
  "questions": {
    "nivel": {
      "type": "score",
      "instructions": "Nivel de conducta que mejor describe la observación para este indicador",
      "criteria": [
        "Básico: Reconoce los cambios, pero tarda en reaccionar y necesita instrucciones.",
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
- `jornadas.ts`: the 2 jornadas (`manana` "Mañana", `noche` "Noche"). Ids are stored in the DB.
- `equipos.ts`: 5 teams per jornada: `id`, `numero`, `jornada`, `competenciaId`, `integrantes[]` with `{ id, nombre, curso }`. Names only (Appendix B): emails live in the DB (`cuentas`), never here. Integrante ids are unique across jornadas.
  - **A team is identified by jornada + competencia.** Its `numero` is a per-jornada display label (Adaptabilidad is Equipo 4 in the morning and Equipo 1 at night) and its size varies (8 and 7). Code looks teams up with `equipoDeCompetencia(jornada, competenciaId)`; never look a team up by number or hard-code a number or size.
- `participantes.ts`: the id and label scheme for evaluados (`{ id: "P01", numero: 1, nombre, etiqueta }`, where `etiqueta` is the name or "Participante 01") and the fallback list of `CANTIDAD_PARTICIPANTES` (default 20) unnamed participants. The real list lives in the `participantes` table (§9.2), set by the admin (§5.10). Ids `P01…P99` are stable: drafts, URLs and evaluations refer to them.
- A config validation test fails the build if ids are duplicated (integrantes across all jornadas), an indicator doesn't have exactly 4 levels, an enabled competencia has no team in any jornada, a competencia or a team number repeats within a jornada, or the teams don't match Appendix B.

### 9.2 Database (Neon Postgres via the Vercel Marketplace, Drizzle ORM)

```text
evaluaciones
  id               uuid pk default gen_random_uuid()
  jornada          text not null check (jornada in ('manana','noche'))
  competencia_id   text not null
  evaluador_id     text not null
  participante_id  text not null
  puntaje          numeric(3,2) not null         -- mean of 4 levels
  created_at       timestamptz not null default now()
  updated_at       timestamptz not null default now()
  unique (jornada, competencia_id, evaluador_id, participante_id)

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

participantes
  jornada     text not null check (jornada in ('manana','noche'))
  id          text not null                       -- "P01".."P99" within the jornada
  numero      smallint not null check (numero between 1 and 99)
  nombre      text null                           -- max 80; null → "Participante NN"
  correo      text null                           -- v1.2; max 254, lowercased; only for §5.14
  activo      boolean not null default true       -- false = hidden (§5.10); rows are never deleted
  updated_at  timestamptz not null default now()
  primary key (jornada, id)
  unique (jornada, numero)

cuentas                                           -- v1.2, §5.12: one row per integrante in config
  integrante_id      text pk                      -- config integrante id (implies the jornada)
  correo             text null unique             -- lowercased, max 254; null → "Sin correo"
  contrasena_hash    text null                    -- scrypt with per-account salt; null → not activated
  activada_en        timestamptz null
  ultimo_acceso      timestamptz null
  intentos_fallidos  smallint not null default 0
  bloqueada_hasta    timestamptz null
  updated_at         timestamptz not null default now()

codigos_verificacion                              -- v1.2, §5.12
  id             uuid pk default gen_random_uuid()
  integrante_id  text not null references cuentas(integrante_id) on delete cascade
  proposito      text not null check (proposito in ('activar','recuperar'))
  codigo_hash    text not null                    -- HMAC-SHA256 with SESSION_SECRET; never the code
  expira_en      timestamptz not null             -- created_at + 10 min
  intentos       smallint not null default 0      -- max 5
  usado_en       timestamptz null
  created_at     timestamptz not null default now()

asistencia                                        -- v1.2, §5.13
  jornada          text not null check (jornada in ('manana','noche'))
  competencia_id   text not null
  evaluador_id     text not null
  participante_id  text not null
  ausente          boolean not null
  updated_at       timestamptz not null default now()
  primary key (jornada, competencia_id, evaluador_id, participante_id)

envios_resultados                                 -- v1.2, §5.14
  id               uuid pk default gen_random_uuid()
  jornada          text not null check (jornada in ('manana','noche'))
  competencia_id   text not null
  participante_id  text not null
  estado           text not null check (estado in ('enviado','error'))
  motivo           text null                      -- error category only; never the address or body
  enviado_en       timestamptz not null default now()
  index (jornada, competencia_id, participante_id)
```

IDs reference the static config, or the `participantes` table for evaluados (matched by jornada and id). Migration `0002_jornadas` backfilled every row that existed before v1.1 as `manana`. v1.2 adds `0003_cuentas` (cuentas, codigos_verificacion), `0004_asistencia` and `0005_resultados_correo` (participantes.correo, envios_resultados). The only names in the DB are the participants' (set by the admin); evaluator names stay in config. The only emails are in `cuentas.correo` and `participantes.correo`. Team ids and team numbers are never stored: rows refer to the competencia and the integrante. The upsert runs in a single transaction: it upserts `evaluaciones`, deletes and reinserts that evaluation's `calificaciones`, and recomputes `puntaje`.

### 9.3 Local draft (`localStorage`)
Key: `nivela:v1:<competenciaId>:<evaluadorId>`, plus `nivela:v1:evaluador:<competenciaId>`. For an evaluador, `<evaluadorId>` is the session's `integranteId`; the `evaluador:<competenciaId>` key is only used by the docente's picker (§5.3). Attendance is not stored in the draft (§5.13).

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
| POST | `/api/acceso` | — | Verify a docente or admin code, set the session cookie, return `{ rol }`. |
| POST | `/api/acceso/correo` | — | `{ correo }` → `{ paso: "contrasena" \| "codigo" }`. Sends an activation code when the account isn't activated. An unknown email gets `"codigo"` and nothing is sent (§5.12). |
| POST | `/api/acceso/activar` | — | `{ correo, codigo, contrasena }`: checks the code, sets the password, signs the session. Also completes password recovery. |
| POST | `/api/acceso/contrasena` | — | `{ correo, contrasena }`: signs the session, or the §5.12 errors (wrong credentials, locked). |
| POST | `/api/acceso/recuperar` | — | `{ correo }`: sends a recovery code; same response for unknown emails. |
| POST | `/api/salir` | any | Clear the cookie. |
| POST | `/api/jornada` | docente, admin | Switch jornada: `{ jornada }`, re-signs the cookie (§5.11). `403` for evaluador. |
| POST | `/api/jev` | evaluador, docente | Jev proxy (§8.3). |
| GET | `/api/evaluaciones?competencia=&evaluador=` | evaluador, docente | Participant ids already sent by this evaluator in the session's jornada, with `updated_at`, plus the ids this evaluator marked absent. For an evaluador, `evaluador` must be the session's `integranteId` (`403`). |
| POST | `/api/evaluaciones` | evaluador, docente | Upsert one evaluation. |
| PUT | `/api/asistencia` | evaluador, docente | `{ competenciaId, evaluadorId, participanteId, ausente }` (§5.13). For an evaluador, `evaluadorId` must be the session's `integranteId` (`403`). `409` if marking absent after sending. |
| GET | `/api/reportes/[competencia]` | docente | Aggregated report JSON (general + per participant, gaps, evaluator progress, attendance). |
| GET | `/api/reportes/[competencia]/csv` | docente | CSV download (UTF-8 with BOM so Excel opens accents correctly). |
| GET | `/api/reportes/[competencia]/grupo?jornada=` | docente | Group summary (§11.3). `jornada` is `manana`, `noche` or `ambas`; invalid or missing → the session's. Read-only. |
| POST | `/api/reportes/[competencia]/enviar` | docente | `{ participantes: string[], reenviar?: boolean }` (§5.14): recomputes results on the server, sends one email per participant, records each in `envios_resultados`, returns `{ enviados, errores: [{ participanteId, motivo }] }`. |
| PUT | `/api/admin/participantes` | admin | Save `{ jornada, cantidad, nombres[], correos[], confirmar? }` for the session's jornada (§5.10). `409 { error, ocultos, evaluacionesAfectadas }` when hiding participants with evaluations without `confirmar`. `409 { error, jornadaDistinta: true }` when `jornada` isn't the session's. |
| GET, PUT | `/api/admin/cuentas` | admin | List the session jornada's accounts; `PUT { integranteId, correo }` edits an email, `PUT { integranteId, restablecer: true }` resets access (§5.12). |
| GET | `/api/dev/correos?para=` | — (dev only) | The latest message of the "consola" email transport, for e2e tests. `404` in production. |

Every route except `/api/acceso*` and `/api/jev` is scoped to the session's jornada. Reports and the CSV cover only that jornada; the group summary is the single read-only exception (§5.11).

`POST /api/evaluaciones` validation (zod plus config checks):
- The competencia exists and is `habilitada`.
- The evaluador belongs to the session jornada's team for that competencia, and for an evaluador it is the session's `integranteId` (`403` otherwise).
- The participante exists and is active in that jornada (§5.10), and this evaluator hasn't marked them absent (§5.13).
- It has exactly that competencia's indicator ids, each with a level from 1 to 4.
- Each observation is ≤ 1,000 chars, and `ia_*` fields are well-formed if present.

Errors use the same shape as §8.3, in Spanish.

CSV columns: `jornada, competencia, evaluador, curso_evaluador, participante, nombre_participante, indicador, nivel, nivel_nombre, origen, ia_nivel_sugerido, ia_confianza, observacion, actualizado`. `nombre_participante` is empty for a participant without a name. The CSV never includes emails or attendance. The file is named `nivela-{competencia}-{jornada}-{aaaa-mm-dd}.csv`.

## 11. Reports and charts (Recharts)

Chart palette: a monochrome blue ramp consistent with DESIGN.md. Básico `#d6d6d6`, Intermedio `#aad0f6`, Avanzado `#509be7`, Experto `#0066cc`. Grid lines `#d6d6d6`, labels `#707070`. Colors are never the only carrier of meaning; labels and values are always shown.

Both reports cover the session's jornada (§5.11) and name it in their header.

**Simpler charts (v1.2).** The default view of every report follows these rules:
- One message per chart. Its title is a plain sentence computed from the data, e.g. *"La mayoría de los participantes está en nivel Avanzado (12 de 20)"* or *"El indicador más alto es «Actúa de manera rápida» (3,25)"*. Ties and empty data get neutral sentences.
- Horizontal bars only, with every value labelled at the bar end. The level thresholds 1,5 / 2,5 / 3,5 are dashed reference lines, labelled with the level they open.
- Only the 4 level colors; no legend is needed to read a chart; each chart keeps its visually hidden table equivalent.
- The v1.1 charts (radar, stacked distributions, 100 % bars) move into a collapsed **"Ver gráficos detallados"** section at the end of each report, loaded only when opened. Nothing is removed.

### 11.1 Reporte individual (per participant)
- Header: participant code, **Nivel general** (large), puntaje general, number of evaluations received, and under the level the gap (§7): *"Le faltan {x} puntos para {nivel}"* or *"Nivel máximo alcanzado"*.
- **Puntaje por indicador**: horizontal bars on a fixed 1–4 axis, labelled "3,25 · Avanzado", with the threshold reference lines.
- Per indicator, one plain line instead of a stacked bar: *"{n} de {total} evaluadores eligieron {nivel}"* (the most chosen level; ties listed).
- Per indicator, the gap and the next level's description from config: *"Para llegar a {nivel}: {descripción}"*.
- **Coincidencia** chip per indicator (§7).
- **Observaciones**, grouped by indicator, each with the evaluator's name and level. Visible to the docente only.
- Share of levels that came from an applied AI suggestion.
- Attendance: "Ausente" or "Asistencia en conflicto" when it applies (§5.13).
- **Ver gráficos detallados**: the radar chart (4 axes, scale 1–4) and the stacked bar per indicator (how many evaluators chose each level).

### 11.2 Reporte general
- Header actions: **"Resumen del grupo"** (§11.3) and **"Enviar resultados por correo"** (§5.14), both secondary; "Descargar CSV" and "Imprimir o guardar PDF".
- KPI tiles: participantes evaluados · evaluaciones recibidas / esperadas (cobertura %) · puntaje general promedio · % de niveles asistidos por IA · **Ausentes** · **Evaluadores completos**.
- **Avance de evaluadores** (after the KPI tiles), titled with that jornada's team, e.g. "Avance de evaluadores · Equipo 1" at night, "· Equipo 4" in the morning:
  - Summary *"{n} de {total} evaluadores completaron"*.
  - Per member of the jornada's team for the competencia: name, curso, account status (Sin correo / Pendiente de activar / Activa), last access (dd/mm/aaaa hh:mm), sent *"{x} de {y}"*, absents marked, and a chip **Sin iniciar** / **En progreso** / **Completo** (§7). Incomplete ones first.
  - Caption: *"Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador."*
  - At 375 px each evaluator is a stacked card instead of a table row.
- **Los 5 puntajes más altos**: the top 5 places by puntaje general, each showing its puntaje, nivel general, evaluations received and the 4 indicator means, and linking to the individual report. Scores that are equal at 2 decimals share a position (1, 2, 2, 4…), and everyone tied at 5th place is shown.
- **Participantes por nivel**: 4 horizontal bars (Básico → Experto) counting participants by nivel general, labelled with count and percent.
- **Puntaje por participante**: horizontal bars sorted descending, colored by nivel general, with the threshold reference lines.
- **Tabla de participantes**: code, the 4 indicator means, puntaje general, nivel general, **"Para el siguiente nivel"** (the gap), number of evaluations, **Asistencia**, and **Correo** (Enviado / Error / Pendiente, §5.14). Sortable, and each row links to the individual report.
- **Cobertura**: an evaluador × participante grid (sent / not sent / **Ausente**) so the docente sees who is missing.
- **Ver gráficos detallados**: "Distribución de niveles por indicador" (100 % stacked bars, one per indicator, across all ratings).
- Empty state: *"Aún no hay evaluaciones enviadas para esta competencia."*

### 11.3 Resumen del grupo
`/reportes/[competencia]/grupo`, docente only. A plain overview of how the group did as a whole.
- A "Jornada" selector with **Mañana** / **Noche** / **Ambas jornadas** (radio group styled like the jornada switch), driving `?jornada=`. The default is the session's jornada. This is the §5.11 exception: read-only, never changes the session.
- Hero "Resumen del grupo" with *"{competencia} · Jornada: {nombre}"* (or *"Ambas jornadas"*).
- KPI tiles: puntaje del grupo and its nivel, the group's gap to the next level (§7), participantes evaluados, ausentes, cobertura, evaluadores completos.
- A one-paragraph summary generated from the data, e.g. *"El grupo alcanzó un nivel Avanzado (2,84). Le faltan 0,66 puntos para Experto. El indicador más fuerte es … y el que más necesita refuerzo es …"*.
- **Participantes por nivel** and **Puntaje promedio por indicador**, using the simple charts above.
- With **Ambas jornadas**, a Mañana vs Noche comparison table (each KPI and indicator mean in two columns). Jornadas are compared **by competencia, never by team number**: for Adaptabilidad it compares morning Equipo 4 with night Equipo 1, and each column header names its own team from config ("Mañana · Equipo 4", "Noche · Equipo 1"). Evaluator counts come from each jornada's own team size. Participants are keyed by jornada + id (P01 exists in both).
- Same empty state as §11.2; "Volver" goes to the Reporte general; printable.

Reports are rendered from one server aggregation (`src/lib/reportes.ts`) that is unit-tested against fixtures.

## 12. UI and design system (from DESIGN.md)

Use DESIGN.md as the visual source of truth, with these adaptations:
- **Brand**: the original name "Nivela" with a simple custom wordmark or glyph. **No Apple logo, product names, imagery or SF Pro font files.** Use the system font stack (it renders as SF Pro on Apple devices).
- **Tokens**: copy the DESIGN.md color, type, spacing and radius tokens into Tailwind v4 `@theme` (see CLAUDE.md).
- **Canvas** `#f5f5f7`. Sections are separated by background tints (`#ffffff` / `#f5f5f7` / an `#aad0f6` wash on the Inicio hero). No borders between sections and **no shadows anywhere**.
- **Nav**: 44 px tall, white with `backdrop-filter: saturate(1.8) blur(20px)` (plus the `-webkit-` prefix). Wordmark on the left; on the right, the evaluator's name or "Reportes", and "Salir".
  - **"Volver" (v1.2)**: at the far left, before the wordmark: a chevron icon plus the word "Volver", in link color `#0066cc` (not a filled button), with a 44 × 44 px minimum tap target and a visible focus ring. Its `aria-label` names the destination ("Volver a Participantes").
  - It goes to the **logical parent screen**, never `history.back()`: an installed PWA has no browser back button, and the history can point outside the app. Parents:

    | Screen | "Volver" goes to |
    |---|---|
    | Rating (`/[c]/[p]`) | Participant list (`/[c]`) |
    | Participant list (`/[c]`) | Inicio |
    | Evaluator page (`/[c]/evaluador`) | Inicio |
    | Reporte individual (`/reportes/[c]/[p]`) | Reporte general (`/reportes/[c]`) |
    | Resumen del grupo (`/reportes/[c]/grupo`) | Reporte general |
    | Envío de resultados (`/reportes/[c]/enviar`) | Reporte general |
    | Reporte general (`/reportes/[c]`) | `/reportes` |
    | `/reportes` | Inicio |

  - Not shown on Inicio, `/acceso` or `/admin`, nor in print. At 360 px, if space runs out, the word "Volver" is hidden visually (kept for screen readers) before the wordmark is truncated. Leaving the rating screen through it flushes the pending draft write.
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
- Session cookie: httpOnly, Secure, SameSite=Lax, HMAC-signed, 12 h. It carries `{ rol, sid, jornada }`, plus `integranteId` for evaluadores only.
- Codes are compared in constant time.
- Passwords hashed with `scrypt` and a per-account salt; verification codes stored only as HMAC hashes, single use, short-lived; lockout and per-email limits (§5.12).
- Sign-in responses don't reveal whether an email is in the roster.
- zod validation on every route.
- No PII in logs: never emails, passwords, codes, names or observation text.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`.

**Privacy**:
- Evaluator names live only in config.
- Participant names are entered by the admin and stored in the `participantes` table.
- **Emails** (v1.2): evaluators' emails live only in `cuentas`, participants' only in `participantes.correo`. They are never in config, never committed to git, never sent to Jev, never logged, and never shown in reports or the CSV. The file used to import evaluator emails stays in a gitignored folder (`privado/`), with the roster screenshots.
- **Phone numbers are never stored.**
- Results emails contain only that participant's own results, never evaluator names or individual ratings (§5.14).
- Otherwise the DB stores ids, levels, observations, attendance, AI metadata and send status.

**Email** (v1.2):
- Provider: **Resend**, on the owner's existing Resend team (free plan: about 100 emails a day, 3,000 a month). The Vercel Marketplace install was not used because a second Resend team there requires a paid plan. `RESEND_API_KEY` is a "Sending access" key (it can only send), set by hand in the Vercel project for Production, Preview and Development.
- Sending domain: **`correo.nivela.snhware.lat`** (region `us-east-1`), a subdomain of the site, so its reputation and DNS records stay apart from the website. Sender `CORREO_REMITENTE` = `Nivela <no-responder@correo.nivela.snhware.lat>`. The domain needs verified SPF and DKIM (plus the bounce MX) and a DMARC record; until it shows "Verified" in Resend, Resend only delivers to the account owner, so codes would never reach students.
- Sent only server-side from a `server-only` module (`src/lib/correo.ts`) with `fetch` to `POST https://api.resend.com/emails`, a 10 s timeout and an optional `Idempotency-Key`; Resend never needs a CSP entry.
- Errors are typed: **rechazado** (4xx: bad key, unverified domain, invalid address) · **limite** (429, with `Retry-After`) · **red** (timeout or no connection) · **desconocido** (5xx, missing configuration, unexpected response).
- `CORREO_MODO`: `resend` or `consola`. Production always uses `resend` (a `consola` there would swallow every code). Elsewhere the default is `consola`, which keeps the last 20 messages in memory and shows them at the dev-only `/dev/correos`; e2e tests read them from `GET /api/dev/correos?para=`.
- `npm run correo:prueba -- --para <correo>` sends one test code email through Resend, to check delivery and the spam folder at `@est.utn.ac.cr` and Gmail.
- Logs record only the template name, status and latency.

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
| M8 | v1.2 spec, night roster and per-jornada team numbering; "Volver" button. (PROMPTS.md 11–12) |
| M9 | Email infrastructure; evaluator accounts and email login; admin account list. (PROMPTS.md 13–14) |
| M10 | Attendance; gap to the next level and evaluator progress; simpler charts; group summary. (PROMPTS.md 15–18) |
| M11 | Personal results by email; v1.2 QA, privacy audit and deploy. (PROMPTS.md 19–20) |

## 15. Acceptance criteria (demo)

1. On an iPhone (Safari) and an Android phone (Chrome and Firefox), an evaluator can do the whole flow without zooming or horizontal scrolling: sign in with their email and password → pick Adaptabilidad → rate a participant on 4 indicators → send. This works for a morning Equipo 4 member and a night Equipo 1 member alike, each seeing only their jornada's participants.
2. The other 4 competencias are visible but cannot be opened.
3. Refreshing mid-rating loses nothing. "Borrar todo" clears local drafts and does not delete sent evaluations.
4. "Enviar evaluación" is disabled until all 4 indicators have a level.
5. Analyzing a Spanish description returns a suggested level with a percentage. Nothing is applied until the evaluator taps "Aplicar sugerencia". Low-confidence and off-topic states render as specified. A Jev outage never blocks manual rating.
6. Network inspection shows no API key and no names in client requests to `/api/jev`.
7. With the docente code, the general and individual reports render correctly with seeded data for each jornada's team × N participants (the team size comes from config: 8 in the morning, 7 at night for Adaptabilidad). The CSV opens in Excel with correct accents.
8. All UI text is in Spanish and uses "usted".
9. `npm run lint`, `npm run typecheck`, `npm test` and the Playwright suite (WebKit, Chromium, Firefox mobile profiles) pass.
10. "Volver" reaches the logical parent from every screen in §12, including inside the installed PWA.
11. First visit: an evaluator enters their email, receives a 6-digit code, creates a password and is signed in; afterwards they sign in with email + password. "¿Olvidó su contraseña?" works. An email outside the roster shows the same screen and sends nothing. 5 wrong passwords lock the account for 15 minutes.
12. An evaluator can't submit or mark attendance as another evaluator (`403`), and can open only their own team's competencia.
13. Marking a participant absent shows "Ausente" in the list, blocks sending, survives a reload, and is reflected in coverage and the reports.
14. Reports show the gap to the next level per participant and per indicator, and "Avance de evaluadores" shows who has and hasn't finished.
15. Each chart's title states its message; "Ver gráficos detallados" still shows the v1.1 charts.
16. The group summary works for Mañana, Noche and Ambas jornadas, comparing teams by competencia.
17. The docente previews and sends results by email; each participant receives only their own results, with no evaluator names; statuses show in the table.
18. No email address appears in git, logs, the CSV, reports or `/api/jev` payloads.

## 16. Open questions

1. ~~**Participants**: how many evaluados are there, and how are they identified?~~ Resolved: the admin sets the count and the names at `/admin` (§5.10); each participant also keeps a number ("Participante 07").
2. ~~**Indicador 4 wording**: "Propone soluciones exigentes y eficaces…".~~ Resolved by the new template (Appendix A): "Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa."
3. ~~**Indicador 1 · Avanzado**: "Adopta" vs "Adapta".~~ Resolved: that description no longer exists in the new template.
4. **Who is the docente user**: the professor, the student coordinator, or both? This affects who gets `CODIGO_DOCENTE`.
5. **Activity date**: needed so the golden-set validation and device QA are scheduled before it.
6. ~~**Night roster**: the names and courses of the 5 night teams.~~ Resolved in v1.2 (Appendix B). The night numbering differs from the morning one: Adaptabilidad is Equipo 1 at night.
7. **Email sending domain**: chosen, `correo.nivela.snhware.lat` (§13 Email). Pending: its DNS records must be added where `snhware.lat` is managed and show "Verified" in Resend before codes and results can reach students.
8. **Observations in results emails**: excluded by default because they were written for the docente. Confirm before enabling.
9. **Missing evaluator emails**: Melany Parrales (mañana, Orientación al detalle) and Yuleissy Vargas Corrales (noche, Orientación a resultados). Neither team's competencia is enabled yet, so this doesn't block the Adaptabilidad demo.
10. **Addresses that look mistyped** in the roster sheets, to confirm with the students: Wesnlyn García Pérez (domain "gmal.com"), Andy Molina Castro and Karyme Varela Cantillano (domain "est.ac.cr" without "utn.").
11. **Participants' emails** for §5.14: to be collected and entered by the admin.
12. **Notice to students**: tell evaluators that their email is used to sign in, and participants that their results will arrive by email.
13. **Template reviewer comment**: `plantilla.xlsx` has an open comment on Indicador 1 · Intermedio, *"Se repite el mismo verbo en el nivel 2 y 3. Debe ajustar."* The current levels 2 and 3 use different verbs ("Responde", "Afronta"), so it may be stale. Confirm with the team; if they change the wording, update Appendix A and `adaptabilidad.ts` together.
14. **Evaluator name spellings**: the template lists "Jimena Salgado Campos", "Wenslyn Gracía Pérez" and "Sebastian Chaves Cespedes"; the roster (Appendix B) has "Jimena Salgado", "Wesnlyn García Pérez" and "Sebastian Chaves". Confirm the correct spellings; display names can change in `equipos.ts` without changing the integrante ids.

---

## Appendix A — Adaptabilidad (corrected text, goes into `src/config/competencias/adaptabilidad.ts`)

Source: `plantilla.xlsx`, sheet "Plantilla sistematizada" (the Adaptabilidad team's systematized template, dated 12/10/2026). It replaces the v1.0/v1.1 rubric: the indicators were reordered and every level description was rewritten. Indicator ids are positional (`adaptabilidad-1` = Indicador 1); the change was made before any real evaluation existed.

**Definición:** La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.
**Fuente:** Govern de les Illes Balears, s. f.

**Indicador 1. Actúa de manera rápida y flexible.**
- Básico: Reconoce los cambios, pero tarda en reaccionar y necesita instrucciones.
- Intermedio: Responde a cambios sencillos, siguiendo las indicaciones recibidas.
- Avanzado: Afronta cambios y mantiene la continuidad de sus tareas.
- Experto: Asume situaciones difíciles o inesperadas con rapidez y mantiene un buen desempeño.

**Indicador 2. Modifica su forma de actuar ante cambios.**
- Básico: Mantiene su forma habitual de trabajar ante un cambio hasta recibir instrucciones.
- Intermedio: Acepta la manera de realizar una tarea siguiendo las indicaciones recibidas.
- Avanzado: Cambia su manera de trabajar ante nuevos procedimientos y los aplica constantemente, sin supervisión.
- Experto: Adapta sus métodos de trabajo a distintos escenarios y mantiene la calidad del resultado.

**Indicador 3. Ajusta las prioridades ante las demandas del entorno.**
- Básico: Continúa con el orden de tareas establecido aunque surjan nuevas prioridades.
- Intermedio: Reordena sus tareas cuando se le indica cuáles deben atenderse primero.
- Avanzado: Realiza sus tareas según su urgencia e importancia sin requerir supervisión.
- Experto: Prioriza las tareas según su importancia y urgencia, incluso cuando surgen varias actividades al mismo tiempo.

**Indicador 4. Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa.**
- Básico: Comunica el imprevisto y solicita apoyo para resolverlo.
- Intermedio: Plantea una alternativa sencilla con orientación de otra persona.
- Avanzado: Propone por iniciativa propia soluciones viables y las pone en práctica.
- Experto: Implementa la solución más eficaz y comprueba que el imprevisto haya sido resuelto.

Corrections applied to the template text (nothing else was changed):
- Accent: "Actua" → "Actúa" (Indicador 1).
- Agreement: "Responde cambio sencillos" → "Responde **a** cambios sencillos" (Indicador 1 · Intermedio; the preposition was added); "soluciones viable" → "soluciones viables" (Indicador 4 · Avanzado).
- Capital letter: "realiza" → "Realiza" (Indicador 3 · Avanzado).
- Final period added to Indicador 1 · Básico and Indicador 1 · Intermedio; double and trailing spaces removed; the "Nivel Básico:" style prefixes dropped (the app shows the level name itself).

The template also carries a reviewer comment on Indicador 1 · Intermedio: *"Se repite el mismo verbo en el nivel 2 y 3. Debe ajustar."* (§16).

## Appendix B — Teams (names only, goes into `src/config/equipos.ts`)

**Team numbers are per jornada.** The two cohorts numbered their teams differently, so the same competencia has a different team number in each jornada:

| Competencia | Mañana | Noche |
|---|---|---|
| Pensamiento crítico y analítico | Equipo 1 | Equipo 3 |
| Autorregulación emocional | Equipo 2 | Equipo 2 |
| Orientación al detalle | Equipo 3 | Equipo 4 |
| Adaptabilidad | Equipo 4 | Equipo 1 |
| Orientación a resultados | Equipo 5 | Equipo 5 |

A team is identified by jornada + competencia; its number is only a display label (§9.1). Emails and phone numbers from the roster sheets never go here (§13 Privacy).

### Mañana

| Equipo | Competencia | Habilitada | AGRH 315 Psicología 2 | AGRH 613 Seminario |
|---|---|---|---|---|
| 1 | Pensamiento crítico y analítico | No | Mariana Alfaro Núñez, Mariela Castillo Zamora, Angelica Ramirez | Felipe López, Adriana Pérez, Dorian Campos |
| 2 | Autorregulación emocional | No | Anny Varela, Kristel Rocha, Anyeli Segura, Tiffany Peña | Nancy Herrera Rojas, María Guadalupe Núñez Arguedas, Monserrat Céspedes Hidalgo |
| 3 | Orientación al detalle | No | Melany Parrales, Valeria Mena | Fiorella Valverde Solano, Anthony Jimenez Espinoza, Genesis Herrera Norori, Yuliana Villalobos Arroyo |
| **4** | **Adaptabilidad** | **Sí** | Wesnlyn García Pérez, Stacy Zamora Rodríguez, Ramsés Salas Vargas, Sebastian Chaves | Kristel Barrantes López, Angelina Mata Arguedas, Allison Campos Morera, Jimena Salgado |
| 5 | Orientación a resultados | No | Ariana Castillo Sánchez, Zury Castro Sandoval, Derroy Navas Valverde | Anyely Espinoza Mendoza, Génesis Ruiz Martínez, Nayeli Araya Solórzano |

### Noche

Ordered by the night team numbers. A team with no members would leave its competencia as "Próximamente" at night.

| Equipo | Competencia | Habilitada | AGRH 315 Psicología 2 | AGRH 613 Seminario |
|---|---|---|---|---|
| **1** | **Adaptabilidad** | **Sí** | Gabriela Salgado, Emmanuel Reyes, Reylin Centeno | Goldine Foster Mclean, Anna Sevilla López, Ricardo Méndez Ubeda, María Celeste Vega Zamora |
| 2 | Autorregulación emocional | No | Raquel Vargas, Keilyn Solis, Delma Saldaña | Andy Molina Castro, Karyme Varela Cantillano, Nailea Matarrita Quirós, Camila Fallas Cerón |
| 3 | Pensamiento crítico y analítico | No | Cristopher Martínez Rentería, Josué Rodríguez Saborío, Yubeidi Mendez Ubeda | Emilly González Azofeifa, Valery Quesada Oviedo, Diana Hidalgo, Mariana Viquez Benavente |
| 4 | Orientación al detalle | No | Melany Aguirre, Brittany Badilla | Sofía Campos Ramirez, Kristel Ugalde, Sandra Gómez Reyes, Arlyne Aguilera Salazar |
| 5 | Orientación a resultados | No | Mariela Salas, Ximena Badilla Vargas | Yuleissy Vargas Corrales, Kevin Chavarría, Aldair Hernández Rodríguez, Tiffany Alfaro, Byron Castro Retana |

## Appendix C — Copy deck (key strings)

| Context | Text |
|---|---|
| App name / tagline | **Nivela** · "Evaluación de competencias entre pares" |
| Inicio hero | "Evalúe con criterio, indicador por indicador." · button "Comenzar" |
| Acceso (evaluadores, §5.12) | "Ingrese con su correo electrónico" · "Correo electrónico" · "Continuar" · "Contraseña" · "Entrar" · "¿Olvidó su contraseña?" · "Le enviamos un código de 6 dígitos a {correo}. Revise también la carpeta de correo no deseado." · "Código de verificación" · "Cree su contraseña" · "Confirme su contraseña" · "Crear contraseña y entrar" · "Reenviar código" · "Debe tener al menos 8 caracteres." · "Las contraseñas no coinciden." · "El código no es válido o expiró." · "Correo o contraseña incorrectos." · "Demasiados intentos. Intente de nuevo en 15 minutos." |
| Acceso (códigos) | link "Ingresar con código de docente o administración" · "Ingrese su código de docente o administración" · "Entrar" · error "El código no es válido. Verifique con su docente." |
| Navegación | "Volver" · aria-label "Volver a {destino}" |
| Competencias | badges "Disponible" / "Próximamente" / "No asignada" · "La competencia de su equipo aún no está disponible." |
| Asistencia | "Marcar ausente" · "¿Marcar a {nombre} como ausente? No podrá enviar su evaluación mientras esté marcada así." · "Marcó a esta persona como ausente." · "Marcar presente" · chip "Ausente" · "{n} de {total} enviadas · {m} ausentes" · "Ya envió una evaluación para esta persona." · "No se pudo guardar la asistencia. Intente de nuevo." · "Asistencia en conflicto" |
| Brecha | "Le faltan {x} puntos para {nivel}" · "Nivel máximo alcanzado" · "Para llegar a {nivel}: {descripción}" · column "Para el siguiente nivel" |
| Avance | "Avance de evaluadores · Equipo {numero}" · "{n} de {total} evaluadores completaron" · "Sin iniciar" · "En progreso" · "Completo" · "Sin correo" · "Pendiente de activar" · "Activa" · "Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador." · KPI "Ausentes" · KPI "Evaluadores completos" |
| Gráficos | "Participantes por nivel" · "Puntaje por indicador" · "{n} de {total} evaluadores eligieron {nivel}" · "Ver gráficos detallados" |
| Resumen del grupo | "Resumen del grupo" · "Jornada" · "Mañana" · "Noche" · "Ambas jornadas" · "Puntaje promedio por indicador" |
| Admin · cuentas | "Cuentas de evaluadores" · "Equipo {numero} · {competencia}" · "Correo electrónico" · "Restablecer acceso" · "Último ingreso" |
| Envío de resultados | "Enviar resultados por correo" · "Enviarme una prueba" · "Enviar a {n} participantes" · "Reenviar" · "Enviado el {fecha}" · "Sin correo" · "Sin evaluaciones" · "Ausente" · subject "Sus resultados de {competencia} · Nivela" |
| Correo de código | "Su código de Nivela es {codigo}. Vence en {minutos} minutos. Si usted no lo solicitó, ignore este mensaje." |
| Evaluador | "¿Quién está evaluando?" · "Seleccione su nombre" |
| Lista | "Participantes" · "Pendiente" · "En progreso" · "Completado" · "Enviado" · "Borrar todo" · "{n} de {total} enviadas" |
| Calificación | "Indicador {n}" · "Observaciones (opcional)" · "Faltan {n} indicadores por calificar" · "Enviar evaluación" |
| IA | "¿No está seguro del nivel?" · "Describa lo que observó" · "No incluya nombres en la descripción." · "Analizar" · "Analizando…" · "Nivel sugerido: {nivel} · {pct}" · "Aplicar sugerencia" · "Usar este texto como observación" |
| Envío | "Evaluación enviada" · "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo." · "Reintentar" |
| Reportes | "Reporte general" · "Reporte individual" · "Nivel general" · "Puntaje general" · "Evaluaciones recibidas" · "Distribución de niveles por indicador" · "Cobertura de evaluaciones" · "Descargar CSV" · "Imprimir o guardar PDF" |
| Sesión | "Salir" · "Su sesión expiró. Ingrese nuevamente." |
| Jornada | "Jornada" · "Mañana" · "Noche" · "Jornada: {nombre}" · "No se pudo cambiar la jornada. Intente de nuevo." · "La jornada cambió en otra pestaña. Recargue la página." |
