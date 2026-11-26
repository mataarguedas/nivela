import type { DefinicionCompetencia, Rubrica } from "./index";

// Text from the morning team's template (plantillas_dia/"Plantilla
// sistematizada ADAPTABILIDAD 2y2.xlsx", "Plantilla sistematizada", PRD
// Appendix A.1) with only the minimal corrections listed there. Keep it
// verbatim: it is also the rubric sent to Jev. Ids are positional
// (adaptabilidad-1 = Indicador 1); the v1.2 template reordered the indicators
// before any real evaluation existed. The v1.18 revision reworded two levels
// under the same ids (PRD §9.1).
const RUBRICA_MANANA: Rubrica = {
  definicion:
    "La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.",
  fuente: "Govern de les Illes Balears, s. f.",
  indicadores: [
    {
      id: "adaptabilidad-1",
      numero: 1,
      titulo: "Actúa de manera rápida y flexible.",
      niveles: {
        1: "Reconoce los cambios, pero tarda en reaccionar y necesita instrucciones.",
        2: "Responde a cambios siguiendo las indicaciones recibidas.",
        3: "Afronta cambios y mantiene la continuidad de sus tareas.",
        4: "Asume situaciones difíciles o inesperadas con rapidez y mantiene un buen desempeño.",
      },
    },
    {
      id: "adaptabilidad-2",
      numero: 2,
      titulo: "Modifica su forma de actuar ante cambios.",
      niveles: {
        1: "Muestra disposición ante un cambio y actúa con orientación para ajustar su forma de proceder.",
        2: "Acepta la manera de realizar una tarea siguiendo las indicaciones recibidas.",
        3: "Cambia su manera de trabajar ante nuevos procedimientos y los aplica constantemente, sin supervisión.",
        4: "Adapta sus métodos de trabajo a distintos escenarios y mantiene la calidad del resultado.",
      },
    },
    {
      id: "adaptabilidad-3",
      numero: 3,
      titulo: "Ajusta las prioridades ante las demandas del entorno.",
      niveles: {
        1: "Continúa con el orden de tareas establecido aunque surjan nuevas prioridades.",
        2: "Reordena sus tareas cuando se le indica cuáles deben atenderse primero.",
        3: "Realiza sus tareas según su urgencia e importancia sin requerir supervisión.",
        4: "Prioriza las tareas según su importancia y urgencia, incluso cuando surgen varias actividades al mismo tiempo.",
      },
    },
    {
      id: "adaptabilidad-4",
      numero: 4,
      titulo: "Propone soluciones eficaces ante imprevistos o exigencias, actuando con iniciativa.",
      niveles: {
        1: "Comunica el imprevisto y solicita apoyo para resolverlo.",
        2: "Plantea una alternativa sencilla con orientación de otra persona.",
        3: "Propone por iniciativa propia soluciones viables y las pone en práctica.",
        4: "Implementa la solución más eficaz y comprueba que el imprevisto haya sido resuelto.",
      },
    },
  ],
};

// The night team's own template (plantillas_noche/"Plantilla sistematizada
// Adaptabilidad.xlsx", PRD Appendix A.6), with only the minimal corrections
// listed there. Until v1.7 the night team rated with the morning template
// (ids adaptabilidad-1…4), so this rubric has its own ids: rows already
// stored are never relabelled (see competencias/index.ts).
const RUBRICA_NOCHE: Rubrica = {
  definicion:
    "“La adaptabilidad implica ajustar el enfoque de trabajo ante condiciones cambiantes, mantener la efectividad en situaciones difíciles y modificar las prioridades según las necesidades del entorno, gestionando la incertidumbre y comunicando oportunamente los ajustes necesarios”.\n“La adaptabilidad es la capacidad de ajustar los pensamientos, las emociones y los comportamientos ante situaciones nuevas o cambiantes, respondiendo de manera flexible a las demandas del entorno”.",
  fuente: "Canadian Centre on Substance Use and Addiction, 2021; Waldeck, D. P., 2021",
  indicadores: [
    {
      id: "adaptabilidad-noche-1",
      numero: 1,
      titulo: "Ajusta su actuación ante condiciones nuevas o cambiantes.",
      niveles: {
        1: "Presenta resistencia ante nuevas condiciones y requiere instrucciones constantes para modificar su actuación.",
        2: "Reconoce la necesidad de cambiar su actuación, pero necesita orientación para implementar los ajustes.",
        3: "Modifica oportunamente su forma de actuar y cumple sus tareas de acuerdo con las nuevas condiciones.",
        4: "Anticipa las exigencias de los cambios, ajusta su actuación autónomamente y propone mejoras en los procedimientos.",
      },
    },
    {
      id: "adaptabilidad-noche-2",
      numero: 2,
      titulo: "Modifica prioridades ante imprevistos y necesidades del entorno.",
      niveles: {
        1: "Tiene dificultades para identificar qué tareas requieren atención inmediata y mantiene sus prioridades iniciales.",
        2: "Identifica las prioridades que deben modificarse, pero necesita apoyo para reorganizar sus actividades.",
        3: "Reorganiza sus tareas de manera autónoma y atiende oportunamente las situaciones inesperadas.",
        4: "Evalúa las necesidades del entorno, establece nuevas prioridades estratégicamente y desarrolla alternativas para resolver situaciones imprevistas.",
      },
    },
    {
      id: "adaptabilidad-noche-3",
      numero: 3,
      titulo: "Gestiona los cambios y la incertidumbre.",
      niveles: {
        1: "Pierde la continuidad de sus actividades ante situaciones inciertas y requiere orientación continua para retomarlas.",
        2: "Continúa parcialmente con el desarrollo de sus actividades, aunque necesita acompañamiento para desenvolverse ante situaciones inciertas.",
        3: "Conserva la conducta y la organización de sus actividades, incluso cuando las condiciones son inciertas.",
        4: "Demuestra constancia ante cambios simultáneos, prevé posibles dificultades y actúa con seguridad en escenarios inciertos.",
      },
    },
    {
      id: "adaptabilidad-noche-4",
      numero: 4,
      titulo: "Responde a la presión de manera flexible y comunica oportunamente los ajustes necesarios.",
      niveles: {
        1: "Evidencia dificultades para ajustar su comportamiento ante situaciones de presión y requiere intervención para responder a las exigencias del entorno.",
        2: "Reconoce las situaciones que le generan presión y ajusta su respuesta cuando recibe indicaciones.",
        3: "Ajusta autónomamente sus comportamientos ante situaciones de presión y realiza los cambios necesarios para mantener su desempeño.",
        4: "Gestiona eficazmente la presión, ajusta sus comportamientos y anticipa los cambios necesarios para mantener la efectividad de sus actividades.",
      },
    },
  ],
};

export const adaptabilidad: DefinicionCompetencia = {
  id: "adaptabilidad",
  nombre: "Adaptabilidad",
  rubricas: {
    manana: RUBRICA_MANANA,
    noche: RUBRICA_NOCHE,
  },
};
