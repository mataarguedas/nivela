import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 1, "Herramienta 4_Plantilla sistematizada.xlsx",
// PRD Appendix A.2) with only the minimal corrections listed there. Keep it
// verbatim: it is also the rubric sent to Jev. No night rubric yet: the night
// team (Equipo 3) hasn't sent its template, so the competencia shows
// "Próximamente" at night.
export const pensamientoCritico: DefinicionCompetencia = {
  id: "pensamiento-critico",
  nombre: "Pensamiento crítico y analítico",
  rubricas: {
    manana: {
      definicion:
        "El pensamiento crítico es una habilidad que ayuda a analizar la información, utilizando pruebas y razones que permiten tomar decisiones y formar opiniones. También hace reflexionar sobre lo que se lee o se escucha, cuestiona y valora la información que recibió.\nEl pensamiento analítico es la capacidad de dividir un problema o idea en partes más pequeñas para así entenderlo mejor, también identifica patrones entre los datos para extraer información y explicar cómo se conecta cada situación y se relaciona con el pensamiento crítico.",
      fuente: "González Giraldo, F., 2023; Wang, M., et al., 2025",
      indicadores: [
        {
          id: "pensamiento-critico-1",
          numero: 1,
          titulo: "Identifica aspectos relevantes de la información presentada.",
          niveles: {
            1: "Presenta dificultad para reconocer los aspectos relevantes de la información presentada y requiere orientación para comprender la situación.",
            2: "Reconoce los aspectos relevantes más evidentes de la información, pero presenta dificultad para explicar su relación con la situación planteada.",
            3: "Analiza los aspectos relevantes de la información, establece relaciones entre ellos y explica su influencia en la situación planteada.",
            4: "Evalúa críticamente los aspectos relevantes de la información, cuestiona su significado y establece relaciones fundamentadas para formular conclusiones sobre la situación planteada.",
          },
        },
        {
          id: "pensamiento-critico-2",
          numero: 2,
          titulo: "Analiza la información para establecer posibles causas dividiendo un problema en partes.",
          niveles: {
            1: "Describe las diferencias observadas.",
            2: "Identifica posibles causas del problema.",
            3: "Relaciona las diferencias con posibles causas utilizando la información disponible.",
            4: "Formula explicaciones fundamentadas sobre el origen del problema, considerando la interacción y la influencia de sus diferentes componentes.",
          },
        },
        {
          id: "pensamiento-critico-3",
          numero: 3,
          titulo: "Evalúa la coherencia de la información mediante la comparación de datos.",
          niveles: {
            1: "Reconoce relaciones evidentes entre los datos de la información disponible.",
            2: "Compara los datos e identifica relaciones y diferencias entre ellos.",
            3: "Contrasta diferentes datos para determinar si existe coherencia entre la información analizada.",
            4: "Evalúa la coherencia de la información y justifica su criterio.",
          },
        },
        {
          id: "pensamiento-critico-4",
          numero: 4,
          titulo: "Toma decisiones fundamentadas y conecta cada situación para resolver.",
          niveles: {
            1: "Expresa una decisión superficial sobre la situación sin examinar críticamente la información.",
            2: "Relaciona la información e identifica inconsistencias para formular una decisión.",
            3: "Analiza críticamente y conecta diferentes elementos de la situación para fundamentar su decisión.",
            4: "Examina rigurosamente y con sentido crítico la información, cuestiona supuestos, identifica relaciones no evidentes y toma decisiones sólidas fundamentadas en evidencia.",
          },
        },
      ],
    },
  },
};
