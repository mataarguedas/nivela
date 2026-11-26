# PRD — Nivela

**Evaluación de competencias entre pares** · Five competencias, one rubric per jornada's team

| | |
|---|---|
| Version | 1.22: the morning Orientación al detalle team sent a revised template (`plantillas_dia/Plantilla Sistematizada-Equipo 5-Orientación al Detalle.xlsx`) that rewrites all 16 level descriptions and opens the definition with "La atención al detalle"; the indicator titles and sources are unchanged, so the new text is stored under the same ids (§9.1, Appendix A.4, §16). The morning Orientación a resultados team's new file (`Herramienta 4 - Indicadores - Orientación a resultados.xlsx`) has the same text as before, so its rubric doesn't change (Appendix A.5). 1.21: the morning Adaptabilidad, Pensamiento crítico y analítico and Autorregulación emocional teams sent revised templates (`plantillas_dia/`): seven level descriptions are reworded (Adaptabilidad Indicador 1 · Intermedio and Indicador 2 · Básico; Pensamiento crítico Indicador 2 · Básico, Intermedio and Avanzado; Autorregulación emocional Indicador 4 · Intermedio). The new text is stored under the same indicator ids, so ratings already sent keep counting: a team may reword its own template's levels without new ids (§9.1, Appendix A.1–A.3, §16). 1.20: the results email and its PDF show the point scale in its own block right after the Resultado general: *"Escala de puntos"*, one row per level with its range (Básico de 0 a 25, Intermedio de 26 a 50, Avanzado de 51 a 75, Experto de 76 a 100 puntos), so each participant reads their scores against the bands (§5.14, Appendix C). 1.19: only the students on the docentes' final list are evaluated in a jornada: `participantes:conservar` renumbers them P01…Pk and hides everyone else after them (never deleted), moving evaluations, absence marks and sent-email records with each participant; at night it left the 27 Contabilidad students of the final "Lista de grupos" and hid the 24 COFI students (§5.10). 1.18: Brenda Alfaro Torres (AGRH 613 Seminario) joins night Adaptabilidad (Equipo 1), which now has 7 members, as its night template already listed her; this settles her part of §16 item 19 (Appendix B). 1.17: extra students can join a jornada whose list is already set: `participantes:agregar` appends the names of a one-column sheet (first name first) after the active participants, as P{n+1}…, all in one new COFI group, so the current participants and their evaluations don't change; it is how the night jornada's Contabilidad students were added (§5.10). 1.16: the results email attaches the participant's general report as a PDF (`nivela-reporte-general.pdf`, the same content as the email), and the docente downloads any evaluated participant's PDF from the send page ("Descargar PDF"), also for those without an email, to print it (§5.14, §10, §13 Email, Appendix C). 1.15: Sebastian Chaves (morning Adaptabilidad, Equipo 4) and Emmanuel Reyes (night Adaptabilidad, Equipo 1) are removed from the roster, so those teams now have 7 and 6 members; `evaluadores:retirados` deletes the stored data (account, evaluations, attendance) of any evaluator no longer in the roster (Appendix B, §9.2, §16). 1.14: "Uso de la aplicación", a docente report of which evaluators activated their account and which are rating, every team of the jornada, linked from Reportes (§5.9, §11.6, Appendix C). 1.13: each participant receives one results email, a general report of every competencia of the jornada with the overall result (promedio entre competencias), instead of one email per competencia; it is sent from the Reporte consolidado (`/reportes/consolidado/enviar`), and the Reporte general's "Enviar resultados por correo" opens that same page (§5.9, §5.14, §9.2, §10, §11.2, §11.4, Appendix C). 1.12: the Reporte consolidado gains "Los 5 promedios más altos" in its Tablero: the top 5 places by promedio entre competencias, like the Reporte general's "Los 5 puntajes más altos" (§11.4, Appendix C). 1.11: the Reporte consolidado no longer has "Requieren atención", and its "En pocas palabras" no longer counts the participants in nivel Básico: at the professor's request the report never singles out the participants with the lowest scores (§11.4, Appendix C). 1.10: the level bands in points are now Básico 0–25, Intermedio 26–50, Avanzado 51–75 and Experto 76–100 (thresholds 26 / 51 / 76) everywhere: nivel general, the gap to the next level, the charts' reference lines, the scale captions and the results email (§7, §11, §5.14, Appendix C). 1.9: a 9-digit cédula is shown as "0-0000-0000" ("1-0000-0001") in the reports, the CSVs and the admin editor, and stored as its 9 digits however it was typed (§5.10, §10, §11); `participantes:matricula` fills the carnets and emails of a named list from the university's enrollment lists ("Listado de Alumnos Matriculados"), matched by name (§5.10). 1.8: participants belong to a COFI group ("Grupo 1"…) from the docentes' distribution sheets; the evaluators' participant list is split by group, with a "Mostrar" dropdown to show one group (§5.4), the admin edits each group (§5.10, §9.2) and `participantes:importar` loads a sheet; the docente also switches jornada on Inicio (§5.11). 1.7: the five night teams sent their templates (`plantillas_noche/`), so every competencia now has a night rubric and opens at night too (Appendix A.6–A.10, Appendix B); night Adaptabilidad rates with its own template instead of the morning one, under new indicator ids (§9.1). 1.6: the reports and the results email give every score in points from 0 to 100, with the level bands Básico 0–24, Intermedio 25–49, Avanzado 50–74 and Experto 75–100 (§7, §10, §11, §5.14); evaluators still rate on the 4 levels. 1.5: Reporte consolidado, all five competencias of the jornada together, with the promedio entre competencias, its CSV and a dashboard (§5.9, §7, §10, §11.4), and the Reporte del participante, one student across every competencia (§11.5). 1.4: participants have a carnet (§5.10, §9.2); the reports and the CSV identify participants by carnet, never by name (§10, §11, §13). 1.3: rubrics are per jornada + competencia (§9.1, Appendix A); the four morning templates enable every competencia in the morning, while at night only Adaptabilidad has a rubric until the night teams send theirs. 1.2: evaluator accounts with email login (§5.1, §5.12), attendance (§5.13), personal results by email (§5.14), gap to the next level (§7), evaluator progress (§11.2), simpler charts (§11), group summary (§11.3), back button (§12), night roster and per-jornada team numbering (Appendix B), and the Adaptabilidad rubric from the team template plantilla.xlsx (Appendix A). 1.1 added the night cohort (§5.11). |
| Date | 2026-11-26 |
| Owner | Emmanuel (engineering) |
| Status | Approved for build (see §16 for open items) |
| UI language | Spanish (Costa Rica), "usted" form, light mode only |

---

## 1. Summary

Nivela is a mobile-first web app (installable as a PWA) used during a peer-assessment activity in the courses **AGRH 315 Psicología 2** and **AGRH 613 Seminario Integrado de Recursos Humanos**.

Students are grouped into five teams, one per *competencia*. Each team member rates participants from a **separate course** on that team's competencia. An admin sets how many participants there are, their names and their carnets (§5.10); the reports identify participants by carnet only. Each competencia has 4 indicators, and each indicator has 4 behavior levels: Básico (1), Intermedio (2), Avanzado (3), Experto (4). The reports and the results email turn those ratings into points from 0 to 100 (§7).

When an evaluator is unsure which level applies, they can describe what they observed in Spanish. **Jev** (TypeSafe AI's System One decision model) then suggests the most likely level with a calibrated probability. The evaluator always confirms the level.

Submitted ratings go to a shared Postgres database. A protected report area shows per-participant, general and whole-group results, the gap each participant has to the next level, and which evaluators have finished. At the end of the activity the docente sends each participant their personal results by email (§5.14).

Evaluators sign in with their own email and a password they create on their first visit, after confirming a code sent to that email (§5.12). Evaluators mark whether each participant is present or absent (§5.13).

The activity runs in two **jornadas** (cohorts): the morning students (*Mañana*) and the night students (*Noche*). Each jornada has its own five teams, its own participant list and its own evaluations and reports. Night students rate night participants only, and the two cohorts never see each other's names. An evaluator's account decides their jornada: it is the jornada of their team in Appendix B. The docente and the admin switch jornada inside the app (§5.11).

Team numbers are per jornada: the morning Adaptabilidad team is Equipo 4 and the night one is Equipo 1 (Appendix B). A team is always identified by jornada + competencia.

Each jornada's team writes the **rubric** (the template with the definition, indicators and levels) for its competencia, so a rubric belongs to jornada + competencia (§9.1, Appendix A). A competencia opens in a jornada only when that jornada has a rubric for it. Since v1.7 all five competencias have one in **both** jornadas: the morning templates (A.1–A.5) and the night templates (A.6–A.10). Rubrics are data, so adding one needs no code changes.

## 2. Context and users

| Role | Who | What they do |
|---|---|---|
| **Evaluador** | The members of their jornada's team for the competencia, from both courses (Appendix B). For Adaptabilidad: Equipo 4 in the morning, Equipo 1 at night. | Sign in with their email and password (§5.12), mark each participant present or absent (§5.13), rate every present participant of that jornada on the 4 indicators, submit. |
| **Evaluado / Participante** | Students from a separate course | They do not use the app. Shown by the name the admin entered, with their number ("Participante 07") as a secondary label; without a name, by number only. They receive their personal results by email if the admin entered their email (§5.14). |
| **Docente** (or course coordinator) | Professor, or a designated student | Enter the docente code, pick the jornada, view reports (including evaluator progress and the group summary), export CSV, print, and send results by email (§5.14). |
| **Admin** | Whoever prepares the activity | Enter the admin code (`CODIGO_ADMIN`), pick the jornada, set the participants (count, names, carnets and optional emails, §5.10) and manage evaluator accounts (§5.12). Nothing else: no rating, no reports. |

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
- Writing or editing rubrics in the app. Each team's template is copied into config (Appendix A).
- Offline rating. Jev and submission both need network.
- Dark mode, native apps, multi-language UI.
- An admin UI for editing indicators. Indicators are edited in config files.

## 4. MVP scope

**In:** access gate (§5.1) · competencia picker (enabled per jornada by its rubrics, §5.2) · evaluator selection · participant list with status · rating screen with 4 indicators × 4 levels plus observations · Jev suggestion per indicator · local drafts with "Borrar todo" · submission to Postgres (upsert) · docente report area (general + per participant) · CSV export · print view · PWA install.

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
5. The class codes of v1.1 (`CODIGO_ACCESO`, `CODIGO_ACCESO_NOCHE`) are **removed**. A session signed for an evaluador without `integranteId` (one of those codes) counts as expired.

### 5.2 Choose competencia (Inicio)
- Hero: app name, tagline, "Comenzar".
- A list of the 5 competencias. A competencia is selectable when the session's jornada has a rubric for it (Appendix A) and a team with members: since v1.7, all 5 in both jornadas. The others show the badge "Próximamente", are not focusable as links, and have `aria-disabled="true"`.
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
- **Groups (v1.8)**: when participants have a COFI group (§5.10), the list is split into one section per group, in order (*"Grupo 1"*, *"Grupo 2"*…), each with its own *"{n} de {total} enviadas"*; participants without one go last under *"Sin grupo"*. Within a group, by number. Without any group the list is one plain list. The rating screen's previous / next follow the same order, and its header shows the group (*"Participante 07 · Grupo 2"*).
- **Group picker (v1.8)**: when participants have a group, a dropdown *"Mostrar"* above the list offers *"Todos los grupos"* (the default) and one option per group with its size (*"Grupo 2 (8)"*, *"Sin grupo (1)"*); choosing a group shows only that section. The choice is kept per competencia for the browser tab (sessionStorage, outside the drafts' `nivela:v1:` prefix), so it survives opening a participant, "Volver" and a reload; a stored group that no longer exists falls back to *"Todos los grupos"*. The overall summary still counts every participant.
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
- `/reportes`: **Reporte consolidado** (all five competencias together, §11.4), **Uso de la aplicación** (which evaluators activated their account and are rating, §11.6, v1.14), then the competencia picker (the competencias with a rubric in the session's jornada) → **Reporte general**.
- From the ranking table, tap a participant → **Reporte individual**.
- From the Reporte consolidado (its level map or its table), tap a participant → **Reporte del participante** (§11.5), every competencia of that student; each Reporte individual links to it with "Ver todas sus competencias".
- From the Reporte general: **Resumen del grupo** (§11.3). From the Reporte consolidado or the Reporte general: **"Enviar resultados por correo"** (§5.14), the same page for every competencia (v1.13).
- "Descargar CSV" and "Imprimir o guardar PDF" are available in both views and in the Reporte consolidado. Printing is also available in the group summary.

### 5.10 Participants (admin only)
- Each jornada has its own list. `/admin` shows the jornada switch (§5.11) and edits the selected jornada's list. Both jornadas number their participants from P01, and the two lists are independent.
- `/admin`: "Cantidad de participantes" (1–99), then one row per participant ("Participante 01", "Participante 02"…) with a name field, a carnet field ("Carné · Participante 01"), an optional "Correo electrónico" field (§5.14) and an optional group field ("Grupo · Participante 01", v1.8: a whole number 1–20, blank for *Sin grupo*). "Pegar lista" fills the rows from one-per-line text and sets the count to the number of lines; each line is a name alone, or the carnet and the name separated by a tab or ";" (`100000001<TAB>Nombre Apellidos`, in either order), with the email as one more field (the one containing "@", §5.14) and the group as another (*"Grupo 2"*; the word is required, so a short carnet is never read as a group). A pasted line replaces its row's name and carnet, so an old carnet never stays on a new name.
- Name field: no emails or phone numbers (anything with "@" or 7+ digits is rejected), at most 80 characters. A blank name shows as "Participante NN". Names are written first name first ("Ana Lucía Mora Solís"): evaluators read them and the results email (§5.14) greets the participant by name.
- Carnet field (v1.4): the university carnet, optional; digits, letters or hyphens, at most 20 characters, unique within the jornada's list. **The reports and the CSV identify participants only by carnet** (§10, §11); evaluators never see it. A blank carnet shows as "Participante NN" in the reports. **Format (v1.9)**: a carnet that is a 9-digit Costa Rican cédula is shown everywhere as *"0-0000-0000"* (`100000001` → `1-0000-0001`) and stored as its 9 digits, so `1-0000-0001` and `100000001` are the same carnet (for uniqueness too); any other carnet (a 12-digit DIMEX, one with letters) is shown as stored.
- Email field: optional; a valid address, trimmed and lowercased, at most 254 characters. Used only to send results (§5.14); never shown in the reports or the CSV.
- **Distribution sheets (v1.8)**: the docentes hand out one "Distribución de estudiantes COFI" spreadsheet per jornada (GV(m) for the morning, GL(n) for the night): one column per group, *"Grupo 1"*…*"Grupo 5"*, with the students below as *"1. Apellido Apellido Nombre"*. They are PII and stay in the gitignored `privado/` folder. `npm run participantes:importar -- --archivo <xlsx> --jornada manana|noche [--simular]` reads one: if the jornada's list has no names yet, the sheet becomes the list (P01… in group order, names turned first-name-first); if it has names, only the groups change, matched by name (order, accents and case ignored), and a sheet row that matches no one or several stops the import. It refuses a sheet whose title names the other jornada, prints counts and positions ("Grupo 2, línea 3") but never names, and writes to production only with `--produccion` and a typed confirmation. Names that don't follow "two surnames, then given names" come out in another order and are fixed here.
- **Enrollment lists (v1.9)**: the university's *"Listado de Alumnos Matriculados"* PDFs (one per course section, a row per student: carnet, name surnames first in capitals and sometimes cut short, institutional email) are PII and stay in `privado/`. `npm run participantes:matricula -- --jornada manana|noche --archivo <pdf|txt> [--archivo …] [--simular] [--produccion]` reads them (`pdftotext -layout` for a PDF) and, for a jornada whose list already has names, sets each matched participant's carnet and email; names, groups, order and evaluations stay. Matching ignores order, accents and case, and accepts a name cut short at the end; a student that matches no one or several, or a carnet another participant already has, stops the import. A cut email (*"…@est.utn.ac."*) is skipped, so the stored one stays, and reported by position. It prints counts and positions, never names, carnets or emails, and writes to production only with `--produccion` and a typed confirmation.
- **Extra students (v1.17)**: students who join after a jornada's list is set (at night, the Contabilidad students) come as a sheet with one column of names, first name first, one per row, or as a `.csv` `nombre,correo,grupo` made from a course's participant export (each student with their own group and email; a row without a group gets `--grupo` or *Sin grupo*; an optional 4th column `carnet`, empty or "—" for none, stored like the admin's: a cédula as its 9 digits); both are PII and stay in `privado/`. `npm run participantes:agregar -- --archivo <xlsx|csv> --jornada manana|noche [--grupo N] [--simular] [--produccion]` appends them after the active participants (P{n+1}…); a sheet's names all go in group `N`, by default the next group number after the ones in use ("Grupo 6"). A group number already in the list is shared: the new students join that section (the accounting course's Grupos 1–6 join the night's Grupos 1–6, as the docentes asked). The current participants, their groups and evaluations stay, except with `--actualizar-existentes`: a row whose name matches exactly one stored participant then only sets that participant's group (and carnet, when the row has one; a carnet another participant has stops the import), so a final group list can mix students already stored and new ones (at night, the docentes' final "Lista de grupos" moved the 8 students added first out of Grupo 6 into Grupos 1–5 and added the rest). It refuses a jornada with no saved list or with hidden participants (the new names would take their numbers), a name repeated in the sheet or already in the list (order, accents and case ignored), an email repeated in the CSV, more than 99 participants, and new numbers that already have evaluations or absence marks. Carnets and emails are added afterwards in `/admin` or with `participantes:matricula`. It prints counts and positions ("fila 3"), never names, and writes to production only with `--produccion` and a typed confirmation.
- **Only the final list (v1.19)**: `npm run participantes:conservar -- --archivo <xlsx|csv> --jornada manana|noche [--simular] [--produccion]` keeps visible only the students on a final list (names only; each must match exactly one visible participant, order, accents and case ignored). Because the list is always P01…Pn with no gaps (the admin editor and hiding by count rely on it), those students are renumbered P01…Pk in their current order and everyone else follows them, hidden, exactly as if the admin had lowered the count: nothing is deleted and raising the count brings them back. Evaluations, absence marks and `envios_resultados` rows move with their participant, all in one transaction. Renumbering changes participant URLs and the ids the evaluators' local drafts use (§9.3), so it runs before rating starts; the dry run counts the evaluations and absence marks that would move. It prints counts and positions, never names, and writes to production only with `--produccion` and a typed confirmation.
- `/admin` also has the **"Cuentas de evaluadores"** section (§5.12), for the selected jornada.
- **"Guardar cambios"** saves; success shows the toast *"Cambios guardados"*. Evaluators and reports see the new list on their next page load.
- Lowering the count **hides** the participants above it; nothing is deleted. If any of them already have evaluations, a confirmation says how many: *"Se ocultarán N participantes con M evaluaciones enviadas. Las evaluaciones no se eliminan y vuelven a aparecer si aumenta la cantidad de nuevo."* Hidden participants leave the lists, the rating routes (404) and the reports, and can't receive new evaluations; their stored evaluations, names and carnets come back if the count is raised again. The CSV keeps all rows.
- Until the admin saves a jornada's list for the first time, that jornada shows `CANTIDAD_PARTICIPANTES` (default 20) unnamed participants.
- If the jornada was switched in another tab after the editor loaded, saving is refused with *"La jornada cambió en otra pestaña. Recargue la página."*, so one cohort's list never overwrites the other's.

### 5.11 Jornadas (mañana / noche)
- The session carries a `jornada`. Every list, rating, submission and report is scoped to it, and the server always takes it from the session, never from the request.
  - **The one exception** is the docente-only group summary (§11.3): it reads a validated `?jornada=manana|noche|ambas` parameter. It is read-only, never writes, and never changes the session.
- **Evaluador**: the jornada is fixed by the account (the jornada of their team). Inicio shows *"Jornada: Noche"* (or *Mañana*) under the tagline, so students can confirm they're in the right group. A competencia is selectable in a jornada only if that jornada has a rubric for it (Appendix A) and that jornada's team for it has members. Otherwise it shows "Próximamente".
- **Team numbers differ per jornada** (Appendix B): the Adaptabilidad team is Equipo 4 in the morning and Equipo 1 at night. Anything that shows a team number reads it from that jornada's team; nothing looks a team up by number.
- **Docente** and **admin**: `/reportes` and `/admin` show a "Jornada" switch with *Mañana* and *Noche* (a radio group; the selected option is outlined, not filled). The docente also has it on Inicio, in the hero in place of the "Jornada: …" line, so the competencias, the evaluator picker (§5.3) and the participant list (§5.4) show the chosen jornada's team and students; those two screens name it under the title ("Adaptabilidad · Jornada: Noche"). Switching re-signs the session cookie through `POST /api/jornada` and reloads the view. Report headers name the jornada ("Adaptabilidad · Jornada: Noche").
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
- **One email per participant** (v1.13): a general report with every competencia of the session's jornada and the overall result. Before v1.13 the docente sent one email per competencia; that page and route are gone.
- At the end of the activity the docente opens **"Enviar resultados por correo"** from the Reporte consolidado or from any Reporte general (both open `/reportes/consolidado/enviar`), for the session's jornada.
- The page lists:
  - **Recipients**: participants with an email and at least 1 evaluation in some competencia, each with *"{n} de {m} competencias"* and the evaluations received over all of them, so the docente sees who is still missing a competencia. The email then covers only the evaluated ones.
  - **Skipped**, each with its reason: *Sin correo* · *Sin evaluaciones* (none in any competencia) · *Ausente* (marked absent in some competencia and evaluated in none).
  - Already sent: "Enviado el {fecha}". They are excluded unless the docente ticks "Reenviar" for them.
- Participants are labelled by carnet in these lists, like every report. A rendered **preview** of the exact email for any selected recipient (with its "Para:" address, the only place a participant's address is shown), and **"Enviarme una prueba"** to an address the docente types (not stored, not recorded; the subject starts with "[Prueba]").
- **"Enviar a {n} participantes"** (the primary button) opens a confirmation dialog, then sends one email per participant. The server recomputes every result; the client never sends scores.
- Sends go one at a time, paced to stay under Resend's rate limit (a rate-limit answer waits and retries once). Each carries an `Idempotency-Key` of jornada, `consolidado`, participant and the time of their latest evaluation in any competencia, so a retried request never sends twice; a deliberate "Reenviar" appends the number of earlier successful sends, so it really sends again. After an `error`, the next send retries that participant without "Reenviar".
- **Email content** (Spanish, "usted"), subject *"Su reporte general de competencias · Nivela"*:
  - Greeting by name; the jornada.
  - **Resultado general**: the nivel of the promedio entre competencias (large), *"Promedio entre competencias: {x} de 100"* (§7), its gap, *"Con evaluaciones en {n} de {m} competencias."* and the evaluations received in total. It is the participant's own figure in the Reporte consolidado (§11.4).
  - **Escala de puntos** (v1.20): *"Cada nivel corresponde a un rango de puntos en la escala de 0 a 100:"* and one row per level with its range, *"Básico · de 0 a 25 puntos"* … *"Experto · de 76 a 100 puntos"* (the bands of §7), in its own tile.
  - **Resumen por competencia**: one line per competencia with a rubric in the jornada, in config order: *"{x} de 100 · {nivel}"* or *"Sin evaluaciones"*.
  - **Detalle por competencia**, for each evaluated competencia: puntaje general and nivel, its gap, the evaluations received there, and per indicator: puntaje ("{x} de 100"), level, the gap ("Le faltan {x} puntos para {nivel}" or "Nivel máximo alcanzado", §7) and the description of the next level's behavior.
  - Closing lines: the results are the average of the peer evaluations, on a 0–100 scale with the four level bands (§7), and the resultado general is the average of the puntajes generales in the evaluated competencias.
  - **Never included**: evaluator names, individual ratings, AI metadata, other participants. Peer observations are **excluded** (open question, §16).
  - Before the closing note to ask the docente: *"Adjuntamos estos resultados en PDF para que pueda guardarlos o imprimirlos."*
- **PDF attachment** (v1.16): every results email, the test send included, attaches the same general report as a PDF, `nivela-reporte-general.pdf` (a fixed name, never the participant's). It is drawn from exactly the email's strings (`modeloResultados`), so it contains the same data and nothing more: Letter size, DESIGN.md colors, the standard Helvetica font, "Resultados al {fecha}" (the participant's latest evaluation) and "Página {n} de {m}" on every page. The same data always gives the same file, so a retried send keeps its `Idempotency-Key` payload. If the PDF can't be built for a participant, that participant's send fails (recorded as `error`, reported as `desconocido`) instead of going out without it; the rest of the list goes on.
- **"Descargar PDF"** (v1.16, a secondary button): on the send page, the previewed recipient's PDF, and, in the skipped list, the PDF of each participant marked *Sin correo* (evaluated, but with no address), so the docente can print it for them. The file is named by the report label (`nivela-reporte-general-{carnet o participante-NN}.pdf`), never by name (`GET /api/reportes/consolidado/pdf`, §10).
- Every send is recorded in `envios_resultados` under `competencia_id = 'consolidado'` (status `enviado` or `error`, timestamp; never the address or the body); rows with a real competencia id are the per-competencia emails sent before v1.13, kept as history and no longer read. Every Reporte general's table shows that general email's status in its "Correo" column: Enviado / Error / Pendiente.
- Delivery: §13 Email.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Access gate: email + password for evaluadores (§5.12); codes for docente and admin. Signed httpOnly session cookie, 12 h expiry. | P0 |
| FR-2 | Competencia picker driven by config. A competencia without a rubric in the session's jornada renders disabled; an evaluador can open only their own team's competencia. | P0 |
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
| FR-28 | Reporte consolidado: all five competencias of the jornada in one report, with its CSV and dashboard (§11.4). | P1 |
| FR-29 | Reporte del participante: one student across every competencia, as a dashboard (§11.5). | P1 |

## 7. Scoring rules

Level values: Básico = 1, Intermedio = 2, Avanzado = 3, Experto = 4. Evaluators rate with these levels.

**Points (v1.6; bands since v1.10).** Every score in the reports, the CSVs' aggregates and the results email is in **points, from 0 to 100**. A mean of levels `m` (1–4) is `(m − 1) ÷ 3 × 100` points: all Básico is 0, all Intermedio 33, all Avanzado 67, all Experto 100, so each level rated alone falls in its own band. Points are shown as whole numbers ("67"), and a score is rounded to a whole number before its level and gap are read, so the shown number and its level always agree.

| Nivel | Points |
|---|---|
| Básico | 0–25 |
| Intermedio | 26–50 |
| Avanzado | 51–75 |
| Experto | 76–100 |

| Metric | Definition |
|---|---|
| Puntaje de una evaluación | Mean of its 4 indicator levels (1.00–4.00), stored in `evaluaciones.puntaje`. Not shown in the reports. |
| Puntaje por indicador (participante) | Mean of that indicator's level across all evaluators who rated the participant, in points. |
| Puntaje general (participante) | Mean of the 4 indicator scores, in points. |
| Nivel general | From a score in points, rounded to a whole number: `≤ 25` Básico · `≤ 50` Intermedio · `≤ 75` Avanzado · `≥ 76` Experto. A mean of exactly 2,5 levels (50 points) is Intermedio; one of 3,25 (75) is Avanzado. |
| Acuerdo (participante, indicador) | Range (min–max) and standard deviation across evaluators, shown as "Alta / Media / Baja" coincidencia: SD ≤ 0.5 / ≤ 1.0 / > 1.0. |
| Cobertura | Evaluations received ÷ expected evaluations. Expected = (number of evaluators × number of active participants) − the evaluator × participant pairs marked absent (§5.13). |
| Brecha al siguiente nivel | For a score `s` in points (a puntaje general, an indicator score or the group score) rounded to a whole number: the next threshold is the first of 26 / 51 / 76 above `s`, and *faltante* = threshold − `s`, in whole points. Uses the same rounding as Nivel general, so the shown score and the gap always agree: 50 → "Le falta 1 punto para Avanzado"; 50,6 shows as 51 → Avanzado, "Le faltan 25 puntos para Experto"; ≥ 76 → "Nivel máximo alcanzado". |
| Puntaje del grupo | Mean of the puntajes generales of the participants with at least 1 evaluation. Its nivel and brecha use the same rules. |
| Promedio entre competencias (participante) | Mean of the participant's puntajes generales in the competencias where they have at least 1 evaluation (§11.4). Always shown with how many competencias it covers ("{n} de {total}"). Its nivel and brecha use the same rules; the group's figure is the mean of these promedios over the participants that have one. |
| Avance de un evaluador | Expected = active participants − those this evaluator marked absent. Status: **Sin iniciar** (0 sent) · **En progreso** · **Completo** (sent = expected). |

Scores are displayed as whole points with `Intl.NumberFormat('es-CR')` (e.g., "67"); other decimals (the standard deviation) use 2 decimals ("0,82"). All scoring, including the conversion to points, lives in one pure, unit-tested module (`src/lib/puntajes.ts`).

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
- The indicator text and criteria come from server-side config, looked up by `competenciaId` + `indicadorId` in the rubric of the session's jornada. The client never sends rubric text.

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
`scripts/evaluar-jev.ts` runs fixture texts through the proxy logic, one fixture file per rubric (`scripts/fixtures/jev-{competencia}.json`, with the `jornada` it was written for; `--competencia <id>` runs one). Each has 16 Spanish observations, one per indicator × level, plus 4 off-topic texts. It prints accuracy, exact-match counts and adjacent-level counts per rubric. Target before the activity, for every rubric: ≥ 75 % exact, ≥ 95 % within ±1 level. Fixtures are written by hand, without names, and are reviewed by the docente if possible.

## 9. Data

### 9.1 Static config (`src/config/`)
- `niveles.ts`: the 4 levels (value, key, label).
- `competencias/*.ts`: one file per competencia: `id`, `nombre` and `rubricas`, one **rubric** per jornada whose team sent its template: `definicion` (paragraphs separated by `\n`), `fuente`, `indicadores[]`. Each indicator has `id`, `numero`, `titulo`, and `niveles` (1–4 → description). Appendix A lists every rubric.
  - **A rubric belongs to jornada + competencia.** A competencia is enabled in a jornada exactly when it has a rubric there; every lookup takes the session's jornada (`obtenerCompetenciaHabilitada(jornada, id)`). Two jornadas may share one rubric object; since v1.7 none do (night Adaptabilidad used the morning template until then).
  - Indicator ids are stored in the DB, so an id never changes its text: a new rubric for a jornada gets new ids (e.g. `pensamiento-critico-noche-1`), and rows already stored are never relabelled.
  - Exception (v1.21): when the team that wrote a rubric revises the wording of its own template (same indicators, same 4 levels in the same order), the new text replaces the old one under the same ids, so ratings already sent keep counting. The level a rating stores (1–4) keeps its meaning; Appendix A records each revision. This holds even when every level description is rewritten, as long as the indicator titles stay (v1.22, A.4).
- `jornadas.ts`: the 2 jornadas (`manana` "Mañana", `noche` "Noche"). Ids are stored in the DB.
- `equipos.ts`: 5 teams per jornada: `id`, `numero`, `jornada`, `competenciaId`, `integrantes[]` with `{ id, nombre, curso }`. Names only (Appendix B): emails live in the DB (`cuentas`), never here. Integrante ids are unique across jornadas.
  - **A team is identified by jornada + competencia.** Its `numero` is a per-jornada display label (Adaptabilidad is Equipo 4 in the morning and Equipo 1 at night) and its size varies from team to team (it comes from config). Code looks teams up with `equipoDeCompetencia(jornada, competenciaId)`; never look a team up by number or hard-code a number or size.
- `participantes.ts`: the id and label scheme for evaluados (`{ id: "P01", numero: 1, nombre, carnet, etiqueta, etiquetaReporte }`, where `etiqueta`, shown to evaluators and the admin, is the name or "Participante 01", and `etiquetaReporte`, shown in the reports and the CSV, is the carnet or "Participante 01") and the fallback list of `CANTIDAD_PARTICIPANTES` (default 20) unnamed participants. The real list lives in the `participantes` table (§9.2), set by the admin (§5.10). Ids `P01…P99` are stable: drafts, URLs and evaluations refer to them.
- A config validation test fails the build if ids are duplicated (integrantes across all jornadas), an indicator doesn't have exactly 4 levels, an enabled competencia has no team in any jornada, a competencia or a team number repeats within a jornada, or the teams don't match Appendix B.

### 9.2 Database (Neon Postgres via the Vercel Marketplace, Drizzle ORM)

```text
evaluaciones
  id               uuid pk default gen_random_uuid()
  jornada          text not null check (jornada in ('manana','noche'))
  competencia_id   text not null
  evaluador_id     text not null
  participante_id  text not null
  puntaje          numeric(3,2) not null         -- mean of 4 levels (1–4); reports use points (§7)
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
  carnet      text null                           -- v1.4; max 20, [0-9A-Za-z-]; the reports' label; null → "Participante NN"
  correo      text null                           -- v1.2; max 254, lowercased; only for §5.14
  grupo       smallint null check (grupo is null or grupo between 1 and 20)  -- v1.8; the COFI group (§5.4); null → "Sin grupo"
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
  competencia_id   text not null                  -- 'consolidado' since v1.13 (one general report); a competencia id before
  participante_id  text not null
  estado           text not null check (estado in ('enviado','error'))
  motivo           text null                      -- error category only; never the address or body
  enviado_en       timestamptz not null default now()
  index (jornada, competencia_id, participante_id)
```

IDs reference the static config, or the `participantes` table for evaluados (matched by jornada and id). Migration `0002_jornadas` backfilled every row that existed before v1.1 as `manana`. v1.2 adds `0003_cuentas` (cuentas, codigos_verificacion), `0004_asistencia` and `0006_resultados_correo` (participantes.correo, envios_resultados); v1.4 adds `0005_carnet` (participantes.carnet); v1.8 adds `0007_grupos` (participantes.grupo). The only names in the DB are the participants' (set by the admin); evaluator names stay in config. The only emails are in `cuentas.correo` and `participantes.correo`; the only carnets in `participantes.carnet`. Team ids and team numbers are never stored: rows refer to the competencia and the integrante. The upsert runs in a single transaction: it upserts `evaluaciones`, deletes and reinserts that evaluation's `calificaciones`, and recomputes `puntaje`.

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
| PUT | `/api/asistencia` | evaluador, docente | `{ competenciaId, evaluadorId, participanteId, ausente }` (§5.13). For an evaluador, `evaluadorId` is optional (it defaults to the session's `integranteId`) and any other id is `403`; the docente must name a member of the jornada's team. `409` if marking absent after sending, checked in the same statement that writes the mark. `POST /api/evaluaciones` answers `409` for a participant that evaluator marked absent. |
| GET | `/api/reportes/[competencia]` | docente | Aggregated report JSON (general + per participant, gaps, evaluator progress, attendance). |
| GET | `/api/reportes/[competencia]/csv` | docente | CSV download (UTF-8 with BOM so Excel opens accents correctly). |
| GET | `/api/reportes/consolidado/csv` | docente | The Reporte consolidado of the session's jornada as a CSV (§11.4), one row per participant. The static `consolidado` segment takes precedence over `[competencia]`; no competencia may use that id. |
| GET | `/api/reportes/[competencia]/grupo?jornada=` | docente | Group summary (§11.3). `jornada` is `manana`, `noche` or `ambas`; invalid or missing → the session's. Read-only. |
| POST | `/api/reportes/consolidado/enviar` | docente | v1.13, replaces `/api/reportes/[competencia]/enviar`. `{ participantes: string[], reenviar?: boolean }` (§5.14): recomputes every competencia's results on the server for the session's jornada, sends one general-report email per participant, records each in `envios_resultados`, returns `{ enviados, errores: [{ participanteId, motivo }] }` (`motivo`: `sin-correo`, `sin-evaluaciones`, `ausente`, `ya-enviado`, `no-existe`, or the email error category). `{ prueba, participanteId }` sends that participant's email, marked "[Prueba]", to the address given (not stored or recorded); `502` if the provider fails. Since v1.16 every email attaches the participant's general report as a PDF. |
| GET | `/api/reportes/consolidado/pdf?participante=P01` | docente | v1.16. That participant's general report as a PDF, the same file their email attaches (§5.14), for the session's jornada only (recomputed on the server). `application/pdf`, `Content-Disposition: attachment; filename="nivela-reporte-general-{carnet o participante-NN}.pdf"`, `Cache-Control: no-store`. `400` for a malformed id, `404` for an unknown participant or one without evaluations. |
| PUT | `/api/admin/participantes` | admin | Save `{ jornada, cantidad, nombres[], carnets[], correos[], grupos?, confirmar? }` for the session's jornada (§5.10); the arrays are aligned by position. `grupos` (v1.8) holds a whole number 1–20 or `null` per participant; without it every row is *Sin grupo*. A repeated carnet is a `400`. `409 { error, ocultos, evaluacionesAfectadas }` when hiding participants with evaluations without `confirmar`. `409 { error, jornadaDistinta: true }` when `jornada` isn't the session's. |
| GET, PUT | `/api/admin/cuentas` | admin | List the session jornada's accounts; `PUT { integranteId, correo }` edits an email, `PUT { integranteId, restablecer: true }` resets access (§5.12). |
| GET | `/api/dev/correos?para=` | — (dev only) | The latest message of the "consola" email transport, for e2e tests. `404` in production. |

Every route except `/api/acceso*` and `/api/jev` is scoped to the session's jornada. Reports and the CSV cover only that jornada; the group summary is the single read-only exception (§5.11).

`POST /api/evaluaciones` validation (zod plus config checks):
- The competencia exists and has a rubric in the session's jornada (Appendix A).
- The evaluador belongs to the session jornada's team for that competencia, and for an evaluador it is the session's `integranteId` (`403` otherwise).
- The participante exists and is active in that jornada (§5.10), and this evaluator hasn't marked them absent (§5.13).
- It has exactly the indicator ids of that jornada's rubric for the competencia, each with a level from 1 to 4.
- Each observation is ≤ 1,000 chars, and `ia_*` fields are well-formed if present.

Errors use the same shape as §8.3, in Spanish.

CSV columns: `jornada, competencia, evaluador, curso_evaluador, participante, carnet, indicador, nivel, nivel_nombre, origen, ia_nivel_sugerido, ia_confianza, observacion, actualizado`. `carnet` is empty for a participant without one. The CSV never includes participant names (v1.4), emails or attendance. The file is named `nivela-{competencia}-{jornada}-{aaaa-mm-dd}.csv`.

Consolidated CSV columns (§11.4): `jornada, participante, carnet`, then for each competencia with a rubric in the jornada (config order) `{id}_puntaje, {id}_nivel, {id}_evaluaciones`, then `competencias_evaluadas, promedio_competencias, nivel_promedio`. One row per active participant; scores in whole points (0–100, §7), like the reports. Never names, emails or attendance. The file is named `nivela-consolidado-{jornada}-{aaaa-mm-dd}.csv`.

## 11. Reports and charts (Recharts)

Chart palette: a monochrome blue ramp consistent with DESIGN.md. Básico `#d6d6d6`, Intermedio `#aad0f6`, Avanzado `#509be7`, Experto `#0066cc`. Grid lines `#d6d6d6`, labels `#707070`. Colors are never the only carrier of meaning; labels and values are always shown.

Both reports cover the session's jornada (§5.11) and name it in their header.

**Participants are identified by carnet (v1.4).** Every report (general, individual, group summary) labels each participant with their carnet, or "Participante NN" when it is blank, and never shows their name. Names stay for the evaluators, the admin and the results email (§5.14).

**Simpler charts (v1.2).** The default view of every report follows these rules:
- One message per chart. Its title is a plain sentence computed from the data, e.g. *"La mayoría de los participantes está en nivel Avanzado (12 de 20)"* or *"El indicador más alto es «Actúa de manera rápida» (75)"*. Ties and empty data get neutral sentences.
- Horizontal bars only, on a fixed 0–100 axis, with every value labelled at the bar end. The level thresholds 26 / 51 / 76 are dashed reference lines, labelled with the level they open.
- Under the KPI tiles, every report states the scale: *"Puntajes de 0 a 100: Básico 0–25 · Intermedio 26–50 · Avanzado 51–75 · Experto 76–100."*
- Only the 4 level colors; no legend is needed to read a chart; each chart keeps its visually hidden table equivalent.
- The v1.1 charts (radar, stacked distributions, 100 % bars) move into a collapsed **"Ver gráficos detallados"** section at the end of each report, loaded only when opened. Nothing is removed.

### 11.1 Reporte individual (per participant)
- Header: the participant's carnet, **Nivel general** (large), puntaje general, number of evaluations received, and under the level the gap (§7): *"Le faltan {x} puntos para {nivel}"* or *"Nivel máximo alcanzado"*.
- **Puntaje por indicador**: horizontal bars on the fixed 0–100 axis, labelled "75 · Experto", with the threshold reference lines.
- Per indicator, one plain line instead of a stacked bar: *"{n} de {total} evaluadores eligieron {nivel}"* (the most chosen level; ties listed).
- Per indicator, the gap and the next level's description from config: *"Para llegar a {nivel}: {descripción}"*.
- **Coincidencia** chip per indicator (§7), with the indicator's score, the range of levels chosen ("Niveles 2–4") and the standard deviation of those levels.
- **Observaciones**, grouped by indicator, each with the evaluator's name and level. Visible to the docente only.
- Share of levels that came from an applied AI suggestion.
- Attendance: "Ausente" or "Asistencia en conflicto" when it applies (§5.13).
- **Ver gráficos detallados**: the radar chart (4 axes, scale 0–100) and the stacked bar per indicator (how many evaluators chose each level).

### 11.2 Reporte general
- Header actions: **"Resumen del grupo"** (§11.3) and **"Enviar resultados por correo"** (§5.14; v1.13: it opens the Reporte consolidado's send page, since the email covers every competencia), both secondary; "Descargar CSV" and "Imprimir o guardar PDF".
- KPI tiles: participantes evaluados · evaluaciones recibidas / esperadas (cobertura %) · puntaje general promedio · % de niveles asistidos por IA · **Ausentes** · **Evaluadores completos**.
- **Avance de evaluadores** (after the KPI tiles), titled with that jornada's team, e.g. "Avance de evaluadores · Equipo 1" at night, "· Equipo 4" in the morning:
  - Summary *"{n} de {total} evaluadores completaron"*.
  - Per member of the jornada's team for the competencia: name, curso, account status (Sin correo / Pendiente de activar / Activa), last access (dd/mm/aaaa hh:mm), sent *"{x} de {y}"*, absents marked, and a chip **Sin iniciar** / **En progreso** / **Completo** (§7). Incomplete ones first.
  - Caption: *"Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador."*
  - At 375 px each evaluator is a stacked card instead of a table row.
- **Los 5 puntajes más altos**: the top 5 places by puntaje general, each showing its puntaje, nivel general, evaluations received and the 4 indicator means, and linking to the individual report. Scores that are equal in whole points share a position (1, 2, 2, 4…), and everyone tied at 5th place is shown.
- **Participantes por nivel**: 4 horizontal bars (Básico → Experto) counting participants by nivel general, labelled with count and percent.
- **Puntaje por participante**: horizontal bars sorted descending, colored by nivel general, with the threshold reference lines.
- **Tabla de participantes**: carnet, the 4 indicator means, puntaje general, nivel general, **"Para el siguiente nivel"** (the gap), number of evaluations, **Asistencia**, and **Correo** (Enviado / Error / Pendiente, §5.14). Sortable, and each row links to the individual report.
- **Cobertura**: an evaluador × participante grid (sent / not sent / **Ausente**) so the docente sees who is missing.
- **Ver gráficos detallados**: "Distribución de niveles por indicador" (100 % stacked bars, one per indicator, across all ratings).
- Empty state: *"Aún no hay evaluaciones enviadas para esta competencia."*

### 11.3 Resumen del grupo
`/reportes/[competencia]/grupo`, docente only. A plain overview of how the group did as a whole.
- A "Jornada" selector with **Mañana** / **Noche** / **Ambas jornadas** (radio group styled like the jornada switch), driving `?jornada=`. The default is the session's jornada. This is the §5.11 exception: read-only, never changes the session.
- Hero "Resumen del grupo" with *"{competencia} · Jornada: {nombre}"* (or *"Ambas jornadas"*).
- KPI tiles: puntaje del grupo and its nivel, the group's gap to the next level (§7), participantes evaluados, ausentes, cobertura, evaluadores completos.
- A one-paragraph summary generated from the data, e.g. *"El grupo alcanzó un nivel Avanzado (61). Le faltan 14 puntos para Experto. El indicador más fuerte es … y el que más necesita refuerzo es …"*.
- **Participantes por nivel** and **Puntaje promedio por indicador**, using the simple charts above.
- With **Ambas jornadas**, a Mañana vs Noche comparison table (each KPI and indicator mean in two columns). Jornadas are compared **by competencia, never by team number**: for Adaptabilidad it compares morning Equipo 4 with night Equipo 1, and each column header names its own team from config ("Mañana · Equipo 4", "Noche · Equipo 1"). Evaluator counts come from each jornada's own team size. Participants are keyed by jornada + id (P01 exists in both). Indicator means are compared side by side only when both jornadas rate with the same rubric (same indicator ids); otherwise each jornada's indicators are listed under its own column, and only the KPIs share rows. "Ambas jornadas" is offered only for competencias with a rubric in both jornadas.
- Same empty state as §11.2; "Volver" goes to the Reporte general; printable.

### 11.4 Reporte consolidado
`/reportes/consolidado`, docente only, linked first on `/reportes`. The five competencias of the session's jornada together, for the professors' general report. Like §11.2 it covers only the session's jornada (§5.11).
- Hero "Reporte consolidado" with *"Todas las competencias · Jornada: {nombre}"*; actions "Descargar CSV" (primary, §10), "Enviar resultados por correo" (secondary, §5.14, v1.13) and "Imprimir o guardar PDF".
- KPI tiles: competencias con evaluaciones (*"{n} de {m}"*, m = those with a rubric and a team in the jornada; when m < 5, *"{m} de 5 con plantilla en esta jornada"*), participantes evaluados (in at least one competencia), evaluaciones recibidas / esperadas with cobertura (summed over the competencias), promedio entre competencias of the group (§7) and its nivel, evaluadores completos (summed over the teams).
- **Tablero** (dashboard, right after the KPI tiles), so the docente reads the group at a glance:
  - **En pocas palabras**: one paragraph generated from the data, e.g. *"El grupo alcanzó un nivel Intermedio (49) como promedio entre competencias. Le falta 1 punto para Avanzado. La competencia más fuerte es «Orientación a resultados» (54) y la que más necesita refuerzo es «Orientación al detalle» (40)."* Ties list every competencia; equal scores and missing data get neutral sentences. It never counts or names the participants in nivel Básico (v1.11).
  - **Los 5 promedios más altos** (v1.12): the top 5 places by promedio entre competencias, as in §11.2's "Los 5 puntajes más altos": each card shows the carnet (linking to §11.5), the promedio and its nivel, *"{n} de {m} competencias"* evaluated and the puntaje general in each competencia with a rubric ("—" without one). Promedios equal in whole points share a position (1, 2, 2, 4…), and everyone tied at 5th place is shown. Participants without a promedio are left out; with nobody, *"Aún no hay puntajes para calcular el promedio entre competencias."*
  - **Mapa de niveles**: a heatmap table, one row per participant (carnet, linking to §11.5) from the highest promedio entre competencias to the lowest, one column per competencia with a rubric plus "Promedio". Each cell is filled with the level color **and shows the score** (the level name is in its tooltip and for screen readers): Básico and Intermedio are too close in lightness to be told apart by color alone. No data shows "—", an absent participant "Aus.". A level legend with each level's band of points (Básico 0–24 …) sits under it.
  - *Removed in v1.11:* "Requieren atención", the list of participants with a competencia in nivel Básico, lowest promedio first. At the professor's request the report never singles out the participants with the lowest scores.
- **Puntaje del grupo por competencia**: horizontal bars on the 0–100 axis with the threshold lines (§11 simpler charts), one per competencia with a rubric; the title names the highest one, e.g. *"La competencia con el puntaje más alto es «Adaptabilidad» (70)"*.
- **Resumen por competencia**: one row per competencia in config order: name (linking to its Reporte general), that jornada's team label ("Equipo {numero}", from config), puntaje del grupo, nivel, "Para el siguiente nivel", participantes evaluados, cobertura, evaluadores completos. A competencia without a rubric or team in the jornada stays listed with *"Sin plantilla en esta jornada"*.
- **Participantes por nivel (promedio entre competencias)**: the 4-bar chart over each participant's nivel by promedio entre competencias.
- **Participantes en todas las competencias**: one row per participant (carnet, never the name, linking to §11.5), one column per competencia with a rubric (puntaje general and nivel, linking to that competencia's Reporte individual; "Ausente" or "—" without a puntaje), then "Competencias evaluadas" (*"{n} de {m}"*), "Promedio", "Nivel" and "Para el siguiente nivel". Sortable like §11.2; default promedio descending.
- Every figure comes from each competencia's own aggregation (§11.2), so it matches that competencia's Reporte general. Empty state: *"Aún no hay evaluaciones enviadas en esta jornada."* "Volver" goes to Reportes; printable.

### 11.5 Reporte del participante
`/reportes/consolidado/[participante]`, docente only. One participant across every competencia of the session's jornada, as a dashboard: what the docente needs to talk to that student, without opening five reports.
- Header: the carnet (never the name), *"Todas las competencias · Jornada: {nombre} · Reporte del participante"*, the nivel by promedio entre competencias (large) and its gap (§7). Action: "Imprimir o guardar PDF" (primary; there is no CSV).
- KPI tiles: promedio entre competencias and its nivel, "Para el siguiente nivel", competencias evaluadas (*"{n} de {m}"*), evaluaciones recibidas (summed over the competencias).
- **En pocas palabras**: e.g. *"El promedio entre competencias es 72 (Avanzado), en 5 de 5 competencias. Le faltan 3 puntos para Experto. La competencia más fuerte es «Pensamiento crítico y analítico» (89) y la que más necesita refuerzo es «Orientación a resultados» (53)."* With one competencia evaluated, the comparison is left out.
- **Puntaje por competencia**: horizontal bars on the 0–100 axis with the threshold lines, one per competencia with a rubric, titled by the highest one.
- **Detalle por competencia**: one card per competencia in config order: puntaje general and nivel, the gap, evaluations received, the highest and lowest indicator (ties listed; *"Todos los indicadores tienen el mismo promedio (x)"* when equal), and "Ver reporte individual" to that competencia's §11.1. Without a rubric: *"Sin plantilla en esta jornada"*; absent: *"Marcado ausente en esta competencia."*; without evaluations: *"Aún no tiene evaluaciones en esta competencia."*
- No observations or evaluator names here: they stay in each Reporte individual.
- Previous / next participant links (carnet labels); "Volver" goes to the Reporte consolidado. A participant who isn't active in the jornada is a 404. Printable.

### 11.6 Uso de la aplicación (v1.14)
`/reportes/uso`, docente only, linked on `/reportes` right after the Reporte consolidado. The professors need to know which students (the evaluators: participants never use the app) activated their account and which are actually using it, for every team of the session's jornada (§5.11). It is built from each competencia's "Avance de evaluadores" (§11.2), so its figures match the Reportes generales. It shows account status only, **never an email**.
- Hero "Uso de la aplicación" with *"Evaluadores de todos los equipos · Jornada: {nombre}"*; action "Imprimir o guardar PDF" (primary; there is no CSV).
- KPI tiles over every team: **Cuentas activadas** (*"{n} de {total}"*), **Ya evalúan** (sent at least one evaluation or marked someone absent), **Completaron** (nothing left to send, §7) and **Sin activar** (with *"{p} pendientes de activar · {s} sin correo"*).
- **En pocas palabras**: *"{a} de {total} evaluadores activaron su cuenta; {u} ya evalúan y {c} completaron todas sus evaluaciones."*, with a caption: "Último ingreso" is the last sign-in (sessions last 12 h), "Última evaluación" the last send, and drafts stay on each phone and don't count.
- **Aún no activan su cuenta**: every evaluator without an active account, with their team (*"Equipo {numero} · {competencia}"*) and status (*Sin correo* / *Pendiente de activar*), so the professors can remind them; *"Todos los evaluadores activaron su cuenta."* when empty.
- One section per team, in team-number order, titled *"Equipo {numero} · {competencia}"* from config (never a hard-coded number), with *"{a} de {t} activaron su cuenta · {c} de {t} completaron"*, then per member: name, curso, cuenta, **Activada el** (dd/mm/aaaa; "—" unless the account is active, so a reset account reads as not activated), **Último ingreso**, **Última evaluación** (dd/mm/aaaa hh:mm, the latest evaluation they sent; "Nunca" without one), enviadas *"{x} de {y}"* and a **Uso** chip: *Sin activar* (account not active, even if the docente sent evaluations on their behalf) · *Sin evaluaciones* (active, nothing sent or marked) · *Evaluando* · *Completó*. Least advanced first. At 375 px each member is a stacked card.
- Empty state: *"No hay equipos con plantilla en esta jornada."* "Volver" goes to Reportes; printable.

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
- Participant names are entered by the admin and stored in the `participantes` table. Reports and the CSV never show them (v1.4).
- **Distribution sheets** (v1.8): the COFI spreadsheets list students by name and group. They stay in `privado/` (never committed), are read only by `participantes:importar`, and their names are never printed or logged.
- **Carnets** (v1.4): stored only in `participantes.carnet`, entered by the admin. They are the reports' and the CSV's participant label, and are never in config, never committed to git (roster files stay in `privado/`), never sent to Jev and never logged.
- **Emails** (v1.2): evaluators' emails live only in `cuentas`, participants' only in `participantes.correo`. They are never in config, never committed to git, never sent to Jev, never logged, and never shown in reports or the CSV. The file used to import evaluator emails stays in a gitignored folder (`privado/`), with the roster screenshots.
- **Phone numbers are never stored.**
- Results emails contain only that participant's own results, never evaluator names or individual ratings (§5.14).
- Otherwise the DB stores ids, levels, observations, attendance, AI metadata and send status.

**Email** (v1.2):
- Provider: **Resend**, on the owner's existing Resend team (free plan: about 100 emails a day, 3,000 a month). The Vercel Marketplace install was not used because a second Resend team there requires a paid plan. `RESEND_API_KEY` is a "Sending access" key (it can only send), set by hand in the Vercel project for Production, Preview and Development.
- Sending domain: **`correo.nivela.snhware.lat`** (region `us-east-1`), a subdomain of the site, so its reputation and DNS records stay apart from the website. Sender `CORREO_REMITENTE` = `Nivela <no-responder@correo.nivela.snhware.lat>`. Its DNS lives at Namecheap (the `snhware.lat` zone): a DKIM TXT (`resend._domainkey.correo.nivela`), the two sending CNAMEs Resend asks for (`send.correo.nivela` and `rsend.correo.nivela`) and a DMARC TXT (`_dmarc.correo.nivela`, `v=DMARC1; p=none;`). All of them show "Verified" in Resend (2026-11-17). If the domain ever loses verification, Resend only delivers to the account owner, so codes would never reach students.
- Sent only server-side from a `server-only` module (`src/lib/correo.ts`) with `fetch` to `POST https://api.resend.com/emails`, a 10 s timeout and an optional `Idempotency-Key`; Resend never needs a CSP entry.
- Errors are typed: **rechazado** (4xx: bad key, unverified domain, invalid address) · **limite** (429, with `Retry-After`) · **red** (timeout or no connection) · **desconocido** (5xx, missing configuration, unexpected response).
- `CORREO_MODO`: `resend` or `consola`. Production always uses `resend` (a `consola` there would swallow every code). Elsewhere the default is `consola`, which keeps the last 20 messages in memory and shows them at the dev-only `/dev/correos`; e2e tests read them from `GET /api/dev/correos?para=`.
- `npm run correo:prueba -- --para <correo>` sends one test code email through Resend, to check delivery and the spam folder at a UTN student address (`est.utn.ac.cr`) and Gmail.
- Attachments (v1.16): sent as base64 `attachments` in the same request (only the results PDF, about 10–30 KB). The `consola` outbox keeps each attachment's name, type and size, not its bytes.
- Logs record only the template name, status, the number of attachments and latency.

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
| M12 | v1.3: rubrics per jornada + competencia; the four morning templates (Appendix A.2–A.5) and their Jev golden sets. |
| M13 | v1.7: the five night templates (Appendix A.6–A.10) and their Jev golden sets; every competencia opens at night. |

## 15. Acceptance criteria (demo)

1. On an iPhone (Safari) and an Android phone (Chrome and Firefox), an evaluator can do the whole flow without zooming or horizontal scrolling: sign in with their email and password → pick Adaptabilidad → rate a participant on 4 indicators → send. This works for a morning Equipo 4 member and a night Equipo 1 member alike, each seeing only their jornada's participants.
2. In both jornadas all 5 competencias open for the docente (and each evaluador opens their own team's), each with that jornada's rubric (Appendix A).
3. Refreshing mid-rating loses nothing. "Borrar todo" clears local drafts and does not delete sent evaluations.
4. "Enviar evaluación" is disabled until all 4 indicators have a level.
5. Analyzing a Spanish description returns a suggested level with a percentage. Nothing is applied until the evaluator taps "Aplicar sugerencia". Low-confidence and off-topic states render as specified. A Jev outage never blocks manual rating.
6. Network inspection shows no API key and no names in client requests to `/api/jev`.
7. With the docente code, the general and individual reports render correctly with seeded data for each jornada's team × N participants (the team size comes from config). The CSV opens in Excel with correct accents.
8. All UI text is in Spanish and uses "usted".
9. `npm run lint`, `npm run typecheck`, `npm test` and the Playwright suite (WebKit, Chromium, Firefox mobile profiles) pass.
10. "Volver" reaches the logical parent from every screen in §12, including inside the installed PWA.
11. First visit: an evaluator enters their email, receives a 6-digit code, creates a password and is signed in; afterwards they sign in with email + password. "¿Olvidó su contraseña?" works. An email outside the roster shows the same screen and sends nothing. 5 wrong passwords lock the account for 15 minutes.
12. An evaluator can't submit or mark attendance as another evaluator (`403`), and can open only their own team's competencia.
13. Marking a participant absent shows "Ausente" in the list, blocks sending, survives a reload, and is reflected in coverage and the reports.
14. Reports show the gap to the next level per participant and per indicator, and "Avance de evaluadores" shows who has and hasn't finished.
15. Each chart's title states its message; "Ver gráficos detallados" still shows the v1.1 charts.
16. The group summary works for Mañana, Noche and Ambas jornadas, comparing teams by competencia.
17. The docente previews and sends results by email; each participant receives one general report with only their own results in every competencia and their overall result, with no evaluator names; statuses show in the table.
18. No email address appears in git, logs, the CSV, reports or `/api/jev` payloads.
19. The reports and the CSV identify each participant by carnet ("Participante NN" without one) and never show a participant's name; evaluators still see names.
20. The Reporte consolidado shows the five competencias of the jornada together (the ones without a rubric marked "Sin plantilla en esta jornada"), each competencia's figures match its Reporte general, and its CSV opens in Excel with one row per participant. Its dashboard summarizes the group in one paragraph, shows the level map (every colored cell also shows its score) and lists who has a competencia in Básico.
21. From the Reporte consolidado or any Reporte individual, the docente opens a participant's Reporte del participante: every competencia with its level, gap and strongest/weakest indicator, identified by carnet only.

## 16. Open questions

1. ~~**Participants**: how many evaluados are there, and how are they identified?~~ Resolved: the admin sets the count and the names at `/admin` (§5.10); each participant also keeps a number ("Participante 07").
2. ~~**Indicador 4 wording**: "Propone soluciones exigentes y eficaces…".~~ Resolved by the new template (Appendix A): "Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa."
3. ~~**Indicador 1 · Avanzado**: "Adopta" vs "Adapta".~~ Resolved: that description no longer exists in the new template.
4. **Who is the docente user**: the professor, the student coordinator, or both? This affects who gets `CODIGO_DOCENTE`.
5. **Activity date**: needed so the golden-set validation and device QA are scheduled before it.
6. ~~**Night roster**: the names and courses of the 5 night teams.~~ Resolved in v1.2 (Appendix B). The night numbering differs from the morning one: Adaptabilidad is Equipo 1 at night.
7. ~~**Email sending domain**~~ Resolved: `correo.nivela.snhware.lat` is verified in Resend (DKIM, sending and DMARC records live at Namecheap, 2026-11-17), and `npm run correo:prueba` reached both a Gmail and a UTN student (`est.utn.ac.cr`) inbox (§13 Email).
8. **Observations in results emails**: excluded by default because they were written for the docente. Confirm before enabling.
9. **Missing evaluator emails**: Melany Parrales (mañana, Orientación al detalle). Since v1.3 Orientación al detalle is enabled in the morning, so **Melany Parrales can't sign in until the admin adds her email** (the docente can still rate as her). Yuleissy Vargas Corrales's (noche) email arrived on 2026-11-17 and is in production (a `cuentas:importar --produccion` on 2026-11-18 found all 66 emails already there, unchanged).
10. **Addresses that look mistyped** in the roster sheets, to confirm with the students: Wesnlyn García Pérez (domain "gmal.com"), Andy Molina Castro and Karyme Varela Cantillano (domain "est.ac.cr" without "utn.").
11. ~~**Participants' emails** for §5.14~~ Resolved: the night list has them, and the morning ones (with the carnets) came from the enrollment lists in v1.9 (§5.10). The one email cut short in its list was confirmed as `@est.utn.ac.cr` and completed in a private text copy of that list.
12. **Notice to students**: tell evaluators that their email is used to sign in, and participants that their results will arrive by email.
13. ~~**Template reviewer comment**~~ Resolved in v1.21: the morning Adaptabilidad team's revised template (A.1) rewords Indicador 1 · Intermedio and no longer carries the comment *"Se repite el mismo verbo en el nivel 2 y 3. Debe ajustar."*
14. **Evaluator name spellings**: the template lists "Jimena Salgado Campos" and "Wenslyn Gracía Pérez"; the roster (Appendix B) has "Jimena Salgado" and "Wesnlyn García Pérez" (Sebastian Chaves, also listed there, left the roster in v1.15). Confirm the correct spellings; display names can change in `equipos.ts` without changing the integrante ids.
15. ~~**Night rubrics**~~ Resolved in v1.7: the five night teams sent their templates (`plantillas_noche/`, Appendix A.6–A.10), including the night Adaptabilidad team (Equipo 1), which now rates with its own template. Night evaluations sent with the morning Adaptabilidad template before v1.7 (ids `adaptabilidad-1`…`4`) stay stored but no longer match the night rubric, so the night reports leave their ratings out; they would need to be sent again with the new rubric.
16. **Wording in the v1.3 templates** that isn't a plain typo, left as written for the teams to confirm (Appendix A):
    - Autorregulación emocional · Indicador 1 · Experto: *"…en acciones constructivas que favorecen y se adapten."* (the verbs don't agree and "favorecen" has no object).
    - Autorregulación emocional · Indicador 3 · Experto: *"Modifica situaciones críticas e inesperadas en oportunidades… y promoviendo soluciones asertivas."* ("Modifica… en" and "y promoviendo").
    - Autorregulación emocional · Indicador 4 · Avanzado: *"Remodela el desafío como situaciones temporales…"* (singular vs. plural).
    - Autorregulación emocional · definición: *"Se puede entender como autorregulación emocional a la capacidad…"* (the "a").
    - Pensamiento crítico · Indicador 2: the Básico and Avanzado levels speak of *"diferencias"*, but the indicator is about causes; and Indicador 4's title *"…conecta cada situación para resolver"* has no object.
    - Orientación a resultados: the sources *"Cursos 2CN, s.f"* and *"UCC; Educación en USA"* are incomplete citations (still so in the v1.22 file).
17. **Template evaluator names** differ from the roster (Appendix B), e.g. "Felipe López Durán", "Adriana Pérez Solano", "Dorian Campos Madrigal", "Angelica Ramírez Molina", "Monserrat Cespedes". Display names can change in `equipos.ts` without changing the integrante ids.

18. **Night templates (v1.7)**, wording left as written for the teams to confirm (Appendix A.6–A.10):
    - Adaptabilidad · Noche, Indicador 4 speaks of *"comunica oportunamente los ajustes necesarios"*, but no level describes communicating.
    - Pensamiento crítico · Noche: the levels describe the team's activity (an airplane built with plastic blocks: *"el modelo"*, *"sus piezas"*, *"la mesa adicional"*), so they only fit that exercise; Jev is sent the same text (§8.2).
    - Orientación al detalle · Noche, Indicador 2: *"…con precisión, minuciosidad e identificando errores"* (the series isn't parallel).
    - Orientación a resultados · Noche, Indicador 3: *"Verifica la calidad de su progreso de sus tareas."*; Indicador 2 · Avanzado: *"Optimiza … los recursos disponibles a las tareas asignadas"*.
    - Autorregulación emocional · Noche: the workbook's "Ficha de Observación" sheet has different level descriptions (and the title "Expresa su desacuerdo sin agredir"); the app uses the "Plantilla sistematizada" sheet. Its own *Nota técnica* (*"No infiera emociones ni valore conocimientos técnicos…"*) differs from the shared one the app shows (§5.5).
19. **Night template evaluator names** differ from the roster (Appendix B): Adaptabilidad lists "Brenda Alfaro" (added to night Equipo 1 in v1.18 as Brenda Alfaro Torres, AGRH 613 Seminario; Emmanuel Reyes left the roster in v1.15), plus "Ana Sevilla" and "Celeste Vega"; Pensamiento crítico lists "Diana Hidalgo Castro", "Josue Rodriguez Saborio" and "Mariana Víquez Benavete"; Orientación al detalle lists "Aguilera Salazar María Anyne", "Badilla Castro Reichel Brittany", "Campos Ramírez Yerelín Sofía" and "Ugalde Alpízar Kristel Fabiana". Confirm the team membership and spellings; display names can change in `equipos.ts` without changing the integrante ids.
20. **Golden sets for the night rubrics**: `scripts/fixtures/jev-*-noche.json` were written by hand for v1.7 and haven't been run against live Jev or reviewed by the docente yet (§8.5).
21. **Orientación al detalle · Mañana, v1.22 template** (A.4), to confirm with the team:
    - The file is named "Equipo 5", but its team cell reads 3 and it lists Equipo 3's evaluators (Appendix B); the app keeps it as Equipo 3's rubric.
    - The competencia cell reads "Atención al Detalle" and the definition opens *"La atención al detalle…"*; the app keeps the name "Orientación al detalle" (it is shared with the night team, A.9).
    - Indicador 3 · Avanzado and Experto describe one activity's materials (*"Distribuye los bloques conforme a las figuras y patrones…"*, *"…identificando correctamente los colores, las figuras y los patrones…"*), while the other levels and indicators are general. Evaluators of any other activity can't match them.
    - Ratings sent before v1.22 were made against the previous level descriptions (listed in A.4) and keep counting under the same ids. If the docente prefers that they don't, the rubric needs new ids and those ratings drop out of the reports, as night Adaptabilidad's did in v1.7 (item 15).
    - The golden set (`scripts/fixtures/jev-orientacion-detalle.json`) was rewritten for the new levels and hasn't been run against live Jev yet (§8.5).

---

## Appendix A — Rubrics (go into `src/config/competencias/*.ts`)

Each jornada's team writes the systematized template ("Plantilla sistematizada") for its competencia, so a rubric belongs to **jornada + competencia** (§9.1). A competencia is enabled in a jornada exactly when it has a rubric there; otherwise it shows "Próximamente". Each section below is one rubric, titled "A.n {competencia} · {jornadas that use it}"; the config test compares every section with config.

| Competencia | Mañana | Noche |
|---|---|---|
| Pensamiento crítico y analítico | A.2 (Equipo 1) | A.7 (Equipo 3) |
| Autorregulación emocional | A.3 (Equipo 2) | A.8 (Equipo 2) |
| Orientación al detalle | A.4 (Equipo 3) | A.9 (Equipo 4) |
| Adaptabilidad | A.1 (Equipo 4) | A.6 (Equipo 1) |
| Orientación a resultados | A.5 (Equipo 5) | A.10 (Equipo 5) |

Corrections policy, the same for every template: only plain typos are fixed (accents, spelling, agreement, capital letters, a missing final period, double or trailing spaces, tabs, doubled periods), the "Nivel Básico:" style prefixes are dropped (the app shows the level name itself), and in-text citations move to **Fuente**. Everything else is kept verbatim, because the text is both what evaluators read and the rubric sent to Jev (§8.2). Wording that reads wrong but isn't a plain typo is left as written and listed in §16 for the team to confirm.

Every template ends with the same *Nota técnica*, shown on the rating screen (§5.5). Notes about how a team used AI to review its template are not copied into the app.

### A.1 Adaptabilidad · Mañana

Source: `plantillas_dia/Plantilla sistematizada ADAPTABILIDAD 2y2.xlsx`, sheet "Plantilla sistematizada", the morning Adaptabilidad team's template, dated 12/10/2026 (revised in v1.21; it replaces `plantilla.xlsx`, the same file as the former `plantillas_dia/Plantilla sistematizada ADAPTABILIDAD.xlsx`). It replaced the v1.0/v1.1 rubric: the indicators were reordered and every level description was rewritten. Indicator ids are positional (`adaptabilidad-1` = Indicador 1); the change was made before any real evaluation existed. The night team rated with it until v1.7, when it sent its own (A.6).

**Definición:** La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.

**Fuente:** Govern de les Illes Balears, s. f.

**Indicador 1. Actúa de manera rápida y flexible.**
- Básico: Reconoce los cambios, pero tarda en reaccionar y necesita instrucciones.
- Intermedio: Responde a cambios siguiendo las indicaciones recibidas.
- Avanzado: Afronta cambios y mantiene la continuidad de sus tareas.
- Experto: Asume situaciones difíciles o inesperadas con rapidez y mantiene un buen desempeño.

**Indicador 2. Modifica su forma de actuar ante cambios.**
- Básico: Muestra disposición ante un cambio y actúa con orientación para ajustar su forma de proceder.
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
- Agreement: "soluciones viable" → "soluciones viables" (Indicador 4 · Avanzado).
- Capital letter: "realiza" → "Realiza" (Indicador 3 · Avanzado).
- Final period added to Indicador 1 · Básico and Indicador 1 · Intermedio; double and trailing spaces removed; the "Nivel Básico:" style prefixes dropped (the app shows the level name itself).

v1.21 revision (same ids, §9.1): Indicador 1 · Intermedio was *"Responde a cambios sencillos, siguiendo las indicaciones recibidas."* and Indicador 2 · Básico was *"Mantiene su forma habitual de trabajar ante un cambio hasta recibir instrucciones."* The revised file no longer carries the reviewer comment on Indicador 1 · Intermedio (§16).

### A.2 Pensamiento crítico y analítico · Mañana

Source: `plantillas_dia/Herramienta 4_Plantilla sistematizada_ Pensamiento analitico y critico.xlsx`, sheet "Plantilla sistematizada", the morning Pensamiento crítico y analítico team's template (Equipo 1, "Semana 11"; revised in v1.21, it replaces `Herramienta 4_Plantilla sistematizada.xlsx`). Indicator ids `pensamiento-critico-1`…`4`.

**Definición:** El pensamiento crítico es una habilidad que ayuda a analizar la información, utilizando pruebas y razones que permiten tomar decisiones y formar opiniones. También hace reflexionar sobre lo que se lee o se escucha, cuestiona y valora la información que recibió.

El pensamiento analítico es la capacidad de dividir un problema o idea en partes más pequeñas para así entenderlo mejor, también identifica patrones entre los datos para extraer información y explicar cómo se conecta cada situación y se relaciona con el pensamiento crítico.

**Fuente:** González Giraldo, F., 2023; Wang, M., et al., 2025

**Indicador 1. Identifica aspectos relevantes de la información presentada.**
- Básico: Presenta dificultad para reconocer los aspectos relevantes de la información presentada y requiere orientación para comprender la situación.
- Intermedio: Reconoce los aspectos relevantes más evidentes de la información, pero presenta dificultad para explicar su relación con la situación planteada.
- Avanzado: Analiza los aspectos relevantes de la información, establece relaciones entre ellos y explica su influencia en la situación planteada.
- Experto: Evalúa críticamente los aspectos relevantes de la información, cuestiona su significado y establece relaciones fundamentadas para formular conclusiones sobre la situación planteada.

**Indicador 2. Analiza la información para establecer posibles causas dividiendo un problema en partes.**
- Básico: Describe las partes principales del problema en la información.
- Intermedio: Identifica posibles causas del problema a partir de sus partes.
- Avanzado: Relaciona las partes del problema para establecer posibles causas a partir de la información disponible.
- Experto: Formula explicaciones fundamentadas sobre el origen del problema, considerando la interacción y la influencia de sus diferentes componentes.

**Indicador 3. Evalúa la coherencia de la información mediante la comparación de datos.**
- Básico: Reconoce relaciones evidentes entre los datos de la información disponible.
- Intermedio: Compara los datos e identifica relaciones y diferencias entre ellos.
- Avanzado: Contrasta diferentes datos para determinar si existe coherencia entre la información analizada.
- Experto: Evalúa la coherencia de la información y justifica su criterio.

**Indicador 4. Toma decisiones fundamentadas y conecta cada situación para resolver.**
- Básico: Expresa una decisión superficial sobre la situación sin examinar críticamente la información.
- Intermedio: Relaciona la información e identifica inconsistencias para formular una decisión.
- Avanzado: Analiza críticamente y conecta diferentes elementos de la situación para fundamentar su decisión.
- Experto: Examina rigurosamente y con sentido crítico la información, cuestiona supuestos, identifica relaciones no evidentes y toma decisiones sólidas fundamentadas en evidencia.
Corrections applied to the template text (nothing else was changed):
- Spelling: "desición" → "decisión" (Indicador 4 · Básico and Intermedio). The v1.21 file already writes "decisiones" in the Indicador 4 title and Experto.
- Accent: "criticamente" → "críticamente" (Indicador 4 · Básico).
- A tab removed (Indicador 1 · Avanzado); the "Nivel Básico:" style prefixes dropped.
- The in-text citations "(González Giraldo, F. , 2023)" and "(Wang, M., et al., 2025)" moved to **Fuente**, one per paragraph, in order.

v1.21 revision (same ids, §9.1): Indicador 2 was Básico *"Describe las diferencias observadas."*, Intermedio *"Identifica posibles causas del problema."* and Avanzado *"Relaciona las diferencias con posibles causas utilizando la información disponible."*

### A.3 Autorregulación emocional · Mañana

Source: `plantillas_dia/plantilla sistematizada_ Regulación emocional.xlsx`, sheet "Plantilla sistematizada", the morning Autorregulación emocional team's template (Equipo 2; revised in v1.21, it replaces `Plantilla sistematizada autorregulación emocional.xlsx`). Indicator ids `autorregulacion-emocional-1`…`4`.

**Definición:** Se puede entender como autorregulación emocional a la capacidad de manejo óptimo de las emociones. Es decir, es un constructo englobado dentro de la inteligencia emocional intrapersonal que nos permite transformar una vivencia potencialmente estresante y emocionalmente alterante en algo que, aunque continúe siendo desagradable, comprendemos que es pasajero, impersonal y controlable. Los individuos con una elevada capacidad de autorregulación tienden a manejar de manera eficaz situaciones de alta exigencia emocional, minimizando el impacto negativo del estrés, y favoreciendo respuestas resilientes frente a los desafíos organizacionales.

**Fuente:** Montagud, 2020, párr. 1; Prado, 2025, p. 36

**Indicador 1. Canaliza lo que siente de forma positiva y responde con inteligencia emocional, a pesar de altibajos emocionales.**
- Básico: Presenta dificultades con conductas impulsivas o de alteración que generan tensión o presión.
- Intermedio: Intenta regular sus respuestas mediante pausas o reflexiones para moderar sus emociones ante situaciones exigentes.
- Avanzado: Identifica con rapidez y precisión sus emociones manteniendo una conducta constructiva ante los altibajos emocionales.
- Experto: Transforma situaciones de tensión en acciones constructivas que favorecen y se adapten.

**Indicador 2. Autorregula las emociones en situaciones difíciles, estresantes o perturbadoras.**
- Básico: Demuestra dificultades para autorregular sus emociones evidenciando comportamientos que afectan su desempeño.
- Intermedio: Aplica técnicas básicas para regular las emociones la mayor parte del tiempo.
- Avanzado: Conserva la calma ante situaciones estresantes, mostrando estabilidad emocional durante las circunstancias.
- Experto: Gestiona el equilibrio emocional ante situaciones estresantes o perturbadoras, manteniendo un comportamiento sereno.

**Indicador 3. Transforma una situación alterante y estresante, en un escenario momentáneo donde mantenga la calma, buscando soluciones asertivas.**
- Básico: Muestra dificultad para mantener la calma ante una situación estresante, por lo que requiere apoyo para enfrentarla.
- Intermedio: Reconoce las circunstancias estresantes, pero necesita tiempo para gestionarlas.
- Avanzado: Reinterpreta situaciones de alta tensión como circunstancias temporales y manejables, manteniendo la calma y propone soluciones efectivas.
- Experto: Modifica situaciones críticas e inesperadas en oportunidades de acción constructiva y promoviendo soluciones asertivas.

**Indicador 4. Maneja eficazmente situaciones de alta exigencia emocional respondiendo con resiliencia ante los desafíos.**
- Básico: Revela dificultades para gestionar sus emociones en situaciones de alta exigencia, afectando su desempeño.
- Intermedio: Valora las circunstancias emocionalmente exigentes, pero necesita tiempo, orientación e instrucciones específicas para superarlas.
- Avanzado: Remodela el desafío como situaciones temporales y manejables, manteniendo la calma y actúa proactivamente.
- Experto: Afronta con resiliencia situaciones críticas e inesperadas, adaptando estrategias ante la adversidad y asegurando la continuidad de los procesos.
Corrections applied to the template text (nothing else was changed):
- Spelling: "Autoregula" → "Autorregula" (Indicador 2 title) and "autoregular" → "autorregular" (Indicador 2 · Básico); "presición" → "precisión" (Indicador 1 · Avanzado); "etresantes" → "estresantes" (Indicador 2 · Avanzado).
- Accents: "reflexiónes" → "reflexiones" (Indicador 1 · Intermedio); "rápidez" → "rapidez" (Indicador 1 · Avanzado); "situacion" → "situación" (Indicador 3 title and Básico); "momentaneo" → "momentáneo" (Indicador 3 title); "estrátegias" → "estrategias" (Indicador 4 · Experto).
- Spacing: double and trailing spaces removed; the "Nivel Básico:" style prefixes dropped.
- The in-text citations "(Montagud, 2020, párr. 1)" and "(Prado, 2025, p.36)" moved to **Fuente**.

Left as written and listed in §16: Indicador 1 · Experto, Indicador 3 · Experto, Indicador 4 · Avanzado and the start of the definition.

v1.21 revision (same ids, §9.1): Indicador 4 · Intermedio ended *"…instrucciones específicas para la adaptación."* The v1.21 file also fixes "desempaño" and "temporalesy" itself.

### A.4 Orientación al detalle · Mañana

Source: `plantillas_dia/Plantilla Sistematizada-Equipo 5-Orientación al Detalle.xlsx`, sheet "Plantilla sistematizada", the morning Orientación al detalle team's template (Equipo 3: the file name says "Equipo 5", but the team cell reads 3 and the evaluators listed are Equipo 3's), dated 12-10-2026 (revised in v1.22; it replaces `Plantilla Sistematizada Orientación al Detalle.xlsx`). Indicator ids `orientacion-detalle-1`…`4`.

**Definición:** La atención al detalle “es la capacidad de notar, procesar y completar con precisión todos los aspectos de una tarea sin omitir elementos pequeños pero significativos”. “Es la habilidad de procesar información detallada con efectividad y consistencia de manera minuciosa y exacta a partir de grandes volúmenes de información o datos”.

Consiste en realizar una tarea con minuciosidad y precisión. Implica supervisar y verificar el trabajo o la información, así como planificar y organizar el tiempo y los recursos de manera eficiente.

**Fuente:** Bermúdez, N., 2023, párr. 1; Kim, K., 2026, párr. 1; Government of the Northwest Territories, s. f.; Syracuse University Performance Partnership, s. f.

**Indicador 1. Verifica aspectos minuciosos.**
- Básico: Observa los detalles más evidentes de una tarea.
- Intermedio: Localiza elementos pequeños que requieren mayor atención.
- Avanzado: Inspecciona cuidadosamente los distintos elementos, sin descuidar información importante.
- Experto: Comprueba aspectos poco perceptibles que podrían pasar desapercibidos para otras personas, manteniendo un alto nivel de precisión.

**Indicador 2. Comprueba cambios significativos.**
- Básico: Percibe modificaciones evidentes durante el desarrollo de una tarea.
- Intermedio: Distingue los cambios que se presentan en diferentes situaciones.
- Avanzado: Evalúa las modificaciones e identifica cuáles tienen mayor importancia.
- Experto: Analiza el impacto de los cambios y determina cuáles requieren mayor atención.

**Indicador 3. Organiza recursos correctos y completos.**
- Básico: Ordena los recursos disponibles siguiendo indicaciones generales.
- Intermedio: Selecciona los recursos necesarios para realizar una tarea de manera organizada.
- Avanzado: Distribuye los bloques conforme a las figuras y patrones de forma adecuada, asegurándose de que no falten elementos importantes.
- Experto: Optimiza la organización utilizando los bloques y identificando correctamente los colores, las figuras y los patrones, gestionando el tiempo de forma eficiente y anticipando posibles errores para completar la actividad con precisión y autonomía.

**Indicador 4. Controla cambios con precisión y exactitud.**
- Básico: Señala las modificaciones evidentes que se presentan durante una tarea.
- Intermedio: Registra los cambios realizados de manera ordenada y siguiendo las instrucciones.
- Avanzado: Ajusta los elementos necesarios ante una modificación, manteniendo la precisión de la tarea.
- Experto: Corrige las inconsistencias provocadas por los cambios y evita que afecten el resultado final.
Corrections applied to the template text (nothing else was changed):
- Quotation marks: the two quoted definitions, written as `“…significativos." " Es la habilidad…datos.”`, became two closed quotes, `“…significativos”. “Es la habilidad…datos”.`, with the period outside each quote.
- Final period added to the Indicador 1 and Indicador 2 titles; a line break removed inside Indicador 3 · Experto; double, trailing and blank-line spaces removed; the "Nivel Básico:" style prefixes dropped.
- The in-text citations "(Bermúdez, N, 2023, párr.1)", "(Kim, K, 2026, párr,1)" and "(Government of the Northwest Territories, s. f.; Syracuse University Performance Partnership, s. f.)" moved to **Fuente**, with their punctuation normalized.

Left as written and listed in §16: the definition now opens "La atención al detalle" (the template's competencia cell reads "Atención al Detalle"; the app keeps the name "Orientación al detalle", shared with the night team), and Indicador 3 · Avanzado and Experto name the materials of one activity (bloques, figuras, patrones, colores).

v1.22 revision (same ids, §9.1): the team rewrote all 16 level descriptions; the indicator titles, the sources and the definition (except its first words, *"La Orientación al detalle"*) are unchanged. The previous levels were:
- Indicador 1: Básico *"Revisa detalles específicos de una tarea siguiendo indicaciones para determinar si son correctos."*, Intermedio *"Contrasta los detalles de una tarea con las indicaciones establecidas para reconocer pequeñas diferencias."*, Avanzado *"Inspecciona minuciosamente los elementos de una tarea para detectar errores que puedan afectar su exactitud."*, Experto *"Corrobora la exactitud de los detalles menos perceptibles, asegurando que todos cumplan con los criterios establecidos."*
- Indicador 2: Básico *"Confirma que los cambios más evidentes de una tarea correspondan con las indicaciones recibidas."*, Intermedio *"Compara los cambios realizados con los resultados esperados para determinar si son importantes y coherentes."*, Avanzado *"Examina los cambios significativos de una tarea para determinar si mantienen consistencia con las condiciones establecidas."*, Experto *"Valida que los cambios significativos sean consistentes entre sí y cumplan con todos los criterios establecidos, incluso cuando presentan diferencias difíciles de detectar."*
- Indicador 3: Básico *"Ordena los recursos necesarios para una tarea siguiendo indicaciones sobre su uso y verificando que estén completos."*, Intermedio *"Selecciona y prepara los recursos adecuados, asegurándose de que correspondan con lo solicitado."*, Avanzado *"Distribuye los recursos según las necesidades de la tarea, comprobando que sean correctos y suficientes."*, Experto *"Optimiza la organización y el procesamiento de los recursos, anticipando posibles errores o faltantes para asegurar su uso adecuado."*
- Indicador 4: Básico *"Aplica cambios sencillos siguiendo instrucciones específicas para mantener la exactitud de una tarea."*, Intermedio *"Registra las modificaciones realizadas y comprueba que correspondan con las indicaciones establecidas."*, Avanzado *"Ajusta las modificaciones necesarias, evitando que se generen errores en los demás elementos de la tarea."*, Experto *"Supervisa las modificaciones realizadas, detectando y corrigiendo inconsistencias para garantizar la precisión del resultado final."*

### A.5 Orientación a resultados · Mañana

Source: `plantillas_dia/Herramienta 4 - Indicadores - Orientación a resultados.xlsx`, sheet "Indicadores", the morning Orientación a resultados team's template ("Grupo: 5"). In v1.22 it replaces `Plantilla Sistematizada Orientación a resultados.xlsx`; its text is identical, so the rubric didn't change. Indicator ids `orientacion-resultados-1`…`4`.

**Definición:** La Orientación a Resultados es la capacidad, actitud y habilidad proactiva y persistente para encaminar las acciones al cumplimiento y superación de los objetivos o metas desafiantes. Implica la habilidad de planificar, priorizar, administrar eficazmente el tiempo y los recursos disponibles, demostrando resiliencia y adaptabilidad para superar obstáculos, evaluar riesgos y tomar decisiones pertinentes y acertadas enfocadas en el resultado final, todo ello bajo estándares de calidad, métricas e indicadores, con la finalidad de sostener e incrementar niveles altos de rendimiento e interés de la organización.

**Fuente:** Aicad Business School, 2023; Cursos 2CN, s. f.; UCC, Educación en USA

**Indicador 1. Planifica acciones hacia el cumplimiento de metas desafiantes y prioritarias.**
- Básico: Presenta dificultades para reconocer las necesidades y establecer prioridades.
- Intermedio: Reconoce las necesidades y prioridades, pero requiere orientación para definir acciones.
- Avanzado: Organiza acciones considerando las prioridades, necesidades y recursos disponibles.
- Experto: Planifica acciones y anticipa posibles obstáculos.

**Indicador 2. Distribuye el tiempo disponible y supera obstáculos de manera persistente.**
- Básico: Presenta dificultades para reconocer las tareas prioritarias y administrar el tiempo.
- Intermedio: Organiza el tiempo disponible según la importancia de las tareas.
- Avanzado: Administra el tiempo de manera autónoma y mantiene el esfuerzo ante las dificultades.
- Experto: Reorganiza el tiempo y adapta sus acciones ante obstáculos y cambios en las prioridades.

**Indicador 3. Propone alternativas de solución con niveles altos de rendimiento, ante discrepancias o errores.**
- Básico: Presenta dificultades para reconocer errores y plantear soluciones.
- Intermedio: Identifica errores y propone soluciones sencillas con orientación.
- Avanzado: Desarrolla alternativas de solución ante discrepancias o errores.
- Experto: Formula soluciones fundamentadas y anticipa sus posibles consecuencias.

**Indicador 4. Toma decisiones proactivas ante riesgos para alcanzar el resultado final con criterios de calidad.**
- Básico: Presenta dificultades para reconocer riesgos y requiere instrucciones para tomar decisiones.
- Intermedio: Identifica riesgos y propone acciones para responder ante situaciones conocidas, con orientación.
- Avanzado: Selecciona alternativas, considerando los posibles riesgos y criterios de calidad.
- Experto: Ejecuta acciones para mantener la calidad de los resultados.
Corrections applied to the template text (nothing else was changed):
- Spelling: "pertienentes" → "pertinentes", "efocadas" → "enfocadas", "incremenrar" → "incrementar" (definition).
- Agreement: "con criterios calidad" → "con criterios **de** calidad" (Indicador 4 title; the preposition was added).
- Final period added to Indicador 1 · Intermedio; the "..." between the two sentences of the definition replaced by a period; double and trailing spaces removed; the "Nivel Básico:" style prefixes dropped.
- The in-text citations "(Aicad Business School; 2023; Cursos 2CN, s.f)" and "(UCC; Educación en USA)" moved to **Fuente**; they are incomplete (§16).

### A.6 Adaptabilidad · Noche

Source: `plantillas_noche/Plantilla sistematizada Adaptabilidad.xlsx`, sheet "Plantilla sistematizada", the night Adaptabilidad team's own template (Equipo 1; the date cell reads "99/99/999"). It replaces the morning template the night team used until v1.7 (A.1). Indicator ids `adaptabilidad-noche-1`…`4`: night evaluations stored before v1.7 keep the ids `adaptabilidad-1`…`4` of A.1 and are never relabelled.

**Definición:** “La adaptabilidad implica ajustar el enfoque de trabajo ante condiciones cambiantes, mantener la efectividad en situaciones difíciles y modificar las prioridades según las necesidades del entorno, gestionando la incertidumbre y comunicando oportunamente los ajustes necesarios”.

“La adaptabilidad es la capacidad de ajustar los pensamientos, las emociones y los comportamientos ante situaciones nuevas o cambiantes, respondiendo de manera flexible a las demandas del entorno”.

**Fuente:** Canadian Centre on Substance Use and Addiction, 2021; Waldeck, D. P., 2021

**Indicador 1. Ajusta su actuación ante condiciones nuevas o cambiantes.**
- Básico: Presenta resistencia ante nuevas condiciones y requiere instrucciones constantes para modificar su actuación.
- Intermedio: Reconoce la necesidad de cambiar su actuación, pero necesita orientación para implementar los ajustes.
- Avanzado: Modifica oportunamente su forma de actuar y cumple sus tareas de acuerdo con las nuevas condiciones.
- Experto: Anticipa las exigencias de los cambios, ajusta su actuación autónomamente y propone mejoras en los procedimientos.

**Indicador 2. Modifica prioridades ante imprevistos y necesidades del entorno.**
- Básico: Tiene dificultades para identificar qué tareas requieren atención inmediata y mantiene sus prioridades iniciales.
- Intermedio: Identifica las prioridades que deben modificarse, pero necesita apoyo para reorganizar sus actividades.
- Avanzado: Reorganiza sus tareas de manera autónoma y atiende oportunamente las situaciones inesperadas.
- Experto: Evalúa las necesidades del entorno, establece nuevas prioridades estratégicamente y desarrolla alternativas para resolver situaciones imprevistas.

**Indicador 3. Gestiona los cambios y la incertidumbre.**
- Básico: Pierde la continuidad de sus actividades ante situaciones inciertas y requiere orientación continua para retomarlas.
- Intermedio: Continúa parcialmente con el desarrollo de sus actividades, aunque necesita acompañamiento para desenvolverse ante situaciones inciertas.
- Avanzado: Conserva la conducta y la organización de sus actividades, incluso cuando las condiciones son inciertas.
- Experto: Demuestra constancia ante cambios simultáneos, prevé posibles dificultades y actúa con seguridad en escenarios inciertos.

**Indicador 4. Responde a la presión de manera flexible y comunica oportunamente los ajustes necesarios.**
- Básico: Evidencia dificultades para ajustar su comportamiento ante situaciones de presión y requiere intervención para responder a las exigencias del entorno.
- Intermedio: Reconoce las situaciones que le generan presión y ajusta su respuesta cuando recibe indicaciones.
- Avanzado: Ajusta autónomamente sus comportamientos ante situaciones de presión y realiza los cambios necesarios para mantener su desempeño.
- Experto: Gestiona eficazmente la presión, ajusta sus comportamientos y anticipa los cambios necesarios para mantener la efectividad de sus actividades.
Corrections applied to the template text (nothing else was changed):
- Quotation marks: the two quoted definitions, written with straight quotes and a leading space (`" La adaptabilidad…necesarios"`, `"La adaptabilidad…entorno."`), became typographic quotes with the period outside each one.
- Final period added to Indicador 4 · Avanzado and Indicador 4 · Experto; the missing space after "Nivel Avanzado:" and the indicator numbers ("2.Modifica") dropped with the prefixes; double and trailing spaces removed; the "Nivel Básico:" style prefixes dropped.
- The in-text citations "(Canadian Centre on Substance Use and Addiction, 2021)" and "(Waldeck, 2021)" moved to **Fuente**, with the initials from the template's reference list. The template's 0–25 / 26–50 / 51–75 / 76–100 "Valor" column is not copied: the app's points and level bands are §7's.

### A.7 Pensamiento crítico y analítico · Noche

Source: `plantillas_noche/Plantilla_sistematizada Pensamiento Crítico y Analítico.xlsx`, sheet "Plantilla sistematizada", the night Pensamiento crítico y analítico team's template (Equipo 3, dated 23/11/2026). Its levels describe the team's activity ("Construyamos un avión con bloques plásticos", sheet "Hoja de evaluación", which carries the same text). Indicator ids `pensamiento-critico-noche-1`…`4`.

**Definición:** El pensamiento crítico y analítico es la capacidad de una persona para analizar y cuestionar la información, identificar problemas, reconocer errores y evaluar diferentes alternativas, utilizando la lógica y el razonamiento para comprender una situación y encontrar soluciones antes de tomar una decisión.

**Fuente:** Halpern, D. F. y Dunn, D. S., 2021; Universidad Técnica Nacional, 2023

**Indicador 1. Analiza y cuestiona la información disponible.**
- Básico: Observa el modelo de forma general y empieza a construir sin revisar sus piezas.
- Intermedio: Identifica las partes del avión y nota algunas diferencias con sus piezas.
- Avanzado: Compara sus piezas con el modelo y reconoce qué partes puede reproducir.
- Experto: Contrasta el modelo parte por parte e identifica piezas faltantes o diferentes antes de construir.

**Indicador 2. Identifica problemas y reconoce errores.**
- Básico: Reconoce solo errores evidentes, como piezas que se caen o partes faltantes.
- Intermedio: Detecta errores de forma, color o posición al comparar con el modelo.
- Avanzado: Detecta errores de proporción o estabilidad y reconoce su causa.
- Experto: Anticipa problemas de forma o estabilidad y reconoce su efecto en el resultado.

**Indicador 3. Evalúa diferentes alternativas de solución.**
- Básico: Ante una dificultad, aplica una sola forma de resolverla.
- Intermedio: Prueba distintas formas de armar, sin compararlas.
- Avanzado: Compara formas de armado según parecido, estabilidad y tiempo.
- Experto: Prioriza alternativas con criterios claros y elige la más efectiva.

**Indicador 4. Propone la solución más adecuada antes de tomar una decisión final.**
- Básico: No define qué piezas cambiar o elige sin una razón clara.
- Intermedio: Identifica piezas para cambiar, pero decide con un análisis limitado.
- Avanzado: Elige 1 o 2 piezas y explica cómo mejoran su avión.
- Experto: Justifica cada pieza elegida y define su uso antes de ir a la mesa adicional.
Corrections applied to the template text (nothing else was changed):
- Accent: "Evalua" → "Evalúa" (Indicador 3 title; the "Hoja de evaluación" sheet already had it).
- The "COMPETENCIA ASIGNADA / Pensamiento crítico y analítico" heading in the definition cell and the "Nivel Básico:" style prefixes dropped; double and trailing spaces removed.
- The template's reference list (Halpern y Dunn, 2021; Universidad Técnica Nacional, 2023) became **Fuente**; the definition itself has no in-text citation. The "Registro" instructions are not copied.

### A.8 Autorregulación emocional · Noche

Source: `plantillas_noche/Plantilla_sistematizada Autoregulación emocional.xlsx`, sheet "Plantilla sistematizada", the night Autorregulación emocional team's template (Equipo 2). Indicator ids `autorregulacion-emocional-noche-1`…`4`. The workbook's "Ficha de Observación" sheet has different level descriptions; the "Plantilla sistematizada" sheet is the rubric, like every other template (§16).

**Definición:** Capacidad de manejar las emociones de forma adecuada, comprendiendo la relación entre lo que se siente, se piensa y se hace, y utilizando recursos para afrontar situaciones difíciles.

Capacidad de gestionar las emociones perturbadoras, evitar respuestas impulsivas y mantener un comportamiento eficaz bajo estrés.

**Fuente:** Guzmán Coyago, E. y Moreno, E. M., 2025; Goleman, D., 2024

**Indicador 1. Autorregula sus emociones.**
- Básico: Reacciona emocionalmente sin lograr controlar sus respuestas.
- Intermedio: Reconoce sus emociones e intenta controlarlas, aunque de manera inconsistente.
- Avanzado: Controla sus emociones de forma consciente y mantiene una respuesta adecuada ante situaciones difíciles.
- Experto: Anticipa sus reacciones y mantiene un equilibrio emocional constante ante situaciones complejas.

**Indicador 2. Expresa su desacuerdo.**
- Básico: Confronta de manera impulsiva o poco respetuosa al expresar desacuerdos.
- Intermedio: Reconoce su desacuerdo con respeto, aunque puede perder el control bajo presión.
- Avanzado: Expresa sus diferencias con respeto, escucha y sostiene un diálogo constructivo de forma autónoma.
- Experto: Promueve el diálogo constructivo y expresa sus diferencias de forma asertiva, favoreciendo la resolución de conflictos.

**Indicador 3. Gestiona emociones perturbadoras bajo estrés.**
- Básico: Se deja dominar por el estrés, afectando su comportamiento y capacidad de respuesta.
- Intermedio: Identifica el estrés e intenta gestionarlo, aunque presenta dificultades para mantener el control.
- Avanzado: Gestiona el estrés de manera efectiva, manteniendo la concentración y el comportamiento adecuado.
- Experto: Domina sus respuestas emocionales ante situaciones de alta presión, adaptándose sin perder el enfoque.

**Indicador 4. Recupera el control después de una tensión.**
- Básico: Permanece alterado o frustrado, afectando su desempeño después de una situación tensa.
- Intermedio: Retoma gradualmente el control, aunque necesita tiempo o apoyo para recuperar la estabilidad.
- Avanzado: Recupera la compostura y retoma la actividad de manera autónoma y constructiva.
- Experto: Restablece rápidamente su equilibrio, reorienta su conducta y continúa sin trasladar la tensión a otras situaciones.
Corrections applied to the template text (nothing else was changed):
- Each definition started with its citation ("Guzmán Coyago y Moreno (2025): capacidad de…", "Goleman (2024): capacidad de…"); the citations moved to **Fuente** and "Capacidad" takes a capital letter.
- Spacing: "Nivel Básico:Reacciona" (Indicador 1 · Básico) lost its prefix like the rest; final period added to Indicador 4 · Básico; the "Nivel Básico:" style prefixes dropped.
- Not copied: the "COMPETENCIA ASIGNADA" heading, the "Perfil de salida" and "Origen de los indicadores" notes, the note about reviewing the levels with AI, and the template's own *Nota técnica* with its 0–100 scoring instructions (the app shows the shared Nota técnica, §5.5, and §7's points).

### A.9 Orientación al detalle · Noche

Source: `plantillas_noche/Herramienta 4 - Plantilla Sistematizada Orientación al Detalle.xlsx`, sheet "Plantilla sistematizada", the night Orientación al detalle team's template (Equipo 4). Indicator ids `orientacion-detalle-noche-1`…`4`.

**Definición:** “Es la habilidad para asegurar que el trabajo y la información, propios o ajenos, sean completos y precisos, además de prepararse cuidadosamente para reuniones y hacer seguimiento a otros, para asegurar que se hayan cumplido los acuerdos y compromisos”.

Es la capacidad de ejecutar tareas con precisión y minuciosidad, identificando errores, verificando la exactitud de los datos y comprobando que la información y los procedimientos cumplan con los requisitos establecidos. Implica mantener la atención durante el desarrollo de las actividades y dar seguimiento a los compromisos para garantizar la calidad de los resultados.

**Fuente:** Biblioteca de Competencias, s. f.; adaptado de Compensar, s. f., y Dirección del Trabajo, s. f.

**Indicador 1. Asegura que la información esté completa y precisa.**
- Básico: Completa la información solicitada en los documentos correspondientes.
- Intermedio: Revisa que los documentos contengan todos los datos requeridos.
- Avanzado: Comprueba que los datos coincidan con los documentos de respaldo.
- Experto: Verifica la integridad y exactitud de la información en los documentos antes de su entrega.

**Indicador 2. Ejecuta tareas con precisión, minuciosidad e identificando errores.**
- Básico: Sigue instrucciones y presta atención a los detalles durante la ejecución de las tareas.
- Intermedio: Demuestra criterios de precisión y reconoce errores comunes en las tareas realizadas.
- Avanzado: Comprueba minuciosamente los resultados e identifica errores u omisiones.
- Experto: Garantiza la precisión en las tareas de distinta complejidad y detecta detalles poco evidentes.

**Indicador 3. Verifica la exactitud de los datos.**
- Básico: Identifica errores evidentes en la información.
- Intermedio: Comprueba la información con diferentes fuentes disponibles.
- Avanzado: Reconoce errores muy complejos o poco evidentes en la información.
- Experto: Detecta inconsistencias de manera oportuna y propone solución al problema, evitando su recurrencia.

**Indicador 4. Garantiza la calidad de los resultados.**
- Básico: Omite comprobar si su trabajo cumple con las instrucciones establecidas.
- Intermedio: Revisa parcialmente algunos requisitos, pero omite verificar otros.
- Avanzado: Verifica que su trabajo cumpla con las instrucciones y los requisitos establecidos.
- Experto: Asegura el cumplimiento de todos los requisitos y la corrección de incumplimientos antes de finalizar.
Corrections applied to the template text (nothing else was changed):
- Spelling: "minusiosidad" → "minuciosidad" (Indicador 2 title). Accent: "este completa" → "esté completa" (Indicador 1 title).
- Quotation marks: the quoted Definición 1 ends `compromisos.”`; the period moved outside the quote, as in A.4. The "Orientación al Detalle", "Definición 1:" and "Definición 2:" labels dropped.
- The indicator prefixes ("Indicador 1:") and the "Nivel Básico:" style prefixes dropped; double and trailing spaces removed.
- The citations "(Biblioteca de Competencias, s. f.)" and "Adaptado de las definiciones de atención al detalle de Compensar (s. f.) y la Dirección del Trabajo (s. f.)." moved to **Fuente**.

### A.10 Orientación a resultados · Noche

Source: `plantillas_noche/Herramienta 4 Orientación a resultados.xlsx`, sheet "Plantilla sistematizada", the night Orientación a resultados team's template (Equipo 5; the date cell reads 12/10/2026). Indicator ids `orientacion-resultados-noche-1`…`4`.

**Definición:** Es la capacidad de establecer objetivos alineados con las metas organizacionales, priorizar actividades, administrar eficientemente los recursos y ejecutar acciones que permitan alcanzar los resultados esperados dentro de los plazos establecidos, dando seguimiento al desempeño y realizando ajustes cuando sea necesario para mantener la calidad del trabajo.

Es la capacidad de dirigir los esfuerzos hacia el cumplimiento eficiente de resultados medibles, alineados con los objetivos organizacionales, aprovechando adecuadamente los recursos y dando seguimiento al logro de las metas.

**Fuente:** Office of Personnel Management [OPM], s. f.; California Department of Human Resources [CalHR], 2023

**Indicador 1. Establece acciones y metas claras.**
- Básico: Cumple las metas indicadas para realizar sus tareas.
- Intermedio: Controla sus tareas según las metas establecidas.
- Avanzado: Coordina sus metas cuando cambian las prioridades.
- Experto: Desarrolla metas claras para mejorar la organización de su trabajo.

**Indicador 2. Administra eficientemente los recursos disponibles asignados.**
- Básico: Identifica los recursos disponibles para realizar sus tareas.
- Intermedio: Gestiona de forma eficiente los recursos asignados.
- Avanzado: Optimiza de manera certera los recursos disponibles a las tareas asignadas.
- Experto: Perfecciona el uso de los recursos disponibles para superar el resultado.

**Indicador 3. Verifica la calidad de su progreso de sus tareas.**
- Básico: Reconoce errores básicos en sus tareas.
- Intermedio: Verifica el avance y la calidad de sus tareas.
- Avanzado: Corrige errores para mejorar la calidad de su trabajo.
- Experto: Implementa mejoras para prevenir errores en sus tareas.

**Indicador 4. Prioriza las metas establecidas.**
- Básico: Sigue el orden de prioridades para realizar sus tareas.
- Intermedio: Organiza sus tareas según las metas establecidas.
- Avanzado: Ajusta sus prioridades para cumplir las metas a tiempo.
- Experto: Promueve cambios en las prioridades para asegurar el cumplimiento de las metas.
Corrections applied to the template text (nothing else was changed):
- Agreement: "superar el resultados" → "superar el resultado" (Indicador 2 · Experto).
- Final period added to the Indicador 3 and Indicador 4 titles; the "Orientación a resultados:" and "Definición 2:" labels and the "Nivel Básico:" style prefixes dropped; double, trailing and line-break spaces removed.
- The citations "(Office of Personnel Management [OPM], s. f.)" and "(California Department of Human Resources [CalHR], 2023)" moved to **Fuente**. The template's 0–25 … 76–100 points per level are not copied (§7).

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
| 1 | Pensamiento crítico y analítico | Sí | Mariana Alfaro Núñez, Mariela Castillo Zamora, Angelica Ramirez | Felipe López, Adriana Pérez, Dorian Campos |
| 2 | Autorregulación emocional | Sí | Anny Varela, Kristel Rocha, Anyeli Segura, Tiffany Peña | Nancy Herrera Rojas, María Guadalupe Núñez Arguedas, Monserrat Céspedes Hidalgo |
| 3 | Orientación al detalle | Sí | Melany Parrales, Valeria Mena | Fiorella Valverde Solano, Anthony Jimenez Espinoza, Genesis Herrera Norori, Yuliana Villalobos Arroyo |
| **4** | **Adaptabilidad** | **Sí** | Wesnlyn García Pérez, Stacy Zamora Rodríguez, Ramsés Salas Vargas | Kristel Barrantes López, Angelina Mata Arguedas, Allison Campos Morera, Jimena Salgado |
| 5 | Orientación a resultados | Sí | Ariana Castillo Sánchez, Zury Castro Sandoval, Derroy Navas Valverde | Anyely Espinoza Mendoza, Génesis Ruiz Martínez, Nayeli Araya Solórzano |

### Noche

Ordered by the night team numbers. A team with no members would leave its competencia as "Próximamente" at night, and so would a competencia without a night rubric (Appendix A); since v1.7 every night competencia has both.

| Equipo | Competencia | Habilitada | AGRH 315 Psicología 2 | AGRH 613 Seminario |
|---|---|---|---|---|
| **1** | **Adaptabilidad** | **Sí** | Gabriela Salgado, Reylin Centeno | Goldine Foster Mclean, Anna Sevilla López, Ricardo Méndez Ubeda, María Celeste Vega Zamora, Brenda Alfaro Torres |
| 2 | Autorregulación emocional | Sí | Raquel Vargas, Keilyn Solis, Delma Saldaña | Andy Molina Castro, Karyme Varela Cantillano, Nailea Matarrita Quirós, Camila Fallas Cerón |
| 3 | Pensamiento crítico y analítico | Sí | Cristopher Martínez Rentería, Josué Rodríguez Saborío, Yubeidi Mendez Ubeda | Emilly González Azofeifa, Valery Quesada Oviedo, Diana Hidalgo, Mariana Viquez Benavente |
| 4 | Orientación al detalle | Sí | Melany Aguirre, Brittany Badilla | Sofía Campos Ramirez, Kristel Ugalde, Sandra Gómez Reyes, Arlyne Aguilera Salazar |
| 5 | Orientación a resultados | Sí | Mariela Salas, Ximena Badilla Vargas | Yuleissy Vargas Corrales, Kevin Chavarría, Aldair Hernández Rodríguez, Tiffany Alfaro, Byron Castro Retana |

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
| Brecha | "Le faltan {x} puntos para {nivel}" · "Le falta 1 punto para {nivel}" · "Nivel máximo alcanzado" · "Para llegar a {nivel}: {descripción}" · column "Para el siguiente nivel" |
| Avance | "Avance de evaluadores · Equipo {numero}" · "{n} de {total} evaluadores completaron" · "Sin iniciar" · "En progreso" · "Completo" · "Sin correo" · "Pendiente de activar" · "Activa" · "Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador." · KPI "Ausentes" · KPI "Evaluadores completos" |
| Gráficos | "Participantes por nivel" · "Puntaje por indicador" · "{n} de {total} evaluadores eligieron {nivel}" · "Ver gráficos detallados" |
| Resumen del grupo | "Resumen del grupo" · "Jornada" · "Mañana" · "Noche" · "Ambas jornadas" · "Puntaje promedio por indicador" |
| Uso de la aplicación | "Uso de la aplicación" · "Quién activó su cuenta y quién ya está evaluando" · "Evaluadores de todos los equipos" · "Cuentas activadas" · "Ya evalúan" · "Enviaron al menos una evaluación o marcaron una ausencia" · "Completaron" · "Sin activar" · "{p} pendientes de activar · {s} sin correo" · "{a} de {t} evaluadores activaron su cuenta; {u} ya evalúan y {c} completaron todas sus evaluaciones." · "Aún no activan su cuenta" · "Pídales que ingresen con su correo para activar la cuenta. Quien aparece «Sin correo» necesita que la administración lo agregue." · "Todos los evaluadores activaron su cuenta." · "Equipo {numero} · {competencia}" · "{a} de {t} activaron su cuenta · {c} de {t} completaron" · "Activada el" · "Última evaluación" · "Uso" · "Sin evaluaciones" · "Evaluando" · "Completó" · "No hay equipos con plantilla en esta jornada." |
| Reporte consolidado | "En pocas palabras" · "Los 5 promedios más altos" · "Según el promedio entre competencias. Los empates comparten la posición." · "{n} de {m} competencias" · "Mapa de niveles" · "Reporte del participante" · "Volver al Reporte consolidado" · "Detalle por competencia" · "Puntaje por competencia" · "Indicador más alto" · "Indicador más bajo" · "Ver reporte individual" · "Ver todas sus competencias" · "Reporte consolidado" · "Las cinco competencias juntas" · "Todas las competencias" · "Competencias con evaluaciones" · "Promedio entre competencias" · "Puntaje del grupo por competencia" · "Resumen por competencia" · "Participantes en todas las competencias" · "Competencias evaluadas" · "Sin plantilla en esta jornada" · "Aún no hay evaluaciones enviadas en esta jornada." |
| Admin · participantes | "Nombres y carnés" · "Carné · Participante {nn}" · "Grupo · Participante {nn}" · "Pegar lista de participantes" · "El carné del participante {nn} ya está en la lista." · "Revise el grupo del participante {nn}: un número entre 1 y 20, o vacío." |
| Lista por grupo | "Grupo {n}" · "Sin grupo" · "{n} de {total} enviadas" · "Participante {nn} · Grupo {n}" · "Mostrar" · "Todos los grupos" · "{grupo} ({n})" |
| Admin · cuentas | "Cuentas de evaluadores" · "Equipo {numero} · {competencia}" · "Correo electrónico" · "Restablecer acceso" · "Último ingreso" |
| Envío de resultados | "Su reporte general de competencias" · "Resultado general" · "Promedio entre competencias: {x} de 100" · "Con evaluaciones en {n} de {m} competencias." · "Recibió {n} evaluaciones de sus pares en total." · "Resumen por competencia" · "{x} de 100 · {nivel}" · "Sin evaluaciones" · "Detalle por competencia" · "Puntaje general: {x} de 100 · {nivel}" · "Recibió {n} evaluaciones en esta competencia." · "El resultado general es el promedio de sus puntajes generales en las competencias en las que recibió evaluaciones." · "{n} de {m} competencias" · "Puntaje: {x} de 100 · {nivel}" · "Estos resultados son el promedio de las evaluaciones que hicieron sus pares, en una escala de 0 a 100: Básico de 0 a 25, Intermedio de 26 a 50, Avanzado de 51 a 75 y Experto de 76 a 100." · "Enviar resultados por correo" · "Enviarme una prueba" · "Enviar a {n} participantes" · "Reenviar" · "Enviado el {fecha}" · "Sin correo" · "Sin evaluaciones" · "Ausente" · subject "Su reporte general de competencias · Nivela" (v1.13) · v1.20: "Escala de puntos" · "Cada nivel corresponde a un rango de puntos en la escala de 0 a 100:" · "de {min} a {max} puntos" · v1.16: "Adjuntamos estos resultados en PDF para que pueda guardarlos o imprimirlos." · "Descargar PDF" · "El correo lleva adjunto este mismo reporte en PDF." · "Resultados al {fecha}" · "Página {n} de {m}" · "No se pudo generar el PDF. Intente de nuevo." |
| Correo de código | "Su código de Nivela es {codigo}. Vence en {minutos} minutos. Si usted no lo solicitó, ignore este mensaje." |
| Evaluador | "¿Quién está evaluando?" · "Seleccione su nombre" |
| Lista | "Participantes" · "Pendiente" · "En progreso" · "Completado" · "Enviado" · "Borrar todo" · "{n} de {total} enviadas" |
| Calificación | "Indicador {n}" · "Observaciones (opcional)" · "Faltan {n} indicadores por calificar" · "Enviar evaluación" |
| IA | "¿No está seguro del nivel?" · "Describa lo que observó" · "No incluya nombres en la descripción." · "Analizar" · "Analizando…" · "Nivel sugerido: {nivel} · {pct}" · "Aplicar sugerencia" · "Usar este texto como observación" |
| Envío | "Evaluación enviada" · "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo." · "Reintentar" |
| Reportes | "Reporte general" · "Reporte individual" · "Nivel general" · "Puntaje general" · "Puntajes de 0 a 100: Básico 0–25 · Intermedio 26–50 · Avanzado 51–75 · Experto 76–100." · "Evaluaciones recibidas" · "Distribución de niveles por indicador" · "Cobertura de evaluaciones" · "Descargar CSV" · "Imprimir o guardar PDF" |
| Sesión | "Salir" · "Su sesión expiró. Ingrese nuevamente." |
| Jornada | "Jornada" · "Mañana" · "Noche" · "Jornada: {nombre}" · "No se pudo cambiar la jornada. Intente de nuevo." · "La jornada cambió en otra pestaña. Recargue la página." |
