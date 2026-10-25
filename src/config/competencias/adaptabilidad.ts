import type { Competencia } from "./index";

// Corrected text from PRD Appendix A. Keep it verbatim: it is also the rubric
// sent to Jev. Open wording questions are tracked in PRD §16 (items 2 and 3).
export const adaptabilidad: Competencia = {
  id: "adaptabilidad",
  nombre: "Adaptabilidad",
  habilitada: true,
  definicion:
    "La adaptabilidad es la capacidad de modificar el propio comportamiento y responder de manera rápida y adecuada ante diferentes situaciones, personas y exigencias del entorno laboral, ajustándose a los cambios en los procedimientos, las tareas y las prioridades, y buscando soluciones eficaces ante los imprevistos.",
  fuente: "Govern de les Illes Balears, s. f.",
  indicadores: [
    {
      id: "adaptabilidad-1",
      numero: 1,
      titulo: "Modifica su forma de actuar ante cambios.",
      niveles: {
        1: "Identifica los cambios cuando se le indican, pero requiere supervisión constante para aplicarlos.",
        2: "Aplica cambios en los procedimientos con poca ayuda, aunque ocasionalmente necesita orientación.",
        3: "Adapta de manera autónoma sus métodos de trabajo al recibir nuevos procedimientos o instrucciones.",
        4: "Se integra proactivamente a los cambios y facilita que otras personas comprendan y adopten la nueva forma de trabajo.",
      },
    },
    {
      id: "adaptabilidad-2",
      numero: 2,
      titulo: "Actúa de manera rápida.",
      niveles: {
        1: "Reconoce los cambios, pero necesita ayuda para responder.",
        2: "Acepta nuevas instrucciones y las pone en práctica con poca ayuda.",
        3: "Actúa rápidamente ante situaciones nuevas siguiendo las indicaciones recibidas.",
        4: "Domina situaciones complejas con rapidez y buen criterio.",
      },
    },
    {
      id: "adaptabilidad-3",
      numero: 3,
      titulo: "Ajusta las prioridades.",
      niveles: {
        1: "Identifica los cambios en sus actividades, pero necesita ayuda para reorganizarlas.",
        2: "Ajusta sus prioridades ante cambios sencillos, cumpliendo parcialmente los objetivos.",
        3: "Organiza sus actividades de manera autónoma para cumplir con los objetivos establecidos.",
        4: "Se desenvuelve proactivamente ante los cambios y facilita que otras personas los comprendan.",
      },
    },
    {
      id: "adaptabilidad-4",
      numero: 4,
      titulo: "Propone soluciones exigentes y eficaces ante imprevistos, actuando con iniciativa.",
      niveles: {
        1: "Identifica los imprevistos, pero depende de las instrucciones de otros para darles solución.",
        2: "Brinda posibles soluciones con orientación y propone alternativas sencillas ante los imprevistos.",
        3: "Detecta posibles problemas antes de que ocurran y propone soluciones preventivas.",
        4: "Se anticipa a posibles imprevistos, propone soluciones innovadoras y ayuda al equipo a resolver situaciones inesperadas.",
      },
    },
  ],
};
