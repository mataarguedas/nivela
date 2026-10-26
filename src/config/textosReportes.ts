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
  promedioPorIndicador: "Promedio por indicador",
  calificacionesPorIndicador: "Calificaciones por indicador",
  coincidenciaTitulo: "Coincidencia entre evaluadores",
  observaciones: "Observaciones",
  participante: "Participante",
  personaEvaluadora: "Persona evaluadora",
  nivel: "Nivel",
  evaluaciones: "Evaluaciones",
  total: "Total",
  indicador: "Indicador",
  indicadorCorto: (n: number) => `Ind. ${n}`,
  enviada: "Enviada",
  pendiente: "Pendiente",
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
