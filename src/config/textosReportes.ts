// Report-only Spanish copy ("usted" form) that is not in PRD Appendix C:
// the picker, KPI tiles, chart and table headings, individual report labels,
// and the report/CSV error bodies. Kept out of TEXTOS (src/config/textos.ts)
// because every client bundle imports that object, and these strings are
// only used on the docente report routes. Appendix C report strings stay in
// TEXTOS.reportes.

export const TEXTOS_REPORTES = {
  elegirCompetencia: "Seleccione la competencia del reporte.",
  participantesEvaluados: "Participantes evaluados",
  /** Numbers come formatted. */
  deTotal: (n: string, total: string) => `${n} de ${total}`,
  coberturaKpi: (porcentaje: string) => `Cobertura ${porcentaje}`,
  puntajePromedio: "Puntaje general promedio",
  asistidosIa: "Niveles asistidos por IA",
  puntajePorParticipante: "Puntaje por participante",
  tablaParticipantes: "Tabla de participantes",
  mejoresTitulo: (n: number) => `Los ${n} puntajes más altos`,
  mejoresDescripcion: "Según el puntaje general. Los empates comparten la posición.",
  posicion: (n: number) => `Posición ${n}`,
  /** Count comes formatted. */
  evaluacionesCuenta: (n: string) => (n === "1" ? "1 evaluación" : `${n} evaluaciones`),
  promedioPorIndicador: "Promedio por indicador",
  calificacionesPorIndicador: "Calificaciones por indicador",
  // Simpler charts (PRD §11 v1.2, Appendix C "Gráficos"). Chart names stay
  // as headings; the title sentence above each chart states its message.
  // Values come formatted.
  participantesPorNivel: "Participantes por nivel",
  puntajePorIndicador: "Puntaje por indicador",
  verGraficosDetallados: "Ver gráficos detallados",
  evaluadoresPorNivel: "Evaluadores por nivel en cada indicador",
  valorNivel: (valor: string, nivel: string) => `${valor} · ${nivel}`,
  /** The report scale (PRD §7); the bands come formatted, e.g. "Básico 0–25". */
  escalaPuntos: (bandas: string) => `Puntajes de 0 a 100: ${bandas}.`,
  bandaNivel: (nivel: string, min: number, max: number) => `${nivel} ${min}–${max}`,
  conteoPorcentaje: (n: string, porcentaje: string) => `${n} · ${porcentaje}`,
  titulos: {
    sinNivelGeneral: "Aún no hay participantes con puntaje general.",
    todosEnNivel: (nivel: string, n: string) => `Todos los participantes están en nivel ${nivel} (${n} de ${n})`,
    mayoriaEnNivel: (nivel: string, n: string, total: string) =>
      `La mayoría de los participantes está en nivel ${nivel} (${n} de ${total})`,
    nivelMasFrecuente: (nivel: string, n: string, total: string) =>
      `El nivel más frecuente es ${nivel} (${n} de ${total} participantes)`,
    empateNiveles: (niveles: string, n: string, total: string) =>
      `Los niveles ${niveles} empatan con ${n} de ${total} participantes cada uno`,
    sinPromedios: "Aún no hay promedios por indicador.",
    indicadorMasAlto: (titulo: string, media: string) => `El indicador más alto es «${titulo}» (${media})`,
    /** Ties name the indicators by number: their titles are long, and each bar is labelled "Indicador n. …". */
    indicadoresMasAltos: (numeros: string, media: string) => `Los indicadores ${numeros} empatan como los más altos (${media})`,
    indicadoresIguales: (media: string) => `Todos los indicadores tienen el mismo promedio (${media})`,
    sinPuntajes: "Aún no hay puntajes de participantes.",
    puntajeUnico: (valor: string) => `Un participante tiene puntaje general (${valor})`,
    puntajesIguales: (valor: string) => `Todos los participantes tienen el mismo puntaje (${valor})`,
    rangoPuntajes: (min: string, max: string) => `Los puntajes van de ${min} a ${max}`,
  },
  /** Appendix C: "{n} de {total} evaluadores eligieron {nivel}". */
  nivelMasElegido: (n: string, total: string, nivel: string) =>
    `${n} de ${total} evaluadores ${n === "1" ? "eligió" : "eligieron"} ${nivel}`,
  empateMasElegido: (niveles: string, n: string, total: string) =>
    `Empate entre ${niveles}: ${n} de ${total} evaluadores ${n === "1" ? "eligió" : "eligieron"} cada uno`,
  coincidenciaTitulo: "Coincidencia entre evaluadores",
  observaciones: "Observaciones",
  participante: "Participante",
  participantes: "Participantes",
  porcentaje: "Porcentaje",
  personaEvaluadora: "Persona evaluadora",
  nivel: "Nivel",
  puntaje: "Puntaje",
  evaluaciones: "Evaluaciones",
  total: "Total",
  indicador: "Indicador",
  indicadorCorto: (n: number) => `Ind. ${n}`,
  enviada: "Enviada",
  pendiente: "Pendiente",
  // Attendance (PRD §5.13, §11.2). "Ausente" and "Asistencia en conflicto" are Appendix C.
  ausentes: "Ausentes",
  ausente: "Ausente",
  asistencia: "Asistencia",
  asistenciaConflicto: "Asistencia en conflicto",
  /** Counts come formatted. */
  marcadoAusentePor: (n: string) => (n === "1" ? "Marcado ausente por 1 evaluador" : `Marcado ausente por ${n} evaluadores`),
  conflictoDetalle: (marcas: string, evaluaciones: string) =>
    `${marcas} ${marcas === "1" ? "lo marcó" : "lo marcaron"} ausente · ${evaluaciones} ${evaluaciones === "1" ? "evaluación" : "evaluaciones"}`,
  ausentesKpi: "Sin evaluaciones y marcados ausentes",
  // Gap to the next level (PRD §7, §11.1, Appendix C "Brecha"). Values come formatted.
  brecha: (faltante: string, nivel: string) =>
    faltante === "1" ? `Le falta 1 punto para ${nivel}` : `Le faltan ${faltante} puntos para ${nivel}`,
  brechaCorta: (faltante: string, nivel: string) => `${faltante} para ${nivel}`,
  nivelMaximo: "Nivel máximo alcanzado",
  paraLlegar: (nivel: string, descripcion: string) => `Para llegar a ${nivel}: ${descripcion}`,
  paraSiguienteNivel: "Para el siguiente nivel",
  // Evaluator progress (PRD §11.2, Appendix C "Avance").
  avanceTitulo: (numero: number) => `Avance de evaluadores · Equipo ${numero}`,
  avanceResumen: (n: string, total: string) => `${n} de ${total} evaluadores completaron`,
  avanceNota: "Solo se cuentan las evaluaciones enviadas; los borradores quedan en el teléfono de cada evaluador.",
  estadosAvance: { "sin-iniciar": "Sin iniciar", "en-progreso": "En progreso", completo: "Completo" },
  estadosCuenta: { "sin-correo": "Sin correo", pendiente: "Pendiente de activar", activa: "Activa" },
  evaluadoresCompletos: "Evaluadores completos",
  nombre: "Nombre",
  curso: "Curso",
  cuenta: "Cuenta",
  ultimoIngreso: "Último ingreso",
  nunca: "Nunca",
  enviadas: "Enviadas",
  estado: "Estado",
  sinDatos: "Sin datos",
  /** Values come formatted. */
  /** The levels chosen (1–4), not points. */
  rango: (min: string, max: string) => `Niveles ${min}–${max}`,
  desviacion: (valor: string) => `DE ${valor}`,
  sinObservaciones: "Sin observaciones para este indicador.",
  sinEvaluacionesParticipante: "Este participante aún no tiene evaluaciones.",
  // Group summary (PRD §11.3, Appendix C "Resumen del grupo"). Values come formatted.
  resumenGrupo: "Resumen del grupo",
  ambasJornadas: "Ambas jornadas",
  puntajePromedioPorIndicador: "Puntaje promedio por indicador",
  puntajeGrupo: "Puntaje del grupo",
  nivelDetalle: (nivel: string) => `Nivel ${nivel}`,
  cobertura: "Cobertura",
  /** "28 de 36 evaluaciones" */
  evaluacionesDe: (n: string, total: string) => `${n} de ${total} evaluaciones`,
  /** The gap tile's detail: "para Experto". */
  paraNivel: (nivel: string) => `para ${nivel}`,
  resumenTitulo: "En pocas palabras",
  comparacionTitulo: "Mañana y Noche",
  comparacionDescripcion: "Cada columna es el equipo de esa jornada para esta competencia.",
  comparacionRubricasDistintas: "Las jornadas usan plantillas distintas: cada columna muestra sus propios indicadores.",
  medida: "Medida",
  /** Column header: "Mañana · Equipo 4". */
  columnaJornada: (jornada: string, numero: number) => `${jornada} · Equipo ${numero}`,
  parrafo: {
    nivel: (nivel: string, puntaje: string) => `El grupo alcanzó un nivel ${nivel} (${puntaje}).`,
    indicadoresIguales: (media: string) => `Todos los indicadores tienen el mismo promedio (${media}).`,
    masFuerte: (titulo: string, media: string) => `El indicador más fuerte es «${titulo}» (${media})`,
    /** Ties name the indicators by number, as the chart titles do. */
    masFuertes: (numeros: string, media: string) => `Los indicadores ${numeros} son los más fuertes (${media})`,
    masDebil: (titulo: string, media: string) => `el que más necesita refuerzo es «${titulo}» (${media})`,
    masDebiles: (numeros: string, media: string) => `los indicadores ${numeros} son los que más necesitan refuerzo (${media})`,
  },
  // Reporte consolidado (PRD §11.4, Appendix C "Reporte consolidado"). Values come formatted.
  consolidado: {
    titulo: "Reporte consolidado",
    enlace: "Reporte consolidado",
    enlaceDetalle: "Las cinco competencias juntas",
    subtitulo: "Todas las competencias",
    vacio: "Aún no hay evaluaciones enviadas en esta jornada.",
    competenciasConEvaluaciones: "Competencias con evaluaciones",
    competenciasDisponibles: (n: string, total: string) => `${n} de ${total} con plantilla en esta jornada`,
    promedioGrupo: "Promedio entre competencias",
    porCompetencia: "Resumen por competencia",
    puntajePorCompetencia: "Puntaje del grupo por competencia",
    porCompetenciaNota:
      "El puntaje del grupo de cada competencia es el promedio de los puntajes generales de sus participantes evaluados, como en su Reporte general.",
    participantesPorNivel: "Participantes por nivel (promedio entre competencias)",
    tabla: "Participantes en todas las competencias",
    tablaNota:
      "Cada celda es el puntaje general del participante en esa competencia. El promedio entre competencias solo incluye las competencias en las que tiene evaluaciones.",
    competencia: "Competencia",
    equipo: "Equipo",
    equipoNumero: (numero: number) => `Equipo ${numero}`,
    sinPlantilla: "Sin plantilla en esta jornada",
    evaluadas: "Competencias evaluadas",
    promedio: "Promedio",
    // "Los 5 promedios más altos" (PRD §11.4, v1.12). Numbers come formatted.
    mejoresTitulo: (n: number) => `Los ${n} promedios más altos`,
    mejoresDescripcion: "Según el promedio entre competencias. Los empates comparten la posición.",
    competenciasEvaluadasCuenta: (n: string, total: string) => `${n} de ${total} competencias`,
    verIndividual: (participante: string, competencia: string) => `Reporte individual de ${participante} en ${competencia}`,
    titulos: {
      sinPuntajes: "Aún no hay puntajes por competencia.",
      unaCompetencia: (nombre: string, valor: string) => `Solo «${nombre}» tiene puntaje (${valor})`,
      masAlta: (nombre: string, valor: string) => `La competencia con el puntaje más alto es «${nombre}» (${valor})`,
      empateAltas: (nombres: string, valor: string) => `${nombres} empatan con el puntaje más alto (${valor})`,
      todasIguales: (valor: string) => `Todas las competencias tienen el mismo puntaje (${valor})`,
    },
    // Dashboard (PRD §11.4 "Tablero").
    resumenTitulo: "En pocas palabras",
    parrafo: {
      grupo: (nivel: string, valor: string) => `El grupo alcanzó un nivel ${nivel} (${valor}) como promedio entre competencias.`,
      participante: (valor: string, nivel: string, n: string, total: string) =>
        `El promedio entre competencias es ${valor} (${nivel}), en ${n} de ${total} competencias.`,
      sinPromedio: "Aún no hay puntajes para calcular el promedio entre competencias.",
      /** Two halves joined with " y ", so a single strongest and tied weakest read right. */
      fuerte: (competencia: string) => `La competencia más fuerte es ${competencia}`,
      fuertes: (competencias: string) => `Las competencias más fuertes son ${competencias}`,
      debil: (competencia: string) => `la que más necesita refuerzo es ${competencia}`,
      debiles: (competencias: string) => `las que más necesitan refuerzo son ${competencias}`,
      iguales: (valor: string) => `Todas las competencias tienen el mismo puntaje (${valor}).`,
      /** "«Adaptabilidad» (70)" */
      competencia: (nombre: string, valor: string) => `«${nombre}» (${valor})`,
    },
    mapaNiveles: "Mapa de niveles",
    mapaNivelesMensaje: "Cada fila es un participante y cada columna una competencia",
    mapaNivelesNota: "Cada celda muestra el puntaje general; el color indica el nivel. Ordenado por promedio entre competencias.",
    celdaMapa: (competencia: string, valor: string, nivel: string) => `${competencia}: ${valor} · ${nivel}`,
    ausenteCorto: "Aus.",
    // Reporte del participante (PRD §11.5).
    participante: {
      titulo: "Reporte del participante",
      verReporte: "Ver reporte del participante",
      volver: "Volver al Reporte consolidado",
      subtitulo: (jornada: string) => `Todas las competencias · ${jornada}`,
      puntajePorCompetencia: "Puntaje por competencia",
      detalle: "Detalle por competencia",
      sinEvaluaciones: "Este participante aún no tiene evaluaciones en esta jornada.",
      sinEvaluacionesCompetencia: "Aún no tiene evaluaciones en esta competencia.",
      ausenteCompetencia: "Marcado ausente en esta competencia.",
      indicadorMasAlto: (n: number) => (n === 1 ? "Indicador más alto" : "Indicadores más altos"),
      indicadorMasBajo: (n: number) => (n === 1 ? "Indicador más bajo" : "Indicadores más bajos"),
      /** "Ind. 2 «Actúa de manera rápida» (83)" */
      indicadorValor: (numero: number, titulo: string, valor: string) => `Ind. ${numero} «${titulo}» (${valor})`,
      todosIguales: (valor: string) => `Todos los indicadores tienen el mismo promedio (${valor})`,
      verIndividual: "Ver reporte individual",
      verIndividualDe: (competencia: string) => `Ver reporte individual de ${competencia}`,
      verTodas: "Ver todas sus competencias",
    },
  },
  // "Uso de la aplicación" (PRD §11.6, v1.14): which evaluators activated their account and are rating.
  uso: {
    titulo: "Uso de la aplicación",
    enlace: "Uso de la aplicación",
    enlaceDetalle: "Quién activó su cuenta y quién ya está evaluando",
    subtitulo: "Evaluadores de todos los equipos",
    kpiActivadas: "Cuentas activadas",
    kpiActividad: "Ya evalúan",
    kpiActividadDetalle: "Enviaron al menos una evaluación o marcaron una ausencia",
    kpiCompletos: "Completaron",
    kpiSinActivar: "Sin activar",
    kpiSinActivarDetalle: (pendientes: string, sinCorreo: string) => `${pendientes} pendientes de activar · ${sinCorreo} sin correo`,
    resumen: (activadas: string, total: string, actividad: string, completos: string) =>
      `${activadas} de ${total} evaluadores activaron su cuenta; ${actividad} ya evalúan y ${completos} completaron todas sus evaluaciones.`,
    sinActivarTitulo: "Aún no activan su cuenta",
    sinActivarNota:
      "Pídales que ingresen con su correo para activar la cuenta. Quien aparece «Sin correo» necesita que la administración lo agregue.",
    todosActivaron: "Todos los evaluadores activaron su cuenta.",
    equipo: (numero: number, competencia: string) => `Equipo ${numero} · ${competencia}`,
    resumenEquipo: (activadas: string, completos: string, total: string) =>
      `${activadas} de ${total} activaron su cuenta · ${completos} de ${total} completaron`,
    activadaEl: "Activada el",
    ultimaEvaluacion: "Última evaluación",
    uso: "Uso",
    estados: { "sin-activar": "Sin activar", "sin-actividad": "Sin evaluaciones", evaluando: "Evaluando", completo: "Completó" },
    nota:
      "«Último ingreso» es la última vez que inició sesión (la sesión dura 12 horas). «Última evaluación» es su último envío. Los borradores quedan en el teléfono de cada evaluador y no se cuentan.",
    vacio: "No hay equipos con plantilla en esta jornada.",
  },
  volverGeneral: "Volver al Reporte general",
  volverReportes: "Volver a Reportes",
  otrosParticipantes: "Otros participantes",
  acciones: "Acciones del reporte",
  errorCarga: "No se pudo cargar el reporte. Intente de nuevo.",
  errorCsv: "No se pudo generar el CSV. Intente de nuevo.",
} as const;

// Results by email (PRD §5.14, Appendix C "Envío de resultados"). Report-only
// copy, like TEXTOS_REPORTES. Values come formatted.
const participantesN = (n: number) => (n === 1 ? "1 participante" : `${n} participantes`);

export const TEXTOS_ENVIO = {
  titulo: "Enviar resultados por correo",
  // v1.13: one general report per participant with every competencia of the jornada.
  descripcion:
    "Cada participante recibe un solo correo con su reporte general: el resultado general (promedio entre competencias) y, por competencia, el puntaje, el nivel y, por indicador, lo que le falta para el siguiente nivel. El correo no incluye nombres de evaluadores, calificaciones individuales ni observaciones.",
  destinatarios: "Destinatarios",
  destinatariosAyuda:
    "Participantes con correo y al menos una evaluación en alguna competencia. Si aún faltan competencias por evaluar, el correo incluye solo las evaluadas. A quien ya recibió sus resultados no se le envía de nuevo, salvo que marque «Reenviar».",
  cobertura: (n: string, total: string) => `${n} de ${total} competencias`,
  sinDestinatarios: "Aún no hay participantes con correo y evaluaciones.",
  omitidos: "No se les enviará",
  sinOmitidos: "Todos los participantes recibirán sus resultados.",
  motivos: { "sin-correo": "Sin correo", "sin-evaluaciones": "Sin evaluaciones", ausente: "Ausente" },
  evaluaciones: (n: string) => (n === "1" ? "1 evaluación" : `${n} evaluaciones`),
  enviadoEl: (fecha: string) => `Enviado el ${fecha}`,
  errorEl: (fecha: string) => `Error al enviar el ${fecha}`,
  pendiente: "Pendiente",
  reenviar: "Reenviar",
  vistaPrevia: "Vista previa",
  participantePrevia: "Participante",
  para: (correo: string) => `Para: ${correo}`,
  asunto: (asunto: string) => `Asunto: ${asunto}`,
  marcoPrevia: (etiqueta: string) => `Vista previa del correo para ${etiqueta}`,
  prueba: "Enviarme una prueba",
  pruebaCampo: "Su correo electrónico",
  pruebaAyuda: "Recibirá el correo de la vista previa, marcado como prueba. Esta dirección no se guarda.",
  pruebaEnviada: "Prueba enviada",
  pruebaError: "No se pudo enviar la prueba. Intente de nuevo.",
  enviarA: (n: number) => `Enviar a ${participantesN(n)}`,
  confirmarTitulo: (n: number) => `¿Enviar los resultados a ${participantesN(n)}?`,
  confirmarDescripcion:
    "Cada persona recibirá un correo solo con sus propios resultados. Cada envío queda registrado.",
  confirmar: "Enviar",
  enviando: "Enviando…",
  resumenEnviados: (n: number) => (n === 1 ? "Se envió 1 correo." : `Se enviaron ${n} correos.`),
  resumenErrores: (n: number) => (n === 1 ? "1 correo no se pudo enviar." : `${n} correos no se pudieron enviar.`),
  errorEnvio: "No se pudieron enviar los resultados. Intente de nuevo.",
  sinEvaluaciones: "Ese participante aún no tiene evaluaciones.",
  // v1.16: the general report as a PDF (attached to the email; the docente downloads it here).
  descargarPdf: "Descargar PDF",
  adjuntoAyuda: "El correo lleva adjunto este mismo reporte en PDF.",
  pdfParticipante: "Indique un participante válido.",
  pdfError: "No se pudo generar el PDF. Intente de nuevo.",
  // The "Correo" column of the Reporte general (PRD §11.2).
  columna: "Correo",
  estados: { enviado: "Enviado", error: "Error", pendiente: "Pendiente" },
} as const;
