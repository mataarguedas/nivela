import type { DefinicionCompetencia } from "./index";

// Morning team's template (Equipo 3, "Plantilla Sistematizada Orientación al
// Detalle.xlsx", PRD Appendix A.4) with only the minimal corrections listed
// there. Keep it verbatim: it is also the rubric sent to Jev. No night rubric
// yet: the night team (Equipo 4) hasn't sent its template, so the competencia
// shows "Próximamente" at night.
export const orientacionDetalle: DefinicionCompetencia = {
  id: "orientacion-detalle",
  nombre: "Orientación al detalle",
  rubricas: {
    manana: {
      definicion:
        "La Orientación al detalle “es la capacidad de notar, procesar y completar con precisión todos los aspectos de una tarea sin omitir elementos pequeños pero significativos”. “Es la habilidad de procesar información detallada con efectividad y consistencia de manera minuciosa y exacta a partir de grandes volúmenes de información o datos”.\nConsiste en realizar una tarea con minuciosidad y precisión. Implica supervisar y verificar el trabajo o la información, así como planificar y organizar el tiempo y los recursos de manera eficiente.",
      fuente:
        "Bermúdez, N., 2023, párr. 1; Kim, K., 2026, párr. 1; Government of the Northwest Territories, s. f.; Syracuse University Performance Partnership, s. f.",
      indicadores: [
        {
          id: "orientacion-detalle-1",
          numero: 1,
          titulo: "Verifica aspectos minuciosos.",
          niveles: {
            1: "Revisa detalles específicos de una tarea siguiendo indicaciones para determinar si son correctos.",
            2: "Contrasta los detalles de una tarea con las indicaciones establecidas para reconocer pequeñas diferencias.",
            3: "Inspecciona minuciosamente los elementos de una tarea para detectar errores que puedan afectar su exactitud.",
            4: "Corrobora la exactitud de los detalles menos perceptibles, asegurando que todos cumplan con los criterios establecidos.",
          },
        },
        {
          id: "orientacion-detalle-2",
          numero: 2,
          titulo: "Comprueba cambios significativos.",
          niveles: {
            1: "Confirma que los cambios más evidentes de una tarea correspondan con las indicaciones recibidas.",
            2: "Compara los cambios realizados con los resultados esperados para determinar si son importantes y coherentes.",
            3: "Examina los cambios significativos de una tarea para determinar si mantienen consistencia con las condiciones establecidas.",
            4: "Valida que los cambios significativos sean consistentes entre sí y cumplan con todos los criterios establecidos, incluso cuando presentan diferencias difíciles de detectar.",
          },
        },
        {
          id: "orientacion-detalle-3",
          numero: 3,
          titulo: "Organiza recursos correctos y completos.",
          niveles: {
            1: "Ordena los recursos necesarios para una tarea siguiendo indicaciones sobre su uso y verificando que estén completos.",
            2: "Selecciona y prepara los recursos adecuados, asegurándose de que correspondan con lo solicitado.",
            3: "Distribuye los recursos según las necesidades de la tarea, comprobando que sean correctos y suficientes.",
            4: "Optimiza la organización y el procesamiento de los recursos, anticipando posibles errores o faltantes para asegurar su uso adecuado.",
          },
        },
        {
          id: "orientacion-detalle-4",
          numero: 4,
          titulo: "Controla cambios con precisión y exactitud.",
          niveles: {
            1: "Aplica cambios sencillos siguiendo instrucciones específicas para mantener la exactitud de una tarea.",
            2: "Registra las modificaciones realizadas y comprueba que correspondan con las indicaciones establecidas.",
            3: "Ajusta las modificaciones necesarias, evitando que se generen errores en los demás elementos de la tarea.",
            4: "Supervisa las modificaciones realizadas, detectando y corrigiendo inconsistencias para garantizar la precisión del resultado final.",
          },
        },
      ],
    },
  },
};
