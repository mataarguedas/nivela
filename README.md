# Nivela

**Evaluación de competencias entre pares** para los cursos AGRH 315 Psicología 2 y AGRH 613 Seminario Integrado de Recursos Humanos.

Nivela es una aplicación web pensada para el teléfono (se puede instalar como app desde el navegador). Cada integrante de un equipo califica a participantes anónimos de otro curso en la competencia de su equipo: 4 indicadores, cada uno con 4 niveles de conducta (Básico, Intermedio, Avanzado, Experto). Si la persona evaluadora no está segura del nivel, puede describir lo que observó y **Jev** (el modelo de decisión de TypeSafe AI) le sugiere el nivel más probable con su porcentaje. La sugerencia nunca se aplica sola: la persona evaluadora siempre decide.

Las evaluaciones enviadas se guardan en Postgres. Con el código docente se consultan los reportes (general e individual), se descarga el CSV y se imprime o guarda en PDF.

En esta primera versión solo está habilitada **Adaptabilidad**. Las otras cuatro competencias aparecen como «Próximamente».

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
| `npm run db:seed` | Datos ficticios: 8 evaluadores × todos los participantes. Se niega a correr con `NODE_ENV=production`. `npm run db:seed -- --limpiar` vacía las tablas. |
| `npm run jev:evaluar` | Conjunto de referencia de Jev (ver abajo). |

## Variables de entorno

| Variable | Uso |
|---|---|
| `TYPESAFE_API_KEY` | Clave de TypeSafe para Jev. Solo en el servidor; nunca llega al navegador. |
| `JEV_MODEL` | Modelo de Jev, fijado en `jev-1.13.0` para que los resultados sean reproducibles. No lo cambie a `jev-latest` sin una decisión explícita. |
| `DATABASE_URL` | Conexión a Neon Postgres. La define la integración de Neon en Vercel. |
| `CODIGO_ACCESO` | Código de la clase (rol evaluador). |
| `CODIGO_DOCENTE` | Código docente (rol docente: todo lo del evaluador más los reportes). |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión: al menos 32 bytes aleatorios. |
| `CANTIDAD_PARTICIPANTES` | Cantidad de participantes anónimos (predeterminado: 20). Se fija al compilar: cambiarla exige volver a desplegar. |

Nunca suba archivos `.env*` al repositorio, salvo `.env.example`.

## Cómo cambiar los códigos de acceso

Los códigos viven solo en las variables de entorno, no en el código.

1. En Vercel: **Project → Settings → Environment Variables**, edite `CODIGO_ACCESO` o `CODIGO_DOCENTE` (o use `vercel env rm CODIGO_ACCESO production` y `vercel env add CODIGO_ACCESO production`).
2. Vuelva a desplegar (`vercel --prod` o **Redeploy** en el panel) para que el cambio tome efecto.
3. Las sesiones abiertas siguen activas hasta que vencen (12 h). Para cerrar todas las sesiones de inmediato, cambie también `SESSION_SECRET` y vuelva a desplegar.

Localmente, edite los mismos nombres en `.env.local` y reinicie `npm run dev`.

## Cómo habilitar otra competencia

Todo se hace en `src/config/`; no hay que tocar componentes.

1. Abra el archivo de la competencia, por ejemplo `src/config/competencias/pensamiento-critico.ts`.
2. Complete `definicion`, `fuente` e `indicadores`. Cada indicador lleva `id` único (por ejemplo `pensamiento-critico-1`), `numero`, `titulo` y `niveles` con exactamente 4 descripciones (`1` Básico a `4` Experto). Use `adaptabilidad.ts` como modelo.
3. Cambie `habilitada: false` a `habilitada: true`.
4. Revise que el equipo correspondiente en `src/config/equipos.ts` tenga a sus integrantes (solo nombres; nunca correos ni teléfonos). **No cambie los `id` existentes**: están guardados en la base de datos y en los borradores.
5. Ejecute `npm test`. La prueba de configuración falla si hay `id` repetidos, si un indicador no tiene 4 niveles o si una competencia habilitada no tiene equipo o indicadores.
6. Despliegue. La competencia aparecerá disponible en Inicio y en Reportes.

Para usar Jev en la nueva competencia conviene preparar antes su conjunto de referencia (siguiente sección).

## Conjunto de referencia de Jev

`npm run jev:evaluar` envía a Jev las observaciones escritas a mano en `scripts/fixtures/jev-adaptabilidad.json` (16 textos, uno por indicador y nivel, más 4 fuera de tema) usando la misma lógica que la app, y muestra:

- el porcentaje de aciertos exactos (meta: ≥ 75 %);
- el porcentaje dentro de ±1 nivel (meta: ≥ 95 %);
- la pertinencia de cada texto (los textos fuera de tema deberían quedar por debajo de 0,5).

Termina con error si no alcanza las metas. Usa `TYPESAFE_API_KEY` y `JEV_MODEL` de `.env.local`/`.env` y solo envía los textos del archivo y la rúbrica de la configuración (nunca nombres). Conviene correrlo antes de la actividad y cada vez que cambie `JEV_MODEL` o el texto de los indicadores. Si fuera posible, pida a la persona docente que revise los textos del archivo.

## Cómo exportar los resultados

Ingrese con el **código docente** y abra **Reportes → Adaptabilidad**.

- **Descargar CSV**: un archivo `nivela-adaptabilidad-aaaa-mm-dd.csv` con una fila por calificación (columnas: `competencia, evaluador, curso_evaluador, participante, indicador, nivel, nivel_nombre, origen, ia_nivel_sugerido, ia_confianza, observacion, actualizado`). Está en UTF-8 con BOM, así que Excel muestra bien las tildes al abrirlo con doble clic.
- **Imprimir o guardar PDF**: abre el diálogo de impresión con un formato limpio (sin menú ni botones, gráficos en blanco). Elija «Guardar como PDF» para obtener el archivo.
- Ambas opciones están en el Reporte general y en cada Reporte individual.

## Despliegue

```bash
npm run lint && npm run typecheck && npm test   # antes de desplegar
vercel --prod                                     # despliega a producción
```

Si cambió el esquema de la base de datos, aplique la migración a producción de forma deliberada, indicando la URL de producción explícitamente:

```bash
DATABASE_URL_MIGRACION="<DATABASE_URL de producción>" npm run db:migrate
```

`drizzle.config.ts` muestra el host de destino antes de migrar; verifíquelo. **Nunca** ejecute `npm run db:seed` contra producción.

## Privacidad y seguridad

- Solo se guardan nombres en la configuración; nunca correos ni teléfonos. La base de datos guarda identificadores, niveles, observaciones y metadatos de la IA, sin nombres.
- A Jev solo se envía el texto de la observación y la rúbrica del indicador. Nunca el código del participante, el nombre de quien evalúa ni la sesión. La interfaz recuerda: «No incluya nombres en la descripción.»
- Los registros del servidor solo incluyen ruta, estado, tiempo y modelo; nunca el texto de las observaciones.
- La sesión es una cookie httpOnly firmada (12 h). La app envía CSP y otros encabezados de seguridad (ver `next.config.ts`).

## App instalable (PWA)

En iPhone: Safari → Compartir → «Agregar a pantalla de inicio». En Android: menú del navegador → «Instalar app». El service worker solo guarda archivos estáticos (`/_next/static/*` y `/icons/*`); nunca guarda páginas ni respuestas de la API. Calificar y enviar requieren conexión; si se pierde, la app lo avisa y los borradores siguen guardados en el dispositivo.

Los íconos se generan con `npx tsx scripts/generar-iconos.ts`.
