# Nivela

**Evaluación de competencias entre pares** para los cursos AGRH 315 Psicología 2 y AGRH 613 Seminario Integrado de Recursos Humanos.

Nivela es una aplicación web pensada para el teléfono (se puede instalar como app desde el navegador). Cada integrante de un equipo califica a participantes de otro curso (con los nombres que define la administración) en la competencia de su equipo: 4 indicadores, cada uno con 4 niveles de conducta (Básico, Intermedio, Avanzado, Experto). Si la persona evaluadora no está segura del nivel, puede describir lo que observó y **Jev** (el modelo de decisión de TypeSafe AI) le sugiere el nivel más probable con su porcentaje. La sugerencia nunca se aplica sola: la persona evaluadora siempre decide.

Las personas evaluadoras ingresan con su correo y una contraseña propia, y marcan a cada participante como presente o ausente. Las evaluaciones enviadas se guardan en Postgres. Con el código docente se consultan los reportes (general, individual y resumen del grupo), se ve qué evaluadores ya terminaron y cuánto le falta a cada participante para el siguiente nivel, se descarga el CSV, se imprime o guarda en PDF y, al final de la actividad, se envía a cada participante su resultado por correo.

Cada equipo redacta la **rúbrica** (la plantilla sistematizada) de su competencia, así que la rúbrica depende de la jornada. Desde la v1.7 las cinco competencias están habilitadas en **ambas** jornadas: de mañana con las plantillas de los equipos de la mañana y de noche con las de los equipos de la noche (carpetas `plantillas_dia/` y `plantillas_noche/`, PRD Apéndice A). Una competencia sin plantilla en una jornada aparecería como «Próximamente».

Documentos de referencia: [`PRD.md`](PRD.md) (alcance, flujos, reglas de puntaje, contrato con Jev, base de datos y textos), [`DESIGN.md`](DESIGN.md) (diseño visual) y [`CLAUDE.md`](CLAUDE.md) (reglas técnicas).

---

## Tecnología

Next.js 16 (App Router, TypeScript estricto) · Tailwind CSS v4 · Recharts (solo en reportes) · Neon Postgres + Drizzle ORM · zod · jose (sesiones firmadas) · `@typesafe-ai/sdk` (solo en el servidor) · Vitest y Playwright · despliegue en Vercel.

## Puesta en marcha local

Requisitos: Node.js 22 o superior y acceso al proyecto de Vercel.

```bash
npm install
npm i -g vercel           # si no tiene la CLI de Vercel
vercel link               # vincula la carpeta con el proyecto "nivela"
vercel env pull .env      # trae las variables de Vercel
```

Luego cree `.env.local` a partir de [`.env.example`](.env.example). **Importante:** en Vercel hay un solo `DATABASE_URL` para todos los entornos y apunta a la base de **producción**. En `.env.local` ponga el `DATABASE_URL` de una **rama de desarrollo** de Neon (por ejemplo, la rama `dev`), para que el desarrollo, las pruebas y los datos de ejemplo nunca toquen producción. `.env.local` tiene prioridad sobre `.env`.

```bash
npm run db:migrate        # crea las tablas en la base de .env.local (muestra el host antes)
npm run db:seed           # opcional: evaluaciones ficticias para ver los reportes (nunca en producción)
npm run dev               # http://localhost:3000
```

Para probar en el teléfono dentro de la misma red: `npm run dev -- -H 0.0.0.0` y abra `http://<IP-de-su-computadora>:3000`.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción. |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript. |
| `npm test` | Pruebas unitarias (Vitest). |
| `npm run test:e2e` | Pruebas de extremo a extremo (Playwright: iPhone 13/WebKit, Pixel 7/Chromium, Firefox móvil y Chrome de escritorio). Requiere los datos de `db:seed` en la rama de desarrollo. |
| `npm run db:generate` / `npm run db:migrate` | Genera y aplica migraciones de Drizzle (carpeta `drizzle/`). |
| `npm run db:seed` | Datos ficticios: el equipo de cada competencia con rúbrica en cada jornada (las cinco en cada jornada) × todos sus participantes, más las cuentas de prueba. Solo corre contra la base de `.env.local` (la rama de desarrollo). `npm run db:seed -- --limpiar` vacía las tablas. |
| `npm run cuentas:prueba` | Deja cada cuenta de evaluador como `<id>@ejemplo.test` con la contraseña `E2E_CONTRASENA` (solo desarrollo; las pruebas e2e lo ejecutan solas). |
| `npm run cuentas:importar -- --archivo privado/correos-evaluadores.csv` | Carga los correos reales de los evaluadores desde un CSV que nunca se sube al repositorio. Muestra conteos, nunca correos. Con `--produccion` apunta a producción y pide confirmación. |
| `npm run jev:evaluar` | Conjunto de referencia de Jev (ver abajo). |

## Variables de entorno

| Variable | Uso |
|---|---|
| `TYPESAFE_API_KEY` | Clave de TypeSafe para Jev. Solo en el servidor; nunca llega al navegador. |
| `JEV_MODEL` | Modelo de Jev, fijado en `jev-1.13.0` para que los resultados sean reproducibles. No lo cambie a `jev-latest` sin una decisión explícita. |
| `DATABASE_URL` | Conexión a Neon Postgres. La define la integración de Neon en Vercel. |
| `CODIGO_DOCENTE` | Código docente (rol docente: todo lo del evaluador más los reportes). |
| `CODIGO_ADMIN` | Código de administración (rol admin: solo `/admin`, donde se definen la cantidad, los nombres y los carnés de los participantes). |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión: al menos 32 bytes aleatorios. |
| `CANTIDAD_PARTICIPANTES` | Participantes sin nombre que se muestran mientras la administración no guarde la lista real (predeterminado: 20). |
| `RESEND_API_KEY` | Clave de Resend con permiso solo de envío («Sending access»). Solo en el servidor. En Vercel se agrega a mano (Production, Preview y Development); localmente viene en `.env`. |
| `CORREO_REMITENTE` | Remitente de los correos: `Nivela <no-responder@correo.nivela.snhware.lat>`. El dominio debe estar verificado en Resend (ver «Dominio de correo»). |
| `CORREO_MODO` | `resend` envía de verdad; `consola` (predeterminado fuera de producción) guarda los últimos 20 mensajes en memoria y los muestra en `/dev/correos`. En producción siempre se envía con Resend. |
| `E2E_CONTRASENA` | Solo desarrollo: contraseña de las cuentas de prueba `<id>@ejemplo.test`. Nunca en Vercel. |

Los evaluadores no usan códigos: ingresan con su correo y una contraseña que crean la primera vez, después de verificar el correo con un código de 6 dígitos. Los códigos de clase de la v1.1 (`CODIGO_ACCESO`, `CODIGO_ACCESO_NOCHE`) ya no existen; si siguen en Vercel, bórrelos.

**No ejecute `vercel env pull .env.local`**: sobrescribiría el `DATABASE_URL` de la rama de desarrollo.

Nunca suba archivos `.env*` al repositorio, salvo `.env.example`.

## Cómo cambiar los códigos de acceso

Los códigos viven solo en las variables de entorno, no en el código.

1. En Vercel: **Project → Settings → Environment Variables**, edite `CODIGO_DOCENTE` o `CODIGO_ADMIN` (o use `vercel env rm CODIGO_DOCENTE production` y `vercel env add CODIGO_DOCENTE production`).
2. Vuelva a desplegar (`vercel --prod` o **Redeploy** en el panel) para que el cambio tome efecto.
3. Las sesiones abiertas siguen activas hasta que vencen (12 h). Para cerrar todas las sesiones de inmediato, cambie también `SESSION_SECRET` y vuelva a desplegar.

Localmente, edite los mismos nombres en `.env.local` y reinicie `npm run dev`.

## Cómo definir los participantes

1. Ingrese en `/acceso` con el código de administración (`CODIGO_ADMIN`). La app lo lleva a **Participantes** (`/admin`).
2. Escriba la cantidad de participantes y el nombre, el carné y (opcional) el correo de cada uno, o use **Pegar lista** para pegar desde una hoja de cálculo las columnas carné, nombre y correo (separadas por tabulación o por «;», en cualquier orden; el campo con «@» se toma como correo) o solo los nombres, una persona por línea.
3. Toque **Guardar cambios**. Las personas evaluadoras y los reportes ven la lista nueva al cargar la siguiente página; no hace falta volver a desplegar.

Escriba primero el nombre de pila y después los apellidos («Ana Lucía Mora Solís»): así lo ven las personas evaluadoras y así saluda el correo de resultados. El campo de nombre rechaza correos y números de teléfono; un nombre vacío se muestra como «Participante 07». **Los reportes y el CSV muestran solo el carné, nunca el nombre**; sin carné, el reporte muestra «Participante 07». Una cédula de 9 dígitos se muestra como «0-0000-0000» (por ejemplo, `100000001` se ve «1-0000-0001») y se guarda con sus 9 dígitos, la escriba con guiones o sin ellos; otros carnés (un DIMEX de 12 dígitos, uno con letras) se muestran tal cual.

**Carnés y correos desde las listas de matrícula.** Con los nombres ya cargados, los «Listado de Alumnos Matriculados» en PDF (uno por grupo del curso; guárdelos en `privado/matricula/`) llenan el carné y el correo de cada participante, emparejados por nombre, sin cambiar el orden, los grupos ni las evaluaciones:

```bash
npm run participantes:matricula -- --jornada manana --archivo privado/matricula/lista-1.pdf --archivo privado/matricula/lista-2.pdf --simular
npm run participantes:matricula -- --jornada manana --archivo privado/matricula/lista-1.pdf --archivo privado/matricula/lista-2.pdf --produccion
```

Necesita `pdftotext` (viene con Git para Windows). Si una fila no coincide con nadie, o con varias personas, no se importa nada y el script indica la posición (nunca el nombre). Un correo cortado en el PDF se omite y se avisa; escríbalo en `/admin`. Si baja la cantidad, los participantes de más se **ocultan** sin borrar nada; si ya tenían evaluaciones, la app pide confirmación, y al subir la cantidad otra vez reaparecen con sus nombres y evaluaciones. El correo del participante solo sirve para enviarle sus resultados; nunca aparece en los reportes ni en el CSV.

## Cuentas de los evaluadores

Cada integrante de los equipos en `src/config/equipos.ts` tiene una cuenta (tabla `cuentas`). Su jornada y su competencia salen de su equipo, así que solo ve los participantes de su jornada y solo califica su competencia.

**Cómo activa su cuenta un evaluador**

1. Abre la app, escribe su correo y toca **Continuar**.
2. La primera vez recibe un código de 6 dígitos por correo (vence en 10 minutos; si no llega, que revise la carpeta de correo no deseado y use **Reenviar código** después de 60 s).
3. Escribe el código, crea su contraseña (al menos 8 caracteres) y toca **Crear contraseña y entrar**.
4. Las siguientes veces ingresa con correo y contraseña. Si la olvida, **¿Olvidó su contraseña?** le envía otro código para crear una nueva.

Un correo que no está en la lista ve la misma pantalla, pero no recibe nada. Cinco contraseñas incorrectas seguidas bloquean la cuenta 15 minutos.

**Cómo cargar los correos (CSV)**

Los correos reales nunca se suben al repositorio: viven en la carpeta `privado/` (en `.gitignore`).

1. Prepare `privado/correos-evaluadores.csv` con las columnas `integranteId,correo` (el `integranteId` es el `id` del integrante en `equipos.ts`; deje el correo vacío si no lo tiene).
2. Pruebe primero contra la rama de desarrollo: `npm run cuentas:importar -- --archivo privado/correos-evaluadores.csv`. El script valida todo antes de escribir, muestra el host de la base y conteos (nunca correos).
3. Para producción: `npm run cuentas:importar -- --archivo privado/correos-evaluadores.csv --produccion` y confirme. Si un correo cambia, esa cuenta vuelve a «Pendiente de activar».

**Cómo edita la administración los correos y restablece el acceso**

Con el código de administración, en `/admin`, elija la jornada y baje a **Cuentas de evaluadores**. Cada integrante muestra su equipo («Equipo 4 · Adaptabilidad» de mañana, «Equipo 1 · Adaptabilidad» de noche), su curso, su correo, su estado (**Sin correo**, **Pendiente de activar** o **Activa**) y su último ingreso.

- Para cambiar o agregar un correo, edítelo y confirme. La cuenta vuelve a «Pendiente de activar».
- **Restablecer acceso** borra la contraseña: la persona vuelve a activar su cuenta con un código nuevo.

## Cómo retirar a un evaluador

1. Quite a la persona de su equipo en `src/config/equipos.ts` y de la tabla del Apéndice B de `PRD.md` (la prueba de configuración compara ambas), y su fila de `privado/correos-evaluadores.csv`.
2. Despliegue. Desde ese momento no puede ingresar y sus evaluaciones y ausencias dejan de contar en los reportes.
3. Borre sus datos guardados (cuenta, evaluaciones y ausencias). Primero cuente, después elimine:

   ```bash
   npm run evaluadores:retirados                          # rama de desarrollo, solo cuenta
   npm run evaluadores:retirados -- --eliminar            # rama de desarrollo
   npm run evaluadores:retirados -- --eliminar --produccion   # pide escribir «sí»
   ```

   Solo se borra lo de evaluadores que ya no están en la configuración; no se puede deshacer. El script muestra cantidades, nunca nombres ni correos.

## Quién activó su cuenta y quién está evaluando

En **Reportes → Uso de la aplicación** el docente ve, para todos los equipos de la jornada elegida, qué evaluadores activaron su cuenta y cuáles ya están evaluando: cuentas activadas, quiénes ya evalúan y quiénes completaron, la lista de quienes **aún no activan su cuenta** (para recordárselo) y, por equipo, la fecha de activación, el último ingreso, la última evaluación enviada y un estado (*Sin activar*, *Sin evaluaciones*, *Evaluando*, *Completó*). No muestra correos. Los borradores quedan en el teléfono de cada evaluador y no se cuentan.

## Cómo enviar los resultados por correo

1. Asegúrese de que la administración haya escrito el correo de cada participante en `/admin`.
2. Ingrese con el código docente, elija la jornada y abra **Reportes → Reporte consolidado → Enviar resultados por correo** (el botón del Reporte general de cada competencia abre la misma página).
3. Revise las listas: **Destinatarios** (con correo y al menos una evaluación en alguna competencia; cada uno indica en cuántas competencias fue evaluado) y **Omitidos** con su motivo (*Sin correo*, *Sin evaluaciones*, *Ausente*). La vista previa muestra el correo exacto que recibirá el participante elegido.
4. Si quiere verlo en su bandeja, use **Enviarme una prueba** con su propio correo (no se guarda; el asunto empieza con «[Prueba]»).
5. Toque **Enviar a {n} participantes** y confirme. Los envíos van de uno en uno, al ritmo que permite Resend.

Cada correo lleva **adjunto el mismo reporte en PDF** (`nivela-reporte-general.pdf`) para que el participante lo guarde o lo imprima. Con **Descargar PDF** usted baja ese archivo para el participante de la vista previa y, en la lista de omitidos, para cada persona *Sin correo* que sí tiene evaluaciones, por si quiere imprimírselo.

Cada participante recibe **un solo correo** con su reporte general: el resultado general (el promedio entre competencias, de 0 a 100: Básico 0–25, Intermedio 26–50, Avanzado 51–75, Experto 76–100, con su nivel y cuánto le falta para el siguiente), un resumen con el puntaje de cada competencia y, por cada competencia evaluada, el puntaje, el nivel, cuántas evaluaciones recibió y, por indicador, el puntaje, el nivel, cuánto le falta para el siguiente y qué conducta describe ese nivel. Si aún faltan competencias por evaluar, el correo incluye solo las evaluadas. **Nunca** incluye nombres de evaluadores, calificaciones individuales, datos de la IA ni las observaciones. Cada envío queda registrado; la columna **Correo** del Reporte general de cada competencia muestra el estado de ese correo general: Enviado, Error o Pendiente. A quien ya lo recibió no se le envía de nuevo, salvo que marque **Reenviar**; un envío con error se reintenta solo la próxima vez. El plan gratuito de Resend permite unos 100 correos al día.

## Dominio de correo

Los correos salen de `no-responder@correo.nivela.snhware.lat`, un subdominio dedicado en el equipo de Resend de la persona propietaria (región `us-east-1`). Sus registros DNS están en Namecheap, en la zona `snhware.lat`:

| Tipo | Host | Para qué |
|---|---|---|
| TXT | `resend._domainkey.correo.nivela` | DKIM (firma) |
| CNAME | `send.correo.nivela` | Envío (SPF) |
| CNAME | `rsend.correo.nivela` | Envío (SPF) |
| TXT | `_dmarc.correo.nivela` | DMARC: `v=DMARC1; p=none;` |

Los cuatro deben aparecer como «Verified» en Resend → Domains. Si el dominio pierde la verificación, Resend solo entrega al correo de la cuenta propietaria y los códigos nunca llegarían a los estudiantes. Para comprobar la entrega: `npm run correo:prueba -- --para <su-correo>` y revise la bandeja de entrada y la de correo no deseado.

## Cómo habilitar una competencia en una jornada

Todo se hace en `src/config/` y en el PRD; no hay que tocar componentes. Una competencia queda habilitada en una jornada cuando tiene una **rúbrica** para esa jornada. Así se agregaron en la v1.7 las plantillas de la noche; por ejemplo, para Pensamiento crítico:

1. Abra el archivo de la competencia, por ejemplo `src/config/competencias/pensamiento-critico.ts`.
2. Agregue en `rubricas` la entrada de la jornada (`noche: { definicion, fuente, indicadores }`). Cada indicador lleva `numero`, `titulo`, `niveles` con exactamente 4 descripciones (`1` Básico a `4` Experto) y un `id` **nuevo** (por ejemplo `pensamiento-critico-noche-1`): los `id` se guardan en la base de datos y nunca deben cambiar de texto. Si la jornada usa la misma plantilla que la otra, puede asignar el mismo objeto de rúbrica (así lo hacía `adaptabilidad.ts` antes de la v1.7).
3. Copie el texto en el PRD, Apéndice A, como una sección nueva («A.n Pensamiento crítico y analítico · Noche»), con la lista de correcciones aplicadas (solo errores evidentes de ortografía o puntuación).
4. Cambie a «Sí» la columna «Habilitada» de esa fila en el Apéndice B.
5. Revise que el equipo correspondiente en `src/config/equipos.ts` tenga a sus integrantes (solo nombres; nunca correos ni teléfonos). **No cambie los `id` existentes**: están guardados en la base de datos y en los borradores.
6. Ejecute `npm test`. La prueba de configuración falla si hay `id` repetidos, si un indicador no tiene 4 niveles, si una rúbrica no tiene equipo en su jornada o si el texto no coincide palabra por palabra con el Apéndice A.
7. Escriba su conjunto de referencia de Jev (siguiente sección, por ejemplo `scripts/fixtures/jev-pensamiento-critico-noche.json`) y despliegue. La competencia aparecerá disponible en Inicio y en Reportes de esa jornada.

## Conjunto de referencia de Jev

`npm run jev:evaluar` envía a Jev las observaciones escritas a mano en `scripts/fixtures/jev-{competencia}.json`, un archivo por rúbrica con la `jornada` para la que se escribió (16 textos, uno por indicador y nivel, más 4 fuera de tema), usando la misma lógica que la app. `npm run jev:evaluar -- --competencia orientacion-detalle` evalúa solo una. Para cada rúbrica muestra:

- el porcentaje de aciertos exactos (meta: ≥ 75 %);
- el porcentaje dentro de ±1 nivel (meta: ≥ 95 %);
- la pertinencia de cada texto (los textos fuera de tema deberían quedar por debajo de 0,5).

Termina con error si no alcanza las metas. Usa `TYPESAFE_API_KEY` y `JEV_MODEL` de `.env.local`/`.env` y solo envía los textos del archivo y la rúbrica de la configuración (nunca nombres). Conviene correrlo antes de la actividad y cada vez que cambie `JEV_MODEL` o el texto de los indicadores. Si fuera posible, pida a la persona docente que revise los textos del archivo.

## Cómo exportar los resultados

Ingrese con el **código docente**, elija la jornada y abra **Reportes →** la competencia (por ejemplo, **Adaptabilidad**).

- **Descargar CSV**: un archivo `nivela-adaptabilidad-{jornada}-aaaa-mm-dd.csv` con una fila por calificación (columnas: `jornada, competencia, evaluador, curso_evaluador, participante, carnet, indicador, nivel, nivel_nombre, origen, ia_nivel_sugerido, ia_confianza, observacion, actualizado`). Está en UTF-8 con BOM, así que Excel muestra bien las tildes al abrirlo con doble clic.
- **Imprimir o guardar PDF**: abre el diálogo de impresión con un formato limpio (sin menú ni botones, gráficos en blanco). Elija «Guardar como PDF» para obtener el archivo.
- Ambas opciones están en el Reporte general y en cada Reporte individual. El **Resumen del grupo** (desde el Reporte general) también se imprime, y permite ver Mañana, Noche o Ambas jornadas.

## Despliegue

Producción es https://nivela.snhware.lat. Vercel despliega automáticamente cada `git push origin main`.

```bash
npm run lint && npm run typecheck && npm test && npm run test:e2e   # antes de desplegar
git push origin main                                                # despliega a producción
```

Si cambió el esquema de la base de datos, aplique la migración a producción **antes** del push, de forma deliberada, indicando la URL de producción explícitamente (en PowerShell):

```powershell
$env:DATABASE_URL_MIGRACION = "<DATABASE_URL de producción>"; npm run db:migrate -- --produccion; $LASTEXITCODE
Remove-Item Env:DATABASE_URL_MIGRACION
```

`drizzle.config.ts` muestra el host de destino antes de migrar; verifíquelo. La migración usa el controlador `pg` (dependencia de desarrollo); un aviso de SSL puede tapar el mensaje de éxito, así que confíe en `$LASTEXITCODE` (0 = aplicada) y compruebe con una consulta de solo lectura a `drizzle.__drizzle_migrations`. Los scripts que escriben en la base (`db:migrate`, `db:seed`, `cuentas:prueba`, `cuentas:importar`) comparan el host con el de producción (el `DATABASE_URL` de `.env`) y se niegan a continuar si coincide, salvo que se pase `--produccion`. `db:seed` y `cuentas:prueba` nunca aceptan producción. **Nunca** ejecute `npm run db:seed` contra producción.

## Privacidad y seguridad

- Nunca se guardan teléfonos. Los nombres de quienes evalúan están en la configuración. Los nombres, carnés y correos de los participantes los escribe la administración y se guardan solo en la tabla `participantes`; los correos de los evaluadores, solo en `cuentas`. Ningún correo ni carné está en el repositorio (los archivos con la lista viven en `privado/`).
- Los reportes y el CSV identifican a cada participante solo por su carné; nunca muestran nombres ni correos. El correo de un participante solo aparece en la vista previa del envío de resultados.
- A Jev solo se envía el texto de la observación y la rúbrica del indicador. Nunca el código del participante, nombres, correos ni la sesión. La interfaz recuerda: «No incluya nombres en la descripción.»
- Los registros del servidor solo incluyen ruta, estado, tiempo, modelo o plantilla de correo; nunca correos, códigos, contraseñas, nombres ni el texto de las observaciones.
- Contraseñas con `scrypt` y sal por cuenta; los códigos de verificación se guardan solo como hash, son de un solo uso y vencen en 10 minutos.
- La sesión es una cookie httpOnly firmada (12 h). La app envía CSP y otros encabezados de seguridad (ver `next.config.ts`).

## App instalable (PWA)

En iPhone: Safari → Compartir → «Agregar a pantalla de inicio». En Android: menú del navegador → «Instalar app». El service worker solo guarda archivos estáticos (`/_next/static/*` y `/icons/*`); nunca guarda páginas ni respuestas de la API. Calificar y enviar requieren conexión; si se pierde, la app lo avisa y los borradores siguen guardados en el dispositivo.

Los íconos se generan con `npx tsx scripts/generar-iconos.ts`.
