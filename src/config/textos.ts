// Shared Spanish (Costa Rica) copy, "usted" form. Source: PRD Appendix C plus
// the longer messages quoted in PRD §5 and §13. Component-specific strings may
// live in the component instead.

export const TEXTOS = {
  app: {
    nombre: "Nivela",
    lema: "Evaluación de competencias entre pares",
  },
  inicio: {
    titulo: "Evalúe con criterio, indicador por indicador.",
    comenzar: "Comenzar",
  },
  acceso: {
    instruccion: "Ingrese el código de acceso de su clase",
    entrar: "Entrar",
    error: "El código no es válido. Verifique con su docente.",
    // Not in PRD Appendix C; needed by the access form and /api/acceso.
    codigoRequerido: "Ingrese el código de acceso.",
    demasiadosIntentos: (segundos: number) =>
      `Demasiados intentos. Espere ${segundos} s para intentar de nuevo.`,
    sinConexion: "No fue posible conectarse. Revise su conexión e intente de nuevo.",
  },
  competencias: {
    disponible: "Disponible",
    proximamente: "Próximamente",
    // Not in PRD Appendix C: heading of the Inicio list.
    titulo: "Competencias",
  },
  evaluador: {
    titulo: "¿Quién está evaluando?",
    instruccion: "Seleccione su nombre",
    // Not in PRD Appendix C: nav label and the change confirmation (PRD §5.3).
    enNav: "Evaluador:",
    cambiarTitulo: "¿Cambiar de evaluador?",
    cambiarDescripcion: (actual: string, nuevo: string) =>
      `Va a continuar como ${nuevo}. Los borradores se guardan por separado para cada evaluador: los de ${actual} se conservan en este dispositivo.`,
    cambiar: "Cambiar",
  },
  lista: {
    titulo: "Participantes",
    borrarTodo: "Borrar todo",
    enviadas: (n: number, total: number) => `${n} de ${total} enviadas`,
    confirmarBorrado:
      "¿Desea borrar todas las evaluaciones guardadas en este dispositivo? Las evaluaciones ya enviadas no se eliminan del servidor.",
  },
  estados: {
    pendiente: "Pendiente",
    enProgreso: "En progreso",
    completado: "Completado",
    enviado: "Enviado",
  },
  calificacion: {
    indicador: (n: number) => `Indicador ${n}`,
    observaciones: "Observaciones (opcional)",
    ayudaObservaciones: "Anote únicamente comportamientos observables del indicador o del nivel de conducta.",
    notaTecnica:
      "Recuerde enfocarse en la evaluación exclusiva de los indicadores y niveles asociados a la competencia. Lo que no está escrito en esta plantilla no se considera por ninguna circunstancia en la evaluación.",
    faltan: (n: number) =>
      n === 1 ? "Falta 1 indicador por calificar" : `Faltan ${n} indicadores por calificar`,
    enviar: "Enviar evaluación",
    // Not in PRD Appendix C: header, navigation and the bar's landmark name.
    definicion: "Definición de la competencia",
    fuente: (fuente: string) => `Fuente: ${fuente}`,
    notaTecnicaTitulo: "Nota técnica:",
    volverALista: "Volver a Participantes",
    otrosParticipantes: "Otros participantes",
    anterior: "Anterior:",
    siguiente: "Siguiente:",
    envio: "Envío",
  },
  ia: {
    abrir: "¿No está seguro del nivel?",
    describa: "Describa lo que observó",
    sinNombres: "No incluya nombres en la descripción.",
    analizar: "Analizar",
    analizando: "Analizando…",
    /** `porcentaje` comes already formatted, e.g. "78 %". */
    nivelSugerido: (nivel: string, porcentaje: string) => `Nivel sugerido: ${nivel} · ${porcentaje}`,
    aplicarSugerencia: "Aplicar sugerencia",
    aplicar: "Aplicar",
    usarComoObservacion: "Usar este texto como observación",
    bajaConfianza: "La IA no está segura entre dos niveles. Revise ambos:",
    noPertinente:
      "La descripción no parece relacionarse con este indicador. Agregue comportamientos observables.",
    error:
      "No fue posible analizar el texto en este momento. Intente de nuevo o seleccione el nivel manualmente.",
    // Not in PRD Appendix C: placeholder until the Jev panel lands (M5).
    proximamente: "La sugerencia de nivel con IA estará disponible próximamente. Mientras tanto, seleccione el nivel manualmente.",
  },
  envio: {
    exito: "Evaluación enviada",
    error: "No se pudo enviar. Sus respuestas siguen guardadas en este dispositivo.",
    reintentar: "Reintentar",
  },
  reportes: {
    enlace: "Reportes",
    general: "Reporte general",
    individual: "Reporte individual",
    nivelGeneral: "Nivel general",
    puntajeGeneral: "Puntaje general",
    evaluacionesRecibidas: "Evaluaciones recibidas",
    distribucion: "Distribución de niveles por indicador",
    cobertura: "Cobertura de evaluaciones",
    descargarCsv: "Descargar CSV",
    imprimir: "Imprimir o guardar PDF",
    vacio: "Aún no hay evaluaciones enviadas para esta competencia.",
  },
  coincidencia: {
    alta: "Alta coincidencia",
    media: "Media coincidencia",
    baja: "Baja coincidencia",
  },
  sesion: {
    salir: "Salir",
    expirada: "Su sesión expiró. Ingrese el código nuevamente.",
    // Not in PRD Appendix C: API 401/403 bodies and the docente gate notice.
    requerida: "Debe ingresar el código de acceso para continuar.",
    soloDocente: "Esta sección requiere el código docente.",
  },
  // Not in PRD Appendix C: 404 page (unknown or disabled competencias, etc.).
  noEncontrado: {
    titulo: "Página no encontrada",
    descripcion: "La página que busca no existe o todavía no está disponible.",
    volver: "Ir a Inicio",
  },
  ui: {
    cargando: "Cargando…",
    cancelar: "Cancelar",
    navegacion: "Navegación principal",
    irAInicio: "Nivela, ir a Inicio",
    /** Screen-reader version of the "12 / 1 000" counter; numbers come formatted. */
    contador: (n: string, max: string) => `${n} de ${max} caracteres`,
  },
  avisos: {
    // Not in PRD Appendix C: dismisses the one-time storage notice.
    entendido: "Entendido",
    sinAlmacenamiento: "Este navegador no permite guardar borradores. No cierre la página hasta enviar.",
    sinConexion: "Sin conexión. Sus respuestas se guardan en este dispositivo.",
  },
} as const;
