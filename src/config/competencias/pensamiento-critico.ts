import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 1, plantillas_dia/"Herramienta 4_Plantilla
// sistematizada_ Pensamiento analitico y critico.xlsx", PRD Appendix A.2) with
// only the minimal corrections listed there. Keep it verbatim: it is also the
// rubric sent to Jev. The v1.21 revision reworded Indicador 2 under the same
// ids (PRD §9.1).
// The night rubric is the night team's own template (Equipo 3,
// plantillas_noche/"Plantilla_sistematizada Pensamiento Crítico y Analítico.xlsx", PRD Appendix A.7),
// with its own indicator ids ("…-noche-N").
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
            1: "Describe las partes principales del problema en la información.",
            2: "Identifica posibles causas del problema a partir de sus partes.",
            3: "Relaciona las partes del problema para establecer posibles causas a partir de la información disponible.",
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
    noche: {
      definicion:
        "El pensamiento crítico y analítico es la capacidad de una persona para analizar y cuestionar la información, identificar problemas, reconocer errores y evaluar diferentes alternativas, utilizando la lógica y el razonamiento para comprender una situación y encontrar soluciones antes de tomar una decisión.",
      fuente: "Halpern, D. F. y Dunn, D. S., 2021; Universidad Técnica Nacional, 2023",
      indicadores: [
        {
          id: "pensamiento-critico-noche-1",
          numero: 1,
          titulo: "Analiza y cuestiona la información disponible.",
          niveles: {
            1: "Observa el modelo de forma general y empieza a construir sin revisar sus piezas.",
            2: "Identifica las partes del avión y nota algunas diferencias con sus piezas.",
            3: "Compara sus piezas con el modelo y reconoce qué partes puede reproducir.",
            4: "Contrasta el modelo parte por parte e identifica piezas faltantes o diferentes antes de construir.",
          },
        },
        {
          id: "pensamiento-critico-noche-2",
          numero: 2,
          titulo: "Identifica problemas y reconoce errores.",
          niveles: {
            1: "Reconoce solo errores evidentes, como piezas que se caen o partes faltantes.",
            2: "Detecta errores de forma, color o posición al comparar con el modelo.",
            3: "Detecta errores de proporción o estabilidad y reconoce su causa.",
            4: "Anticipa problemas de forma o estabilidad y reconoce su efecto en el resultado.",
          },
        },
        {
          id: "pensamiento-critico-noche-3",
          numero: 3,
          titulo: "Evalúa diferentes alternativas de solución.",
          niveles: {
            1: "Ante una dificultad, aplica una sola forma de resolverla.",
            2: "Prueba distintas formas de armar, sin compararlas.",
            3: "Compara formas de armado según parecido, estabilidad y tiempo.",
            4: "Prioriza alternativas con criterios claros y elige la más efectiva.",
          },
        },
        {
          id: "pensamiento-critico-noche-4",
          numero: 4,
          titulo: "Propone la solución más adecuada antes de tomar una decisión final.",
          niveles: {
            1: "No define qué piezas cambiar o elige sin una razón clara.",
            2: "Identifica piezas para cambiar, pero decide con un análisis limitado.",
            3: "Elige 1 o 2 piezas y explica cómo mejoran su avión.",
            4: "Justifica cada pieza elegida y define su uso antes de ir a la mesa adicional.",
          },
        },
      ],
    },
  },
};
