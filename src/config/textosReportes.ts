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
  brecha: (faltante: string, nivel: string) => `Le faltan ${faltante} puntos para ${nivel}`,
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
  rango: (min: string, max: string) => `Rango ${min}–${max}`,
  desviacion: (valor: string) => `DE ${valor}`,
  sinObservaciones: "Sin observaciones para este indicador.",
  sinEvaluacionesParticipante: "Este participante aún no tiene evaluaciones.",
  volverGeneral: "Volver al Reporte general",
  volverReportes: "Volver a Reportes",
  otrosParticipantes: "Otros participantes",
  acciones: "Acciones del reporte",
  errorCarga: "No se pudo cargar el reporte. Intente de nuevo.",
  errorCsv: "No se pudo generar el CSV. Intente de nuevo.",
} as const;
